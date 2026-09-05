import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  IngestionItemResult,
  IngestionRunResult,
  SourceIngestionResult,
  SourceRecord,
} from './types.ts'
import { fetchWithLimits } from './fetch.ts'
import { parseFeed } from './rss-parser.ts'
import { normalizeFeedItem, toArticleInsert } from './normalize.ts'
import { findDuplicate, type ExistingArticle } from './dedupe.ts'
import { isAllowedUrl } from './url.ts'

const JOB_NAME = 'ingest-sources'

export async function loadActiveSources(supabase: SupabaseClient): Promise<SourceRecord[]> {
  const { data, error } = await supabase
    .from('sources')
    .select('*')
    .eq('is_active', true)
    .order('name')

  if (error) throw new Error(`Failed to load sources: ${error.message}`)
  return (data ?? []) as SourceRecord[]
}

async function loadRecentArticles(supabase: SupabaseClient): Promise<ExistingArticle[]> {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const { data, error } = await supabase
    .from('articles')
    .select('id, canonical_url, content_hash, normalized_title, title, published_at')
    .gte('discovered_at', since)

  if (error) throw new Error(`Failed to load articles for dedupe: ${error.message}`)
  return (data ?? []) as ExistingArticle[]
}

async function linkArticleSource(
  supabase: SupabaseClient,
  articleId: string,
  sourceId: string,
): Promise<void> {
  await supabase.from('article_sources').upsert(
    { article_id: articleId, source_id: sourceId },
    { onConflict: 'article_id,source_id', ignoreDuplicates: true },
  )
}

async function recordSourceFailure(
  supabase: SupabaseClient,
  source: SourceRecord,
  errorMessage: string,
): Promise<void> {
  const metadata = {
    ...source.metadata,
    last_error: errorMessage,
    last_error_at: new Date().toISOString(),
  }

  await supabase
    .from('sources')
    .update({ metadata, last_fetched_at: new Date().toISOString() })
    .eq('id', source.id)
}

async function recordSourceSuccess(supabase: SupabaseClient, sourceId: string): Promise<void> {
  await supabase
    .from('sources')
    .update({ last_fetched_at: new Date().toISOString() })
    .eq('id', sourceId)
}

export async function ingestSource(
  supabase: SupabaseClient,
  source: SourceRecord,
  existingArticles: ExistingArticle[],
): Promise<SourceIngestionResult> {
  const started = Date.now()
  const result: SourceIngestionResult = {
    sourceId: source.id,
    sourceName: source.name,
    fetched: 0,
    inserted: 0,
    linked: 0,
    duplicates: 0,
    skipped: 0,
    errors: [],
    durationMs: 0,
  }

  if (!isAllowedUrl(source.url)) {
    result.errors.push(`Unsupported source URL protocol: ${source.url}`)
    await recordSourceFailure(supabase, source, result.errors[0] ?? 'Unsupported source URL')
    result.durationMs = Date.now() - started
    return result
  }

  const fetchResult = await fetchWithLimits(source.url)
  if (!fetchResult.ok) {
    result.errors.push(fetchResult.error)
    await recordSourceFailure(supabase, source, fetchResult.error)
    result.durationMs = Date.now() - started
    return result
  }

  const parsed = parseFeed(fetchResult.body, source.url, source.type)
  if (parsed.error) {
    result.errors.push(parsed.error)
  }

  result.fetched = parsed.items.length

  for (const item of parsed.items) {
    try {
      const normalized = await normalizeFeedItem(item, source)
      if (!normalized) {
        result.skipped++
        continue
      }

      const duplicate = findDuplicate(
        {
          canonicalUrl: normalized.canonicalUrl,
          contentHash: normalized.contentHash,
          normalizedTitle: normalized.normalizedTitle,
          title: normalized.title,
          publishedAt: normalized.publishedAt,
        },
        existingArticles,
      )

      if (duplicate) {
        await linkArticleSource(supabase, duplicate.article.id, source.id)
        result.duplicates++
        if (duplicate.type === 'title_similarity') {
          result.linked++
        }
        continue
      }

      const { data: inserted, error: insertError } = await supabase
        .from('articles')
        .insert(toArticleInsert(normalized, source))
        .select('id, canonical_url')
        .maybeSingle()

      if (insertError) {
        if (insertError.code === '23505') {
          const { data: existingByUrl } = await supabase
            .from('articles')
            .select('id, canonical_url, content_hash, normalized_title, title, published_at')
            .eq('canonical_url', normalized.canonicalUrl)
            .maybeSingle()

          const existing =
            existingByUrl ??
            (
              await supabase
                .from('articles')
                .select('id, canonical_url, content_hash, normalized_title, title, published_at')
                .eq('content_hash', normalized.contentHash)
                .maybeSingle()
            ).data

          if (existing) {
            existingArticles.push(existing as ExistingArticle)
            await linkArticleSource(supabase, existing.id, source.id)
            result.duplicates++
            continue
          }
        }

        result.errors.push(`Insert failed for ${normalized.canonicalUrl}: ${insertError.message}`)
        result.skipped++
        continue
      }

      if (!inserted) {
        result.skipped++
        continue
      }

      existingArticles.push({
        id: inserted.id,
        canonical_url: inserted.canonical_url,
        content_hash: normalized.contentHash,
        normalized_title: normalized.normalizedTitle,
        title: normalized.title,
        published_at: normalized.publishedAt,
      })

      await linkArticleSource(supabase, inserted.id, source.id)
      result.inserted++
    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : 'Unknown item error')
      result.skipped++
    }
  }

  if (result.errors.length === 0 || result.inserted > 0 || result.fetched > 0) {
    await recordSourceSuccess(supabase, source.id)
  } else if (result.errors.length > 0) {
    await recordSourceFailure(supabase, source, result.errors.join('; '))
  }

  result.durationMs = Date.now() - started
  return result
}

export async function runIngestion(supabase: SupabaseClient): Promise<IngestionRunResult> {
  const started = Date.now()

  const { data: cronRun, error: cronError } = await supabase
    .from('cron_runs')
    .insert({ job_name: JOB_NAME, status: 'running' })
    .select('id')
    .single()

  if (cronError || !cronRun) {
    throw new Error(`Failed to create cron run: ${cronError?.message ?? 'unknown'}`)
  }

  const sources = await loadActiveSources(supabase)
  let existingArticles = await loadRecentArticles(supabase)
  const sourceResults: SourceIngestionResult[] = []

  for (const source of sources) {
    try {
      const sourceResult = await ingestSource(supabase, source, existingArticles)
      sourceResults.push(sourceResult)
      existingArticles = await loadRecentArticles(supabase)
    } catch (error) {
      sourceResults.push({
        sourceId: source.id,
        sourceName: source.name,
        fetched: 0,
        inserted: 0,
        linked: 0,
        duplicates: 0,
        skipped: 0,
        errors: [error instanceof Error ? error.message : 'Source ingestion failed'],
        durationMs: 0,
      })
    }
  }

  const totals = sourceResults.reduce(
    (acc, r) => ({
      inserted: acc.inserted + r.inserted,
      linked: acc.linked + r.linked,
      duplicates: acc.duplicates + r.duplicates,
      skipped: acc.skipped + r.skipped,
      errors: acc.errors + r.errors.length,
    }),
    { inserted: 0, linked: 0, duplicates: 0, skipped: 0, errors: 0 },
  )

  const durationMs = Date.now() - started
  const status = totals.errors > 0 && totals.inserted === 0 ? 'failed' : 'completed'

  await supabase
    .from('cron_runs')
    .update({
      status,
      completed_at: new Date().toISOString(),
      items_processed: totals.inserted + totals.linked,
      error: totals.errors > 0 ? `${totals.errors} source-level errors` : null,
      metadata: { sourceResults },
    })
    .eq('id', cronRun.id)

  return {
    cronRunId: cronRun.id,
    sourcesProcessed: sources.length,
    totalInserted: totals.inserted,
    totalLinked: totals.linked,
    totalDuplicates: totals.duplicates,
    totalSkipped: totals.skipped,
    totalErrors: totals.errors,
    sourceResults,
    durationMs,
  }
}

export type { IngestionItemResult }

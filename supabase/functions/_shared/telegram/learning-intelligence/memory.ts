import type { SupabaseClient } from '@supabase/supabase-js'
import { normalizeTopic, topicKeywords } from './parse.ts'

export type LearningMemoryRow = {
  topic: string
  view_count: number
  interest_level: number
  last_command: string
  last_viewed_at: string
}

const INTEREST_BOOST_PER_VIEW = 5
const RELATED_TOPIC_BOOST = 5
const MAX_INTEREST = 100

export async function getUserLearningMemory(
  supabase: SupabaseClient,
  userId: string,
  limit = 10,
): Promise<LearningMemoryRow[]> {
  const { data, error } = await supabase
    .from('user_learning_memory')
    .select('topic, view_count, interest_level, last_command, last_viewed_at')
    .eq('user_id', userId)
    .order('interest_level', { ascending: false })
    .limit(limit)

  if (error) return []
  return (data ?? []) as LearningMemoryRow[]
}

export function buildMemoryNote(rows: LearningMemoryRow[], currentTopic: string): string {
  const normalized = normalizeTopic(currentTopic)
  const keywords = topicKeywords(currentTopic)
  const related = rows.filter((row) => {
    if (row.topic === normalized) return true
    return keywords.some((keyword) => row.topic.includes(keyword))
  })

  if (related.length === 0) return ''

  return related
    .map((row) => `${row.topic} (views: ${row.view_count}, interest: ${row.interest_level})`)
    .join('; ')
}

export async function recordLearningQuery(
  supabase: SupabaseClient,
  userId: string,
  topic: string,
  command: string,
): Promise<void> {
  const normalized = normalizeTopic(topic)
  if (!normalized) return

  const { data: existing } = await supabase
    .from('user_learning_memory')
    .select('view_count, interest_level')
    .eq('user_id', userId)
    .eq('topic', normalized)
    .maybeSingle()

  const viewCount = (existing?.view_count ?? 0) + 1
  const interestLevel = Math.min(
    MAX_INTEREST,
    (existing?.interest_level ?? 50) + INTEREST_BOOST_PER_VIEW,
  )

  await supabase.from('user_learning_memory').upsert(
    {
      user_id: userId,
      topic: normalized,
      last_command: command,
      view_count: viewCount,
      interest_level: interestLevel,
      last_viewed_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,topic' },
  )

  await boostRelatedTopics(supabase, userId, normalized)
}

async function boostRelatedTopics(
  supabase: SupabaseClient,
  userId: string,
  topic: string,
): Promise<void> {
  const keywords = topicKeywords(topic)
  if (keywords.length === 0) return

  const { data: rows } = await supabase
    .from('user_learning_memory')
    .select('topic, interest_level')
    .eq('user_id', userId)
    .neq('topic', topic)

  if (!rows?.length) return

  for (const row of rows) {
    const related = keywords.some((keyword) => row.topic.includes(keyword))
    if (!related) continue

    await supabase
      .from('user_learning_memory')
      .update({
        interest_level: Math.min(MAX_INTEREST, row.interest_level + RELATED_TOPIC_BOOST),
      })
      .eq('user_id', userId)
      .eq('topic', row.topic)
  }
}

export async function upsertLearningProgress(
  supabase: SupabaseClient,
  userId: string,
  topicTitle: string,
): Promise<void> {
  const { data: topic } = await supabase
    .from('learning_topics')
    .select('id')
    .ilike('title', topicTitle)
    .maybeSingle()

  if (!topic?.id) return

  const { data: existing } = await supabase
    .from('learning_progress')
    .select('progress, interest_level')
    .eq('user_id', userId)
    .eq('topic_id', topic.id)
    .maybeSingle()

  await supabase.from('learning_progress').upsert(
    {
      user_id: userId,
      topic_id: topic.id,
      progress: Math.min(100, (existing?.progress ?? 0) + 10),
      interest_level: Math.min(100, (existing?.interest_level ?? 50) + 5),
      last_viewed_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,topic_id' },
  )
}

import { getSupabaseClientOrNull } from '@/lib/supabase/client'
import type { FeedbackSignal } from '../types'

export async function fetchArticleFeedback(
  userId: string,
  articleId: string,
): Promise<FeedbackSignal[]> {
  const supabase = getSupabaseClientOrNull()
  if (!supabase) return []

  const { data, error } = await supabase
    .from('user_feedback')
    .select('signal')
    .eq('user_id', userId)
    .eq('article_id', articleId)

  if (error) throw new Error(error.message)
  return (data ?? []).map((row) => row.signal as FeedbackSignal)
}

export async function submitArticleFeedback(
  userId: string,
  articleId: string,
  signal: FeedbackSignal,
): Promise<void> {
  const supabase = getSupabaseClientOrNull()
  if (!supabase) throw new Error('Supabase not configured')

  const { error } = await supabase.from('user_feedback').upsert(
    { user_id: userId, article_id: articleId, signal },
    { onConflict: 'user_id,article_id,signal' },
  )

  if (error) throw new Error(error.message)
}

export async function removeConflictingFeedback(
  userId: string,
  articleId: string,
  signal: FeedbackSignal,
): Promise<void> {
  const supabase = getSupabaseClientOrNull()
  if (!supabase) return

  const opposites: Partial<Record<FeedbackSignal, FeedbackSignal[]>> = {
    relevant: ['dismiss', 'not_relevant', 'less_like_this'],
    dismiss: ['relevant', 'more_like_this'],
    more_like_this: ['less_like_this', 'not_relevant'],
    less_like_this: ['more_like_this', 'relevant'],
    not_relevant: ['relevant', 'more_like_this'],
  }

  const toRemove = opposites[signal] ?? []
  if (toRemove.length === 0) return

  await supabase
    .from('user_feedback')
    .delete()
    .eq('user_id', userId)
    .eq('article_id', articleId)
    .in('signal', toRemove)
}

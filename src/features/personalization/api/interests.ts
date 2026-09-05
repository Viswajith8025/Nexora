import { getSupabaseClientOrNull } from '@/lib/supabase/client'
import type { InterestType, UserInterest } from '@/types/database'

export async function fetchUserInterests(userId: string): Promise<UserInterest[]> {
  const supabase = getSupabaseClientOrNull()
  if (!supabase) return []

  const { data, error } = await supabase
    .from('user_interests')
    .select('*')
    .eq('user_id', userId)
    .order('interest_type')
    .order('value')

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function fetchFollowedTopics(userId: string): Promise<string[]> {
  const supabase = getSupabaseClientOrNull()
  if (!supabase) return []

  const { data, error } = await supabase
    .from('user_followed_topics')
    .select('topic')
    .eq('user_id', userId)
    .order('topic')

  if (error) throw new Error(error.message)
  return (data ?? []).map((row) => row.topic)
}

export async function upsertInterest(
  userId: string,
  interestType: InterestType,
  value: string,
  weight = 60,
): Promise<void> {
  const supabase = getSupabaseClientOrNull()
  if (!supabase) throw new Error('Supabase not configured')

  const { error } = await supabase.from('user_interests').upsert(
    { user_id: userId, interest_type: interestType, value, weight },
    { onConflict: 'user_id,interest_type,value' },
  )

  if (error) throw new Error(error.message)
}

export async function removeInterest(userId: string, interestId: string): Promise<void> {
  const supabase = getSupabaseClientOrNull()
  if (!supabase) throw new Error('Supabase not configured')

  const { error } = await supabase
    .from('user_interests')
    .delete()
    .eq('user_id', userId)
    .eq('id', interestId)

  if (error) throw new Error(error.message)
}

export async function replaceInterestsByType(
  userId: string,
  interestType: InterestType,
  values: string[],
): Promise<void> {
  const supabase = getSupabaseClientOrNull()
  if (!supabase) throw new Error('Supabase not configured')

  const { error: deleteError } = await supabase
    .from('user_interests')
    .delete()
    .eq('user_id', userId)
    .eq('interest_type', interestType)

  if (deleteError) throw new Error(deleteError.message)

  if (values.length === 0) return

  const { error: insertError } = await supabase.from('user_interests').insert(
    values.map((value) => ({
      user_id: userId,
      interest_type: interestType,
      value,
      weight: 60,
    })),
  )

  if (insertError) throw new Error(insertError.message)
}

export async function replaceFollowedTopics(userId: string, topics: string[]): Promise<void> {
  const supabase = getSupabaseClientOrNull()
  if (!supabase) throw new Error('Supabase not configured')

  const { error: deleteError } = await supabase
    .from('user_followed_topics')
    .delete()
    .eq('user_id', userId)

  if (deleteError) throw new Error(deleteError.message)

  if (topics.length === 0) return

  const { error: insertError } = await supabase.from('user_followed_topics').insert(
    topics.map((topic) => ({ user_id: userId, topic })),
  )

  if (insertError) throw new Error(insertError.message)
}

export async function saveInterestWeights(
  userId: string,
  interests: Array<{ id: string; weight: number }>,
): Promise<void> {
  const supabase = getSupabaseClientOrNull()
  if (!supabase) throw new Error('Supabase not configured')

  for (const interest of interests) {
    const { error } = await supabase
      .from('user_interests')
      .update({ weight: interest.weight })
      .eq('user_id', userId)
      .eq('id', interest.id)

    if (error) throw new Error(error.message)
  }
}

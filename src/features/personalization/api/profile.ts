import { getSupabaseClientOrNull } from '@/lib/supabase/client'
import type { Profile } from '@/types/database'

export type ProfileSettingsUpdate = Partial<
  Pick<
    Profile,
    | 'display_name'
    | 'timezone'
    | 'telegram_enabled'
    | 'gmail_enabled'
    | 'morning_digest_enabled'
    | 'evening_digest_enabled'
    | 'weekly_digest_enabled'
    | 'breaking_alerts_enabled'
    | 'quiet_hours_enabled'
    | 'quiet_hours_start'
    | 'quiet_hours_end'
    | 'morning_digest_hour'
    | 'evening_digest_hour'
    | 'notification_threshold'
  >
>

export async function updateProfileSettings(
  userId: string,
  updates: ProfileSettingsUpdate,
): Promise<void> {
  const supabase = getSupabaseClientOrNull()
  if (!supabase) throw new Error('Supabase not configured')

  const { error } = await supabase.from('profiles').update(updates).eq('id', userId)
  if (error) throw new Error(error.message)
}

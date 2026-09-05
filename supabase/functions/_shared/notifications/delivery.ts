import type { SupabaseClient } from '@supabase/supabase-js'
import type { TelegramClient } from '../telegram/client.ts'
import { splitTelegramMessage } from '../telegram/format.ts'
import type { DeliveryResult, NotificationType, UserDeliveryProfile } from './types.ts'
import { hasDeliveredDedupeKey } from './queries.ts'

export type DeliverNotificationInput = {
  supabase: SupabaseClient
  telegram: TelegramClient
  user: UserDeliveryProfile
  notificationType: NotificationType
  dedupeKey: string
  title: string
  body: string
  articleIds: string[]
  notificationLevel: 'breaking' | 'high' | 'normal' | 'low' | 'none'
  bypassQuietHours?: boolean
}

export async function deliverNotification(
  input: DeliverNotificationInput,
): Promise<DeliveryResult> {
  const { supabase, telegram, user, notificationType, dedupeKey } = input

  if (!user.telegram_enabled || !user.telegram_chat_id) {
    return { userId: user.id, sent: false, skipped: true, reason: 'telegram_not_linked' }
  }

  const alreadySent = await hasDeliveredDedupeKey(supabase, user.id, notificationType, dedupeKey)
  if (alreadySent) {
    return { userId: user.id, sent: false, skipped: true, reason: 'duplicate_dedupe_key' }
  }

  const { data: notification, error: insertError } = await supabase
    .from('notifications')
    .insert({
      user_id: user.id,
      channel: 'telegram',
      title: input.title,
      body: input.body,
      status: 'pending',
      notification_level: input.notificationLevel,
      notification_type: notificationType,
      dedupe_key: dedupeKey,
      metadata: { article_ids: input.articleIds },
    })
    .select('id')
    .single()

  if (insertError || !notification) {
    return {
      userId: user.id,
      sent: false,
      skipped: false,
      error: insertError?.message ?? 'Failed to create notification',
    }
  }

  try {
    const chunks = splitTelegramMessage(input.body)
    await telegram.sendMessages(user.telegram_chat_id, chunks)

    await supabase
      .from('notifications')
      .update({ status: 'sent', sent_at: new Date().toISOString() })
      .eq('id', notification.id)

    await supabase.from('notification_deliveries').insert({
      notification_id: notification.id,
      channel: 'telegram',
      status: 'success',
      response: { chunks: chunks.length },
    })

    return { userId: user.id, sent: true, skipped: false, notificationId: notification.id }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Delivery failed'

    await supabase
      .from('notifications')
      .update({ status: 'failed', error_message: message })
      .eq('id', notification.id)

    await supabase.from('notification_deliveries').insert({
      notification_id: notification.id,
      channel: 'telegram',
      status: 'failure',
      response: { error: message },
    })

    return { userId: user.id, sent: false, skipped: false, notificationId: notification.id, error: message }
  }
}

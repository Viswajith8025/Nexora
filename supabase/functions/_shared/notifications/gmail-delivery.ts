import type { SupabaseClient } from '@supabase/supabase-js'
import {
  buildDigestHtml,
  refreshGmailAccessToken,
  sendGmailMessage,
} from '../gmail/client.ts'
import type { NotificationType } from './types.ts'
import { hasDeliveredDedupeKey } from './queries.ts'

export type GmailDeliveryInput = {
  supabase: SupabaseClient
  userId: string
  email: string
  refreshToken: string
  notificationType: NotificationType
  dedupeKey: string
  title: string
  body: string
  articleIds: string[]
  clientId: string
  clientSecret: string
}

export async function deliverGmailNotification(
  input: GmailDeliveryInput,
): Promise<{ sent: boolean; skipped: boolean; reason?: string; error?: string }> {
  const dedupeKey = `${input.dedupeKey}:email`

  const alreadySent = await hasDeliveredDedupeKey(
    input.supabase,
    input.userId,
    input.notificationType,
    dedupeKey,
  )
  if (alreadySent) {
    return { sent: false, skipped: true, reason: 'duplicate_dedupe_key' }
  }

  const { data: notification, error: insertError } = await input.supabase
    .from('notifications')
    .insert({
      user_id: input.userId,
      channel: 'email',
      title: input.title,
      body: input.body,
      status: 'pending',
      notification_level: 'normal',
      notification_type: input.notificationType,
      dedupe_key: dedupeKey,
      metadata: { article_ids: input.articleIds },
    })
    .select('id')
    .single()

  if (insertError || !notification) {
    return { sent: false, skipped: false, error: insertError?.message ?? 'Failed to create notification' }
  }

  try {
    const accessToken = await refreshGmailAccessToken(
      input.refreshToken,
      input.clientId,
      input.clientSecret,
    )

    await sendGmailMessage({
      accessToken,
      to: input.email,
      subject: input.title,
      htmlBody: buildDigestHtml(input.title, input.body),
    })

    await input.supabase
      .from('notifications')
      .update({ status: 'sent', sent_at: new Date().toISOString() })
      .eq('id', notification.id)

    await input.supabase.from('notification_deliveries').insert({
      notification_id: notification.id,
      channel: 'email',
      status: 'success',
      response: { to: input.email },
    })

    await input.supabase
      .from('profiles')
      .update({ last_gmail_delivery_at: new Date().toISOString() })
      .eq('id', input.userId)

    return { sent: true, skipped: false }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Gmail delivery failed'

    await input.supabase
      .from('notifications')
      .update({ status: 'failed', error_message: message })
      .eq('id', notification.id)

    await input.supabase.from('notification_deliveries').insert({
      notification_id: notification.id,
      channel: 'email',
      status: 'failure',
      response: { error: message },
    })

    return { sent: false, skipped: false, error: message }
  }
}

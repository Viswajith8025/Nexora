import type { UserDeliveryProfile } from './types.ts'
import { getLocalTimeInfo } from './timezone.ts'

function parseTime(value: string | null): { hour: number; minute: number } | null {
  if (!value) return null
  const match = value.match(/^(\d{1,2}):(\d{2})/)
  if (!match) return null
  return { hour: Number(match[1]), minute: Number(match[2]) }
}

export function isQuietHours(
  profile: UserDeliveryProfile,
  date = new Date(),
): boolean {
  if (!profile.quiet_hours_enabled) return false

  const start = parseTime(profile.quiet_hours_start)
  const end = parseTime(profile.quiet_hours_end)
  if (!start || !end) return false

  const local = getLocalTimeInfo(profile.timezone, date)
  const currentMinutes = local.hour * 60 + local.minute
  const startMinutes = start.hour * 60 + start.minute
  const endMinutes = end.hour * 60 + end.minute

  if (startMinutes <= endMinutes) {
    return currentMinutes >= startMinutes && currentMinutes < endMinutes
  }

  return currentMinutes >= startMinutes || currentMinutes < endMinutes
}

export function canBypassQuietHours(isCritical: boolean): boolean {
  return isCritical
}

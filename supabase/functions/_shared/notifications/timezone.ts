export type LocalTimeInfo = {
  hour: number
  minute: number
  dateKey: string
  weekKey: string
  iso: string
}

export function getLocalTimeInfo(timezone: string, date = new Date()): LocalTimeInfo {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })

  const parts = formatter.formatToParts(date)
  const lookup = Object.fromEntries(parts.map((part) => [part.type, part.value]))

  const hour = Number(lookup.hour ?? 0)
  const minute = Number(lookup.minute ?? 0)
  const year = lookup.year ?? '0000'
  const month = lookup.month ?? '01'
  const day = lookup.day ?? '01'
  const dateKey = `${year}-${month}-${day}`

  const weekFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  const weekDate = new Date(`${dateKey}T12:00:00`)
  const dayOfWeek = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    weekday: 'short',
  }).format(weekDate)

  const weekKeys: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }
  const dow = weekKeys[dayOfWeek.slice(0, 3)] ?? 0
  const weekStart = new Date(weekDate)
  weekStart.setDate(weekDate.getDate() - dow)
  const weekKey = weekFormatter.format(weekStart).replace(/\//g, '-')

  return {
    hour,
    minute,
    dateKey,
    weekKey,
    iso: date.toISOString(),
  }
}

export function isDigestHour(localHour: number, targetHour: number): boolean {
  return localHour === targetHour
}

export function isWeeklyDigestDay(localInfo: LocalTimeInfo, targetHour: number): boolean {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC',
    weekday: 'short',
  })
  // Use date from dateKey - Sunday weekly digest
  const date = new Date(`${localInfo.dateKey}T12:00:00Z`)
  const weekday = formatter.format(date)
  return weekday.startsWith('Sun') && localInfo.hour === targetHour
}

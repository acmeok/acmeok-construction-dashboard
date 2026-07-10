const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

const CHICAGO_PARTS_FMT = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/Chicago',
  year: 'numeric', month: 'short', day: 'numeric',
  hour: 'numeric', minute: '2-digit', hour12: true,
})

// Formats any Date or ISO string into a consistent Chicago-timezone display string.
// Using formatToParts prevents browsers from inserting line-break-worthy whitespace
// around AM/PM, which some locales produce with toLocaleString.
export function formatDisplayTime(input) {
  if (!input) return null
  const d = typeof input === 'string' ? new Date(input) : input
  if (isNaN(d.getTime())) return null
  const parts = CHICAGO_PARTS_FMT.formatToParts(d)
  const get = (type) => parts.find((p) => p.type === type)?.value ?? ''
  const hour = get('hour')
  const minute = get('minute')
  const dayperiod = get('dayPeriod')
  const month = get('month')
  const day = get('day')
  const year = get('year')
  return `${month} ${day}, ${year}, ${hour}:${minute} ${dayperiod} CT`
}

// Parses the Chicago-formatted timestamp stored by n8n Acknowledge/Complete handlers:
// e.g. "June 30, 2026, 2:45 PM CDT" → a UTC-based Date object
export function parseChicagoTimestamp(str) {
  if (!str) return null
  const m = str.match(/(\w+)\s+(\d+),\s+(\d{4}),\s+(\d+):(\d{2})\s+(AM|PM)\s*(\w*)/)
  if (!m) return null
  const [, monthName, day, year, rawHour, min, ampm, tz] = m
  const monthIdx = MONTHS.indexOf(monthName)
  if (monthIdx === -1) return null
  let h = parseInt(rawHour, 10)
  if (ampm === 'PM' && h !== 12) h += 12
  if (ampm === 'AM' && h === 12) h = 0
  // CDT = UTC-5, CST = UTC-6; default 0 if unrecognised (graceful degradation)
  const tzOffsetMin = tz === 'CDT' ? -300 : tz === 'CST' ? -360 : 0
  const utcMs = Date.UTC(parseInt(year, 10), monthIdx, parseInt(day, 10), h, parseInt(min, 10))
  return new Date(utcMs - tzOffsetMin * 60000)
}

// Formats a millisecond duration into a compact human-readable string: "2h 15m", "45m", "3d 1h"
export function formatDuration(ms) {
  if (ms == null || isNaN(ms) || ms < 0) return '—'
  const totalMin = Math.round(ms / 60000)
  if (totalMin < 1) return '< 1m'
  const days = Math.floor(totalMin / 1440)
  const hours = Math.floor((totalMin % 1440) / 60)
  const mins = totalMin % 60
  const parts = []
  if (days) parts.push(`${days}d`)
  if (hours) parts.push(`${hours}h`)
  if (mins && !days) parts.push(`${mins}m`)
  return parts.join(' ') || '< 1m'
}

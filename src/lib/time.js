const TIME_ZONE = 'Europe/Istanbul'

const clockFormatter = new Intl.DateTimeFormat('tr-TR', {
  timeZone: TIME_ZONE,
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
})

const shortTimeFormatter = new Intl.DateTimeFormat('tr-TR', {
  timeZone: TIME_ZONE,
  hour: '2-digit',
  minute: '2-digit',
})

const dateFormatter = new Intl.DateTimeFormat('tr-TR', {
  timeZone: TIME_ZONE,
  day: '2-digit',
  month: 'long',
  weekday: 'long',
})

export function formatClock(date) {
  return clockFormatter.format(date)
}

export function formatShortTime(date) {
  return shortTimeFormatter.format(date)
}

export function formatDateLabel(date) {
  return dateFormatter.format(date)
}

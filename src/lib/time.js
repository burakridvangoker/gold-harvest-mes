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

/*
 * Türkiye 2016'dan beri yaz saati uygulamıyor; ofset yıl boyu sabit UTC+3.
 * Bu yüzden duvar saati ↔ epoch dönüşümü kütüphanesiz ve güvenli yapılabilir.
 * Cihazın saat dilimi yanlış ayarlıysa bile hat saatinde kalırız.
 */
const TR_OFFSET_MS = 3 * 60 * 60 * 1000

/** epoch → <input type="time"> değeri ("HH:MM"), hat saatinde. */
export function toTimeInputValue(ms) {
  const shifted = new Date(ms + TR_OFFSET_MS)
  const hours = String(shifted.getUTCHours()).padStart(2, '0')
  const minutes = String(shifted.getUTCMinutes()).padStart(2, '0')
  return `${hours}:${minutes}`
}

/**
 * "HH:MM" → epoch. Takvim günü baseMs'ten alınır, böylece gece vardiyasında
 * gün atlaması bozulmaz.
 */
export function fromTimeInputValue(baseMs, value) {
  const [hours, minutes] = String(value).split(':').map(Number)
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null

  const shifted = new Date(baseMs + TR_OFFSET_MS)
  shifted.setUTCHours(hours, minutes, 0, 0)
  return shifted.getTime() - TR_OFFSET_MS
}

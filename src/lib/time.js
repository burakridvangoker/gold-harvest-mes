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

/*
 * Vardiyaların saatleri sahada sabit ve bellidir — operatöre "ne zaman
 * başladı" diye sormaya gerek yok. Üçü de 8 saat.
 */
export const VARDIYA_SAATLERI = { 1: 7, 2: 15, 3: 23 }
export const VARDIYA_SURESI_MS = 8 * 60 * 60 * 1000

/**
 * Seçilen vardiyanın planlı başlangıcı. 3. vardiya gece yarısını geçtiği
 * için "bugünkü" saat henüz gelmediyse (ör. saat 02:00'de vardiya 3
 * açılıyorsa) bir gün geriye düşer — vardiya dün 23:00'te başlamıştır.
 */
export function vardiyaBaslangici(vardiyaNo, nowMs = Date.now()) {
  const saat = VARDIYA_SAATLERI[vardiyaNo]
  if (saat == null) return null

  const bugun = fromTimeInputValue(nowMs, `${String(saat).padStart(2, '0')}:00`)
  return bugun > nowMs ? bugun - 24 * 60 * 60 * 1000 : bugun
}

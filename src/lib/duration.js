/**
 * Plandan sapmayı okunur hale getirir. 90 dakikayı geçince saate çevrilir;
 * "182 dk geridesin" operatöre bir şey anlatmıyor, "3 sa 2 dk" anlatıyor.
 */
export function formatDelta(dakika) {
  const abs = Math.abs(Math.round(dakika))
  if (abs < 90) return `${abs} dk`

  const saat = Math.floor(abs / 60)
  const kalan = abs % 60
  return kalan === 0 ? `${saat} sa` : `${saat} sa ${kalan} dk`
}

export function formatDuration(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  const pad = (n) => String(n).padStart(2, '0')
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
}

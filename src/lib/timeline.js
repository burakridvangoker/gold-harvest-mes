/*
 * Zaman çizelgesi türetme katmanı.
 *
 * Süreler hiçbir yerde saklanmaz. timeline_events yalnızca durumun BAŞLADIĞI
 * anları tutar; aralıklar burada türetilir. Bunun sebebi operatörün olayı
 * sonradan girebilmesi: "7:30'da başladı ama 7:35'te girdim" durumunda saat
 * geriye çekilince tüm toplamlar kendiliğinden doğru hale gelir.
 *
 * Buradaki her şey saf fonksiyon — girdi verilir, çıktı alınır, yan etki yok.
 */

const SAAT_MS = 60 * 60 * 1000
const DAKIKA_MS = 60 * 1000

export function toMs(value) {
  if (value == null) return null
  if (typeof value === 'number') return value
  return new Date(value).getTime()
}

/** Olayları zamana göre sıralar. Girdiyi değiştirmez. */
export function sortEvents(events) {
  return [...events].sort((a, b) => toMs(a.at) - toMs(b.at))
}

/**
 * Geçiş noktalarından aralık üretir. Her olay bir sonraki olayın anında
 * biter; son olay hâlâ sürüyordur ve endMs'te (vardiya bitişi ya da şimdi)
 * kapanır.
 */
export function buildIntervals(events, endMs = Date.now()) {
  const sorted = sortEvents(events)

  return sorted.map((event, index) => {
    const startMs = toMs(event.at)
    const rawEnd = index + 1 < sorted.length ? toMs(sorted[index + 1].at) : endMs
    const ongoing = index + 1 === sorted.length

    return {
      eventId: event.id,
      kind: event.kind,
      productRunId: event.product_run_id ?? null,
      note: event.note ?? null,
      startMs,
      endMs: Math.max(startMs, rawEnd),
      ongoing,
      durationMs: Math.max(0, rawEnd - startMs),
    }
  })
}

function emptyTotals() {
  return { uretimMs: 0, durusMs: 0 }
}

/** Ürün çalışması başına üretim/duruş süresi. Anahtar: product_run_id. */
export function totalsByRun(intervals) {
  const map = new Map()

  for (const interval of intervals) {
    const key = interval.productRunId
    const current = map.get(key) ?? emptyTotals()

    if (interval.kind === 'uretim') current.uretimMs += interval.durationMs
    else current.durusMs += interval.durationMs

    map.set(key, current)
  }

  return map
}

/** Vardiya geneli. Makinenin toplam verimi buradan okunur. */
export function shiftTotals(intervals) {
  const totals = intervals.reduce((acc, interval) => {
    if (interval.kind === 'uretim') acc.uretimMs += interval.durationMs
    else acc.durusMs += interval.durationMs
    return acc
  }, emptyTotals())

  const toplamMs = totals.uretimMs + totals.durusMs

  return {
    ...totals,
    toplamMs,
    zamanKullanimi: toplamMs > 0 ? totals.uretimMs / toplamMs : 0,
  }
}

/**
 * Anlık durum olay kaydından türetilir; ayrıca saklanmaz. Böylece geçmiş
 * düzenlendiğinde durum ile kayıt arasında tutarsızlık oluşamaz.
 */
export function currentState(events) {
  const sorted = sortEvents(events)
  const last = sorted[sorted.length - 1]

  if (!last) return 'beklemede'
  return last.kind === 'uretim' ? 'uretimde' : 'durdu'
}

/** Son olay ve ne zamandır sürdüğü — operatör panelindeki büyük sayaç. */
export function currentInterval(events, nowMs = Date.now()) {
  const intervals = buildIntervals(events, nowMs)
  return intervals[intervals.length - 1] ?? null
}

/**
 * Bir olayın saati hangi aralığa çekilebilir. Komşularını geçerse sıra
 * bozulur, o yüzden pencere komşularla sınırlanır.
 *
 * Dönen değerlerde null = sınırsız.
 */
export function validEditWindow(events, eventId, { shiftStartMs = null, nowMs = Date.now() } = {}) {
  const sorted = sortEvents(events)
  const index = sorted.findIndex((event) => event.id === eventId)

  if (index === -1) return { minMs: shiftStartMs, maxMs: nowMs }

  const previous = sorted[index - 1]
  const next = sorted[index + 1]

  return {
    minMs: previous ? toMs(previous.at) : shiftStartMs,
    /* Gelecek saat girilemez; son olaysa tavan "şimdi". */
    maxMs: next ? toMs(next.at) : nowMs,
  }
}

/** Yeni olay eklenirken kullanılabilecek pencere (hep en sona eklenir). */
export function newEventWindow(events, { shiftStartMs = null, nowMs = Date.now() } = {}) {
  const sorted = sortEvents(events)
  const last = sorted[sorted.length - 1]

  return {
    minMs: last ? toMs(last.at) : shiftStartMs,
    maxMs: nowMs,
  }
}

export function clampToWindow(ms, { minMs, maxMs }) {
  let value = ms
  if (minMs != null && value < minMs) value = minMs
  if (maxMs != null && value > maxMs) value = maxMs
  return value
}

/* ---- Palet ve koli ---- */

export function palletTotals(pallets) {
  return pallets.reduce(
    (acc, pallet) => {
      acc.paletAdedi += 1
      acc.koliAdedi += pallet.koli_count ?? 0
      return acc
    },
    { paletAdedi: 0, koliAdedi: 0 },
  )
}

export function palletTotalsByRun(pallets) {
  const map = new Map()

  for (const pallet of pallets) {
    const key = pallet.product_run_id
    const current = map.get(key) ?? { paletAdedi: 0, koliAdedi: 0 }
    current.paletAdedi += 1
    current.koliAdedi += pallet.koli_count ?? 0
    map.set(key, current)
  }

  return map
}

/** Paket, koli üzerinden türetilir: koli adedi × koli içi adet. */
export function koliToPaket(koliAdedi, koliIciAdet) {
  if (!koliIciAdet) return null
  return koliAdedi * koliIciAdet
}

/* ---- Plan takibi ---- */

/**
 * "Hızlanmam gerekiyor mu?" sorusunun cevabı.
 *
 * Plana göre şu ana kadar kaç koli beklendiğini hesaplar ve aradaki farkı
 * dakikaya çevirir: "18 dk öndesin" / "25 dk geridesin".
 *
 * Anlık hız üzerinden ileri projeksiyon yapmak vardiyanın başında çok
 * oynak sonuç veriyor (ilk 5 dakikada 0 koli varken "sonsuz geride"),
 * bu yüzden beklenen-gerçekleşen farkı kullanılıyor.
 */
export function paceStatus({
  hedefKoli,
  uretilenKoli,
  shiftStartMs,
  shiftEndMs,
  nowMs = Date.now(),
}) {
  if (!hedefKoli || !shiftStartMs || !shiftEndMs || shiftEndMs <= shiftStartMs) {
    return null
  }

  const vardiyaMs = shiftEndMs - shiftStartMs
  const gecenMs = Math.min(Math.max(0, nowMs - shiftStartMs), vardiyaMs)
  const kalanMs = Math.max(0, shiftEndMs - nowMs)

  const kalanKoli = Math.max(0, hedefKoli - uretilenKoli)
  const planHizKoliSaat = hedefKoli / (vardiyaMs / SAAT_MS)
  const beklenenKoli = hedefKoli * (gecenMs / vardiyaMs)
  const farkKoli = uretilenKoli - beklenenKoli

  const mevcutHizKoliSaat = gecenMs > 0 ? uretilenKoli / (gecenMs / SAAT_MS) : 0
  const gerekenHizKoliSaat = kalanMs > 0 ? kalanKoli / (kalanMs / SAAT_MS) : null

  const farkDk = planHizKoliSaat > 0 ? (farkKoli / planHizKoliSaat) * 60 : 0

  let durum = 'planinda'
  if (kalanKoli === 0) durum = 'tamam'
  else if (farkDk >= 5) durum = 'onde'
  else if (farkDk <= -5) durum = 'geride'

  return {
    hedefKoli,
    uretilenKoli,
    kalanKoli,
    beklenenKoli,
    farkKoli,
    farkDk,
    durum,
    ilerleme: Math.min(1, uretilenKoli / hedefKoli),
    planHizKoliSaat,
    mevcutHizKoliSaat,
    gerekenHizKoliSaat,
    kalanMs,
  }
}

/**
 * Gerçekleşen paket hızının hedef hıza oranı. Duruşlar hariç, yalnızca
 * makinenin çalıştığı süre üzerinden.
 */
export function hizVerimi({ paketAdedi, uretimMs, hedefHizPktDk }) {
  if (!hedefHizPktDk || !uretimMs || !paketAdedi) return null

  const mevcutPktDk = paketAdedi / (uretimMs / DAKIKA_MS)
  return { mevcutPktDk, hedefPktDk: hedefHizPktDk, oran: mevcutPktDk / hedefHizPktDk }
}

/* ---- Duruş notları ---- */

/**
 * Sık kullanılan duruş notları. Operatöre tek dokunuşluk çip olarak sunulur.
 *
 * Kullanıcının "günler geçtikçe tekrarlanma ve önem derecesine göre koda
 * dönüşecek" dediği şey buradan doğuyor: notlar tekrarlandıkça yukarı
 * çıkıyor, elle katalog yönetimi gerekmiyor.
 */
export function frequentNotes(events, limit = 6) {
  const counts = new Map()

  for (const event of events) {
    const note = (event.note ?? '').trim()
    if (!note) continue

    const key = note.toLocaleLowerCase('tr')
    const current = counts.get(key) ?? { note, adet: 0, sonKullanimMs: 0 }
    current.adet += 1
    current.sonKullanimMs = Math.max(current.sonKullanimMs, toMs(event.at) ?? 0)
    counts.set(key, current)
  }

  return Array.from(counts.values())
    .sort((a, b) => b.adet - a.adet || b.sonKullanimMs - a.sonKullanimMs)
    .slice(0, limit)
}

/** Duruş sebeplerinin süreye göre dökümü — müdür panosu için. */
export function downtimeByNote(intervals, limit = 5) {
  const totals = new Map()

  for (const interval of intervals) {
    if (interval.kind !== 'durus') continue

    const note = (interval.note ?? '').trim()
    const key = note || '__yok__'
    const current = totals.get(key) ?? { note: note || null, ms: 0, adet: 0 }
    current.ms += interval.durationMs
    current.adet += 1
    totals.set(key, current)
  }

  return Array.from(totals.values())
    .sort((a, b) => b.ms - a.ms)
    .slice(0, limit)
}

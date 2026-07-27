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
  return { uretimMs: 0, durusMs: 0, molaMs: 0 }
}

/**
 * Bir aralığın süresini doğru kovaya ekler. Mola, duruş SAYILMAZ — planlı bir
 * mola makinenin "açık kalma" performansını düşürüyormuş gibi görünmesin diye
 * ayrı tutuluyor (bkz. shiftTotals'taki toplamMs).
 */
function addToTotals(totals, interval) {
  if (interval.kind === 'uretim') totals.uretimMs += interval.durationMs
  else if (interval.kind === 'mola') totals.molaMs += interval.durationMs
  else totals.durusMs += interval.durationMs
  return totals
}

/** Ürün çalışması başına üretim/duruş/mola süresi. Anahtar: product_run_id. */
export function totalsByRun(intervals) {
  const map = new Map()

  for (const interval of intervals) {
    const key = interval.productRunId
    map.set(key, addToTotals(map.get(key) ?? emptyTotals(), interval))
  }

  return map
}

/**
 * Vardiya geneli. Makinenin toplam verimi buradan okunur. Mola, açık kalma
 * oranının paydasına (toplamMs) hiç girmez — bilinçli karar: 3 planlı mola
 * yüzünden oran hep düşük görünmesin, mola gerçek "çalışma dışı" zaman değil.
 */
export function shiftTotals(intervals) {
  const totals = intervals.reduce(addToTotals, emptyTotals())
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
  if (last.kind === 'uretim') return 'uretimde'
  if (last.kind === 'mola') return 'molada'
  return 'durdu'
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

/**
 * Ürün başına başlangıç/bitiş anı. Ürün geçmişi kartları buradan besleniyor:
 * bir ürünün ilk olayından son aralığının bitişine kadar. Aynı ürüne geri
 * dönülürse (A→B→A) aralar dahil değil, sadece en erken başlangıç ve en geç
 * bitiş — "bu ürünle ne zaman ilk/son ilgilenildi" sorusuna cevap.
 */
export function runSpans(events, nowMs = Date.now()) {
  const intervals = buildIntervals(events, nowMs)
  const map = new Map()

  for (const interval of intervals) {
    const key = interval.productRunId
    if (key == null) continue

    const current = map.get(key) ?? { startMs: interval.startMs, endMs: interval.endMs, ongoing: false }
    current.startMs = Math.min(current.startMs, interval.startMs)
    current.endMs = Math.max(current.endMs, interval.endMs)
    if (interval.ongoing) current.ongoing = true
    map.set(key, current)
  }

  return map
}

/**
 * Vardiyayı mola başlangıçlarına göre bölümlere ayırır. N mola varsa N+1
 * bölüm çıkar (3 mola → 4 bölüm, hiç mola yoksa tek bölüm = vardiyanın
 * tamamı). Müdür panosunda "tüm vardiya alt alta" yerine bölümler yan yana
 * gösterilsin diye — her bölümün kendi olay listesi olur.
 */
export function shiftSegments(events, { shiftStartMs, endMs = Date.now() }) {
  if (shiftStartMs == null) return []

  const molaStarts = sortEvents(events)
    .filter((event) => event.kind === 'mola')
    .map((event) => toMs(event.at))

  const bounds = [shiftStartMs, ...molaStarts, Math.max(shiftStartMs, endMs)]

  return bounds.slice(0, -1).map((startMs, index) => ({
    index: index + 1,
    startMs,
    endMs: bounds[index + 1],
  }))
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

/* ---- Ambalaj firesi ---- */

/**
 * Ürün üretimi bitince operatörden dolu/boş paket numaratör bitişi alınır.
 * Fark, üretilen paket adediyle karşılaştırılır: aradaki eksik dolu pakette
 * kaybolmuştur (dolu fire). Boş paket farkı da kullanılmayıp atılan/artan
 * ambalajdır. İkisinin toplamı ambalaj firesi — grama çevirmek için boş
 * paket ağırlığıyla çarpılır.
 */
export function packagingWaste({
  doluBaslangic,
  doluBitis,
  bosBaslangic,
  bosBitis,
  toplamPaket,
  bosPaketAgirlikG,
}) {
  if (doluBaslangic == null || doluBitis == null || bosBaslangic == null || bosBitis == null) {
    return null
  }

  const doluFark = doluBitis - doluBaslangic
  const bosFark = bosBitis - bosBaslangic
  const doluFire = doluFark - (toplamPaket ?? 0)
  const ambalajFireAdet = doluFire + bosFark
  const ambalajFireGram = bosPaketAgirlikG ? ambalajFireAdet * bosPaketAgirlikG : null

  return { doluFark, bosFark, doluFire, ambalajFireAdet, ambalajFireGram }
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

/** Bir oranı andon renk sınıfına çevirir — iyi/orta/kötü eşiği. */
export function seviyeDurumu(oran, { iyi = 0.85, kotu = 0.6 } = {}) {
  if (oran == null) return null
  if (oran >= iyi) return 'iyi'
  if (oran < kotu) return 'kotu'
  return 'orta'
}

/**
 * Duruş sebeplerinin süreye göre dökümü — müdür panosu için. Varsayılan
 * limitsiz: sayfa kaydırılabilir olduğu için hiçbir sebep gizlenmesin,
 * hepsi görünsün (en çok süreye sahip en üstte).
 */
export function downtimeByNote(intervals, limit = Infinity) {
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

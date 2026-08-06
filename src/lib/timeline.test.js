import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  aktifUrun,
  buildIntervals,
  assignLanes,
  clampToWindow,
  currentState,
  downtimeByNote,
  frequentNotes,
  groupSegmentsByEvent,
  hizVerimi,
  packagingWaste,
  paceStatus,
  palletTotals,
  palletTotalsByRun,
  runSpans,
  seviyeDurumu,
  shiftPaket,
  shiftSegments,
  shiftTotals,
  totalsByRun,
  validEditWindow,
} from './timeline.js'

const T = (saat, dakika) => new Date(Date.UTC(2026, 6, 26, saat, dakika)).toISOString()
const ms = (iso) => new Date(iso).getTime()
const DK = 60 * 1000

/* 07:30 üretim → 09:00 duruş → 09:20 üretim, "şimdi" 10:00 */
function ornekOlaylar() {
  return [
    { id: 'a', at: T(7, 30), kind: 'uretim', product_run_id: 'urun-1', note: null },
    { id: 'b', at: T(9, 0), kind: 'durus', product_run_id: 'urun-1', note: 'Bobin değişimi' },
    { id: 'c', at: T(9, 20), kind: 'uretim', product_run_id: 'urun-1', note: null },
  ]
}

const SIMDI = ms(T(10, 0))

describe('buildIntervals', () => {
  it('geçiş noktalarından bitişik aralık üretir, boşluk bırakmaz', () => {
    const intervals = buildIntervals(ornekOlaylar(), SIMDI)

    assert.equal(intervals.length, 3)
    assert.equal(intervals[0].durationMs, 90 * DK)
    assert.equal(intervals[1].durationMs, 20 * DK)
    assert.equal(intervals[2].durationMs, 40 * DK)

    // Her aralık bir sonrakinin başladığı anda biter
    assert.equal(intervals[0].endMs, intervals[1].startMs)
    assert.equal(intervals[1].endMs, intervals[2].startMs)
  })

  it('son aralık sürüyor olarak işaretlenir', () => {
    const intervals = buildIntervals(ornekOlaylar(), SIMDI)

    assert.equal(intervals[2].ongoing, true)
    assert.equal(intervals[0].ongoing, false)
  })

  it('sırasız gelen olayları zamana göre sıralar', () => {
    const karisik = [ornekOlaylar()[2], ornekOlaylar()[0], ornekOlaylar()[1]]
    const intervals = buildIntervals(karisik, SIMDI)

    assert.deepEqual(
      intervals.map((i) => i.eventId),
      ['a', 'b', 'c'],
    )
  })

  it('boş olay listesinde boş dizi döner', () => {
    assert.deepEqual(buildIntervals([], SIMDI), [])
  })
})

describe('geriye dönük düzeltme', () => {
  it('duruş saati geri çekilince toplamlar kendiliğinden düzelir', () => {
    const once = shiftTotals(buildIntervals(ornekOlaylar(), SIMDI))
    assert.equal(once.uretimMs, 130 * DK) // 90 + 40
    assert.equal(once.durusMs, 20 * DK)

    // Operatör: "duruş aslında 08:55'te başlamıştı"
    const duzeltilmis = ornekOlaylar().map((event) =>
      event.id === 'b' ? { ...event, at: T(8, 55) } : event,
    )

    const sonra = shiftTotals(buildIntervals(duzeltilmis, SIMDI))
    assert.equal(sonra.uretimMs, 125 * DK) // 85 + 40
    assert.equal(sonra.durusMs, 25 * DK)

    // Toplam süre değişmez, sadece üretim/duruş dağılımı kayar
    assert.equal(once.toplamMs, sonra.toplamMs)
  })

  it('olay silinince iki aralık birleşir', () => {
    // Duruş kaydı yanlışlıkla girilmişti, silindi
    const silinmis = ornekOlaylar().filter((event) => event.id !== 'b')
    const intervals = buildIntervals(silinmis, SIMDI)

    assert.equal(intervals.length, 2)
    // 07:30 → 09:20 tek üretim aralığı oldu
    assert.equal(intervals[0].durationMs, 110 * DK)

    const totals = shiftTotals(intervals)
    assert.equal(totals.durusMs, 0)
    assert.equal(totals.uretimMs, 150 * DK)
  })
})

describe('ürüne geri dönüş (A → B → A)', () => {
  const olaylar = [
    { id: '1', at: T(7, 0), kind: 'uretim', product_run_id: 'A' },
    { id: '2', at: T(8, 0), kind: 'uretim', product_run_id: 'B' },
    { id: '3', at: T(8, 30), kind: 'uretim', product_run_id: 'A' },
  ]

  it('aynı ürünün parçalarını toplar', () => {
    const totals = totalsByRun(buildIntervals(olaylar, ms(T(9, 0))))

    // A: 07:00-08:00 (60dk) + 08:30-09:00 (30dk)
    assert.equal(totals.get('A').uretimMs, 90 * DK)
    assert.equal(totals.get('B').uretimMs, 30 * DK)
  })

  it('vardiya geneli ürünlerin toplamına eşittir', () => {
    const intervals = buildIntervals(olaylar, ms(T(9, 0)))
    const genel = shiftTotals(intervals)
    const perRun = totalsByRun(intervals)

    const toplam = [...perRun.values()].reduce((acc, t) => acc + t.uretimMs, 0)
    assert.equal(genel.uretimMs, toplam)
  })
})

describe('currentState', () => {
  it('olay yoksa beklemede', () => {
    assert.equal(currentState([]), 'beklemede')
  })

  it('son olay üretimse üretimde', () => {
    assert.equal(currentState(ornekOlaylar()), 'uretimde')
  })

  it('son olay duruşsa durdu', () => {
    assert.equal(currentState(ornekOlaylar().slice(0, 2)), 'durdu')
  })

  it('sıralama bozuk gelse de son olaya bakar', () => {
    const karisik = [ornekOlaylar()[2], ornekOlaylar()[0], ornekOlaylar()[1]]
    assert.equal(currentState(karisik), 'uretimde')
  })

  it('son olay molaysa molada', () => {
    const olaylar = [...ornekOlaylar(), { id: 'd', at: T(9, 30), kind: 'mola' }]
    assert.equal(currentState(olaylar), 'molada')
  })
})

describe('mola: açık kalma oranına girmez', () => {
  it('molaMs ayrı tutulur, toplamMs (payda) mola içermez', () => {
    // 07:00 üretim (60dk) → 08:00 mola (15dk) → 08:15 üretim (45dk), şimdi 09:00
    const olaylar = [
      { id: '1', at: T(7, 0), kind: 'uretim' },
      { id: '2', at: T(8, 0), kind: 'mola' },
      { id: '3', at: T(8, 15), kind: 'uretim' },
    ]
    const totals = shiftTotals(buildIntervals(olaylar, ms(T(9, 0))))

    assert.equal(totals.uretimMs, 105 * DK) // 60 + 45
    assert.equal(totals.molaMs, 15 * DK)
    assert.equal(totals.durusMs, 0)
    // Payda mola hariç: 105dk üretim / 105dk toplam = %100, mola hiç düşürmüyor
    assert.equal(totals.toplamMs, 105 * DK)
    assert.equal(totals.zamanKullanimi, 1)
  })
})

describe('aktifUrun', () => {
  const urunler = [
    { id: 'r1', urun_adi: 'Kuru üzüm' },
    { id: 'r2', urun_adi: 'Natura karışık' },
  ]

  it('son olayın işaret ettiği ürünü verir', () => {
    const olaylar = [
      { id: '1', at: T(7, 0), kind: 'durus', product_run_id: null },
      { id: '2', at: T(7, 30), kind: 'uretim', product_run_id: 'r1' },
    ]
    assert.equal(aktifUrun(olaylar, urunler)?.id, 'r1')
  })

  it('ürün bitirilince (son olay ürünsüz) aktif ürün kalmaz', () => {
    const olaylar = [
      { id: '1', at: T(7, 0), kind: 'durus', product_run_id: null },
      { id: '2', at: T(7, 30), kind: 'uretim', product_run_id: 'r1' },
      { id: '3', at: T(11, 0), kind: 'durus', product_run_id: null, note: 'Ürün bitişi' },
    ]
    assert.equal(aktifUrun(olaylar, urunler), null)
  })

  it('yeni ürüne geçilince aktif ürün yenisidir', () => {
    const olaylar = [
      { id: '1', at: T(7, 30), kind: 'uretim', product_run_id: 'r1' },
      { id: '2', at: T(11, 0), kind: 'durus', product_run_id: null },
      { id: '3', at: T(11, 20), kind: 'uretim', product_run_id: 'r2' },
    ]
    assert.equal(aktifUrun(olaylar, urunler)?.id, 'r2')
  })

  it('sıralama bozuk gelse de son olaya bakar', () => {
    const olaylar = [
      { id: '2', at: T(11, 0), kind: 'durus', product_run_id: null },
      { id: '1', at: T(7, 30), kind: 'uretim', product_run_id: 'r1' },
    ]
    assert.equal(aktifUrun(olaylar, urunler), null)
  })

  it('hiç olay yoksa son ürüne düşer', () => {
    assert.equal(aktifUrun([], urunler)?.id, 'r2')
    assert.equal(aktifUrun([], []), null)
  })
})

describe('shiftSegments', () => {
  it('mola yoksa tek bölüm döner', () => {
    const segments = shiftSegments([], { shiftStartMs: ms(T(7, 0)), endMs: ms(T(15, 0)) })
    assert.equal(segments.length, 1)
    assert.equal(segments[0].startMs, ms(T(7, 0)))
    assert.equal(segments[0].endMs, ms(T(15, 0)))
  })

  it('3 mola 4 bölüm çıkarır', () => {
    const olaylar = [
      { id: '1', at: T(9, 0), kind: 'mola' },
      { id: '2', at: T(11, 0), kind: 'mola' },
      { id: '3', at: T(13, 0), kind: 'mola' },
    ]
    const segments = shiftSegments(olaylar, { shiftStartMs: ms(T(7, 0)), endMs: ms(T(15, 0)) })

    assert.equal(segments.length, 4)
    assert.deepEqual(
      segments.map((s) => s.index),
      [1, 2, 3, 4],
    )
    assert.equal(segments[0].startMs, ms(T(7, 0)))
    assert.equal(segments[0].endMs, ms(T(9, 0)))
    assert.equal(segments[3].startMs, ms(T(13, 0)))
    assert.equal(segments[3].endMs, ms(T(15, 0)))
  })
})

describe('validEditWindow', () => {
  it('ortadaki olayı komşularıyla sınırlar', () => {
    const pencere = validEditWindow(ornekOlaylar(), 'b', { nowMs: SIMDI })

    assert.equal(pencere.minMs, ms(T(7, 30)))
    assert.equal(pencere.maxMs, ms(T(9, 20)))
  })

  it('son olayın tavanı şimdidir, gelecek girilemez', () => {
    const pencere = validEditWindow(ornekOlaylar(), 'c', { nowMs: SIMDI })

    assert.equal(pencere.minMs, ms(T(9, 0)))
    assert.equal(pencere.maxMs, SIMDI)
  })

  it('ilk olayın tabanı vardiya başlangıcıdır', () => {
    const shiftStartMs = ms(T(7, 0))
    const pencere = validEditWindow(ornekOlaylar(), 'a', { shiftStartMs, nowMs: SIMDI })

    assert.equal(pencere.minMs, shiftStartMs)
  })

  it('clampToWindow pencere dışını içeri çeker', () => {
    const pencere = { minMs: 100, maxMs: 200 }

    assert.equal(clampToWindow(50, pencere), 100)
    assert.equal(clampToWindow(250, pencere), 200)
    assert.equal(clampToWindow(150, pencere), 150)
  })
})

describe('paceStatus', () => {
  const shiftStartMs = ms(T(8, 0))
  const shiftEndMs = ms(T(16, 0)) // 8 saatlik vardiya
  const ortasi = ms(T(12, 0)) // yarısı geçti

  it('planın yarısında hedefin yarısı üretilmişse planında', () => {
    const pace = paceStatus({
      hedefKoli: 750,
      uretilenKoli: 375,
      shiftStartMs,
      shiftEndMs,
      nowMs: ortasi,
    })

    assert.equal(pace.durum, 'planinda')
    assert.equal(Math.round(pace.farkDk), 0)
    assert.equal(pace.kalanKoli, 375)
  })

  it('geride kalmayı dakikaya çevirir', () => {
    const pace = paceStatus({
      hedefKoli: 750,
      uretilenKoli: 300,
      shiftStartMs,
      shiftEndMs,
      nowMs: ortasi,
    })

    assert.equal(pace.durum, 'geride')
    // 75 koli eksik, plan hızı 750/8sa ≈ 93.75 koli/sa → ~48 dk geride
    assert.equal(Math.round(pace.farkDk), -48)
  })

  it('önde olmayı tespit eder', () => {
    const pace = paceStatus({
      hedefKoli: 750,
      uretilenKoli: 450,
      shiftStartMs,
      shiftEndMs,
      nowMs: ortasi,
    })

    assert.equal(pace.durum, 'onde')
    assert.ok(pace.farkDk > 0)
  })

  it('hedef tamamlandıysa tamam der', () => {
    const pace = paceStatus({
      hedefKoli: 750,
      uretilenKoli: 780,
      shiftStartMs,
      shiftEndMs,
      nowMs: ortasi,
    })

    assert.equal(pace.durum, 'tamam')
    assert.equal(pace.kalanKoli, 0)
  })

  it('hedef yoksa hesap yapmaz', () => {
    assert.equal(
      paceStatus({ hedefKoli: null, uretilenKoli: 10, shiftStartMs, shiftEndMs, nowMs: ortasi }),
      null,
    )
  })
})

describe('palet ve koli', () => {
  it('paletlerin kendi koli adedini toplar', () => {
    // Standart 100'lük paletler, sonuncusu yarım kalmış
    const pallets = [
      { id: '1', product_run_id: 'A', koli_count: 100 },
      { id: '2', product_run_id: 'A', koli_count: 100 },
      { id: '3', product_run_id: 'A', koli_count: 60 },
    ]

    assert.deepEqual(palletTotals(pallets), { paletAdedi: 3, koliAdedi: 260 })
  })

  it('shiftPaket her ürünü kendi koli içi adediyle çarpıp toplar', () => {
    // Yaşanmış hata: tek bir koli_ici_adet (aktif ürününki) tüm koliye
    // uygulanıyordu — 30 koli kuru üzüm (koli içi 7) + natura henüz 0
    // koli iken toplam 210 değil aktif ürünün 12'siyle 360 çıkıyordu.
    const runs = [
      { id: 'A', koli_ici_adet: 7 },
      { id: 'B', koli_ici_adet: 12 },
    ]
    const pallets = [{ id: '1', product_run_id: 'A', koli_count: 30 }]
    const paletlerByRun = palletTotalsByRun(pallets)

    assert.equal(shiftPaket(runs, paletlerByRun), 210)
  })
})

describe('runSpans', () => {
  it('ürünün ilk başlangıcından son bitişine kadarki aralığı verir', () => {
    // A: 07:00-08:00, B: 08:00-08:30, A: 08:30-09:00 (hâlâ sürüyor)
    const olaylar = [
      { id: '1', at: T(7, 0), kind: 'uretim', product_run_id: 'A' },
      { id: '2', at: T(8, 0), kind: 'uretim', product_run_id: 'B' },
      { id: '3', at: T(8, 30), kind: 'uretim', product_run_id: 'A' },
    ]

    const spans = runSpans(olaylar, ms(T(9, 0)))

    assert.equal(spans.get('A').startMs, ms(T(7, 0)))
    assert.equal(spans.get('A').endMs, ms(T(9, 0)))
    assert.equal(spans.get('A').ongoing, true)

    assert.equal(spans.get('B').startMs, ms(T(8, 0)))
    assert.equal(spans.get('B').endMs, ms(T(8, 30)))
    assert.equal(spans.get('B').ongoing, false)
  })
})

describe('packagingWaste', () => {
  it('dolu ve boş paket farkından ambalaj firesini hesaplar', () => {
    // 1000 paket üretildi (koli×koli_ici_adet). Dolu numaratör 1004 ilerledi
    // (4 dolu paket kayıp), boş numaratör 6 ilerledi (6 boş paket kullanıldı
    // ama dolamadı/atıldı). Ambalaj firesi = 4 + 6 = 10 adet, her biri 3g → 30g.
    const sonuc = packagingWaste({
      doluBaslangic: 10000,
      doluBitis: 11004,
      bosBaslangic: 5000,
      bosBitis: 5006,
      toplamPaket: 1000,
      bosPaketAgirlikG: 3,
    })

    assert.equal(sonuc.doluFark, 1004)
    assert.equal(sonuc.bosFark, 6)
    assert.equal(sonuc.doluFire, 4)
    assert.equal(sonuc.ambalajFireAdet, 10)
    assert.equal(sonuc.ambalajFireGram, 30)
  })

  it('eksik numaratör varsa null döner', () => {
    assert.equal(
      packagingWaste({
        doluBaslangic: 1,
        doluBitis: null,
        bosBaslangic: 1,
        bosBitis: 2,
        toplamPaket: 10,
        bosPaketAgirlikG: 3,
      }),
      null,
    )
  })

  it('boş paket ağırlığı yoksa gram hesaplanmaz', () => {
    const sonuc = packagingWaste({
      doluBaslangic: 0,
      doluBitis: 100,
      bosBaslangic: 0,
      bosBitis: 0,
      toplamPaket: 100,
      bosPaketAgirlikG: null,
    })

    assert.equal(sonuc.ambalajFireGram, null)
  })
})

describe('duruş notları', () => {
  const olaylar = [
    { id: '1', at: T(8, 0), kind: 'durus', note: 'Bobin değişimi' },
    { id: '2', at: T(9, 0), kind: 'durus', note: 'bobin değişimi' },
    { id: '3', at: T(10, 0), kind: 'durus', note: 'Temizlik' },
    { id: '4', at: T(11, 0), kind: 'uretim', note: null },
  ]

  it('sık notları büyük/küçük harf farkını yok sayarak sayar', () => {
    const sik = frequentNotes(olaylar)

    assert.equal(sik[0].note, 'Bobin değişimi')
    assert.equal(sik[0].adet, 2)
    assert.equal(sik[1].adet, 1)
  })

  it('boş notları atlar', () => {
    assert.equal(frequentNotes([{ id: '1', at: T(8, 0), note: '   ' }]).length, 0)
  })

  it('duruşları nota göre süreye çevirir', () => {
    const intervals = buildIntervals(
      [
        { id: '1', at: T(8, 0), kind: 'durus', note: 'Bobin' },
        { id: '2', at: T(8, 30), kind: 'uretim', note: null },
        { id: '3', at: T(9, 0), kind: 'durus', note: 'Bobin' },
      ],
      ms(T(9, 10)),
    )

    const dokum = downtimeByNote(intervals)
    assert.equal(dokum[0].note, 'Bobin')
    assert.equal(dokum[0].ms, 40 * DK)
    assert.equal(dokum[0].adet, 2)
  })

  it('segmentleri olan bir duruşta süreyi HER SEGMENTİN kendi notuna atar', () => {
    // 07:00 duruş (55dk, note='Bobin + Ambalaj + Elektrik') → 07:55 üretim.
    // Segmentler çakışıyor: A 07:00-07:30, B 07:15-07:45, C 07:20-07:55.
    const olaylar = [
      { id: '1', at: T(7, 0), kind: 'durus', note: 'Bobin + Ambalaj + Elektrik' },
      { id: '2', at: T(7, 55), kind: 'uretim', note: null },
    ]
    const intervals = buildIntervals(olaylar, ms(T(8, 0)))

    const segmentsByEventId = new Map([
      [
        '1',
        [
          { id: 's1', note: 'Bobin', startMs: ms(T(7, 0)), endMs: ms(T(7, 30)) },
          { id: 's2', note: 'Ambalaj', startMs: ms(T(7, 15)), endMs: ms(T(7, 45)) },
          { id: 's3', note: 'Elektrik', startMs: ms(T(7, 20)), endMs: ms(T(7, 55)) },
        ],
      ],
    ])

    const dokum = downtimeByNote(intervals, { segmentsByEventId })
    const byNote = Object.fromEntries(dokum.map((d) => [d.note, d.ms]))

    assert.equal(byNote.Bobin, 30 * DK)
    assert.equal(byNote.Ambalaj, 30 * DK)
    assert.equal(byNote.Elektrik, 35 * DK)
    // Toplam (95dk) gerçek duruş süresinden (55dk) FAZLA — segmentler
    // çakıştığı için bu doğru, aynı anda birden fazla şey oluyordu.
    assert.equal(dokum.reduce((sum, d) => sum + d.ms, 0), 95 * DK)
  })

  it('segmenti olmayan duruşlarda eski davranış (tüm süre, interval.note) devam eder', () => {
    const intervals = buildIntervals(
      [
        { id: '1', at: T(8, 0), kind: 'durus', note: 'Temizlik' },
        { id: '2', at: T(8, 20), kind: 'uretim', note: null },
      ],
      ms(T(8, 30)),
    )

    const dokum = downtimeByNote(intervals, { segmentsByEventId: new Map() })
    assert.equal(dokum[0].note, 'Temizlik')
    assert.equal(dokum[0].ms, 20 * DK)
  })
})

describe('groupSegmentsByEvent', () => {
  it('ham DB satırlarını event_id\'ye göre gruplayıp ms\'e çevirir, başlangıca göre sıralar', () => {
    const rows = [
      { id: 's2', event_id: 'e1', note: 'B', start_at: T(7, 15), end_at: T(7, 45) },
      { id: 's1', event_id: 'e1', note: 'A', start_at: T(7, 0), end_at: T(7, 30) },
      { id: 's3', event_id: 'e2', note: 'C', start_at: T(8, 0), end_at: T(8, 10) },
    ]

    const map = groupSegmentsByEvent(rows)

    assert.equal(map.size, 2)
    const e1 = map.get('e1')
    assert.equal(e1.length, 2)
    assert.equal(e1[0].note, 'A')
    assert.equal(e1[0].startMs, ms(T(7, 0)))
    assert.equal(e1[1].note, 'B')
  })
})

describe('assignLanes', () => {
  it('çakışmayan segmentleri aynı lane\'e koyar', () => {
    const segments = [
      { id: 'a', startMs: ms(T(7, 0)), endMs: ms(T(7, 20)) },
      { id: 'b', startMs: ms(T(7, 20)), endMs: ms(T(7, 40)) },
    ]

    const result = assignLanes(segments)
    assert.equal(result.find((s) => s.id === 'a').lane, 0)
    assert.equal(result.find((s) => s.id === 'b').lane, 0)
  })

  it('çakışan segmentleri ayrı lane\'lere dağıtır', () => {
    // A 07:00-07:30, B 07:15-07:45, C 07:20-07:55 — üçü de birbiriyle çakışıyor
    const segments = [
      { id: 'a', startMs: ms(T(7, 0)), endMs: ms(T(7, 30)) },
      { id: 'b', startMs: ms(T(7, 15)), endMs: ms(T(7, 45)) },
      { id: 'c', startMs: ms(T(7, 20)), endMs: ms(T(7, 55)) },
    ]

    const result = assignLanes(segments)
    const lanes = new Set(result.map((s) => s.lane))
    assert.equal(lanes.size, 3)
  })
})

describe('hizVerimi', () => {
  it('makine 6 saat açık kaldı ama üretilen paket 5 saatlik net işe karşılık geliyorsa %83 verir', () => {
    // 100 pkt/dk hedefte 5 saatlik iş = 30.000 paket, 6 saatlik açık kalmaya bölünce
    const sonuc = hizVerimi({ paketAdedi: 30000, uretimMs: 6 * 60 * DK, hedefHizPktDk: 100 })

    assert.equal(sonuc.hedefPktDk, 100)
    assert.ok(Math.abs(sonuc.mevcutPktDk - 83.33) < 0.01)
    assert.ok(Math.abs(sonuc.oran - 0.8333) < 0.001)
  })

  it('eksik girdide null döner', () => {
    assert.equal(hizVerimi({ paketAdedi: 0, uretimMs: 1000, hedefHizPktDk: 100 }), null)
    assert.equal(hizVerimi({ paketAdedi: 10, uretimMs: 0, hedefHizPktDk: 100 }), null)
    assert.equal(hizVerimi({ paketAdedi: 10, uretimMs: 1000, hedefHizPktDk: null }), null)
  })
})

describe('seviyeDurumu', () => {
  it('eşiklere göre iyi/orta/kötü döner', () => {
    assert.equal(seviyeDurumu(0.9), 'iyi')
    assert.equal(seviyeDurumu(0.85), 'iyi')
    assert.equal(seviyeDurumu(0.7), 'orta')
    assert.equal(seviyeDurumu(0.6), 'orta')
    assert.equal(seviyeDurumu(0.59), 'kotu')
  })

  it('null oran için null döner', () => {
    assert.equal(seviyeDurumu(null), null)
  })
})

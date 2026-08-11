/*
 * Sunum/video için sahte Supabase istemcisi — YAZILABİLİR ve
 * FRAME'LER ARASINDA PAYLAŞIMLI.
 *
 * vite.config.js'teki resolve.alias ile `src/lib/supabaseClient` yerine
 * bu modül yüklenir; sayfa bileşenleri HİÇ DEĞİŞMEZ, gerçek kod çalışır.
 *
 * DEPO NEDEN localStorage'DA (yaşanmış hata): sahnede operatör ekranı ve
 * müdür panosu ayrı birer iframe, yani ayrı DOKÜMAN. ES modülleri doküman
 * başına ayrı örneklenir — depo modül içinde bir dizi olarak tutulunca
 * her frame kendi kopyasını yazıyor, operatörün açtığı vardiyayı müdür
 * panosu hiç görmüyordu ("Açık vardiya yok"). localStorage aynı köken
 * altındaki tüm frame'lerde ortak; üstelik `storage` olayı diğer frame'i
 * kendiliğinden uyarıyor, bu da realtime taklidini bedavaya getiriyor.
 */

import * as ornek from './sample-data.js'
import * as hazir from './hazir-vardiya.js'

const ANAHTAR = 'mes-mock-depo'

const parametreler =
  typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams()

/*
 * `?hazir=1` — PDF sunumunun ekran görüntüleri için önceden doldurulmuş
 * vardiya. Öğretici video bunu KULLANMAZ; orada her kayıt tıklanarak
 * oluşur. Bu modda ayrıca zaman kırpması geçerli: sahte saat nereye
 * sabitlendiyse ekran o anın tutarlı halini gösterir.
 */
const hazirMod = parametreler.has('hazir')

const TABLOLAR = [
  'shifts',
  'product_runs',
  'timeline_events',
  'pallet_records',
  'stop_reason_segments',
  'manager_dashboard_visits',
  'personnel',
  'line_status',
  'stop_reasons',
]

function bosDepo() {
  const depo = { __sayac: 0 }
  for (const t of TABLOLAR) depo[t] = []
  depo.personnel = [...ornek.personnel]
  depo.line_status = ornek.LINE_CODES.map((code) => ({ line_code: code }))

  if (hazirMod) {
    depo.shifts = [hazir.shift]
    depo.product_runs = [...hazir.product_runs]
    depo.timeline_events = [...hazir.timeline_events]
    depo.pallet_records = [...hazir.pallet_records]
    depo.stop_reason_segments = [...hazir.stop_reason_segments]
    depo.manager_dashboard_visits = [...hazir.manager_dashboard_visits]
  }
  return depo
}

function oku() {
  try {
    const ham = localStorage.getItem(ANAHTAR)
    if (ham) return JSON.parse(ham)
  } catch {
    /* bozuk kayıt varsa sıfırdan kur */
  }
  const depo = bosDepo()
  try {
    localStorage.setItem(ANAHTAR, JSON.stringify(depo))
  } catch {}
  return depo
}

function kaydet(depo) {
  try {
    localStorage.setItem(ANAHTAR, JSON.stringify(depo))
  } catch {}
}

/*
 * Şema varsayılanları (`default now()`) — gerçek veritabanı bunları
 * kendisi dolduruyor, mock doldurmazsa alan `undefined` kalıyor.
 *
 * YAŞANMIŞ HATA: ManagerDashboard ziyaret kaydını `insert({ line_code })`
 * ile atıyor; `opened_at` boş kalınca operatör ekranındaki "Müdür panosu
 * görüntülemeleri" listesi `new Date(undefined)` ile "Invalid time value"
 * fırlatıp TÜM operatör panelini düşürüyordu (kök bomboş kalıyordu).
 */
const simdi = () => new Date().toISOString()

const VARSAYILAN = {
  manager_dashboard_visits: () => ({ opened_at: simdi(), last_seen_at: simdi() }),
  shifts: () => ({ started_at: simdi(), ended_at: null }),
  timeline_events: () => ({ at: simdi(), note: null, product_run_id: null }),
  pallet_records: () => ({ completed_at: simdi() }),
  stop_reason_segments: () => ({ start_at: simdi(), end_at: simdi() }),
}

/* ---- realtime taklidi ---- */
const dinleyiciler = new Set()

function tetikle() {
  for (const geriCagirma of dinleyiciler) {
    try {
      geriCagirma({})
    } catch {
      /* bir dinleyicinin hatası yayını durdurmasın */
    }
  }
}

/* Kendi frame'imiz: mikro görevde (setTimeout sahte saate bağlı, saat
 * ilerlemeden ateşlenmiyor). Diğer frame: storage olayıyla. */
const yayinla = () => queueMicrotask(tetikle)

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (olay) => {
    if (olay.key === ANAHTAR) tetikle()
  })
  window.__mesYenile = tetikle
  window.__mesVeri = () => oku()
}

function query(tablo) {
  let islem = 'select'
  let yuk = null
  const suzgecler = []
  let siralama = null
  let sinir = null

  const suz = (satirlar) =>
    satirlar.filter((satir) =>
      suzgecler.every(({ tur, sutun, deger }) => {
        const alan = satir[sutun] ?? null
        if (tur === 'is') return alan === deger
        if (tur === 'not-is') return alan !== deger
        return satir[sutun] === deger
      }),
    )

  const calistir = () => {
    const depo = oku()
    const kaynak = depo[tablo] ?? (depo[tablo] = [])

    if (islem === 'insert') {
      const gelen = Array.isArray(yuk) ? yuk : [yuk]
      const eklenen = gelen.map((satir) => ({
        id: `${tablo}-${++depo.__sayac}`,
        ...VARSAYILAN[tablo]?.(),
        ...satir,
      }))
      kaynak.push(...eklenen)
      kaydet(depo)
      yayinla()
      return { data: eklenen, error: null }
    }

    if (islem === 'update') {
      const hedef = suz(kaynak)
      for (const satir of hedef) Object.assign(satir, yuk)
      kaydet(depo)
      yayinla()
      return { data: hedef, error: null }
    }

    if (islem === 'delete') {
      const kalan = kaynak.filter((satir) => !suz(kaynak).includes(satir))
      const silinen = suz(kaynak)
      depo[tablo] = kalan
      kaydet(depo)
      yayinla()
      return { data: silinen, error: null }
    }

    let satirlar = suz(kaynak)

    const zamanSutunu = hazirMod ? hazir.ZAMAN_SUTUNU[tablo] : null
    if (zamanSutunu) {
      const simdi = Date.now()
      satirlar = satirlar.filter((satir) => new Date(satir[zamanSutunu]).getTime() <= simdi)
    }

    if (siralama) {
      const { sutun, artan } = siralama
      satirlar = [...satirlar].sort((a, b) => {
        if (a[sutun] === b[sutun]) return 0
        return (a[sutun] > b[sutun] ? 1 : -1) * (artan ? 1 : -1)
      })
    }

    if (sinir != null) satirlar = satirlar.slice(0, sinir)

    return { data: satirlar, error: null }
  }

  const tek = async () => {
    const sonuc = calistir()
    const veri = Array.isArray(sonuc.data) ? sonuc.data[0] ?? null : sonuc.data
    return { data: veri, error: null }
  }

  const builder = {
    /* select() insert/update sonrası da çağrılıyor — işlemi sıfırlamamalı. */
    select: () => builder,
    insert: (satirlar) => {
      islem = 'insert'
      yuk = satirlar
      return builder
    },
    update: (yama) => {
      islem = 'update'
      yuk = yama
      return builder
    },
    delete: () => {
      islem = 'delete'
      return builder
    },
    eq: (sutun, deger) => {
      suzgecler.push({ tur: 'eq', sutun, deger })
      return builder
    },
    is: (sutun, deger) => {
      suzgecler.push({ tur: 'is', sutun, deger })
      return builder
    },
    /* useShiftList: .not('ended_at','is',null) — kapanmış vardiyalar.
     * useFrequentNotes: .not('note','is',null). */
    not: (sutun, operator, deger) => {
      if (operator === 'is') suzgecler.push({ tur: 'not-is', sutun, deger })
      return builder
    },
    or: () => builder,
    in: () => builder,
    neq: () => builder,
    gte: () => builder,
    lte: () => builder,
    order: (sutun, secenekler = {}) => {
      siralama = { sutun, artan: secenekler.ascending !== false }
      return builder
    },
    limit: (adet) => {
      sinir = adet
      return builder
    },
    single: tek,
    maybeSingle: tek,
    then: (coz) => coz(calistir()),
  }

  return builder
}

const kanalYap = () => {
  const kanal = {
    on: (_olay, _suzgec, geriCagirma) => {
      if (typeof geriCagirma === 'function') dinleyiciler.add(geriCagirma)
      return kanal
    },
    subscribe: () => kanal,
    unsubscribe: () => kanal,
  }
  return kanal
}

export const supabase = {
  from: query,
  channel: kanalYap,
  removeChannel: () => {},
}

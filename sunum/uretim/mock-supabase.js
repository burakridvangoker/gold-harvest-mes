/*
 * Sunum ekran görüntüleri için sahte Supabase istemcisi.
 *
 * vite.config.js'teki resolve.alias ile `src/lib/supabaseClient` yerine
 * bu modül yüklenir — sayfa bileşenlerinin (OperatorPanel,
 * ManagerDashboard) KENDİSİ hiç değişmez, gerçek kod çalışır.
 * Sadece veri kaynağı sabit örnek veriye bağlanır.
 */

import * as sample from './sample-data.js'

const TABLES = {
  shifts: [sample.shift],
  product_runs: sample.product_runs,
  timeline_events: sample.timeline_events,
  pallet_records: sample.pallet_records,
  stop_reason_segments: sample.stop_reason_segments,
  personnel: sample.personnel,
  manager_dashboard_visits: sample.manager_dashboard_visits,
  line_status: [{ line_code: sample.LINE_CODE }],
  stop_reasons: [],
}

/*
 * Zaman sütunu olan tablolar "şimdi"ye kadar kırpılır. Playwright saati
 * sabitliyor (page.clock), bu yüzden Date.now() o âna denk gelir —
 * böylece hangi ana sabitlersek ekran o anın tutarlı halini gösterir
 * (gelecekteki olay/palet sızmaz, durum yanlış çıkmaz).
 */
const TIME_COLUMN = {
  timeline_events: 'at',
  pallet_records: 'completed_at',
  stop_reason_segments: 'start_at',
  manager_dashboard_visits: 'opened_at',
}

function query(table) {
  let rows = [...(TABLES[table] ?? [])]

  const timeColumn = TIME_COLUMN[table]
  if (timeColumn) {
    const now = Date.now()
    rows = rows.filter((row) => new Date(row[timeColumn]).getTime() <= now)
  }

  const builder = {
    select: () => builder,
    insert: () => builder,
    update: () => builder,
    delete: () => builder,
    or: () => builder,
    in: () => builder,
    neq: () => builder,
    gte: () => builder,
    lte: () => builder,
    eq(column, value) {
      rows = rows.filter((row) => row[column] === value)
      return builder
    },
    is(column, value) {
      rows = rows.filter((row) => (row[column] ?? null) === value)
      return builder
    },
    order(column, options = {}) {
      const dir = options.ascending === false ? -1 : 1
      rows = [...rows].sort((a, b) => {
        const x = a[column]
        const y = b[column]
        if (x === y) return 0
        return (x > y ? 1 : -1) * dir
      })
      return builder
    },
    limit(count) {
      rows = rows.slice(0, count)
      return builder
    },
    maybeSingle: async () => ({ data: rows[0] ?? null, error: null }),
    single: async () => ({ data: rows[0] ?? null, error: null }),
    then: (resolve) => resolve({ data: rows, error: null }),
  }

  return builder
}

/*
 * Realtime taklidi. Gerçek Supabase'te veri değişince kayıtlı geri
 * çağırmalar tetikleniyor ve useShift yeniden çekiyor. Video düzeneğinde
 * saat ileri sarıldıkça ekranların da güncellenmesi için aynı şey lazım:
 * geri çağırmalar toplanır, sürücü her adımda window.__mesYenile() ile
 * hepsini tetikler (zamanlayıcıya bağlamak yerine BİLEREK açık çağrı —
 * sahte saat ileri sarılınca bir aralık yüzlerce kez ateşlenir ve
 * kare üretimi sürünür).
 */
const dinleyiciler = new Set()

const makeChannel = () => {
  const ch = {
    on: (_event, _filtre, geriCagirma) => {
      if (typeof geriCagirma === 'function') dinleyiciler.add(geriCagirma)
      return ch
    },
    subscribe: () => ch,
    unsubscribe: () => ch,
  }
  return ch
}

if (typeof window !== 'undefined') {
  window.__mesYenile = () => {
    for (const geriCagirma of dinleyiciler) geriCagirma({})
  }
}

export const supabase = {
  from: query,
  channel: makeChannel,
  removeChannel: () => {},
}

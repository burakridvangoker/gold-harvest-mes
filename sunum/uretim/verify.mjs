import { buildIntervals, shiftTotals, palletTotals, palletTotalsByRun, shiftPaket, hizVerimi, totalsByRun, downtimeByNote } from '../../src/lib/timeline.js'
import { product_runs, timeline_events, pallet_records } from './hazir-vardiya.js'
import { SHIFT_START_MS } from './sample-data.js'

/* Hazır vardiya ekran görüntüleri 14:52'ye sabitleniyor (bkz. shots.cjs). */
const NOW_MS = SHIFT_START_MS + 472 * 60 * 1000

const iv = buildIntervals(timeline_events, NOW_MS)
const t = shiftTotals(iv)
const fmt = (ms) => {
  const s = Math.floor(ms/1000); const h=Math.floor(s/3600); const m=Math.floor((s%3600)/60)
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`
}
console.log('Çalışma :', fmt(t.uretimMs))
console.log('Duruş   :', fmt(t.durusMs))
console.log('Mola    :', fmt(t.molaMs))
console.log('AÇIK KALMA: %' + Math.round(t.zamanKullanimi*100))

const pByRun = palletTotalsByRun(pallet_records)
const pt = palletTotals(pallet_records)
console.log('Palet:', pt.paletAdedi, ' Koli:', pt.koliAdedi, ' Paket:', shiftPaket(product_runs, pByRun))
for (const r of product_runs) {
  const b = pByRun.get(r.id) ?? {paletAdedi:0,koliAdedi:0}
  console.log(`  ${r.urun_adi}: ${b.paletAdedi} palet / ${b.koliAdedi} koli / ${b.koliAdedi*r.koli_ici_adet} paket`)
}
const rt = totalsByRun(iv)
for (const r of product_runs) {
  const z = rt.get(r.id) ?? {uretimMs:0,durusMs:0}
  const koli = (pByRun.get(r.id)?.koliAdedi) ?? 0
  const hv = hizVerimi({paketAdedi: koli*r.koli_ici_adet, uretimMs: z.uretimMs, hedefHizPktDk: r.calisma_hizi_pkt_dk})
  const ak = (z.uretimMs+z.durusMs)>0 ? z.uretimMs/(z.uretimMs+z.durusMs) : 0
  console.log(`  ${r.urun_adi}: açık kalma %${Math.round(ak*100)}  hız verimi %${hv?Math.round(hv.oran*100):'—'}`)
}
console.log('\nDuruş sebepleri:')
for (const d of downtimeByNote(iv)) console.log('  ', (d.note??'—').padEnd(18), fmt(d.ms), '×'+d.adet)

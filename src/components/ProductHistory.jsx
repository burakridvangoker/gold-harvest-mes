import { useMemo, useState } from 'react'
import {
  buildIntervals,
  koliToPaket,
  packagingWaste,
  palletTotalsByRun,
  runSpans,
  totalsByRun,
} from '../lib/timeline'
import { formatDuration } from '../lib/duration'
import { formatShortTime } from '../lib/time'
import './Sheet.css'
import './ProductHistory.css'

/*
 * Vardiya içinde çalışılan her ürün — başlama/bitiş saati kart olarak,
 * dokununca verim/miktar detayı açılır. Aynı ürüne geri dönülmüşse (A→B→A)
 * tek kart olarak kalır: runSpans en erken başlangıç, en geç bitişi verir.
 */
function ProductHistory({ runs, events, pallets, nowMs }) {
  const [openId, setOpenId] = useState(null)

  const summaries = useMemo(() => {
    const intervals = buildIntervals(events, nowMs)
    const spans = runSpans(events, nowMs)
    const zamanByRun = totalsByRun(intervals)
    const paletByRun = palletTotalsByRun(pallets)

    return [...runs]
      .sort((a, b) => a.sira - b.sira)
      .map((run) => {
        const span = spans.get(run.id) ?? null
        const zaman = zamanByRun.get(run.id) ?? { uretimMs: 0, durusMs: 0 }
        const palet = paletByRun.get(run.id) ?? { paletAdedi: 0, koliAdedi: 0 }
        const paket = koliToPaket(palet.koliAdedi, run.koli_ici_adet)
        const gercekPktDk =
          zaman.uretimMs > 0 && paket ? paket / (zaman.uretimMs / 60000) : null
        const waste = packagingWaste({
          doluBaslangic: run.dolu_paket_baslangic,
          doluBitis: run.dolu_paket_bitis,
          bosBaslangic: run.bos_paket_baslangic,
          bosBitis: run.bos_paket_bitis,
          toplamPaket: paket ?? 0,
          bosPaketAgirlikG: run.bos_paket_agirlik_g,
        })

        return { run, span, zaman, palet, paket, gercekPktDk, waste }
      })
  }, [runs, events, pallets, nowMs])

  if (summaries.length === 0) return null

  const open = summaries.find((entry) => entry.run.id === openId) ?? null

  return (
    <div className="history-strip">
      <span className="history-strip-label plate">Bu vardiyadaki ürünler</span>
      <div className="history-strip-list">
        {summaries.map(({ run, span }) => (
          <button
            key={run.id}
            type="button"
            className="history-card"
            onClick={() => setOpenId(run.id)}
          >
            <span className="history-card-name">{run.urun_adi}</span>
            <span className="history-card-time tnum">
              {span ? formatShortTime(new Date(span.startMs)) : '—'}
              {' – '}
              {span?.ongoing ? 'sürüyor' : span ? formatShortTime(new Date(span.endMs)) : '—'}
            </span>
          </button>
        ))}
      </div>

      {open ? (
        <div className="sheet-overlay" onClick={() => setOpenId(null)}>
          <div
            className="sheet-panel"
            role="dialog"
            aria-modal="true"
            aria-label={open.run.urun_adi}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="sheet-handle" />
            <h2 className="sheet-title plate">{open.run.urun_adi}</h2>
            {open.run.parti_no ? (
              <p className="sheet-subtitle">{open.run.parti_no}</p>
            ) : null}

            <div className="sheet-stats">
              <div className="sheet-stat-row">
                <span className="sheet-stat-label">Süre</span>
                <span className="sheet-stat-value tnum">{formatDuration(open.zaman.uretimMs)}</span>
              </div>
              <div className="sheet-stat-row">
                <span className="sheet-stat-label">Duruş</span>
                <span className="sheet-stat-value tnum">{formatDuration(open.zaman.durusMs)}</span>
              </div>
              <div className="sheet-stat-row">
                <span className="sheet-stat-label">Palet</span>
                <span className="sheet-stat-value tnum">{open.palet.paletAdedi}</span>
              </div>
              <div className="sheet-stat-row">
                <span className="sheet-stat-label">Koli</span>
                <span className="sheet-stat-value tnum">{open.palet.koliAdedi}</span>
              </div>
              <div className="sheet-stat-row">
                <span className="sheet-stat-label">Paket</span>
                <span className="sheet-stat-value tnum">{open.paket ?? '—'}</span>
              </div>
              <div className="sheet-stat-row">
                <span className="sheet-stat-label">Gerçekleşen hız</span>
                <span className="sheet-stat-value tnum">
                  {open.gercekPktDk ? `${open.gercekPktDk.toFixed(1)} pkt/dk` : '—'}
                </span>
              </div>
            </div>

            {open.waste ? (
              <div className="sheet-stats">
                <div className="sheet-stat-row">
                  <span className="sheet-stat-label">Dolu pakette fire</span>
                  <span className="sheet-stat-value tnum">{open.waste.doluFire} adet</span>
                </div>
                <div className="sheet-stat-row">
                  <span className="sheet-stat-label">Ambalaj firesi</span>
                  <span className="sheet-stat-value tnum">
                    {open.waste.ambalajFireAdet} adet
                    {open.waste.ambalajFireGram != null ? ` · ${open.waste.ambalajFireGram} g` : ''}
                  </span>
                </div>
                {open.run.ortalama_gramaj_g ? (
                  <div className="sheet-stat-row">
                    <span className="sheet-stat-label">Ortalama gramaj</span>
                    <span className="sheet-stat-value tnum">{open.run.ortalama_gramaj_g} g</span>
                  </div>
                ) : null}
              </div>
            ) : null}

            <div className="sheet-actions">
              <button
                type="button"
                className="sheet-button sheet-button--primary"
                onClick={() => setOpenId(null)}
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default ProductHistory

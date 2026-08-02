import { useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useShiftById } from '../hooks/useShiftById'
import { usePersonnel } from '../hooks/usePersonnel'
import {
  buildIntervals,
  downtimeByNote,
  hizVerimi,
  koliToPaket,
  palletTotals,
  palletTotalsByRun,
  seviyeDurumu,
  shiftPaket,
  shiftSegments,
  shiftTotals,
  totalsByRun,
} from '../lib/timeline'
import { formatBreakdown, formatDuration } from '../lib/duration'
import { formatDateLabel, formatShortTime } from '../lib/time'
import ProductHistory from './ProductHistory'
import EventLog from './EventLog'
import OperatorNameField from './OperatorNameField'
import './Sheet.css'
import './ShiftHistoryDetail.css'

const NO_REASON_LABEL = 'Sebep girilmemiş'

/*
 * Kapanmış bir vardiyanın donmuş özeti — "bir paket gibi durması" istenen
 * görünüm. Vardiyayı bitirmek veri silmez; bu bileşen bunun kanıtı:
 * timeline.js'teki AYNI saf fonksiyonlarla, sadece nowMs hep
 * `shift.ended_at`'e sabit (canlı saat değil) — o an nasıl bittiyse öyle
 * kalır, bir daha değişmez.
 *
 * readOnly=false (OperatorPanel): EventLog + ProductHistory'nin "Düzenle"si
 * aynen çalışır — kapanmış bir vardiyada unutulan duruş notu, yanlış palet,
 * eksik ürün bilgisi hâlâ düzeltilebilir. readOnly=true (ManagerDashboard):
 * hiçbir yazma çağrısı yok, sadece rakamlar.
 */
function ShiftHistoryDetail({ shiftId, readOnly, onBack }) {
  const { shift, runs, events, pallets, loading, error, setError, refresh } = useShiftById(shiftId)
  /* Salt-okunur (müdür) görünümde operatör düzenlenemez, liste hiç çekilmez. */
  const personnel = usePersonnel(!readOnly)
  const [logOpen, setLogOpen] = useState(false)
  const [operatorOpen, setOperatorOpen] = useState(false)
  const [operatorName, setOperatorName] = useState('')
  const [busy, setBusy] = useState(false)

  const runsById = useMemo(() => new Map(runs.map((run) => [run.id, run])), [runs])

  if (loading) {
    return <p className="history-detail-status plate">Yükleniyor</p>
  }

  if (!shift) {
    return <p className="history-detail-status plate">Vardiya bulunamadı</p>
  }

  const nowMs = new Date(shift.ended_at).getTime()
  const shiftStartMs = new Date(shift.started_at).getTime()

  const intervals = buildIntervals(events, nowMs)
  const totals = shiftTotals(intervals)
  const paletler = palletTotals(pallets)
  const topReasons = downtimeByNote(intervals)
  const maxReasonMs = topReasons[0]?.ms ?? 0
  const segments = shiftSegments(events, { shiftStartMs, endMs: nowMs })

  const lastInterval = intervals[intervals.length - 1] ?? null
  const lastRun =
    (lastInterval?.productRunId && runsById.get(lastInterval.productRunId)) ||
    runs[runs.length - 1] ||
    null

  const runTotals = totalsByRun(intervals)
  const paletlerByRun = palletTotalsByRun(pallets)
  const lastRunTotals = lastRun ? runTotals.get(lastRun.id) ?? { uretimMs: 0, durusMs: 0 } : null
  const lastRunKoli = lastRun ? (paletlerByRun.get(lastRun.id)?.koliAdedi ?? 0) : 0
  const lastRunPaket = koliToPaket(lastRunKoli, lastRun?.koli_ici_adet)

  /*
   * Tek bir koli_ici_adet (son ürününki) ile çarpmak yanlış — vardiyada
   * birden çok ürün varsa (farklı koli içi adetleri) her ürün kendi
   * adediyle hesaplanıp toplanmalı (bkz. timeline.js#shiftPaket).
   */
  const paket = shiftPaket(runs, paletlerByRun)

  /*
   * Vardiya toplamı "1+5" gibi ürün bazlı katkılara ayrılabilsin diye —
   * sadece paleti çıkmış (katkısı 0'dan büyük) ürünler, vardiya sırasıyla.
   */
  const contributingRuns = runs.filter((run) => (paletlerByRun.get(run.id)?.paletAdedi ?? 0) > 0)
  const paletParts = contributingRuns.map((run) => paletlerByRun.get(run.id)?.paletAdedi ?? 0)
  const koliParts = contributingRuns.map((run) => paletlerByRun.get(run.id)?.koliAdedi ?? 0)
  const paketParts = contributingRuns.map(
    (run) => koliToPaket(paletlerByRun.get(run.id)?.koliAdedi ?? 0, run.koli_ici_adet) ?? 0,
  )

  const zamanKullanimi = Math.round(totals.zamanKullanimi * 100)
  const acikKalmaDurum = seviyeDurumu(totals.zamanKullanimi)

  const performans =
    lastRun?.calisma_hizi_pkt_dk && lastRunTotals
      ? hizVerimi({
          paketAdedi: lastRunPaket ?? 0,
          uretimMs: lastRunTotals.uretimMs,
          hedefHizPktDk: lastRun.calisma_hizi_pkt_dk,
        })
      : null
  const performansDurum = performans ? seviyeDurumu(performans.oran) : null
  const performansYuzde = performans ? Math.round(performans.oran * 100) : null

  const guard = async (work, mesaj) => {
    if (busy) return
    setBusy(true)
    setError(null)

    const { error: failure } = await work()

    if (failure) setError(`${mesaj}: ${failure.message}`)
    else await refresh()

    setBusy(false)
  }

  const updateEvent = (id, patch) =>
    guard(() => supabase.from('timeline_events').update(patch).eq('id', id), 'Güncellenemedi')

  const deleteEvent = (id) =>
    guard(() => supabase.from('timeline_events').delete().eq('id', id), 'Silinemedi')

  const updatePallet = (id, patch) =>
    guard(() => supabase.from('pallet_records').update(patch).eq('id', id), 'Güncellenemedi')

  const deletePallet = (id) =>
    guard(() => supabase.from('pallet_records').delete().eq('id', id), 'Silinemedi')

  const updateRun = (id, patch) =>
    guard(() => supabase.from('product_runs').update(patch).eq('id', id), 'Ürün bilgisi güncellenemedi')

  const updateOperator = (name) => {
    setOperatorOpen(false)
    guard(
      () => supabase.from('shifts').update({ operator: name.trim() || null }).eq('id', shift.id),
      'Operatör güncellenemedi',
    )
  }

  return (
    <div className="history-detail">
      <div className="history-detail-header">
        <button type="button" className="history-detail-back" onClick={onBack}>
          ← Canlıya dön
        </button>
        <span className="history-detail-badge plate">Geçmiş vardiya</span>
      </div>

      <div className="history-detail-meta">
        <span className="history-detail-title">
          {formatDateLabel(new Date(shiftStartMs))} · {shift.vardiya}. vardiya
        </span>
        {readOnly ? (
          shift.operator ? <span className="history-detail-operator">{shift.operator}</span> : null
        ) : (
          <button
            type="button"
            className="history-detail-operator history-detail-operator--button"
            onClick={() => {
              setOperatorName(shift.operator ?? '')
              setOperatorOpen(true)
            }}
          >
            {shift.operator || 'Operatör girilmedi'}
          </button>
        )}
        <span className="history-detail-time tnum">
          {formatShortTime(new Date(shiftStartMs))} – {formatShortTime(new Date(nowMs))} ·{' '}
          {formatDuration(nowMs - shiftStartMs)}
        </span>
      </div>

      {error && <div className="history-detail-error">{error}</div>}

      <div className="history-detail-ratios">
        <div
          className={`history-detail-ratio${acikKalmaDurum ? ` history-detail-ratio--${acikKalmaDurum}` : ''}`}
        >
          <span className="history-detail-ratio-value tnum">%{zamanKullanimi}</span>
          <span className="history-detail-ratio-label plate">açık kalma</span>
        </div>
        <div
          className={`history-detail-ratio${performansDurum ? ` history-detail-ratio--${performansDurum}` : ''}`}
        >
          <span className="history-detail-ratio-value tnum">
            {performansYuzde != null ? `%${performansYuzde}` : '—'}
          </span>
          <span className="history-detail-ratio-label plate">hız verimi</span>
        </div>
      </div>

      <dl className="history-detail-figures">
        <div className="history-detail-figure">
          <dt>Çalışma</dt>
          <dd className="tnum">{formatDuration(totals.uretimMs)}</dd>
        </div>
        <div className="history-detail-figure">
          <dt>Duruş</dt>
          <dd className="tnum">{formatDuration(totals.durusMs)}</dd>
        </div>
        <div className="history-detail-figure">
          <dt>Mola</dt>
          <dd className="tnum">{formatDuration(totals.molaMs)}</dd>
        </div>
        <div className="history-detail-figure">
          <dt>Palet</dt>
          <dd className="tnum">{formatBreakdown(paletParts, paletler.paletAdedi)}</dd>
        </div>
        <div className="history-detail-figure">
          <dt>Koli</dt>
          <dd className="tnum">{formatBreakdown(koliParts, paletler.koliAdedi)}</dd>
        </div>
        <div className="history-detail-figure">
          <dt>Paket</dt>
          <dd className="tnum">{formatBreakdown(paketParts, paket)}</dd>
        </div>
      </dl>

      <ProductHistory
        runs={runs}
        events={events}
        pallets={pallets}
        nowMs={nowMs}
        onUpdateRun={readOnly ? undefined : updateRun}
        frozen
      />

      <div className="history-detail-section">
        <h3 className="history-detail-subtitle plate">Duruş sebepleri</h3>
        {topReasons.length === 0 ? (
          <p className="history-detail-empty">Duruş kaydı yok</p>
        ) : (
          <ul className="history-detail-reasons">
            {topReasons.map((reason) => (
              <li key={reason.note ?? '__yok__'} className="history-detail-reasons-row">
                <div className="history-detail-reasons-head">
                  <span className="history-detail-reasons-label">{reason.note ?? NO_REASON_LABEL}</span>
                  <span className="history-detail-reasons-value tnum">
                    {formatDuration(reason.ms)}
                    <span className="history-detail-reasons-count"> ×{reason.adet}</span>
                  </span>
                </div>
                <div className="history-detail-reasons-track">
                  <div
                    className="history-detail-reasons-fill"
                    style={{ width: `${maxReasonMs > 0 ? (reason.ms / maxReasonMs) * 100 : 0}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="history-detail-section">
        <h3 className="history-detail-subtitle plate">Vardiya bölümleri</h3>
        <div className="history-detail-quarters">
          {segments.map((segment) => {
            const segIntervals = intervals
              .filter((interval) => interval.startMs >= segment.startMs && interval.startMs < segment.endMs)
              .reverse()

            return (
              <div key={segment.index} className="history-detail-quarter">
                <div className="history-detail-quarter-head">
                  <span className="history-detail-quarter-title plate">{segment.index}. Bölüm</span>
                  <span className="history-detail-quarter-time tnum">
                    {formatShortTime(new Date(segment.startMs))} –{' '}
                    {formatShortTime(new Date(segment.endMs))}
                  </span>
                </div>
                {segIntervals.length === 0 ? (
                  <p className="history-detail-empty">Olay yok</p>
                ) : (
                  <ul className="history-detail-events">
                    {segIntervals.map((interval) => (
                      <li
                        key={interval.eventId}
                        className={`history-detail-events-row history-detail-events-row--${interval.kind}`}
                      >
                        <span className="tnum">{formatShortTime(new Date(interval.startMs))}</span>
                        <span className="history-detail-events-label">
                          {interval.kind === 'durus'
                            ? interval.note || NO_REASON_LABEL
                            : interval.kind === 'mola'
                              ? 'Mola'
                              : runsById.get(interval.productRunId)?.urun_adi || 'Üretim'}
                        </span>
                        <span className="tnum">{formatDuration(interval.durationMs)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {!readOnly && (
        <>
          <button
            type="button"
            className="history-detail-log-button"
            onClick={() => setLogOpen(true)}
          >
            Olay geçmişi
          </button>

          <EventLog
            open={logOpen}
            events={events}
            pallets={pallets}
            runsById={runsById}
            shiftStartMs={shiftStartMs}
            nowMs={nowMs}
            onSaveEvent={updateEvent}
            onDeleteEvent={deleteEvent}
            onSavePallet={updatePallet}
            onDeletePallet={deletePallet}
            onClose={() => setLogOpen(false)}
            frozen
          />

          {operatorOpen && (
            <div className="sheet-overlay" onClick={() => setOperatorOpen(false)}>
              <div
                className="sheet-panel"
                role="dialog"
                aria-modal="true"
                aria-label="Operatör"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="sheet-handle" />
                <h2 className="sheet-title plate">Operatör</h2>
                <label className="sheet-field">
                  <span className="sheet-field-label">Ad Soyad</span>
                  <OperatorNameField
                    value={operatorName}
                    onChange={setOperatorName}
                    personnel={personnel}
                    inputClassName="sheet-input"
                  />
                </label>
                <div className="sheet-actions">
                  <button
                    type="button"
                    className="sheet-button sheet-button--secondary"
                    onClick={() => setOperatorOpen(false)}
                  >
                    Vazgeç
                  </button>
                  <button
                    type="button"
                    className="sheet-button sheet-button--primary"
                    onClick={() => updateOperator(operatorName)}
                  >
                    Kaydet
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default ShiftHistoryDetail

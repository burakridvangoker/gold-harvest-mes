import { useEffect, useMemo, useState } from 'react'
import { useShift } from '../hooks/useShift'
import {
  buildIntervals,
  currentState,
  downtimeByNote,
  koliToPaket,
  paceStatus,
  palletTotals,
  shiftTotals,
} from '../lib/timeline'
import { formatDelta, formatDuration } from '../lib/duration'
import { formatClock, formatDateLabel, formatShortTime } from '../lib/time'
import StatusBadge from '../components/StatusBadge'
import './ManagerDashboard.css'

const LINE_CODE = 'PFM-11'
const RECENT_EVENTS_LIMIT = 8
const TOP_REASONS_LIMIT = 5
const NO_REASON_LABEL = 'Sebep girilmemiş'
const TAM_ISRAR_MS = 30 * 60 * 1000

function ManagerDashboard() {
  const { shift, runs, events, pallets, loading, error } = useShift(LINE_CODE)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  const runsById = useMemo(() => new Map(runs.map((run) => [run.id, run])), [runs])

  const intervals = useMemo(() => buildIntervals(events, now), [events, now])
  const totals = useMemo(() => shiftTotals(intervals), [intervals])
  const paletler = useMemo(() => palletTotals(pallets), [pallets])
  const state = useMemo(() => currentState(events), [events])
  const topReasons = useMemo(() => downtimeByNote(intervals, TOP_REASONS_LIMIT), [intervals])

  const recentIntervals = useMemo(() => [...intervals].reverse().slice(0, RECENT_EVENTS_LIMIT), [intervals])

  const activeRun = useMemo(() => {
    const last = intervals[intervals.length - 1]
    return (last?.productRunId && runsById.get(last.productRunId)) || runs[runs.length - 1] || null
  }, [intervals, runs, runsById])

  const nowDate = new Date(now)

  if (loading) {
    return (
      <div className="manager-shell is-beklemede">
        <div className="andon-rail" />
        <div className="manager-dashboard manager-dashboard--center">
          <p className="plate">Yükleniyor</p>
        </div>
      </div>
    )
  }

  if (!shift) {
    return (
      <div className="manager-shell is-beklemede">
        <div className="andon-rail" />
        <div className="manager-dashboard manager-dashboard--center">
          <span className="manager-line-code">{LINE_CODE}</span>
          <p className="plate">Açık vardiya yok</p>
        </div>
      </div>
    )
  }

  const shiftStartMs = new Date(shift.started_at).getTime()
  const son = intervals[intervals.length - 1] ?? null
  const urgency = state === 'durdu' && son ? Math.min(1, son.durationMs / TAM_ISRAR_MS) : 0

  const paket = koliToPaket(paletler.koliAdedi, activeRun?.koli_ici_adet)
  const maxReasonMs = topReasons[0]?.ms ?? 0

  const pace = paceStatus({
    hedefKoli: shift.hedef_koli,
    uretilenKoli: paletler.koliAdedi,
    shiftStartMs,
    shiftEndMs: shift.planlanan_bitis ? new Date(shift.planlanan_bitis).getTime() : null,
    nowMs: now,
  })

  const zamanKullanimi = Math.round(totals.zamanKullanimi * 100)

  return (
    <div className={`manager-shell is-${state}`}>
      <div
        className={`andon-rail${state === 'durdu' ? ' andon-rail--pulsing' : ''}`}
        style={{ '--urgency': urgency }}
      />

      <div className="manager-dashboard">
        <header className="manager-header">
          <span className="manager-line-code">{LINE_CODE}</span>
          <span className="manager-date plate">
            {formatDateLabel(nowDate)} · {shift.vardiya}. vardiya
            {shift.operator ? ` · ${shift.operator}` : ''}
          </span>
          <span className="manager-clock tnum">{formatClock(nowDate)}</span>
        </header>

        {error && <div className="manager-error">{error}</div>}

        {/* ŞİMDİ */}
        <section className="zone zone--now">
          <h2 className="zone-title plate">Şimdi</h2>
          <div className="now-state" aria-live="polite">
            <StatusBadge status={state} size="xl" />
            <span className="now-elapsed tnum">{formatDuration(son ? son.durationMs : 0)}</span>
          </div>
          {activeRun ? (
            <div className="now-run">
              <span className="now-run-product">{activeRun.urun_adi}</span>
              <span className="now-run-meta plate">
                {activeRun.parti_no ? `${activeRun.parti_no} · ` : ''}
                {activeRun.hedef_hiz_pkt_dk ? `hedef ${activeRun.hedef_hiz_pkt_dk} pkt/dk` : ''}
              </span>
            </div>
          ) : (
            <div className="now-run-empty plate">Ürün girilmedi</div>
          )}
        </section>

        {/* BUGÜN */}
        <section className="zone zone--today">
          <div className="zone-head">
            <h2 className="zone-title plate">Vardiya</h2>
            {pace ? (
              <span className={`usage-figure usage-figure--${pace.durum} tnum`}>
                {pace.uretilenKoli} / {pace.hedefKoli}
                <span className="usage-figure-note plate">
                  {pace.durum === 'tamam'
                    ? 'hedef tamam'
                    : pace.durum === 'planinda'
                      ? 'planında'
                      : `${formatDelta(pace.farkDk)} ${
                          pace.durum === 'onde' ? 'önde' : 'geride'
                        }`}
                </span>
              </span>
            ) : (
              <span className="usage-figure tnum">
                %{zamanKullanimi}
                <span className="usage-figure-note plate">çalışma oranı</span>
              </span>
            )}
          </div>

          <div
            className="split-bar"
            role="img"
            aria-label={`Çalışma oranı yüzde ${zamanKullanimi}`}
          >
            <div className="split-bar-run" style={{ width: `${totals.zamanKullanimi * 100}%` }} />
          </div>

          <dl className="today-figures">
            <div className="figure figure--run">
              <dt className="figure-label plate">Çalışma</dt>
              <dd className="figure-value tnum">{formatDuration(totals.uretimMs)}</dd>
            </div>
            <div className="figure figure--stop">
              <dt className="figure-label plate">Duruş</dt>
              <dd className="figure-value tnum">{formatDuration(totals.durusMs)}</dd>
            </div>
            <div className="figure">
              <dt className="figure-label plate">Palet</dt>
              <dd className="figure-value tnum">{paletler.paletAdedi}</dd>
            </div>
            <div className="figure">
              <dt className="figure-label plate">Koli</dt>
              <dd className="figure-value tnum">{paletler.koliAdedi}</dd>
            </div>
            <div className="figure">
              <dt className="figure-label plate">Paket</dt>
              <dd className="figure-value tnum">{paket ?? '—'}</dd>
            </div>
          </dl>
        </section>

        {/* NEDEN */}
        <section className="zone zone--why">
          <div className="why-col">
            <h2 className="zone-title plate">Duruş sebepleri</h2>
            {topReasons.length === 0 ? (
              <p className="zone-empty plate">Duruş kaydı yok</p>
            ) : (
              <ul className="reasons-list">
                {topReasons.map((reason) => (
                  <li key={reason.note ?? '__yok__'} className="reasons-row">
                    <div className="reasons-row-head">
                      <span className="reasons-row-label">{reason.note ?? NO_REASON_LABEL}</span>
                      <span className="reasons-row-value tnum">
                        {formatDuration(reason.ms)}
                        <span className="reasons-row-count"> ×{reason.adet}</span>
                      </span>
                    </div>
                    <div className="reasons-row-bar-track">
                      <div
                        className="reasons-row-bar-fill"
                        style={{ width: `${maxReasonMs > 0 ? (reason.ms / maxReasonMs) * 100 : 0}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="why-col">
            <h2 className="zone-title plate">Son olaylar</h2>
            {recentIntervals.length === 0 ? (
              <p className="zone-empty plate">Olay yok</p>
            ) : (
              <ul className="feed-list">
                {recentIntervals.map((interval) => (
                  <li
                    key={interval.eventId}
                    className={`feed-row${interval.ongoing ? ' feed-row--ongoing' : ''} feed-row--${interval.kind}`}
                  >
                    <span className="feed-row-time tnum">
                      {formatShortTime(new Date(interval.startMs))}
                    </span>
                    <span className="feed-row-label">
                      {interval.kind === 'durus'
                        ? interval.note || NO_REASON_LABEL
                        : runsById.get(interval.productRunId)?.urun_adi || 'Üretim'}
                    </span>
                    <span className="feed-row-duration tnum">
                      {formatDuration(interval.durationMs)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}

export default ManagerDashboard

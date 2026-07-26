import { useEffect, useMemo, useState } from 'react'
import { useLineStatus } from '../hooks/useLineStatus'
import { useActiveProductionRun } from '../hooks/useActiveProductionRun'
import { useStopEvents } from '../hooks/useStopEvents'
import { useStopReasons } from '../hooks/useStopReasons'
import { formatDuration } from '../lib/duration'
import { formatClock, formatDateLabel, formatShortTime } from '../lib/time'
import StatusBadge from '../components/StatusBadge'
import './ManagerDashboard.css'

const LINE_CODE = 'PFM-11'
const RECENT_EVENTS_LIMIT = 8
const TOP_REASONS_LIMIT = 5
const NO_REASON_LABEL = 'Sebep girilmemiş'
const FULL_URGENCY_MS = 30 * 60 * 1000

function eventDurationMs(event, nowMs) {
  const start = new Date(event.started_at).getTime()
  const end = event.ended_at ? new Date(event.ended_at).getTime() : nowMs
  return Math.max(0, end - start)
}

function ManagerDashboard() {
  const { line, loading, error } = useLineStatus(LINE_CODE)
  const { run } = useActiveProductionRun(LINE_CODE)
  const { events } = useStopEvents(LINE_CODE)
  const reasons = useStopReasons()
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const intervalId = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(intervalId)
  }, [])

  const reasonByCode = useMemo(() => {
    const map = new Map()
    reasons.forEach((reason) => map.set(reason.code, reason))
    return map
  }, [reasons])

  const topReasons = useMemo(() => {
    const totals = new Map()

    for (const event of events) {
      const key = event.reason_code ?? '__none__'
      const duration = eventDurationMs(event, now)
      totals.set(key, (totals.get(key) ?? 0) + duration)
    }

    const rows = Array.from(totals.entries()).map(([code, ms]) => ({
      code,
      label: code === '__none__' ? NO_REASON_LABEL : reasonByCode.get(code)?.label ?? code,
      /* Çubuk rengi planlı/plansız ayrımını taşır — dekor değil, bilgi. */
      category: reasonByCode.get(code)?.category ?? 'bilinmiyor',
      ms,
    }))

    rows.sort((a, b) => b.ms - a.ms)
    return rows.slice(0, TOP_REASONS_LIMIT)
  }, [events, now, reasonByCode])

  const maxReasonMs = topReasons[0]?.ms ?? 0
  const recentEvents = events.slice(0, RECENT_EVENTS_LIMIT)
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

  if (!line) {
    return (
      <div className="manager-shell is-durdu">
        <div className="andon-rail" />
        <div className="manager-dashboard manager-dashboard--center">
          <p className="plate">{LINE_CODE} hattı bulunamadı</p>
        </div>
      </div>
    )
  }

  const elapsedInCurrentStatusMs = now - new Date(line.status_changed_at).getTime()
  const totalProductionMs =
    line.total_production_seconds * 1000 +
    (line.status === 'uretimde' ? elapsedInCurrentStatusMs : 0)
  const totalDowntimeMs =
    line.total_downtime_seconds * 1000 +
    (line.status !== 'uretimde' ? elapsedInCurrentStatusMs : 0)

  const totalTrackedMs = totalProductionMs + totalDowntimeMs
  const timeUsagePercent = totalTrackedMs > 0 ? (totalProductionMs / totalTrackedMs) * 100 : 0
  const hasTrackedTime = totalTrackedMs > 0

  const urgency =
    line.status === 'durdu' ? Math.min(1, elapsedInCurrentStatusMs / FULL_URGENCY_MS) : 0

  return (
    <div className={`manager-shell is-${line.status}`}>
      <div
        className={`andon-rail${line.status === 'durdu' ? ' andon-rail--pulsing' : ''}`}
        style={{ '--urgency': urgency }}
      />

      <div className="manager-dashboard">
        <header className="manager-header">
          <span className="manager-line-code">{LINE_CODE}</span>
          <span className="manager-date plate">{formatDateLabel(nowDate)}</span>
          <span className="manager-clock tnum">{formatClock(nowDate)}</span>
        </header>

        {error && <div className="manager-error">{error}</div>}

        {/* ŞİMDİ — hattın o anki hali, uzaktan tek bakışta okunacak katman */}
        <section className="zone zone--now">
          <h2 className="zone-title plate">Şimdi</h2>
          <div className="now-state" aria-live="polite">
            <StatusBadge status={line.status} size="xl" />
            <span className="now-elapsed tnum">{formatDuration(elapsedInCurrentStatusMs)}</span>
          </div>
          {run ? (
            <div className="now-run">
              <span className="now-run-product">{run.urun_adi}</span>
              <span className="now-run-meta plate">
                {run.vardiya}. vardiya · hedef {run.hedef_hiz_pkt_dk} pkt/dk
              </span>
            </div>
          ) : (
            <div className="now-run-empty plate">Üretim başlatılmadı</div>
          )}
        </section>

        {/* BUGÜN — birikmiş zaman. Simit yerine oransal çubuk: bölünmeyi
            doğrudan gösterir ve 5 metreden okunur. */}
        <section className="zone zone--today">
          <div className="zone-head">
            <h2 className="zone-title plate">Bugün</h2>
            <span className="usage-figure tnum">
              {hasTrackedTime ? `%${Math.round(timeUsagePercent)}` : '—'}
              <span className="usage-figure-note plate">çalışma oranı</span>
            </span>
          </div>

          <div
            className="split-bar"
            role="img"
            aria-label={
              hasTrackedTime
                ? `Çalışma oranı yüzde ${Math.round(timeUsagePercent)}`
                : 'Henüz kayıtlı süre yok'
            }
          >
            <div className="split-bar-run" style={{ width: `${timeUsagePercent}%` }} />
          </div>

          <dl className="today-figures">
            <div className="figure figure--run">
              <dt className="figure-label plate">Çalışma</dt>
              <dd className="figure-value tnum">{formatDuration(totalProductionMs)}</dd>
            </div>
            <div className="figure figure--stop">
              <dt className="figure-label plate">Duruş</dt>
              <dd className="figure-value tnum">{formatDuration(totalDowntimeMs)}</dd>
            </div>
            <div className="figure">
              <dt className="figure-label plate">Palet</dt>
              <dd className="figure-value tnum">{line.pallet_count}</dd>
            </div>
            <div className="figure">
              <dt className="figure-label plate">Paket</dt>
              <dd className="figure-value tnum">{line.package_count}</dd>
            </div>
          </dl>
        </section>

        {/* NEDEN — zamanı ne yiyor */}
        <section className="zone zone--why">
          <div className="why-col">
            <h2 className="zone-title plate">Duruş sebepleri</h2>
            {topReasons.length === 0 ? (
              <p className="zone-empty plate">Duruş kaydı yok</p>
            ) : (
              <ul className="reasons-list">
                {topReasons.map((reason) => (
                  <li key={reason.code} className={`reasons-row reasons-row--${reason.category}`}>
                    <div className="reasons-row-head">
                      <span className="reasons-row-label">{reason.label}</span>
                      <span className="reasons-row-value tnum">{formatDuration(reason.ms)}</span>
                    </div>
                    <div className="reasons-row-bar-track">
                      <div
                        className="reasons-row-bar-fill"
                        style={{
                          width: `${maxReasonMs > 0 ? (reason.ms / maxReasonMs) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="why-col">
            <h2 className="zone-title plate">Son olaylar</h2>
            {recentEvents.length === 0 ? (
              <p className="zone-empty plate">Olay yok</p>
            ) : (
              <ul className="feed-list">
                {recentEvents.map((event) => {
                  const isOngoing = !event.ended_at
                  const label = event.reason_code
                    ? reasonByCode.get(event.reason_code)?.label ?? event.reason_code
                    : NO_REASON_LABEL

                  return (
                    <li key={event.id} className={`feed-row${isOngoing ? ' feed-row--ongoing' : ''}`}>
                      <span className="feed-row-time tnum">
                        {formatShortTime(new Date(event.started_at))}
                      </span>
                      <span className="feed-row-label">{label}</span>
                      <span className="feed-row-duration tnum">
                        {formatDuration(eventDurationMs(event, now))}
                      </span>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}

export default ManagerDashboard

import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLineStatus } from '../hooks/useLineStatus'
import { useActiveProductionRun } from '../hooks/useActiveProductionRun'
import { useStopEvents } from '../hooks/useStopEvents'
import { useStopReasons } from '../hooks/useStopReasons'
import { formatDuration } from '../lib/duration'
import { formatClock, formatDateLabel, formatShortTime } from '../lib/time'
import { getStoredFactory } from '../lib/factoryStorage'
import StatusBadge from '../components/StatusBadge'
import './ManagerDashboard.css'

const RECENT_EVENTS_LIMIT = 8
const TOP_REASONS_LIMIT = 5
const NO_REASON_LABEL = 'Sebep girilmemiş'

function eventDurationMs(event, nowMs) {
  const start = new Date(event.started_at).getTime()
  const end = event.ended_at ? new Date(event.ended_at).getTime() : nowMs
  return Math.max(0, end - start)
}

function ManagerDashboard() {
  const navigate = useNavigate()
  const factory = useMemo(() => getStoredFactory(), [])
  const lineCode = factory?.lineCode

  useEffect(() => {
    if (!factory) navigate('/', { replace: true })
  }, [factory, navigate])

  const { line, loading, error } = useLineStatus(lineCode)
  const { run } = useActiveProductionRun(lineCode)
  const { events } = useStopEvents(lineCode)
  const reasons = useStopReasons()
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const intervalId = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(intervalId)
  }, [])

  const reasonLabelByCode = useMemo(() => {
    const map = new Map()
    reasons.forEach((reason) => map.set(reason.code, reason.label))
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
      label: code === '__none__' ? NO_REASON_LABEL : reasonLabelByCode.get(code) ?? code,
      ms,
    }))

    rows.sort((a, b) => b.ms - a.ms)
    return rows.slice(0, TOP_REASONS_LIMIT)
  }, [events, now, reasonLabelByCode])

  const maxReasonMs = topReasons[0]?.ms ?? 0
  const recentEvents = events.slice(0, RECENT_EVENTS_LIMIT)

  const nowDate = new Date(now)

  if (loading) {
    return (
      <div className="manager-dashboard manager-dashboard--center">
        <p>Yükleniyor...</p>
      </div>
    )
  }

  if (!line) {
    return (
      <div className="manager-dashboard manager-dashboard--center">
        <p>{lineCode} hattı bulunamadı.</p>
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

  return (
    <div className={`manager-dashboard manager-dashboard--${line.status}`}>
      <header className="manager-header">
        <div className="manager-header-left">
          <span className="manager-line-code">{lineCode}</span>
          <span className="manager-date">{formatDateLabel(nowDate)}</span>
        </div>
        <span className="manager-clock">{formatClock(nowDate)}</span>
        <StatusBadge status={line.status} size="xl" />
      </header>

      {error && <div className="manager-error">{error}</div>}

      <div className="manager-top-row">
        <div className="panel active-run-panel">
          <span className="panel-title">Aktif Üretim</span>
          {run ? (
            <div className="active-run-body">
              <span className="active-run-product">{run.urun_adi}</span>
              <div className="active-run-meta">
                <div className="active-run-meta-item">
                  <span className="active-run-meta-label">Vardiya</span>
                  <span className="active-run-meta-value">{run.vardiya}</span>
                </div>
                <div className="active-run-meta-item">
                  <span className="active-run-meta-label">Hedef Hız</span>
                  <span className="active-run-meta-value">
                    {run.hedef_hiz_pkt_dk} <small>pkt/dk</small>
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="active-run-empty">Üretim yok</div>
          )}
        </div>

        <div className="panel usage-panel">
          <span className="panel-title">Zaman Kullanımı</span>
          <div className="usage-ring" style={{ '--pct': `${timeUsagePercent}%` }}>
            <span className="usage-ring-value">
              {totalTrackedMs > 0 ? `${Math.round(timeUsagePercent)}%` : '—'}
            </span>
          </div>
        </div>
      </div>

      <div className="manager-metrics">
        <div className="metric-card">
          <span className="metric-label">Toplam Çalışma Süresi</span>
          <span className="metric-value">{formatDuration(totalProductionMs)}</span>
        </div>
        <div className="metric-card">
          <span className="metric-label">Toplam Duruş Süresi</span>
          <span className="metric-value">{formatDuration(totalDowntimeMs)}</span>
        </div>
        <div className="metric-card">
          <span className="metric-label">Palet</span>
          <span className="metric-value">{line.pallet_count}</span>
        </div>
        <div className="metric-card">
          <span className="metric-label">Paket</span>
          <span className="metric-value">{line.package_count}</span>
        </div>
      </div>

      <div className="manager-bottom-row">
        <div className="panel reasons-panel">
          <span className="panel-title">En Çok Duruş Sebepleri</span>
          {topReasons.length === 0 ? (
            <div className="panel-empty">Henüz duruş kaydı yok</div>
          ) : (
            <ul className="reasons-list">
              {topReasons.map((reason) => (
                <li key={reason.code} className="reasons-row">
                  <div className="reasons-row-head">
                    <span className="reasons-row-label">{reason.label}</span>
                    <span className="reasons-row-value">{formatDuration(reason.ms)}</span>
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

        <div className="panel feed-panel">
          <span className="panel-title">Son Olaylar Akışı</span>
          {recentEvents.length === 0 ? (
            <div className="panel-empty">Henüz olay yok</div>
          ) : (
            <ul className="feed-list">
              {recentEvents.map((event) => {
                const isOngoing = !event.ended_at
                const label = event.reason_code
                  ? reasonLabelByCode.get(event.reason_code) ?? event.reason_code
                  : NO_REASON_LABEL

                return (
                  <li key={event.id} className={`feed-row${isOngoing ? ' feed-row--ongoing' : ''}`}>
                    <span className="feed-row-time">{formatShortTime(new Date(event.started_at))}</span>
                    <span className="feed-row-label">{label}</span>
                    <span className="feed-row-duration">
                      {formatDuration(eventDurationMs(event, now))}
                      {isOngoing && <span className="feed-row-live"> · devam ediyor</span>}
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

export default ManagerDashboard

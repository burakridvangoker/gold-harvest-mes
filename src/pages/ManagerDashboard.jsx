import { useEffect, useState } from 'react'
import { useLineStatus } from '../hooks/useLineStatus'
import { formatDuration } from '../lib/duration'
import StatusBadge from '../components/StatusBadge'
import './ManagerDashboard.css'

const LINE_CODE = 'PFM-11'

function ManagerDashboard() {
  const { line, loading, error } = useLineStatus(LINE_CODE)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const intervalId = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(intervalId)
  }, [])

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
        <p>{LINE_CODE} hattı bulunamadı.</p>
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

  return (
    <div className="manager-dashboard">
      <header className="manager-header">
        <span className="manager-line-code">{LINE_CODE}</span>
        <StatusBadge status={line.status} size="lg" />
      </header>

      {error && <div className="manager-error">{error}</div>}

      <div className="manager-grid">
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
    </div>
  )
}

export default ManagerDashboard

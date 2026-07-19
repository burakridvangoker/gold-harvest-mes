import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useLineStatus } from '../hooks/useLineStatus'
import { formatDuration } from '../lib/duration'
import StatusBadge from '../components/StatusBadge'
import './OperatorPanel.css'

const LINE_CODE = 'PFM-11'

function OperatorPanel() {
  const { line, setLine, loading, error, setError } = useLineStatus(LINE_CODE)
  const [pending, setPending] = useState(false)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const intervalId = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(intervalId)
  }, [])

  const applyUpdate = useCallback(
    async (dbPatch, localPatch = dbPatch) => {
      setLine((prev) => (prev ? { ...prev, ...localPatch } : prev))
      setPending(true)
      setError(null)

      const { error } = await supabase
        .from('line_status')
        .update(dbPatch)
        .eq('line_code', LINE_CODE)

      setPending(false)

      if (error) {
        setError('Kaydedilemedi: ' + error.message)
      }
    },
    [setLine, setError],
  )

  const handleStartProduction = () =>
    applyUpdate(
      { status: 'uretimde' },
      { status: 'uretimde', status_changed_at: new Date().toISOString() },
    )
  const handleStop = () =>
    applyUpdate(
      { status: 'durdu' },
      { status: 'durdu', status_changed_at: new Date().toISOString() },
    )
  const handlePalletPlusOne = () => {
    if (!line) return
    applyUpdate({ pallet_count: line.pallet_count + 1 })
  }

  if (loading) {
    return (
      <div className="operator-panel operator-panel--center">
        <p>Yükleniyor...</p>
      </div>
    )
  }

  if (!line) {
    return (
      <div className="operator-panel operator-panel--center">
        <p>{LINE_CODE} hattı bulunamadı.</p>
      </div>
    )
  }

  const durationLabel = line.status === 'uretimde' ? 'Çalışma süresi' : 'Duruş süresi'
  const durationMs = now - new Date(line.status_changed_at).getTime()

  return (
    <div className="operator-panel">
      <header className="operator-header">
        <span className="operator-line-code">{LINE_CODE}</span>
        <StatusBadge status={line.status} />
      </header>

      {error && <div className="operator-error">{error}</div>}

      <div className="duration-card">
        <span className="duration-label">{durationLabel}</span>
        <span className="duration-value">{formatDuration(durationMs)}</span>
      </div>

      <div className="operator-counts">
        <div className="count-card">
          <span className="count-label">Palet</span>
          <span className="count-value">{line.pallet_count}</span>
        </div>
        <div className="count-card">
          <span className="count-label">Paket</span>
          <span className="count-value">{line.package_count}</span>
        </div>
      </div>

      <div className="operator-actions">
        <button
          type="button"
          className="action-button action-button--start"
          onClick={handleStartProduction}
          disabled={pending || line.status === 'uretimde'}
        >
          ÜRETİME GEÇ
        </button>
        <button
          type="button"
          className="action-button action-button--stop"
          onClick={handleStop}
          disabled={pending || line.status === 'durdu'}
        >
          DURDU
        </button>
        <button
          type="button"
          className="action-button action-button--pallet"
          onClick={handlePalletPlusOne}
          disabled={pending}
        >
          +1 PALET
        </button>
      </div>
    </div>
  )
}

export default OperatorPanel

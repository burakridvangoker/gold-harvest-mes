import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import './OperatorPanel.css'

const LINE_CODE = 'PFM-11'

const STATUS_LABELS = {
  beklemede: 'BEKLEMEDE',
  uretimde: 'ÜRETİMDE',
  durdu: 'DURDU',
}

function formatDuration(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  const pad = (n) => String(n).padStart(2, '0')
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
}

function OperatorPanel() {
  const [line, setLine] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [pending, setPending] = useState(false)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const intervalId = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(intervalId)
  }, [])

  useEffect(() => {
    let isMounted = true

    async function fetchLine() {
      const { data, error } = await supabase
        .from('line_status')
        .select('*')
        .eq('line_code', LINE_CODE)
        .single()

      if (!isMounted) return

      if (error) {
        setError('Veri yüklenemedi: ' + error.message)
      } else {
        setLine(data)
      }
      setLoading(false)
    }

    fetchLine()

    const channel = supabase
      .channel(`line_status_${LINE_CODE}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'line_status',
          filter: `line_code=eq.${LINE_CODE}`,
        },
        (payload) => {
          if (payload.new) setLine(payload.new)
        },
      )
      .subscribe()

    return () => {
      isMounted = false
      supabase.removeChannel(channel)
    }
  }, [])

  const applyUpdate = useCallback(async (dbPatch, localPatch = dbPatch) => {
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
  }, [])

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
        <span className={`status-badge status-badge--${line.status}`}>
          {STATUS_LABELS[line.status] ?? line.status}
        </span>
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

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import './OperatorPanel.css'

const LINE_CODE = 'PFM-11'

const STATUS_LABELS = {
  beklemede: 'BEKLEMEDE',
  uretimde: 'ÜRETİMDE',
  durdu: 'DURDU',
}

function OperatorPanel() {
  const [line, setLine] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [pending, setPending] = useState(false)

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

  const applyUpdate = useCallback(async (patch) => {
    setLine((prev) => (prev ? { ...prev, ...patch } : prev))
    setPending(true)
    setError(null)

    const { error } = await supabase
      .from('line_status')
      .update(patch)
      .eq('line_code', LINE_CODE)

    setPending(false)

    if (error) {
      setError('Kaydedilemedi: ' + error.message)
    }
  }, [])

  const handleStartProduction = () => applyUpdate({ status: 'uretimde' })
  const handleStop = () => applyUpdate({ status: 'durdu' })
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

  return (
    <div className="operator-panel">
      <header className="operator-header">
        <span className="operator-line-code">{LINE_CODE}</span>
        <span className={`status-badge status-badge--${line.status}`}>
          {STATUS_LABELS[line.status] ?? line.status}
        </span>
      </header>

      {error && <div className="operator-error">{error}</div>}

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

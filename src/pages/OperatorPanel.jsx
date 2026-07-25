import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../hooks/useAuth'
import { useLineStatus } from '../hooks/useLineStatus'
import { useStopReasons } from '../hooks/useStopReasons'
import { formatDuration } from '../lib/duration'
import StatusBadge from '../components/StatusBadge'
import ReasonPicker from '../components/ReasonPicker'
import ProductionRunWizard from '../components/ProductionRunWizard'
import './OperatorPanel.css'

const LINE_CODE = 'PFM-11'

function OperatorPanel() {
  const { signOut } = useAuth()
  const { line, setLine, loading, error, setError } = useLineStatus(LINE_CODE)
  const reasons = useStopReasons()
  const [pending, setPending] = useState(false)
  const [now, setNow] = useState(() => Date.now())
  const [openStopEventId, setOpenStopEventId] = useState(null)
  const [wizardOpen, setWizardOpen] = useState(false)

  const plansizReasons = useMemo(
    () => reasons.filter((reason) => reason.category === 'plansiz'),
    [reasons],
  )
  const planliReasons = useMemo(
    () => reasons.filter((reason) => reason.category === 'planli'),
    [reasons],
  )

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

  const handleStartProduction = useCallback(async () => {
    if (!line || pending) return
    const previousLine = line
    const timestamp = new Date().toISOString()

    setLine((prev) =>
      prev ? { ...prev, status: 'uretimde', status_changed_at: timestamp } : prev,
    )
    setPending(true)

    try {
      const [lineResult, stopEventResult] = await Promise.all([
        supabase.from('line_status').update({ status: 'uretimde' }).eq('line_code', LINE_CODE),
        supabase
          .from('stop_events')
          .update({ ended_at: timestamp })
          .eq('line_code', LINE_CODE)
          .is('ended_at', null)
          .select('id'),
      ])

      if (lineResult.error || stopEventResult.error) {
        setLine(previousLine)
      } else if (stopEventResult.data?.length) {
        setOpenStopEventId(stopEventResult.data[0].id)
      }
    } catch {
      setLine(previousLine)
    } finally {
      setPending(false)
    }
  }, [line, pending, setLine])

  const handleStop = useCallback(async () => {
    if (!line || pending) return
    const previousLine = line
    const timestamp = new Date().toISOString()

    setLine((prev) => (prev ? { ...prev, status: 'durdu', status_changed_at: timestamp } : prev))
    setPending(true)

    try {
      const [lineResult, stopEventResult] = await Promise.all([
        supabase.from('line_status').update({ status: 'durdu' }).eq('line_code', LINE_CODE),
        supabase.from('stop_events').insert({ line_code: LINE_CODE, started_at: timestamp }),
      ])

      if (lineResult.error || stopEventResult.error) {
        setLine(previousLine)
      }
    } catch {
      setLine(previousLine)
    } finally {
      setPending(false)
    }
  }, [line, pending, setLine])

  const handlePalletPlusOne = () => {
    if (!line) return
    applyUpdate({ pallet_count: line.pallet_count + 1 })
  }

  const handleSkipReason = useCallback(() => {
    setOpenStopEventId(null)
  }, [])

  const handleSelectReason = useCallback(async (code) => {
    const eventId = openStopEventId
    if (!eventId) return

    setOpenStopEventId(null)

    const { error } = await supabase.from('stop_events').update({ reason_code: code }).eq('id', eventId)

    if (error) {
      setOpenStopEventId(eventId)
    }
  }, [openStopEventId])

  const handleCreateProductionRun = useCallback(
    async (payload) => {
      setWizardOpen(false)
      setError(null)

      const { error } = await supabase
        .from('production_runs')
        .insert({ line_code: LINE_CODE, ...payload })

      if (error) {
        setError('Üretim kaydedilemedi: ' + error.message)
      }
    },
    [setError],
  )

  const handleSubmitReasonNote = useCallback(async (note) => {
    const eventId = openStopEventId
    if (!eventId) return

    setOpenStopEventId(null)

    const { error } = await supabase
      .from('stop_events')
      .update({ reason_note: note })
      .eq('id', eventId)

    if (error) {
      setOpenStopEventId(eventId)
    }
  }, [openStopEventId])

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
        <button type="button" className="operator-logout" onClick={signOut}>
          Çıkış
        </button>
      </header>

      <button
        type="button"
        className="new-run-button"
        onClick={() => setWizardOpen(true)}
      >
        <span className="new-run-icon">+</span> Yeni Üretim Başlat
      </button>

      {error && <div className="operator-error">{error}</div>}

      <div className={`duration-card duration-card--${line.status}`}>
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

      <ReasonPicker
        open={openStopEventId !== null}
        plansizReasons={plansizReasons}
        planliReasons={planliReasons}
        onSelect={handleSelectReason}
        onSkip={handleSkipReason}
        onSubmitNote={handleSubmitReasonNote}
      />

      <ProductionRunWizard
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        onSubmit={handleCreateProductionRun}
      />
    </div>
  )
}

export default OperatorPanel

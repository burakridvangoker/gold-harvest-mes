import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useShift } from '../hooks/useShift'
import { useFrequentNotes } from '../hooks/useFrequentNotes'
import {
  buildIntervals,
  currentState,
  koliToPaket,
  newEventWindow,
  paceStatus,
  palletTotals,
} from '../lib/timeline'
import { formatDelta, formatDuration } from '../lib/duration'
import StatusBadge from '../components/StatusBadge'
import TimeSheet from '../components/TimeSheet'
import StopNoteSheet from '../components/StopNoteSheet'
import EventLog from '../components/EventLog'
import ShiftWizard from '../components/ShiftWizard'
import './OperatorPanel.css'

const LINE_CODE = 'PFM-11'
const SAAT_MS = 60 * 60 * 1000
const TAM_ISRAR_MS = 30 * 60 * 1000

function OperatorPanel() {
  const { shift, runs, events, pallets, loading, error, setError, refresh } = useShift(LINE_CODE)
  const suggestions = useFrequentNotes(LINE_CODE)

  const [now, setNow] = useState(() => Date.now())
  const [busy, setBusy] = useState(false)
  const [wizardOpen, setWizardOpen] = useState(false)
  const [logOpen, setLogOpen] = useState(false)
  const [pending, setPending] = useState(null)
  const [noteEventId, setNoteEventId] = useState(null)
  const [palletKoli, setPalletKoli] = useState('')

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  const runsById = useMemo(() => new Map(runs.map((run) => [run.id, run])), [runs])

  /* Aktif ürün son olayın işaret ettiği üründür; olay yoksa son açılan ürün. */
  const activeRun = useMemo(() => {
    const sorted = [...events].sort((a, b) => new Date(a.at) - new Date(b.at))
    const lastRunId = sorted[sorted.length - 1]?.product_run_id
    return (lastRunId && runsById.get(lastRunId)) || runs[runs.length - 1] || null
  }, [events, runs, runsById])

  const shiftStartMs = shift ? new Date(shift.started_at).getTime() : null
  const intervals = useMemo(() => buildIntervals(events, now), [events, now])
  const paletler = useMemo(() => palletTotals(pallets), [pallets])
  const state = useMemo(() => currentState(events), [events])
  const son = intervals[intervals.length - 1] ?? null

  const paket = koliToPaket(paletler.koliAdedi, activeRun?.koli_ici_adet)

  const pace = useMemo(
    () =>
      shift
        ? paceStatus({
            hedefKoli: shift.hedef_koli,
            uretilenKoli: paletler.koliAdedi,
            shiftStartMs,
            shiftEndMs: shift.planlanan_bitis ? new Date(shift.planlanan_bitis).getTime() : null,
            nowMs: now,
          })
        : null,
    [shift, paletler.koliAdedi, shiftStartMs, now],
  )

  const eventRange = useMemo(
    () => newEventWindow(events, { shiftStartMs, nowMs: now }),
    [events, shiftStartMs, now],
  )

  const isRunning = state === 'uretimde'

  /* ---- Yazma işlemleri ---- */

  const guard = useCallback(
    async (work, mesaj) => {
      if (busy) return
      setBusy(true)
      setError(null)

      const { error: failure } = await work()

      if (failure) setError(`${mesaj}: ${failure.message}`)
      else await refresh()

      setBusy(false)
    },
    [busy, setError, refresh],
  )

  const createShift = useCallback(
    async (payload, atMs) => {
      if (busy) return
      setBusy(true)
      setError(null)

      const startedAt = new Date(atMs).toISOString()
      const sure = payload.shift.vardiyaSaat || 8

      const { data: newShift, error: shiftError } = await supabase
        .from('shifts')
        .insert({
          line_code: LINE_CODE,
          vardiya: payload.shift.vardiya,
          operator: payload.shift.operator,
          hedef_koli: payload.shift.hedef_koli,
          started_at: startedAt,
          planlanan_bitis: new Date(atMs + sure * SAAT_MS).toISOString(),
        })
        .select()
        .single()

      if (shiftError) {
        setError('Vardiya açılamadı: ' + shiftError.message)
        setBusy(false)
        return
      }

      const { data: newRun, error: runError } = await supabase
        .from('product_runs')
        .insert({ shift_id: newShift.id, line_code: LINE_CODE, sira: 1, ...payload.run })
        .select()
        .single()

      if (runError) {
        setError('Ürün kaydedilemedi: ' + runError.message)
        setBusy(false)
        return
      }

      const { error: eventError } = await supabase.from('timeline_events').insert({
        line_code: LINE_CODE,
        shift_id: newShift.id,
        product_run_id: newRun.id,
        at: startedAt,
        kind: 'uretim',
      })

      if (eventError) setError('Başlangıç kaydedilemedi: ' + eventError.message)

      await refresh()
      setBusy(false)
    },
    [busy, setError, refresh],
  )

  const addEvent = useCallback(
    async (kind, atMs) => {
      if (busy || !shift) return null
      setBusy(true)
      setError(null)

      const { data, error: failure } = await supabase
        .from('timeline_events')
        .insert({
          line_code: LINE_CODE,
          shift_id: shift.id,
          product_run_id: activeRun?.id ?? null,
          at: new Date(atMs).toISOString(),
          kind,
        })
        .select('id')
        .single()

      if (failure) setError('Kaydedilemedi: ' + failure.message)
      else await refresh()

      setBusy(false)
      return failure ? null : data.id
    },
    [busy, shift, activeRun, setError, refresh],
  )

  /* ---- TimeSheet onayı: hangi aksiyon bekliyorsa o çalışır ---- */

  const handleTimeConfirm = useCallback(
    async (atMs) => {
      const action = pending
      setPending(null)
      if (!action) return

      if (action.type === 'shift-start') {
        await createShift(action.payload, atMs)
        return
      }

      if (action.type === 'start') {
        await addEvent('uretim', atMs)
        return
      }

      if (action.type === 'stop') {
        const id = await addEvent('durus', atMs)
        if (id) setNoteEventId(id)
        return
      }

      if (action.type === 'pallet') {
        const koli = parseInt(palletKoli, 10)
        await guard(
          () =>
            supabase.from('pallet_records').insert({
              line_code: LINE_CODE,
              shift_id: shift.id,
              product_run_id: activeRun.id,
              completed_at: new Date(atMs).toISOString(),
              koli_count: Number.isFinite(koli) && koli > 0 ? koli : activeRun.koli_per_palet,
            }),
          'Palet kaydedilemedi',
        )
        return
      }

      if (action.type === 'shift-end') {
        await guard(
          () =>
            supabase
              .from('shifts')
              .update({ ended_at: new Date(atMs).toISOString() })
              .eq('id', shift.id),
          'Vardiya kapatılamadı',
        )
      }
    },
    [pending, createShift, addEvent, guard, shift, activeRun, palletKoli],
  )

  const saveNote = useCallback(
    async (note) => {
      const id = noteEventId
      setNoteEventId(null)
      if (!id || !note) return

      await guard(
        () => supabase.from('timeline_events').update({ note }).eq('id', id),
        'Sebep kaydedilemedi',
      )
    },
    [noteEventId, guard],
  )

  const updateEvent = useCallback(
    (id, patch) =>
      guard(() => supabase.from('timeline_events').update(patch).eq('id', id), 'Güncellenemedi'),
    [guard],
  )

  const deleteEvent = useCallback(
    (id) => guard(() => supabase.from('timeline_events').delete().eq('id', id), 'Silinemedi'),
    [guard],
  )

  const updatePallet = useCallback(
    (id, patch) =>
      guard(() => supabase.from('pallet_records').update(patch).eq('id', id), 'Güncellenemedi'),
    [guard],
  )

  const deletePallet = useCallback(
    (id) => guard(() => supabase.from('pallet_records').delete().eq('id', id), 'Silinemedi'),
    [guard],
  )

  /* ---- Görünüm ---- */

  if (loading) {
    return (
      <div className="operator-shell is-beklemede">
        <div className="andon-rail" />
        <div className="operator-panel operator-panel--center">
          <p className="plate">Yükleniyor</p>
        </div>
      </div>
    )
  }

  if (!shift) {
    return (
      <div className="operator-shell is-beklemede">
        <div className="andon-rail" />
        <div className="operator-panel operator-panel--center">
          <span className="operator-line-code">{LINE_CODE}</span>
          <p className="operator-idle-text">Açık vardiya yok</p>
          {error && <div className="operator-error">{error}</div>}
          <button
            type="button"
            className="action-primary action-primary--start"
            onClick={() => setWizardOpen(true)}
          >
            VARDİYA BAŞLAT
          </button>
        </div>

        <ShiftWizard
          open={wizardOpen}
          mode="shift"
          onClose={() => setWizardOpen(false)}
          onSubmit={(payload) => {
            setWizardOpen(false)
            setPending({ type: 'shift-start', payload })
          }}
        />

        <TimeSheet
          open={pending?.type === 'shift-start'}
          title="Vardiya ne zaman başladı?"
          confirmLabel="Vardiyayı başlat"
          tone="start"
          initialMs={now}
          range={{ maxMs: now }}
          onConfirm={handleTimeConfirm}
          onCancel={() => setPending(null)}
        />
      </div>
    )
  }

  const durationLabel = isRunning ? 'Çalışma süresi' : 'Duruş süresi'
  const urgency = state === 'durdu' && son ? Math.min(1, son.durationMs / TAM_ISRAR_MS) : 0

  return (
    <div className={`operator-shell is-${state}`}>
      <div
        className={`andon-rail${state === 'durdu' ? ' andon-rail--pulsing' : ''}`}
        style={{ '--urgency': urgency }}
      />

      <div className="operator-panel">
        <header className="operator-header">
          <div className="operator-header-left">
            <span className="operator-line-code">{LINE_CODE}</span>
            {activeRun && <span className="operator-run-name">{activeRun.urun_adi}</span>}
          </div>
          <span aria-live="polite">
            <StatusBadge status={state} />
          </span>
        </header>

        {error && <div className="operator-error">{error}</div>}

        {/*
         * Her zaman görünür: bunlar kaydırılabilir alanın içinde kalırsa
         * küçük telefonlarda (ör. 375×667) kaydırma ipucu olmadan ekran
         * dışına taşabiliyordu. "İstediğini sil/düzelt" sözü verdiğimiz
         * erişim noktası hiçbir zaman gizlenmemeli.
         */}
        <div className="operator-secondary">
          <button type="button" className="ghost-button" onClick={() => setLogOpen(true)}>
            Olay geçmişi
          </button>
          <button
            type="button"
            className="ghost-button"
            onClick={() => setPending({ type: 'shift-end' })}
          >
            Vardiyayı bitir
          </button>
        </div>

        <div className="operator-body">
          <div className="operator-readout">
            <div className="duration-block">
              <span className="duration-label plate">{durationLabel}</span>
              <span className="duration-value tnum">
                {formatDuration(son ? son.durationMs : 0)}
              </span>
            </div>

            {pace && (
              <div className={`plan-block plan-block--${pace.durum}`}>
                <div className="plan-head">
                  <span className="plan-label plate">Vardiya planı</span>
                  <span className="plan-figure tnum">
                    {pace.uretilenKoli} / {pace.hedefKoli} <small>koli</small>
                  </span>
                </div>
                <div className="plan-track">
                  <div className="plan-fill" style={{ width: `${pace.ilerleme * 100}%` }} />
                </div>
                <div className="plan-foot">
                  <span className="plan-remaining tnum">{pace.kalanKoli} koli kaldı</span>
                  <span className="plan-pace">
                    {pace.durum === 'tamam'
                      ? 'Hedef tamam'
                      : pace.durum === 'planinda'
                        ? 'Planında'
                        : `${formatDelta(pace.farkDk)} ${
                            pace.durum === 'onde' ? 'öndesin' : 'geridesin'
                          }`}
                  </span>
                </div>
              </div>
            )}

            <div className="operator-counts">
              <div className="count-cell">
                <span className="count-label plate">Palet</span>
                <span className="count-value tnum">{paletler.paletAdedi}</span>
              </div>
              <div className="count-cell">
                <span className="count-label plate">Koli</span>
                <span className="count-value tnum">{paletler.koliAdedi}</span>
              </div>
              <div className="count-cell">
                <span className="count-label plate">Paket</span>
                <span className="count-value tnum">{paket ?? '—'}</span>
              </div>
            </div>
          </div>

          <div className="operator-actions">
            <button
              type="button"
              className={`action-primary action-primary--${isRunning ? 'stop' : 'start'}`}
              onClick={() => setPending({ type: isRunning ? 'stop' : 'start' })}
              disabled={busy}
            >
              {isRunning ? 'DURDUR' : 'BAŞLAT'}
            </button>
            <button
              type="button"
              className="action-secondary"
              onClick={() => {
                setPalletKoli(String(activeRun?.koli_per_palet ?? ''))
                setPending({ type: 'pallet' })
              }}
              disabled={busy || !activeRun}
            >
              +1 PALET
            </button>
          </div>
        </div>

        <TimeSheet
          open={pending?.type === 'start'}
          title="Üretim ne zaman başladı?"
          confirmLabel="Başlat"
          tone="start"
          initialMs={now}
          range={eventRange}
          onConfirm={handleTimeConfirm}
          onCancel={() => setPending(null)}
        />

        <TimeSheet
          open={pending?.type === 'stop'}
          title="Makine ne zaman durdu?"
          confirmLabel="Durdur"
          tone="stop"
          initialMs={now}
          range={eventRange}
          onConfirm={handleTimeConfirm}
          onCancel={() => setPending(null)}
        />

        <TimeSheet
          open={pending?.type === 'pallet'}
          title="Palet ne zaman bitti?"
          confirmLabel="Paleti kaydet"
          initialMs={now}
          range={{ minMs: shiftStartMs, maxMs: now }}
          onConfirm={handleTimeConfirm}
          onCancel={() => setPending(null)}
        >
          <label className="pallet-field">
            <span className="pallet-field-label plate">Bu paletteki koli</span>
            <input
              className="pallet-field-input tnum"
              type="number"
              inputMode="numeric"
              min="1"
              value={palletKoli}
              onChange={(event) => setPalletKoli(event.target.value)}
            />
            <span className="pallet-field-hint">
              Yarım palet çıktıysa gerçek adedi yaz.
            </span>
          </label>
        </TimeSheet>

        <TimeSheet
          open={pending?.type === 'shift-end'}
          title="Vardiya ne zaman bitti?"
          confirmLabel="Vardiyayı bitir"
          initialMs={now}
          range={{ minMs: shiftStartMs, maxMs: now }}
          onConfirm={handleTimeConfirm}
          onCancel={() => setPending(null)}
        />

        <StopNoteSheet
          open={noteEventId !== null}
          suggestions={suggestions}
          onSave={saveNote}
          onSkip={() => setNoteEventId(null)}
        />

        <EventLog
          open={logOpen}
          events={events}
          pallets={pallets}
          runsById={runsById}
          shiftStartMs={shiftStartMs}
          nowMs={now}
          onSaveEvent={updateEvent}
          onDeleteEvent={deleteEvent}
          onSavePallet={updatePallet}
          onDeletePallet={deletePallet}
          onClose={() => setLogOpen(false)}
        />
      </div>
    </div>
  )
}

export default OperatorPanel

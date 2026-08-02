import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useShift } from '../hooks/useShift'
import { useFrequentNotes } from '../hooks/useFrequentNotes'
import { usePersonnel } from '../hooks/usePersonnel'
import { useLineCode } from '../hooks/useLineCode'
import {
  buildIntervals,
  currentState,
  koliToPaket,
  newEventWindow,
  paceStatus,
  palletTotals,
  palletTotalsByRun,
  runSpans,
  shiftPaket,
} from '../lib/timeline'
import { formatBreakdown, formatDelta, formatDuration } from '../lib/duration'
import { formatDateLabel, vardiyaBaslangici, VARDIYA_SURESI_MS } from '../lib/time'
import StatusBadge from '../components/StatusBadge'
import TimeSheet from '../components/TimeSheet'
import StopNoteSheet from '../components/StopNoteSheet'
import SpeedSheet from '../components/SpeedSheet'
import RunEndSheet from '../components/RunEndSheet'
import ProductHistory from '../components/ProductHistory'
import EventLog from '../components/EventLog'
import ShiftWizard from '../components/ShiftWizard'
import OperatorNameField from '../components/OperatorNameField'
import LineSelect from '../components/LineSelect'
import ShiftHistoryPicker from '../components/ShiftHistoryPicker'
import ShiftHistoryDetail from '../components/ShiftHistoryDetail'
import '../components/Sheet.css'
import './OperatorPanel.css'

const TAM_ISRAR_MS = 30 * 60 * 1000

function OperatorPanel() {
  const { lineCode, selectLine, clearLine } = useLineCode()
  const { shift, runs, events, pallets, loading, error, setError, refresh } = useShift(lineCode)
  const suggestions = useFrequentNotes(lineCode)
  const personnel = usePersonnel()

  const [now, setNow] = useState(() => Date.now())
  const [busy, setBusy] = useState(false)
  const [wizardOpen, setWizardOpen] = useState(false)
  const [productWizardOpen, setProductWizardOpen] = useState(false)
  const [runEndOpen, setRunEndOpen] = useState(false)
  const [speedOpen, setSpeedOpen] = useState(false)
  const [operatorOpen, setOperatorOpen] = useState(false)
  const [operatorName, setOperatorName] = useState('')
  const [logOpen, setLogOpen] = useState(false)
  const [historyPickerOpen, setHistoryPickerOpen] = useState(false)
  const [historyShiftId, setHistoryShiftId] = useState(null)
  const [pending, setPending] = useState(null)
  const [noteEventId, setNoteEventId] = useState(null)
  const [palletKoli, setPalletKoli] = useState('')

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  const runsById = useMemo(() => new Map(runs.map((run) => [run.id, run])), [runs])
  const paletlerByRun = useMemo(() => palletTotalsByRun(pallets), [pallets])

  /* Aktif ürün son olayın işaret ettiği üründür; olay yoksa son açılan ürün. */
  const activeRun = useMemo(() => {
    const sorted = [...events].sort((a, b) => new Date(a.at) - new Date(b.at))
    const lastRunId = sorted[sorted.length - 1]?.product_run_id
    return (lastRunId && runsById.get(lastRunId)) || runs[runs.length - 1] || null
  }, [events, runs, runsById])

  const shiftStartMs = shift ? new Date(shift.started_at).getTime() : null
  const intervals = useMemo(() => buildIntervals(events, now), [events, now])
  const paletlerToplam = useMemo(() => palletTotals(pallets), [pallets])
  const state = useMemo(() => currentState(events), [events])
  const son = intervals[intervals.length - 1] ?? null

  /*
   * Tek bir koli_ici_adet (aktif ürününki) ile çarpmak yanlış — vardiyada
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

  const activeRunPaletler = activeRun
    ? paletlerByRun.get(activeRun.id) ?? { paletAdedi: 0, koliAdedi: 0 }
    : { paletAdedi: 0, koliAdedi: 0 }
  const activeRunPaket = koliToPaket(activeRunPaletler.koliAdedi, activeRun?.koli_ici_adet)

  /*
   * Hedef koli ürün bazlıdır (vardiya kurulumunda artık sorulmuyor), bu
   * yüzden tempo da aktif ürüne göre hesaplanır: ürünün kendi başlangıcı
   * ("runSpans") ile vardiyanın planlı bitişi arasında ne kadar önde/geride.
   */
  const activeRunSpan = useMemo(() => {
    if (!activeRun) return null
    return runSpans(events, now).get(activeRun.id) ?? null
  }, [activeRun, events, now])

  const pace = useMemo(
    () =>
      activeRun?.hedef_koli && activeRunSpan && shift
        ? paceStatus({
            hedefKoli: activeRun.hedef_koli,
            uretilenKoli: activeRunPaletler.koliAdedi,
            shiftStartMs: activeRunSpan.startMs,
            shiftEndMs: shift.planlanan_bitis ? new Date(shift.planlanan_bitis).getTime() : null,
            nowMs: now,
          })
        : null,
    [activeRun, activeRunSpan, activeRunPaletler.koliAdedi, shift, now],
  )

  const eventRange = useMemo(
    () => newEventWindow(events, { shiftStartMs, nowMs: now }),
    [events, shiftStartMs, now],
  )

  const isRunning = state === 'uretimde'
  const isMola = state === 'molada'

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
    async (payload) => {
      if (busy) return
      setBusy(true)
      setError(null)

      /*
       * Vardiyaların saatleri sahada sabit ve belli (1. 07-15, 2. 15-23,
       * 3. 23-07) — operatöre "ne zaman başladı" diye sormaya gerek yok.
       */
      const startMs = vardiyaBaslangici(payload.shift.vardiya)
      const startedAt = new Date(startMs).toISOString()

      const { data: newShift, error: shiftError } = await supabase
        .from('shifts')
        .insert({
          line_code: lineCode,
          vardiya: payload.shift.vardiya,
          operator: payload.shift.operator,
          started_at: startedAt,
          planlanan_bitis: new Date(startMs + VARDIYA_SURESI_MS).toISOString(),
        })
        .select()
        .single()

      if (shiftError) {
        setError('Vardiya açılamadı: ' + shiftError.message)
        setBusy(false)
        return
      }

      /*
       * Vardiya ürünsüz, duruştan başlar: sahada genelde önce temizlik/arıza
       * gibi bir duruş olur, ürün ne olacağı henüz belli olmayabilir.
       * Operatör hazır olunca "ÜRÜN BAŞLAT" ile ürün bilgisini girer.
       */
      const { error: eventError } = await supabase.from('timeline_events').insert({
        line_code: lineCode,
        shift_id: newShift.id,
        product_run_id: null,
        at: startedAt,
        kind: 'durus',
      })

      if (eventError) setError('Başlangıç kaydedilemedi: ' + eventError.message)

      await refresh()
      setBusy(false)
    },
    [busy, lineCode, setError, refresh],
  )

  const createProductRun = useCallback(
    async (payload, atMs) => {
      if (busy || !shift) return
      setBusy(true)
      setError(null)

      const nextSira = runs.reduce((max, run) => Math.max(max, run.sira ?? 0), 0) + 1

      const { data: newRun, error: runError } = await supabase
        .from('product_runs')
        .insert({ shift_id: shift.id, line_code: lineCode, sira: nextSira, ...payload.run })
        .select()
        .single()

      if (runError) {
        setError('Ürün kaydedilemedi: ' + runError.message)
        setBusy(false)
        return
      }

      const { error: eventError } = await supabase.from('timeline_events').insert({
        line_code: lineCode,
        shift_id: shift.id,
        product_run_id: newRun.id,
        at: new Date(atMs).toISOString(),
        kind: 'uretim',
      })

      if (eventError) setError('Ürün geçişi kaydedilemedi: ' + eventError.message)

      await refresh()
      setBusy(false)
    },
    [busy, shift, runs, lineCode, setError, refresh],
  )

  const addEvent = useCallback(
    async (kind, atMs, note = null) => {
      if (busy || !shift) return null
      setBusy(true)
      setError(null)

      const { data, error: failure } = await supabase
        .from('timeline_events')
        .insert({
          line_code: lineCode,
          shift_id: shift.id,
          product_run_id: activeRun?.id ?? null,
          at: new Date(atMs).toISOString(),
          kind,
          note,
        })
        .select('id')
        .single()

      if (failure) setError('Kaydedilemedi: ' + failure.message)
      else await refresh()

      setBusy(false)
      return failure ? null : data.id
    },
    [busy, shift, lineCode, activeRun, setError, refresh],
  )

  /* ---- TimeSheet onayı: hangi aksiyon bekliyorsa o çalışır ---- */

  const handleTimeConfirm = useCallback(
    async (atMs) => {
      const action = pending
      setPending(null)
      if (!action) return

      if (action.type === 'product-start') {
        await createProductRun(action.payload, atMs)
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

      if (action.type === 'mola-start') {
        await addEvent('mola', atMs)
        return
      }

      if (action.type === 'mola-end') {
        /*
         * Mola dönüşü direkt üretime değil duruşa geçer: makine molaya
         * girdikten sonra genelde bir-iki dakika içinde tekrar başlıyor ama
         * anında değil — operatör BAŞLAT'a ayrıca basar. Not otomatik
         * dolduruluyor, operatöre ayrıca "neden durdu" sorulmaz.
         */
        await addEvent('durus', atMs, 'Moladan dönüş')
        return
      }

      if (action.type === 'pallet') {
        const koli = parseInt(palletKoli, 10)
        await guard(
          () =>
            supabase.from('pallet_records').insert({
              line_code: lineCode,
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
    [pending, createProductRun, addEvent, guard, shift, lineCode, activeRun, palletKoli],
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

  const updateSpeed = useCallback(
    (value) => {
      setSpeedOpen(false)
      if (!activeRun) return
      guard(
        () => supabase.from('product_runs').update({ calisma_hizi_pkt_dk: value }).eq('id', activeRun.id),
        'Hız kaydedilemedi',
      )
    },
    [activeRun, guard],
  )

  const updateRun = useCallback(
    (id, patch) =>
      guard(() => supabase.from('product_runs').update(patch).eq('id', id), 'Ürün bilgisi güncellenemedi'),
    [guard],
  )

  const updateOperator = useCallback(
    (name) => {
      setOperatorOpen(false)
      if (!shift) return
      guard(
        () => supabase.from('shifts').update({ operator: name.trim() || null }).eq('id', shift.id),
        'Operatör güncellenemedi',
      )
    },
    [shift, guard],
  )

  const handleRunEndConfirm = useCallback(
    async (values) => {
      setRunEndOpen(false)
      if (!activeRun) return

      await guard(
        () => supabase.from('product_runs').update(values).eq('id', activeRun.id),
        'Ürün bilgisi kaydedilemedi',
      )

      setProductWizardOpen(true)
    },
    [activeRun, guard],
  )

  /* ---- Görünüm ---- */

  if (!lineCode) {
    return <LineSelect onSelect={selectLine} />
  }

  if (historyShiftId) {
    return (
      <div className="operator-shell is-beklemede">
        <div className="andon-rail" />
        <div className="operator-panel">
          <header className="operator-header">
            <button type="button" className="operator-line-code" onClick={clearLine}>
              {lineCode}
            </button>
          </header>
          <ShiftHistoryDetail
            shiftId={historyShiftId}
            readOnly={false}
            onBack={() => setHistoryShiftId(null)}
          />
        </div>
      </div>
    )
  }

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
          <button type="button" className="operator-line-code" onClick={clearLine}>
            {lineCode}
          </button>
          <p className="operator-idle-date plate">{formatDateLabel(new Date(now))}</p>
          <p className="operator-idle-text">Açık vardiya yok</p>
          {error && <div className="operator-error">{error}</div>}
          <button
            type="button"
            className="action-primary action-primary--start"
            onClick={() => setWizardOpen(true)}
          >
            VARDİYA BAŞLAT
          </button>
          <button
            type="button"
            className="ghost-button"
            onClick={() => setHistoryPickerOpen(true)}
          >
            Geçmiş vardiyalar
          </button>
        </div>

        <ShiftWizard
          open={wizardOpen}
          mode="shift"
          personnel={personnel}
          onClose={() => setWizardOpen(false)}
          onSubmit={(payload) => {
            setWizardOpen(false)
            createShift(payload)
          }}
        />

        <ShiftHistoryPicker
          open={historyPickerOpen}
          lineCode={lineCode}
          onSelect={(id) => {
            setHistoryPickerOpen(false)
            setHistoryShiftId(id)
          }}
          onClose={() => setHistoryPickerOpen(false)}
        />
      </div>
    )
  }

  const durationLabel = isRunning ? 'Çalışma süresi' : isMola ? 'Mola süresi' : 'Duruş süresi'
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
            <button type="button" className="operator-line-code" onClick={clearLine}>
              {lineCode}
            </button>
            <button
              type="button"
              className="operator-shift-info"
              onClick={() => {
                setOperatorName(shift.operator ?? '')
                setOperatorOpen(true)
              }}
            >
              {shift.vardiya}. vardiya · {shift.operator || 'Operatör girilmedi'}
            </button>
            <span className="operator-run-name">
              {activeRun ? activeRun.urun_adi : 'Ürün seçilmedi'}
            </span>
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
            onClick={() => setRunEndOpen(true)}
            disabled={!activeRun}
          >
            Ürün değiştir
          </button>
          <button
            type="button"
            className="ghost-button"
            onClick={() => setPending({ type: 'shift-end' })}
          >
            Vardiyayı bitir
          </button>
          <button
            type="button"
            className="ghost-button"
            onClick={() => setHistoryPickerOpen(true)}
          >
            Geçmiş vardiyalar
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

            {activeRun && (
              <button type="button" className="speed-row" onClick={() => setSpeedOpen(true)}>
                <span className="speed-row-label plate">Çalışma hızı</span>
                <span className="speed-row-value tnum">
                  {activeRun.calisma_hizi_pkt_dk ? `${activeRun.calisma_hizi_pkt_dk} pkt/dk` : 'Gir'}
                </span>
              </button>
            )}

            {pace && (
              <div className={`plan-block plan-block--${pace.durum}`}>
                <div className="plan-head">
                  <span className="plan-label plate">Ürün planı</span>
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

            {/*
             * Bu ürün / vardiya toplamı ayrı ayrı gösterilir — birden
             * çok ürün üretilen bir vardiyada ikisi karıştırılmasın diye
             * (yaşanmış hata: ürün değişince eski ürünün toplamı yeni
             * ürünün altında görünüyordu). Ana ızgara HER ZAMAN aktif
             * ürünün kendi sayıları, vardiya toplamı ayrı, küçük bir satır.
             */}
            <div className="operator-counts-section">
              <span className="operator-counts-label plate">Bu ürün</span>
              <div className="operator-counts">
                <div className="count-cell">
                  <span className="count-label plate">Palet</span>
                  <span className="count-value tnum">{activeRunPaletler.paletAdedi}</span>
                </div>
                <div className="count-cell">
                  <span className="count-label plate">Koli</span>
                  <span className="count-value tnum">{activeRunPaletler.koliAdedi}</span>
                </div>
                <div className="count-cell">
                  <span className="count-label plate">Paket</span>
                  <span className="count-value tnum">{activeRunPaket ?? '—'}</span>
                </div>
              </div>
            </div>

            <div className="operator-shift-totals">
              <span className="operator-shift-totals-label plate">Vardiya toplamı</span>
              <span className="operator-shift-totals-value tnum">
                {formatBreakdown(paletParts, paletlerToplam.paletAdedi)} palet ·{' '}
                {formatBreakdown(koliParts, paletlerToplam.koliAdedi)} koli ·{' '}
                {formatBreakdown(paketParts, paket)} paket
              </span>
            </div>

            <ProductHistory
              runs={runs}
              events={events}
              pallets={pallets}
              nowMs={now}
              onUpdateRun={updateRun}
            />
          </div>

          <div className="operator-actions">
            <button
              type="button"
              className={`action-primary action-primary--${
                isMola ? 'mola' : !activeRun ? 'start' : isRunning ? 'stop' : 'start'
              }`}
              onClick={() => {
                if (isMola) {
                  setPending({ type: 'mola-end' })
                  return
                }
                if (!activeRun) {
                  setProductWizardOpen(true)
                  return
                }
                setPending({ type: isRunning ? 'stop' : 'start' })
              }}
              disabled={busy}
            >
              {isMola ? 'MOLA BİTTİ' : !activeRun ? 'ÜRÜN BAŞLAT' : isRunning ? 'DURDUR' : 'BAŞLAT'}
            </button>
            <div className="operator-actions-row">
              {!isMola && (
                <button
                  type="button"
                  className="action-secondary"
                  onClick={() => setPending({ type: 'mola-start' })}
                  disabled={busy}
                >
                  MOLA
                </button>
              )}
              <button
                type="button"
                className="action-secondary"
                onClick={() => {
                  setPalletKoli(String(activeRun?.koli_per_palet ?? ''))
                  setPending({ type: 'pallet' })
                }}
                disabled={busy || !activeRun || isMola}
              >
                +1 PALET
              </button>
            </div>
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
          open={pending?.type === 'mola-start'}
          title="Mola ne zaman başladı?"
          confirmLabel="Mola başlat"
          tone="mola"
          initialMs={now}
          range={eventRange}
          onConfirm={handleTimeConfirm}
          onCancel={() => setPending(null)}
        />

        <TimeSheet
          open={pending?.type === 'mola-end'}
          title="Mola ne zaman bitti?"
          confirmLabel="Molayı bitir"
          tone="mola"
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

        <TimeSheet
          open={pending?.type === 'product-start'}
          title={activeRun ? 'Yeni ürüne ne zaman geçildi?' : 'Üretim ne zaman başladı?'}
          confirmLabel={activeRun ? 'Ürünü başlat' : 'Üretimi başlat'}
          tone="start"
          initialMs={now}
          range={eventRange}
          onConfirm={handleTimeConfirm}
          onCancel={() => setPending(null)}
        />

        <StopNoteSheet
          open={noteEventId !== null}
          suggestions={suggestions}
          onSave={saveNote}
          onSkip={() => setNoteEventId(null)}
        />

        <SpeedSheet
          open={speedOpen}
          initialValue={activeRun?.calisma_hizi_pkt_dk}
          onConfirm={updateSpeed}
          onCancel={() => setSpeedOpen(false)}
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

        <RunEndSheet
          open={runEndOpen}
          run={activeRun}
          koliAdedi={activeRunPaletler.koliAdedi}
          paketAdedi={activeRunPaket}
          onConfirm={handleRunEndConfirm}
          onCancel={() => setRunEndOpen(false)}
        />

        <ShiftWizard
          open={productWizardOpen}
          mode="product"
          onClose={() => setProductWizardOpen(false)}
          onSubmit={(payload) => {
            setProductWizardOpen(false)
            setPending({ type: 'product-start', payload })
          }}
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

        <ShiftHistoryPicker
          open={historyPickerOpen}
          lineCode={lineCode}
          onSelect={(id) => {
            setHistoryPickerOpen(false)
            setHistoryShiftId(id)
          }}
          onClose={() => setHistoryPickerOpen(false)}
        />
      </div>
    </div>
  )
}

export default OperatorPanel

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useShift } from '../hooks/useShift'
import { useFrequentNotes } from '../hooks/useFrequentNotes'
import { usePersonnel } from '../hooks/usePersonnel'
import { useLineCode } from '../hooks/useLineCode'
import {
  aktifUrun,
  buildIntervals,
  currentState,
  groupSegmentsByEvent,
  hizVerimi,
  koliToPaket,
  newEventWindow,
  paceStatus,
  palletTotals,
  palletTotalsByRun,
  runSpans,
  shiftPaket,
  shiftTotals,
  totalsByRun,
} from '../lib/timeline'
import { formatBreakdown, formatDelta, formatDuration } from '../lib/duration'
import { formatClock, formatDateLabel, vardiyaBaslangici, VARDIYA_SURESI_MS } from '../lib/time'
import StatusBadge from '../components/StatusBadge'
import RadialGauge from '../components/RadialGauge'
import ShiftClockBar from '../components/ShiftClockBar'
import TimeSheet from '../components/TimeSheet'
import StopNoteSheet from '../components/StopNoteSheet'
import ReasonSegments from '../components/ReasonSegments'
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

/*
 * Üç ekranlı yatay kaydırma: sağ/sol parmak kaydırması ya da üstteki
 * sekmeye dokunarak geçilir. "Ana ekran" (index 1, açılışta aktif)
 * BAŞLAT/DURDUR + MOLA/+1 PALET'i taşır — operatörün asıl işi, hiçbir
 * koşulda dikey kaymamalı (bkz. CLAUDE.md, yaşanmış "ekran kayıyor"
 * şikayeti). Diğer ikisi ("Genel" — zaman çizelgesi + ikincil butonlar,
 * "Detay" — hız/hedef/palet rakamları) içerik uzunsa KENDİ İÇİNDE kayar,
 * sayfa/kabuk hiç kaymaz.
 */
const PANEL_TITLES = ['Genel', 'Ana ekran', 'Detay']
const MAIN_PANEL_INDEX = 1
const SWIPE_THRESHOLD_PX = 45

function OperatorPanel() {
  const { lineCode, selectLine, clearLine } = useLineCode()
  const { shift, runs, events, pallets, segments, loading, error, setError, refresh } = useShift(lineCode)
  const suggestions = useFrequentNotes(lineCode)
  const personnel = usePersonnel(lineCode)

  const [now, setNow] = useState(() => Date.now())
  const [busy, setBusy] = useState(false)
  const [wizardOpen, setWizardOpen] = useState(false)
  const [productWizardOpen, setProductWizardOpen] = useState(false)
  const [runEndOpen, setRunEndOpen] = useState(false)
  const [speedOpen, setSpeedOpen] = useState(false)
  const [operatorOpen, setOperatorOpen] = useState(false)
  const [operatorName, setOperatorName] = useState('')
  const [fisNoOpen, setFisNoOpen] = useState(false)
  const [fisNoValue, setFisNoValue] = useState('')
  const [logOpen, setLogOpen] = useState(false)
  const [logFocusEventId, setLogFocusEventId] = useState(null)
  const [historyPickerOpen, setHistoryPickerOpen] = useState(false)
  const [historyShiftId, setHistoryShiftId] = useState(null)
  const [pending, setPending] = useState(null)
  const [noteEventId, setNoteEventId] = useState(null)
  const [palletKoli, setPalletKoli] = useState('')
  const [activePanel, setActivePanel] = useState(MAIN_PANEL_INDEX)
  const touchStartXRef = useRef(null)

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  const runsById = useMemo(() => new Map(runs.map((run) => [run.id, run])), [runs])
  const paletlerByRun = useMemo(() => palletTotalsByRun(pallets), [pallets])

  /* Aktif ürün son olayın işaret ettiği üründür; son olay ürünsüzse ("Ürünü
   * bitir" ya da vardiya açılışı) aktif ürün yoktur — bkz. timeline.js. */
  const activeRun = useMemo(() => aktifUrun(events, runs), [events, runs])

  const shiftStartMs = shift ? new Date(shift.started_at).getTime() : null
  const shiftEndMs = shift?.planlanan_bitis ? new Date(shift.planlanan_bitis).getTime() : null
  const intervals = useMemo(() => buildIntervals(events, now), [events, now])
  const paletlerToplam = useMemo(() => palletTotals(pallets), [pallets])
  const state = useMemo(() => currentState(events), [events])
  const son = intervals[intervals.length - 1] ?? null
  const segmentsByEventId = useMemo(() => groupSegmentsByEvent(segments), [segments])
  const sonSegments = son ? segmentsByEventId.get(son.eventId) ?? [] : []

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
   * Müdür panosundaki aynı iki oran (bkz. CLAUDE.md "Müdür panosu: iki
   * oran"), operatörün de kendi ekranında görmesi için — aynı fonksiyon,
   * aynı hesap, ayrı ayrı türetilmesin. Açık kalma vardiya geneli, hız
   * verimi aktif ürüne göre (önceki üründen kalan paletler yeni ürünün
   * birkaç dakikalık süresine bölünüp anlamsız yüzde vermesin diye).
   */
  const zamanKullanimi = shiftTotals(intervals).zamanKullanimi
  const activeRunUretimMs = activeRun ? totalsByRun(intervals).get(activeRun.id)?.uretimMs ?? 0 : 0
  const performans =
    activeRun?.calisma_hizi_pkt_dk
      ? hizVerimi({
          paketAdedi: activeRunPaket ?? 0,
          uretimMs: activeRunUretimMs,
          hedefHizPktDk: activeRun.calisma_hizi_pkt_dk,
        })
      : null

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
          fis_no: payload.shift.fis_no,
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

  const addSegment = useCallback(
    async ({ note, startMs, endMs }) => {
      if (!shift || !son) return

      await guard(
        () =>
          supabase.from('stop_reason_segments').insert({
            line_code: lineCode,
            shift_id: shift.id,
            event_id: son.eventId,
            note,
            start_at: new Date(startMs).toISOString(),
            end_at: new Date(endMs).toISOString(),
          }),
        'Sebep eklenemedi',
      )
    },
    [shift, son, lineCode, guard],
  )

  const updateSegment = useCallback(
    async (id, { note, startMs, endMs }) => {
      await guard(
        () =>
          supabase
            .from('stop_reason_segments')
            .update({
              note,
              start_at: new Date(startMs).toISOString(),
              end_at: new Date(endMs).toISOString(),
            })
            .eq('id', id),
        'Sebep güncellenemedi',
      )
    },
    [guard],
  )

  const deleteSegment = useCallback(
    async (id) => {
      await guard(() => supabase.from('stop_reason_segments').delete().eq('id', id), 'Sebep silinemedi')
    },
    [guard],
  )

  /*
   * Ürünü bitirme: numaratör bitişleri kaydedilir, ürün kapanır ve hat
   * duruşa geçer. Yeni ürüne geçmekten AYRI bir iş — eskiden ikisi tek
   * akışa yapışıktı ve ürünü bitirmenin tek yolu yeni bir ürüne geçmekti;
   * sahada "bitirdim ama yenisine geçmeyeceğim" durumu karşılanamıyordu.
   */
  const finishRun = useCallback(
    async (values, atMs) => {
      if (busy || !activeRun || !shift) return
      setBusy(true)
      setError(null)

      const { error: runError } = await supabase
        .from('product_runs')
        .update(values)
        .eq('id', activeRun.id)

      if (runError) {
        setError('Ürün bilgisi kaydedilemedi: ' + runError.message)
        setBusy(false)
        return
      }

      /*
       * Ürünü kapatan olay: product_run_id AÇIKÇA null. Aktif ürün bundan
       * sonra yok sayılır (timeline.js#aktifUrun), ana buton "ÜRÜN
       * BAŞLAT"a döner. Not otomatik — "Moladan dönüş" ile aynı desen,
       * operatöre ayrıca sebep sorulmaz.
       */
      const { error: eventError } = await supabase.from('timeline_events').insert({
        line_code: lineCode,
        shift_id: shift.id,
        product_run_id: null,
        at: new Date(atMs).toISOString(),
        kind: 'durus',
        note: 'Ürün bitişi',
      })

      if (eventError) setError('Ürün bitişi kaydedilemedi: ' + eventError.message)

      await refresh()
      setBusy(false)
    },
    [busy, activeRun, shift, lineCode, setError, refresh],
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

      if (action.type === 'run-finish') {
        await finishRun(action.values, atMs)
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
    [pending, createProductRun, addEvent, finishRun, guard, shift, lineCode, activeRun, palletKoli],
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

  /*
   * Palet ekleme — BELİRLİ bir ürüne, aktif olmasına bakmadan.
   *
   * Ana ekrandaki "+1 PALET" aktif ürün ister (`pallet_records.product_run_id`
   * not null). Sahada "son paleti girmeden ürünü bitirdim" çok oluyor ve o
   * palet hiçbir yerden girilemiyordu — yaşanmış hata. Ürün geçmişindeki
   * kart kendi run.id'sini bildiği için bitmiş bir ürüne de yazılabiliyor.
   */
  const addPalletToRun = useCallback(
    (runId, patch) =>
      guard(
        () =>
          supabase.from('pallet_records').insert({
            line_code: lineCode,
            shift_id: shift.id,
            product_run_id: runId,
            ...patch,
          }),
        'Palet kaydedilemedi',
      ),
    [guard, lineCode, shift],
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

  /*
   * Fiş no (Logo'daki vardiya fişinin MES karşılığı, bkz. CLAUDE.md
   * "ŞİMDİ YAPILACAK — Sevkiyat") vardiya açılışında opsiyonel; kağıt
   * elde değilse boş bırakılıp buradan sonradan girilir. Aynı desen:
   * updateOperator ile birebir aynı.
   */
  const updateFisNo = useCallback(
    (value) => {
      setFisNoOpen(false)
      if (!shift) return
      guard(
        () => supabase.from('shifts').update({ fis_no: value.trim() || null }).eq('id', shift.id),
        'Fiş no güncellenemedi',
      )
    },
    [shift, guard],
  )

  /*
   * Ürünü bitirme, yeni ürüne geçmekten AYRI bir iş: numaratör bitişleri
   * alınır, ürün kapanır ve hat duruşa geçer. Yeni ürüne geçilecekse
   * ayrıca "Yeni ürün" (ya da ana ekrandaki "ÜRÜN BAŞLAT") kullanılır.
   * Eskiden ikisi tek akışa yapışıktı; ürünü bitirmenin tek yolu yeni bir
   * ürüne geçmekti — sahada "bitirdim ama yenisine geçmeyeceğim" durumu
   * karşılanamıyordu.
   */
  const handleRunEndConfirm = useCallback((values) => {
    setRunEndOpen(false)
    setPending({ type: 'run-finish', values })
  }, [])

  /* Sağ/sol parmak kaydırmasıyla ekran değiştirme — üstteki sekmelerin
   * dokunmatik alternatifi. Basit eşik: dikey kaydırmayla (sayfa scroll)
   * karışmaması için sadece yatay hareket net baskınsa geçilir. */
  const handleTouchStart = (event) => {
    touchStartXRef.current = { x: event.touches[0].clientX, y: event.touches[0].clientY }
  }

  const handleTouchEnd = (event) => {
    const start = touchStartXRef.current
    touchStartXRef.current = null
    if (!start) return

    const dx = event.changedTouches[0].clientX - start.x
    const dy = event.changedTouches[0].clientY - start.y
    if (Math.abs(dx) < SWIPE_THRESHOLD_PX || Math.abs(dx) < Math.abs(dy)) return

    setActivePanel((current) => {
      if (dx < 0) return Math.min(2, current + 1)
      return Math.max(0, current - 1)
    })
  }


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
            {/*
             * Makine + vardiya/operatör + fiş no aynı satırda yan yana —
             * eskiden üç ayrı satır dikey yer kaplıyordu (yaşanmış
             * şikayet: "ana ekran kayıyor", bu üç satır tek başına
             * derinlik ekliyordu). Satır sığmazsa doğal olarak sarar,
             * hiçbiri kesilmez.
             */}
            <div className="operator-header-top">
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
              <button
                type="button"
                className="operator-fisno tnum"
                onClick={() => {
                  setFisNoValue(shift.fis_no ?? '')
                  setFisNoOpen(true)
                }}
              >
                {shift.fis_no ? `Fiş ${shift.fis_no}` : 'Fiş no gir'}
              </button>
            </div>
            <span className="operator-run-name">
              {activeRun ? activeRun.urun_adi : 'Ürün seçilmedi'}
            </span>
          </div>
          <div className="operator-header-right">
            <span className="operator-clock tnum" aria-label="Gerçek saat">
              {formatClock(new Date(now))}
            </span>
            <span aria-live="polite">
              <StatusBadge status={state} />
            </span>
          </div>
        </header>

        {error && <div className="operator-error">{error}</div>}

        <div className="operator-pager-nav">
          {PANEL_TITLES.map((title, index) => (
            <button
              key={title}
              type="button"
              className={`operator-pager-tab${activePanel === index ? ' operator-pager-tab--active' : ''}`}
              onClick={() => setActivePanel(index)}
            >
              {title}
            </button>
          ))}
        </div>

        <div className="operator-pager" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
          <div
            className="operator-pager-track"
            style={{ transform: `translateX(-${activePanel * (100 / 3)}%)` }}
          >
            {/* Ekran 1/3 — Genel: zaman çizelgesi + ikincil aksiyonlar.
              * "İstediğini sil/düzelt" sözü verdiğimiz erişim noktası
              * hiçbir zaman gizlenmemeli, bu yüzden kendi ekranında sabit. */}
            <div className="operator-pager-panel">
              {/*
               * Müdür panosundaki aynı bileşen (bkz. CLAUDE.md "Veri
               * görselleştirme"), tek farkla: `onEdit` verildiği için
               * balondaki "Düzenle" butonu görünür ve dokununca EventLog'u
               * o olaya odaklanmış açar (`logFocusEventId`) — müdür
               * panosunda bu prop hiç geçirilmez, orası salt-okunur kalır.
               */}
              <ShiftClockBar
                intervals={intervals}
                shiftStartMs={shiftStartMs}
                shiftEndMs={shiftEndMs}
                runsById={runsById}
                nowMs={now}
                onEdit={(interval) => {
                  setLogFocusEventId(interval.eventId)
                  setLogOpen(true)
                }}
              />

              {/*
               * Tek bir duruş boyunca birbirini ARDIŞIK değil ÇAKIŞIK takip
               * eden birden fazla sebep olabiliyor (net sıraları yok) —
               * ReasonSegments bunları ayrı zaman damgalarına bölünmüş
               * olaylar yerine, TEK duruşun içinde kendi başlangıç/bitişi
               * olan segmentler olarak tutar. Zaman çizelgesinin hemen
               * altında: olay tam yaşanırken/hemen sonra eklenip düzenlenir.
               */}
              <ReasonSegments
                interval={son}
                segments={sonSegments}
                suggestions={suggestions}
                onAdd={addSegment}
                onUpdate={updateSegment}
                onDelete={deleteSegment}
              />

              <div className="operator-secondary">
                <button
                  type="button"
                  className="ghost-button"
                  onClick={() => {
                    setLogFocusEventId(null)
                    setLogOpen(true)
                  }}
                >
                  Olay geçmişi
                </button>
                {/*
                  * İki ayrı iş, iki ayrı buton: "Ürünü bitir" numaratör
                  * bitişlerini alıp ürünü kapatır (hat duruşa geçer), "Yeni
                  * ürün" doğrudan yeni ürün sihirbazını açar. Eskiden tek
                  * bir "Ürün değiştir" vardı ve ürünü bitirmek zorunlu
                  * olarak yeni ürüne geçmeyi gerektiriyordu.
                  */}
                <button
                  type="button"
                  className="ghost-button"
                  onClick={() => setRunEndOpen(true)}
                  disabled={!activeRun}
                >
                  Ürünü bitir
                </button>
                <button
                  type="button"
                  className="ghost-button"
                  onClick={() => setProductWizardOpen(true)}
                >
                  Yeni ürün
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
            </div>

            {/* Ekran 2/3 — Ana ekran: operatörün asıl işi. Açılışta aktif,
              * BAŞLAT/DURDUR ve MOLA/+1 PALET hep aynı yerde, hiç kaymaz. */}
            <div className="operator-pager-panel operator-pager-panel--main">
              <div className="operator-main">
                {/*
                 * Zaman çubuğu süre sayacının HEMEN ÜSTÜNDE — "az önce
                 * durdu/kalktı, ne zaman oldu" sorusunun cevabı ilk bakışta
                 * orada. `compact`: lejant/ipucu metni burada gereksiz yer
                 * kaplıyordu, dokunma davranışı (balon açma) aynen çalışır.
                 */}
                <ShiftClockBar
                  intervals={intervals}
                  shiftStartMs={shiftStartMs}
                  shiftEndMs={shiftEndMs}
                  runsById={runsById}
                  nowMs={now}
                  compact
                  onEdit={(interval) => {
                    setLogFocusEventId(interval.eventId)
                    setLogOpen(true)
                  }}
                />

                <div className="duration-block duration-block--compact">
                  <span className="duration-label plate">{durationLabel}</span>
                  <span className="duration-value duration-value--compact tnum">
                    {formatDuration(son ? son.durationMs : 0)}
                  </span>
                </div>

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

                {/*
                 * Hız girişi + iki oran (müdür panosundaki AYNI hesap,
                 * bkz. CLAUDE.md "Müdür panosu: iki oran") yan yana, tek
                 * satırda — operatör hıza dokunup değiştirebilir, diğer
                 * ikisi salt-okunur. `.operator-counts` ile aynı ızgara,
                 * yeni bir stil eklemeye gerek kalmadı.
                 */}
                <div className="operator-counts operator-metrics">
                  <button
                    type="button"
                    className="count-cell count-cell--tap"
                    onClick={() => setSpeedOpen(true)}
                  >
                    <span className="count-label plate">Hız</span>
                    <span className="count-value tnum">
                      {activeRun?.calisma_hizi_pkt_dk ? activeRun.calisma_hizi_pkt_dk : 'Gir'}
                    </span>
                  </button>
                  <div className="count-cell">
                    <span className="count-label plate">Açık kalma</span>
                    <span className="count-value tnum">%{Math.round(zamanKullanimi * 100)}</span>
                  </div>
                  <div className="count-cell">
                    <span className="count-label plate">Hız verimi</span>
                    <span className="count-value tnum">
                      {performans ? `%${Math.round(performans.oran * 100)}` : '—'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Ekran 3/3 — Detay: hız/hedef/palet rakamları, ürün geçmişi. */}
            <div className="operator-pager-panel">
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
                    <RadialGauge
                      value={pace.ilerleme}
                      seviye={pace.durum === 'geride' ? 'kotu' : pace.durum === 'onde' || pace.durum === 'tamam' ? 'iyi' : 'orta'}
                      size={56}
                      thickness={6}
                      valueLabel={`%${Math.round(pace.ilerleme * 100)}`}
                    />
                    <div className="plan-head-text">
                      <span className="plan-label plate">Ürün planı</span>
                      <span className="plan-figure tnum">
                        {pace.uretilenKoli} / {pace.hedefKoli} <small>koli</small>
                      </span>
                    </div>
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
                shiftStartMs={shiftStartMs}
                fisNo={shift.fis_no}
                onUpdateRun={updateRun}
                onAddPallet={addPalletToRun}
                onSavePallet={updatePallet}
                onDeletePallet={deletePallet}
              />
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
          open={pending?.type === 'run-finish'}
          title="Ürün ne zaman bitti?"
          confirmLabel="Ürünü bitir"
          tone="stop"
          initialMs={now}
          range={eventRange}
          onConfirm={handleTimeConfirm}
          onCancel={() => setPending(null)}
        />

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
                  vardiyaNo={shift.vardiya}
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

        {fisNoOpen && (
          <div className="sheet-overlay" onClick={() => setFisNoOpen(false)}>
            <div
              className="sheet-panel"
              role="dialog"
              aria-modal="true"
              aria-label="Fiş no"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="sheet-handle" />
              <h2 className="sheet-title plate">Fiş no</h2>
              <label className="sheet-field">
                <span className="sheet-field-label">Vardiya fiş numarası</span>
                <input
                  className="sheet-input"
                  type="text"
                  inputMode="numeric"
                  value={fisNoValue}
                  onChange={(event) => setFisNoValue(event.target.value)}
                  placeholder="Örn. 505792"
                />
                <span className="sheet-field-hint">
                  Ürün değişince sevkiyat ekranında otomatik alt fiş (.1, .2…) görünür.
                </span>
              </label>
              <div className="sheet-actions">
                <button
                  type="button"
                  className="sheet-button sheet-button--secondary"
                  onClick={() => setFisNoOpen(false)}
                >
                  Vazgeç
                </button>
                <button
                  type="button"
                  className="sheet-button sheet-button--primary"
                  onClick={() => updateFisNo(fisNoValue)}
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
          focusEventId={logFocusEventId}
          events={events}
          pallets={pallets}
          runsById={runsById}
          shiftStartMs={shiftStartMs}
          nowMs={now}
          onSaveEvent={updateEvent}
          onDeleteEvent={deleteEvent}
          onSavePallet={updatePallet}
          onDeletePallet={deletePallet}
          onClose={() => {
            setLogOpen(false)
            setLogFocusEventId(null)
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
    </div>
  )
}

export default OperatorPanel

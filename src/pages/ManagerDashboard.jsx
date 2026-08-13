import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useShift } from '../hooks/useShift'
import { useLineCode } from '../hooks/useLineCode'
import LineSelect from '../components/LineSelect'
import ShiftHistoryPicker from '../components/ShiftHistoryPicker'
import ShiftHistoryDetail from '../components/ShiftHistoryDetail'
import {
  aktifUrun,
  buildIntervals,
  currentState,
  hizVerimi,
  koliToPaket,
  paceStatus,
  palletTotals,
  palletTotalsByRun,
  runSpans,
  runSummaries,
  seviyeDurumu,
  shiftPaket,
  shiftTotals,
  totalsByRun,
} from '../lib/timeline'
import { formatBreakdown, formatDelta, formatDuration } from '../lib/duration'
import { formatClock, formatDateLabel, formatShortTime } from '../lib/time'
import StatusBadge from '../components/StatusBadge'
import RadialGauge from '../components/RadialGauge'
import ShiftClockBar from '../components/ShiftClockBar'
import ProductDetail from '../components/ProductDetail'
import '../components/Sheet.css'
import './ManagerDashboard.css'

const TAM_ISRAR_MS = 30 * 60 * 1000
const VISIT_HEARTBEAT_MS = 20 * 1000
const VISIT_SESSION_KEY = 'mes_manager_visit'
const VISIT_RESUME_WINDOW_MS = 30 * 60 * 1000

/*
 * Üç ekranlı pager (OperatorPanel.jsx'teki desenin aynısı) — tek uzun
 * scroll'un yerine geçti. Yaşanmış şikayet: "Şimdi" bölgesindeki süre
 * sayacı duvar ekranı için dev boyutta (`clamp(3rem,6vw,9rem)`), normal
 * tarayıcı penceresinde sayfayı yiyip "Vardiya toplamı"/ürün listesini
 * aşağı itiyordu, kullanıcı ekran görüntüsüyle bildirdi. Çözüm: her biri
 * kendi başına sığan üç ekran — "Şimdi" artık TEK BAŞINA nefes alacak
 * yer buluyor (dev sayaç kalabilir, kimseyle yer paylaşmıyor), "Vardiya"
 * sabit boyutlu özet, "Ürünler" ise zaten değişken uzunluklu tek bölüm
 * (`plan-stack`) — kabuk hiç kaymadan SADECE bu panel kendi içinde kayar.
 * Varsayılan aktif ekran "Genel" (index 0): müdürün ilk bakışta görmek
 * isteyeceği "şu an ne oluyor" + "bugün nasıl gidiyor" sorularının ikisi
 * de burada — "Şimdi" ile "Vardiya" başta ayrı ekrandı, kullanıcı
 * ikisinin birlikte daha mantıklı olduğuna karar verdi (ikisi de sabit
 * boyutlu, ayrı ekrana ihtiyaç yoktu — bkz. CLAUDE.md).
 */
const PANEL_TITLES = ['Genel', 'Ürünler']
const SWIPE_THRESHOLD_PX = 45

function ManagerDashboard() {
  const { lineCode, selectLine, clearLine } = useLineCode()
  const { shift, runs, events, pallets, loading, error } = useShift(lineCode)
  const [now, setNow] = useState(() => Date.now())
  const [historyPickerOpen, setHistoryPickerOpen] = useState(false)
  const [historyShiftId, setHistoryShiftId] = useState(null)
  const [activePanel, setActivePanel] = useState(0)
  const touchStartXRef = useRef(null)
  /* Ürün satırına dokununca açılan detay — salt-okunur, operatördeki
   * ProductHistory detayının aynısı (ortak `ProductDetail` bileşeni). */
  const [detayRunId, setDetayRunId] = useState(null)

  /* Dokunmatik duvar ekranında sağ/sol parmak kaydırması — üstteki
   * sekmelerin dokunmatik alternatifi, OperatorPanel'deki aynı desen. */
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
      if (dx < 0) return Math.min(1, current + 1)
      return Math.max(0, current - 1)
    })
  }

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  /*
   * Müdür panosu bu hatta açıldığında anonim bir ziyaret kaydı düşer
   * (bkz. add_manager_visits.sql) — kimin baktığı tutulmuyor, sadece
   * ne zaman/ne kadar. Süre `last_seen_at` heartbeat'iyle yaklaşık tutulur:
   * sekme aniden kapanırsa (beforeunload her zaman güvenilir ateşlenmiyor,
   * özellikle mobilde) süre son heartbeat'te kalır — tam kapanış anı değil
   * ama yeterince yakın bir tahmin. Operatör ekranı bu kayıtları listeler.
   *
   * Sekme ARKA PLANA düşünce mobil tarayıcılar setInterval'i büyük ölçüde
   * durdurur/yavaşlatır (pil tasarrufu) — 20 saniyelik heartbeat arka
   * planda hiç ateşlenmeyebilir, süre olduğu yerde donar. `visibilitychange`/
   * `focus` ile sekme tekrar öne geldiği ANDA bir ping atılır ama bu tek
   * başına yetmedi: Android'de arka plana düşen bir sekme genelde SADECE
   * yavaşlatılmıyor, belleği boşaltmak için tamamen KAPATILIP sekme tekrar
   * öne gelince SIFIRDAN yeniden yükleniyor — React yeniden mount oluyor,
   * bu useEffect en baştan çalışıyor, yeni bir INSERT ile alakasız yeni bir
   * ziyaret satırı açılıyor. Sonuç (yaşanmış durum, kullanıcı ekran
   * görüntüsüyle bildirdi): birkaç dakika arayla art arda 4-5 satır,
   * hepsi "1 dk altı" — her biri gerçekten kısa ömürlü ayrı bir yeniden
   * yükleme, tekilleştirilmiş "sekme açık kaldı" süresi hiç oluşmuyordu.
   *
   * Çözüm: `sessionStorage` sayfa yeniden yüklense de AYNI sekme için
   * kalıcı kalır (gerçek kapatma/yeni sekmede sıfırlanır) — bu yüzden
   * ziyaret kimliğini oraya yazıyoruz. Mount'ta önce sessionStorage'a
   * bakılır: aynı hat için yakın zamanda (VISIT_RESUME_WINDOW_MS içinde)
   * bir ziyaret varsa YENİ satır AÇILMAZ, o satırın last_seen_at'i
   * güncellenerek "aynı bakışın devamı" sayılır. Yoksa/çok eskiyse yeni
   * satır açılır. Pencere süresi (30 dk) çok eski/unutulmuş bir kaydın
   * sonsuza kadar "devam ediyormuş" gibi büyümesini engeller.
   */
  useEffect(() => {
    if (!lineCode) return

    let visitId = null
    let cancelled = false

    const readStored = () => {
      try {
        const raw = sessionStorage.getItem(VISIT_SESSION_KEY)
        return raw ? JSON.parse(raw) : null
      } catch {
        return null
      }
    }

    const writeStored = (id) => {
      try {
        sessionStorage.setItem(
          VISIT_SESSION_KEY,
          JSON.stringify({ lineCode, visitId: id, lastPingAt: Date.now() }),
        )
      } catch {
        /* sessionStorage kapalı/dolu olabilir — sessizce vazgeç, sadece
         * her yeniden yüklemede yeni bir satır açılır, kritik değil. */
      }
    }

    const ping = () => {
      if (!visitId) return
      const now = new Date().toISOString()
      supabase.from('manager_dashboard_visits').update({ last_seen_at: now }).eq('id', visitId)
      writeStored(visitId)
    }

    const start = async () => {
      const stored = readStored()
      const isFresh = stored && Date.now() - stored.lastPingAt < VISIT_RESUME_WINDOW_MS

      if (isFresh && stored.lineCode === lineCode) {
        visitId = stored.visitId
        ping()
        return
      }

      const { data } = await supabase
        .from('manager_dashboard_visits')
        .insert({ line_code: lineCode })
        .select('id')
        .single()

      if (!cancelled && data) {
        visitId = data.id
        writeStored(data.id)
      }
    }

    start()

    const heartbeat = setInterval(ping, VISIT_HEARTBEAT_MS)

    const onVisible = () => {
      if (document.visibilityState === 'visible') ping()
    }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onVisible)

    return () => {
      cancelled = true
      clearInterval(heartbeat)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', onVisible)
      ping()
    }
  }, [lineCode])

  const runsById = useMemo(() => new Map(runs.map((run) => [run.id, run])), [runs])

  const intervals = useMemo(() => buildIntervals(events, now), [events, now])
  const totals = useMemo(() => shiftTotals(intervals), [intervals])
  const paletler = useMemo(() => palletTotals(pallets), [pallets])
  const state = useMemo(() => currentState(events), [events])

  const shiftStartMs = shift ? new Date(shift.started_at).getTime() : null

  /* Operatör ekranıyla aynı kural: son olay ürünsüzse ("Ürünü bitir" ya da
   * vardiya açılışı) aktif ürün yoktur — bkz. timeline.js#aktifUrun. */
  const activeRun = useMemo(() => aktifUrun(events, runs), [events, runs])

  /* Ürün detayı için tam özet — operatör ekranıyla aynı fonksiyon. */
  const ozetler = useMemo(
    () => runSummaries(runs, events, pallets, now),
    [runs, events, pallets, now],
  )
  const acikOzet = ozetler.find((ozet) => ozet.run.id === detayRunId) ?? null

  const nowDate = new Date(now)

  if (!lineCode) {
    return <LineSelect onSelect={selectLine} />
  }

  if (historyShiftId) {
    return (
      /*
       * `manager-shell--gecmis` — canlı görünümün sabit `height:100dvh;
       * overflow:hidden` kabuğu (bkz. aşağıdaki üç ekranlı pager) burada
       * BİLEREK devre dışı: ShiftHistoryDetail kendi kaydırmasını taşımıyor,
       * sayfanın kendisinin kayabilmesine güveniyor (donmuş özet, ürün
       * sayısı kadar uzayabilir). Sabit kabuk burada da geçerli olsaydı
       * içerik kaybolurdu, kaymazdı — CLAUDE.md'nin "içerik kaybolmaktansa
       * kaysın" ilkesiyle çelişirdi.
       */
      <div className="manager-shell manager-shell--gecmis is-beklemede">
        <div className="andon-rail" />
        <div className="manager-dashboard">
          <button type="button" className="manager-line-code" onClick={clearLine}>
            {lineCode}
          </button>
          <ShiftHistoryDetail
            shiftId={historyShiftId}
            readOnly
            wall
            onBack={() => setHistoryShiftId(null)}
          />
        </div>
      </div>
    )
  }

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

  if (!shift) {
    return (
      <div className="manager-shell is-beklemede">
        <div className="andon-rail" />
        <div className="manager-dashboard manager-dashboard--center">
          <button type="button" className="manager-line-code" onClick={clearLine}>
            {lineCode}
          </button>
          <p className="plate">Açık vardiya yok</p>
          <button
            type="button"
            className="manager-history-button"
            onClick={() => setHistoryPickerOpen(true)}
          >
            Geçmiş vardiyalar
          </button>
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

  const son = intervals[intervals.length - 1] ?? null
  const urgency = state === 'durdu' && son ? Math.min(1, son.durationMs / TAM_ISRAR_MS) : 0

  /* Hedef koli ürün bazlı; tempo da her ürünün kendi başlangıcına göre. */
  const spans = runSpans(events, now)
  const paletlerByRun = palletTotalsByRun(pallets)
  const runTotals = totalsByRun(intervals)
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
  const shiftEndMs = shift.planlanan_bitis ? new Date(shift.planlanan_bitis).getTime() : null

  const activeRunKoli = activeRun ? (paletlerByRun.get(activeRun.id)?.koliAdedi ?? 0) : 0
  const activeRunPaletAdedi = activeRun ? (paletlerByRun.get(activeRun.id)?.paletAdedi ?? 0) : 0
  const activeRunTotals = activeRun ? runTotals.get(activeRun.id) ?? { uretimMs: 0, durusMs: 0 } : null

  /*
   * Ürün geçmişi: her ürünün kendi açık kalma / hız verimi / hedef
   * ilerlemesi ayrı bir satır — üstteki iki oran genel (vardiya/aktif
   * ürün), bunlar ürün bazlı ek bilgi. Aktif olan canlı sayılır
   * (nowMs = şimdi); üretimi bitmiş bir ürün için tempo o ürünün son
   * anına ("span.endMs") göre dondurulur, "sealed" görünümle altta asılı
   * kalır. Sıra `runs`'ın TERSİ (sira azalan) — aktif/en yeni ürün en
   * üstte, bitmiş ürünler altında; sayfanın geri kalanının (Son olaylar,
   * çeyrekler, palet çıkışları) zaten kullandığı yeni-üstte kuralıyla
   * tutarlı (yaşanmış şikayet: eski üründe kalıp yeni ürünle karışıyordu).
   */
  const productRows = [...runs]
    .reverse()
    .map((run) => {
      const span = spans.get(run.id) ?? null
      if (!span) return null

      const isActive = run.id === activeRun?.id
      const rt = runTotals.get(run.id) ?? { uretimMs: 0, durusMs: 0 }
      const rToplamMs = rt.uretimMs + rt.durusMs
      const acikKalmaOran = rToplamMs > 0 ? rt.uretimMs / rToplamMs : null

      const paletAdedi = paletlerByRun.get(run.id)?.paletAdedi ?? 0
      const koli = paletlerByRun.get(run.id)?.koliAdedi ?? 0
      const runPaket = koliToPaket(koli, run.koli_ici_adet)
      const perf = run.calisma_hizi_pkt_dk
        ? hizVerimi({ paketAdedi: runPaket ?? 0, uretimMs: rt.uretimMs, hedefHizPktDk: run.calisma_hizi_pkt_dk })
        : null

      const pace = run.hedef_koli
        ? paceStatus({
            hedefKoli: run.hedef_koli,
            uretilenKoli: koli,
            shiftStartMs: span.startMs,
            shiftEndMs,
            nowMs: isActive ? now : span.endMs,
          })
        : null

      /*
       * Her ürünün kendi palet çıkışları — hangi paletin hangi ürüne ait
       * olduğu belirsiz kalmasın diye tek, ortak bir liste yerine burada,
       * ürünün kendi satırında (yaşanmış şikayet: tek ortak liste natura'nın
       * altında dururken hâlâ kuru üzüm'ün paletlerini gösteriyordu).
       */
      const runPallets = [...pallets]
        .filter((pallet) => pallet.product_run_id === run.id)
        .reverse()

      return { run, isActive, acikKalmaOran, perf, pace, runPallets, paletAdedi, koli, runPaket }
    })
    .filter(Boolean)

  const zamanKullanimi = Math.round(totals.zamanKullanimi * 100)
  const acikKalmaDurum = seviyeDurumu(totals.zamanKullanimi)

  /*
   * İkinci oran: aktif ürün açık kaldığı sürede, girilen çalışma hızına
   * göre ne kadarı gerçekten "net iş"ti. Ör. 6 saat açık kaldı ama
   * üretilen paket sayısı hıza göre yalnızca 5 saatlik işe karşılık
   * geliyorsa %83 — duruşlardan bağımsız, hızdaki düşüşü/mikro-duruşları
   * yakalar. Aktif ürüne göre kapsanır (şimdi'ye göre değil): aksi halde
   * önceki üründen kalan paletler yeni ürünün birkaç dakikalık çalışma
   * süresine bölünüp anlamsız yüzdeler (%1000+) üretir.
   */
  const activeRunPaket = koliToPaket(activeRunKoli, activeRun?.koli_ici_adet)
  const performans =
    activeRun?.calisma_hizi_pkt_dk && activeRunTotals
      ? hizVerimi({
          paketAdedi: activeRunPaket ?? 0,
          uretimMs: activeRunTotals.uretimMs,
          hedefHizPktDk: activeRun.calisma_hizi_pkt_dk,
        })
      : null
  const performansDurum = performans ? seviyeDurumu(performans.oran) : null
  const performansYuzde = performans ? Math.round(performans.oran * 100) : null

  /* useMemo değil: bu noktada zaten early return'lerin ardındayız, hook
   * sırası bozulmasın diye diğer türetilmiş değerler gibi düz const. */

  return (
    <div className={`manager-shell is-${state}`}>
      <div
        className={`andon-rail${state === 'durdu' ? ' andon-rail--pulsing' : ''}`}
        style={{ '--urgency': urgency }}
      />

      <div className="manager-dashboard">
        <header className="manager-header">
          <button type="button" className="manager-line-code" onClick={clearLine}>
            {lineCode}
          </button>
          <span className="manager-date plate">
            {formatDateLabel(nowDate)} · {shift.vardiya}. vardiya
            {shift.operator ? ` · ${shift.operator}` : ''}
          </span>
          <button
            type="button"
            className="manager-history-button"
            onClick={() => setHistoryPickerOpen(true)}
          >
            Geçmiş vardiyalar
          </button>
          <span className="manager-clock tnum">{formatClock(nowDate)}</span>
        </header>

        <ShiftHistoryPicker
          open={historyPickerOpen}
          lineCode={lineCode}
          onSelect={(id) => {
            setHistoryPickerOpen(false)
            setHistoryShiftId(id)
          }}
          onClose={() => setHistoryPickerOpen(false)}
        />

        {error && <div className="manager-error">{error}</div>}

        <div className="manager-pager-nav">
          {PANEL_TITLES.map((title, index) => (
            <button
              key={title}
              type="button"
              className={`manager-pager-tab${activePanel === index ? ' manager-pager-tab--active' : ''}`}
              onClick={() => setActivePanel(index)}
            >
              {title}
            </button>
          ))}
        </div>

        <div className="manager-pager" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
          {/* `left` yüzdesi — OperatorPanel.jsx'teki AYNI gerekçeyle `transform`
           * DEĞİL: bir öğeyi transform ile kaydırmak, torunlarındaki
           * `position:fixed` öğeler (ürün detayının `sheet-overlay`'i) için
           * yeni bir konumlanma referansı açar. Buradaki sheet zaten
           * pager'ın DIŞINDA render ediliyor (bkz. dosya sonu) ama aynı
           * kalıba bilerek uyuyoruz — ileride biri o overlay'i pager'ın
           * içine taşırsa aynı hatayı tekrar yaşamasın. */}
          <div className="manager-pager-track" style={{ left: `-${activePanel * 100}%` }}>
            {/* Ekran 1/2 — Genel: zaman çizelgesi + şimdi + vardiya toplamı,
              * tek ekranda. İlk sürümde "Şimdi" ile "Vardiya" ayrı ekrandı;
              * kullanıcı ikisinin birlikte daha mantıklı olduğuna karar
              * verdi ("şimdi ile vardiyayı birleştir") — ikisi de sabit
              * boyutlu, ürün sayısından etkilenmiyor, ayrı ekrana ihtiyaç
              * yoktu. Değişken uzunluklu TEK bölüm (ürün listesi) kendi
              * ekranında kaldı. */}
            <div className="manager-pager-panel">
              {/* Vardiyanın tamamı, planlanan bitişe (07:00→15:00 gibi) kadar
               * tek bakışta — henüz gelmemiş kısım taralı, "ŞİMDİ" çizgisi net. */}
              <ShiftClockBar
                intervals={intervals}
                shiftStartMs={shiftStartMs}
                shiftEndMs={shiftEndMs}
                runsById={runsById}
                nowMs={now}
              />

              <section className="zone zone--now">
                <div className="now-state" aria-live="polite">
                  <StatusBadge status={state} size="xl" />
                  <span className="now-elapsed tnum">{formatDuration(son ? son.durationMs : 0)}</span>
                </div>
                {activeRun ? (
                  <div className="now-run">
                    <span className="now-run-product">{activeRun.urun_adi}</span>
                    <span className="now-run-meta plate">
                      {activeRun.parti_no ? `${activeRun.parti_no} · ` : ''}
                      {activeRun.calisma_hizi_pkt_dk ? `${activeRun.calisma_hizi_pkt_dk} pkt/dk` : ''}
                    </span>
                    {/*
                     * Bu ürünün kendi palet/koli/paketi — aşağıdaki "Vardiya
                     * toplamı" ile karıştırılmasın diye burada, ürün adının
                     * hemen altında, ayrı ve net (yaşanmış hata: ürün
                     * değişince eski ürünün toplamı yenisinin altında
                     * görünüyordu).
                     */}
                    <div className="now-run-figures">
                      <span className="now-run-figure">
                        <span className="now-run-figure-value tnum">{activeRunPaletAdedi}</span>
                        <span className="now-run-figure-label plate">palet</span>
                      </span>
                      <span className="now-run-figure">
                        <span className="now-run-figure-value tnum">{activeRunKoli}</span>
                        <span className="now-run-figure-label plate">koli</span>
                      </span>
                      <span className="now-run-figure">
                        <span className="now-run-figure-value tnum">{activeRunPaket ?? '—'}</span>
                        <span className="now-run-figure-label plate">paket</span>
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="now-run-empty plate">Ürün girilmedi</div>
                )}
              </section>

              <section className="zone zone--today">
                <div className="zone-head">
                  {/*
                   * "Vardiya toplamı" — bilerek TÜM ürünlerin toplamı, aktif
                   * ürünün değil (o yukarıda, .now-run-figures'ta). Sadece
                   * "Vardiya" başlığı bunu netleştirmiyordu (yaşanmış
                   * karışıklık: tek ürün varken bu toplam o ürünün rakamlarıyla
                   * birebir aynı görünüyor, "toplamı" ibaresi olmadan aktif
                   * ürüne aitmiş gibi okunuyordu).
                   */}
                  <h2 className="zone-title plate">Vardiya toplamı</h2>
                  <div className="oran-group">
                    <RadialGauge
                      value={totals.zamanKullanimi}
                      seviye={acikKalmaDurum}
                      size={104}
                      valueLabel={`%${zamanKullanimi}`}
                      label="açık kalma"
                    />
                    <RadialGauge
                      value={performans ? performans.oran : null}
                      seviye={performansDurum}
                      size={104}
                      valueLabel={performansYuzde != null ? `%${performansYuzde}` : '—'}
                      label="hız verimi"
                    />
                  </div>
                </div>

                <div
                  className="split-bar"
                  role="img"
                  aria-label={`Açık kalma oranı yüzde ${zamanKullanimi}`}
                >
                  <div className="split-bar-run" style={{ width: `${totals.zamanKullanimi * 100}%` }} />
                </div>

                <dl className="today-figures">
                  <div className="figure figure--run">
                    <dt className="figure-label plate">Çalışma</dt>
                    <dd className="figure-value tnum">{formatDuration(totals.uretimMs)}</dd>
                  </div>
                  <div className="figure figure--stop">
                    <dt className="figure-label plate">Duruş</dt>
                    <dd className="figure-value tnum">{formatDuration(totals.durusMs)}</dd>
                  </div>
                  <div className="figure figure--mola">
                    <dt className="figure-label plate">Mola</dt>
                    <dd className="figure-value tnum">{formatDuration(totals.molaMs)}</dd>
                  </div>
                  <div className="figure">
                    <dt className="figure-label plate">Palet</dt>
                    <dd className="figure-value tnum">{formatBreakdown(paletParts, paletler.paletAdedi)}</dd>
                  </div>
                  <div className="figure">
                    <dt className="figure-label plate">Koli</dt>
                    <dd className="figure-value tnum">{formatBreakdown(koliParts, paletler.koliAdedi)}</dd>
                  </div>
                  <div className="figure">
                    <dt className="figure-label plate">Paket</dt>
                    <dd className="figure-value tnum">{formatBreakdown(paketParts, paket)}</dd>
                  </div>
                </dl>
              </section>
            </div>

            {/* Ekran 2/2 — Ürünler: ürün bazlı liste. Sayfadaki TEK gerçekten
              * değişken-uzunluklu bölüm burasıydı (ürün sayısı arttıkça
              * uzuyordu) — artık kabuğu değil, sadece kendi panelini kaydırır. */}
            <div className="manager-pager-panel">
              {productRows.length > 0 ? (
                <div className="plan-stack">
                  <span className="plan-stack-hint">Ürün detayı için satıra dokun</span>
                  {productRows.map(
                    ({ run, acikKalmaOran, perf, pace, isActive, runPallets, paletAdedi, koli, runPaket }, index) => {
                    const isFirstFrozen = !isActive && (index === 0 || productRows[index - 1].isActive)
                    return (
                    <div
                      key={run.id}
                      className={`plan-row${pace ? ` plan-row--${pace.durum}` : ''}${
                        isActive ? '' : ' plan-row--frozen'
                      }${isFirstFrozen ? ' plan-row--frozen-first' : ''}`}
                      role="button"
                      tabIndex={0}
                      aria-label={`${run.urun_adi} detayı`}
                      onClick={() => setDetayRunId(run.id)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault()
                          setDetayRunId(run.id)
                        }
                      }}
                    >
                      <div className="plan-row-head">
                        <span className="plan-row-label plate">{run.urun_adi}</span>
                        <div className="plan-row-metrics tnum">
                          <span className="plan-row-metric">
                            <span className="plan-row-metric-value">
                              {acikKalmaOran != null ? `%${Math.round(acikKalmaOran * 100)}` : '—'}
                            </span>
                            <span className="plan-row-metric-label plate">açık kalma</span>
                          </span>
                          <span className="plan-row-metric">
                            <span className="plan-row-metric-value">
                              {perf ? `%${Math.round(perf.oran * 100)}` : '—'}
                            </span>
                            <span className="plan-row-metric-label plate">hız verimi</span>
                          </span>
                        </div>
                        {pace && (
                          <>
                            <span className="plan-row-figure tnum">
                              {pace.uretilenKoli} / {pace.hedefKoli} koli
                            </span>
                            <span className="plan-row-status">
                              {pace.durum === 'tamam'
                                ? 'Hedef tamam'
                                : pace.durum === 'planinda'
                                  ? 'Planında'
                                  : `${formatDelta(pace.farkDk)} ${pace.durum === 'onde' ? 'önde' : 'geride'}`}
                            </span>
                          </>
                        )}
                      </div>
                      {/*
                       * Bu ürünün kendi palet/koli/paketi — "Vardiya toplamı"
                       * ekranındaki rakamın hangi üründen geldiği burada net
                       * görünsün diye (yaşanmış karışıklık: vardiya toplamı tek
                       * ürünün üretimiyle birebir aynı görününce o rakamın
                       * nereden geldiği belirsiz kalıyordu).
                       */}
                      <div className="plan-row-counts tnum">
                        {paletAdedi} palet · {koli} koli · {runPaket ?? '—'} paket
                      </div>
                      {pace && (
                        <div className="plan-row-track">
                          <div className="plan-row-fill" style={{ width: `${pace.ilerleme * 100}%` }} />
                        </div>
                      )}
                      {runPallets.length > 0 && (
                        <div className="plan-row-pallets">
                          <span className="plan-row-pallets-label plate">Palet çıkış saatleri</span>
                          <ul className="plan-row-pallets-list">
                            {runPallets.map((pallet) => (
                              <li key={pallet.id} className="plan-row-pallets-row tnum">
                                <span>{formatShortTime(new Date(pallet.completed_at))}</span>
                                <span>{pallet.koli_count} koli</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                    )
                  })}
                </div>
              ) : (
                <p className="zone-empty plate">Henüz ürün girilmedi</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/*
        * Ürün detayı — operatördeki `ProductHistory` detayının aynısı,
        * ortak `ProductDetail` bileşeniyle. Salt-okunur: "Düzenle" yok,
        * müdür panosu hiçbir yazma çağrısı içermez (bkz. CLAUDE.md).
        */}
      {acikOzet && (
        <div className="sheet-overlay sheet-overlay--wall" onClick={() => setDetayRunId(null)}>
          <div
            className="sheet-panel"
            role="dialog"
            aria-modal="true"
            aria-label={acikOzet.run.urun_adi}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="sheet-handle" />
            <h2 className="sheet-title plate">{acikOzet.run.urun_adi}</h2>
            {acikOzet.run.parti_no ? (
              <p className="sheet-subtitle">{acikOzet.run.parti_no}</p>
            ) : null}

            <ProductDetail ozet={acikOzet} />

            <div className="sheet-actions">
              <button
                type="button"
                className="sheet-button sheet-button--primary"
                onClick={() => setDetayRunId(null)}
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ManagerDashboard

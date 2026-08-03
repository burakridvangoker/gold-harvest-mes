import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useShift } from '../hooks/useShift'
import { useLineCode } from '../hooks/useLineCode'
import LineSelect from '../components/LineSelect'
import ShiftHistoryPicker from '../components/ShiftHistoryPicker'
import ShiftHistoryDetail from '../components/ShiftHistoryDetail'
import {
  buildIntervals,
  currentState,
  downtimeByNote,
  hizVerimi,
  hourlyPaket,
  koliToPaket,
  paceStatus,
  palletTotals,
  palletTotalsByRun,
  runSpans,
  segmentKind,
  seviyeDurumu,
  shiftPaket,
  shiftSegments,
  shiftTotals,
  totalsByRun,
} from '../lib/timeline'
import { formatBreakdown, formatDelta, formatDuration } from '../lib/duration'
import { formatClock, formatDateLabel, formatShortTime } from '../lib/time'
import StatusBadge from '../components/StatusBadge'
import RadialGauge from '../components/RadialGauge'
import ShiftClockBar from '../components/ShiftClockBar'
import ProductionBars from '../components/ProductionBars'
import './ManagerDashboard.css'

const NO_REASON_LABEL = 'Sebep girilmemiş'
const TAM_ISRAR_MS = 30 * 60 * 1000
const VISIT_HEARTBEAT_MS = 20 * 1000

function ManagerDashboard() {
  const { lineCode, selectLine, clearLine } = useLineCode()
  const { shift, runs, events, pallets, loading, error } = useShift(lineCode)
  const [now, setNow] = useState(() => Date.now())
  const [historyPickerOpen, setHistoryPickerOpen] = useState(false)
  const [historyShiftId, setHistoryShiftId] = useState(null)

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
   * planda hiç ateşlenmeyebilir, süre olduğu yerde donar (yaşanmış durum:
   * sekme dakikalarca arka planda açık kalmış ama kayıt "1 dk altı"
   * gösteriyordu). `visibilitychange`/`focus` ile sekme tekrar öne
   * geldiği ANDA bir ping atılır — bu, arka planda geçen süreyi saymaz
   * (o zaten kimse bakmıyordu demektir) ama panoya her dönüşte süreyi
   * güncel tutar.
   */
  useEffect(() => {
    if (!lineCode) return

    let visitId = null
    let cancelled = false

    const ping = () => {
      if (!visitId) return
      supabase
        .from('manager_dashboard_visits')
        .update({ last_seen_at: new Date().toISOString() })
        .eq('id', visitId)
    }

    supabase
      .from('manager_dashboard_visits')
      .insert({ line_code: lineCode })
      .select('id')
      .single()
      .then(({ data }) => {
        if (!cancelled && data) visitId = data.id
      })

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
  /* Limitsiz — sayfa kaydırılabilir, hiçbir duruş sebebi gizlenmesin. */
  const topReasons = useMemo(() => downtimeByNote(intervals), [intervals])

  const shiftStartMs = shift ? new Date(shift.started_at).getTime() : null

  /*
   * "Tüm vardiya alt alta" yerine mola başlangıçlarına göre bölümlere
   * ayrılmış, yan yana bir görünüm — 3 mola varsa 4 bölüm çıkar. Her
   * bölümün kendi olay listesi kendi içinde alt alta.
   */
  const segments = useMemo(
    () => shiftSegments(events, { shiftStartMs, endMs: now }),
    [events, shiftStartMs, now],
  )

  const activeRun = useMemo(() => {
    const last = intervals[intervals.length - 1]
    return (last?.productRunId && runsById.get(last.productRunId)) || runs[runs.length - 1] || null
  }, [intervals, runs, runsById])

  const nowDate = new Date(now)

  if (!lineCode) {
    return <LineSelect onSelect={selectLine} />
  }

  if (historyShiftId) {
    return (
      <div className="manager-shell is-beklemede">
        <div className="andon-rail" />
        <div className="manager-dashboard">
          <button type="button" className="manager-line-code" onClick={clearLine}>
            {lineCode}
          </button>
          <ShiftHistoryDetail
            shiftId={historyShiftId}
            readOnly
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

  const maxReasonMs = topReasons[0]?.ms ?? 0

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
  const hourlyBuckets = hourlyPaket(pallets, runsById, shiftStartMs, now)

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

        {/* Vardiyanın tamamı, planlanan bitişe (07:00→15:00 gibi) kadar tek
         * bakışta — henüz gelmemiş kısım taralı, "ŞİMDİ" çizgisi net. */}
        <ShiftClockBar
          intervals={intervals}
          shiftStartMs={shiftStartMs}
          shiftEndMs={shiftEndMs}
          runsById={runsById}
          nowMs={now}
        />

        {/* ŞİMDİ */}
        <section className="zone zone--now">
          <h2 className="zone-title plate">Şimdi</h2>
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
               * Bu ürünün kendi palet/koli/paketi — aşağıdaki "Vardiya"
               * bölgesindeki toplamla karıştırılmasın diye burada, ürün
               * adının hemen altında, ayrı ve net (yaşanmış hata: ürün
               * değişince eski ürünün toplamı yenisinin altında görünüyordu).
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

        {/* BUGÜN */}
        <section className="zone zone--today">
          <div className="zone-head">
            {/*
             * "Vardiya toplamı" — bilerek TÜM ürünlerin toplamı, aktif
             * ürünün değil (o "Şimdi" bölgesinde, .now-run-figures'ta).
             * Sadece "Vardiya" başlığı bunu netleştirmiyordu (yaşanmış
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

          {/* Saatlik üretim — tek seri, tek ton; büyüklüğü/eğilimi tek bakışta gösterir. */}
          <div className="hourly-block">
            <span className="hourly-label plate">Saatlik üretim (paket)</span>
            <ProductionBars buckets={hourlyBuckets} />
          </div>

          {productRows.length > 0 && (
            <div className="plan-stack">
              {productRows.map(
                ({ run, acikKalmaOran, perf, pace, isActive, runPallets, paletAdedi, koli, runPaket }, index) => {
                const isFirstFrozen = !isActive && (index === 0 || productRows[index - 1].isActive)
                return (
                <div
                  key={run.id}
                  className={`plan-row${pace ? ` plan-row--${pace.durum}` : ''}${
                    isActive ? '' : ' plan-row--frozen'
                  }${isFirstFrozen ? ' plan-row--frozen-first' : ''}`}
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
                   * bölümündeki rakamın hangi üründen geldiği burada net
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
          )}
        </section>

        {/* NEDEN */}
        <section className="zone zone--why">
          <h2 className="zone-title plate">Duruş sebepleri</h2>
          {topReasons.length === 0 ? (
            <p className="zone-empty plate">Duruş kaydı yok</p>
          ) : (
            <ul className="reasons-list">
              {topReasons.map((reason) => (
                <li key={reason.note ?? '__yok__'} className="reasons-row">
                  <div className="reasons-row-head">
                    <span className="reasons-row-label">{reason.note ?? NO_REASON_LABEL}</span>
                    <span className="reasons-row-value tnum">
                      {formatDuration(reason.ms)}
                      <span className="reasons-row-count"> ×{reason.adet}</span>
                    </span>
                  </div>
                  <div className="reasons-row-bar-track">
                    <div
                      className="reasons-row-bar-fill"
                      style={{ width: `${maxReasonMs > 0 ? (reason.ms / maxReasonMs) * 100 : 0}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* ÇEYREKLER — molalara göre bölünmüş, yan yana */}
        <section className="zone zone--quarters">
          <h2 className="zone-title plate">Vardiya bölümleri</h2>
          <div className="quarters-row">
            {segments.map((segment) => {
              const segIntervals = intervals
                .filter((interval) => interval.startMs >= segment.startMs && interval.startMs < segment.endMs)
                .reverse()

              return (
                <div key={segment.index} className="quarter-col">
                  <div className="quarter-col-head">
                    <span className="quarter-col-title plate">{segment.index}. Bölüm</span>
                    <span className="quarter-col-time tnum">
                      {formatShortTime(new Date(segment.startMs))} –{' '}
                      {segment.endMs >= now ? 'şimdi' : formatShortTime(new Date(segment.endMs))}
                    </span>
                  </div>
                  {segIntervals.length === 0 ? (
                    <p className="zone-empty plate">Olay yok</p>
                  ) : (
                    <ul className="quarter-col-list">
                      {segIntervals.map((interval) => (
                        <li
                          key={interval.eventId}
                          className={`quarter-row${interval.ongoing ? ' quarter-row--ongoing' : ''} quarter-row--${segmentKind(interval)}`}
                        >
                          <span className="quarter-row-time tnum">
                            {formatShortTime(new Date(interval.startMs))}
                          </span>
                          {/*
                           * 'uretim' ve 'mola' dışındaki HER kind burada duruş
                           * gibi ele alınır (tek satır 'durus' kontrolü değil) —
                           * addToTotals'taki final else ile aynı desen. Kaldırılmış
                           * özelliklerden (ör. eski 'hazirlik') kalan satırlar bu
                           * sayede "Üretim" gibi yanlış bir etikete düşmez.
                           */}
                          <span className="quarter-row-label">
                            {interval.kind === 'uretim'
                              ? runsById.get(interval.productRunId)?.urun_adi || 'Üretim'
                              : interval.kind === 'mola'
                                ? 'Mola'
                                : interval.note || NO_REASON_LABEL}
                          </span>
                          <span className="quarter-row-duration tnum">
                            {formatDuration(interval.durationMs)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      </div>
    </div>
  )
}

export default ManagerDashboard

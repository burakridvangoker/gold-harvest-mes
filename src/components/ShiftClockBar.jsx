import { useState } from 'react'
import { formatDelta } from '../lib/duration'
import { formatShortTime } from '../lib/time'
import { segmentKind } from '../lib/timeline'
import './ShiftClockBar.css'

const SAAT_MS = 60 * 60 * 1000
const NO_REASON_LABEL = 'Sebep girilmemiş'

/*
 * Vardiyanın tamamını, SAATE bağlı olarak (07:00 → 15:00 gibi planlanan
 * bitişe kadar) gösteren yatay çubuk — ShiftTimelineBar'ın yerini aldı.
 * Ondan farkı: segment genişlikleri "şimdiye kadar geçen süre"ye değil,
 * vardiyanın TAMAMINA (planlanan bitişe) oranlanır — henüz gelmemiş kısım
 * taralı görünür; dolu/taralı sınırı zaten "şimdi"nin nerede olduğunu
 * gösterdiği için üstteki "ŞİMDİ" saat etiketinin dışında ayrıca dikey bir
 * çizgi/çubuk YOK — dolu/taralı ayrımı + saat etiketi yeterli, ekstra
 * bir çizgi altındaki lejantla çakışıp kalabalık yaratıyordu (yaşanmış
 * şikayet).
 *
 * Metin etiketleri bilerek çubuğun ÜSTÜNDE değil: renk zaten durumu
 * anlatıyor (yeşil/kırmızı/amber, andon dili ile tutarlı). Sebep/ürün adı
 * ve dakika cinsinden süre sadece bir segmente dokununca (tıkla-aç/kapa)
 * beliren bir balonda gösterilir — sürekli metin duvar ekranından
 * kalabalık görünürdü.
 *
 * `onEdit` opsiyonel: verilirse balona bir "Düzenle" butonu eklenir —
 * operatör ekranında kullanılır (müdür panosu salt-okunur, bu prop hiç
 * geçirilmez). Tek dokunuşla dokunuşa çıkma riskine karşı düzenleme
 * doğrudan segmenti tıklayınca değil, önce balonu açıp İÇİNDEKİ ayrı bir
 * "Düzenle" dokunuşuyla tetiklenir — TimeSheet'in kaydırmalı çarkına
 * kadar giden akışı `EventLog` üstlenir (bkz. OperatorPanel'deki
 * `logFocusEventId`), burada sadece o akışı tetikleyen bir çağrı yapılır.
 */
function reasonLabel(interval, runsById) {
  if (interval.kind === 'uretim') return runsById.get(interval.productRunId)?.urun_adi || 'Üretim'
  if (interval.kind === 'mola') return 'Mola'
  return interval.note || NO_REASON_LABEL
}

function ShiftClockBar({ intervals, shiftStartMs, shiftEndMs, runsById, nowMs, onEdit, compact = false }) {
  const [activeId, setActiveId] = useState(null)

  if (shiftStartMs == null) return null

  /*
   * Çok kısa segmentler (ör. 3 dk) duvar ekranında/telefonda parmakla tam
   * isabet ettirmesi zor oluyor — çubuğun yanına önceki/sonraki oku eklendi,
   * segment listesindeki (zaten kronolojik) sırayı adım adım gezdiriyor.
   * Hiçbir şey seçili değilken "sonraki" ilkten, "önceki" sondan başlar —
   * bu, kullanıcının hangi uçtan gezmeye başladığına göre en sezgisel yön.
   */
  const activeIndex = intervals.findIndex((interval) => interval.eventId === activeId)

  const goToPrev = () => {
    if (intervals.length === 0) return
    const target = activeIndex === -1 ? intervals.length - 1 : Math.max(activeIndex - 1, 0)
    setActiveId(intervals[target].eventId)
  }

  const goToNext = () => {
    if (intervals.length === 0) return
    const target = activeIndex === -1 ? 0 : Math.min(activeIndex + 1, intervals.length - 1)
    setActiveId(intervals[target].eventId)
  }

  const prevDisabled = intervals.length === 0 || activeIndex === 0
  const nextDisabled = intervals.length === 0 || activeIndex === intervals.length - 1

  /*
   * Vardiya süresini aşıp aşmadığımıza göre eksenin sonu değişir: normalde
   * planlanan bitiş (gelecek kısım taralı görünür); vardiya uzadıysa
   * (nowMs planlanan bitişi geçtiyse) eksen "şimdi"ye kadar uzar — gelecek
   * hiç gösterilmez, segmentler taşıp kırpılmaz.
   */
  const displayEndMs = shiftEndMs != null && nowMs < shiftEndMs ? shiftEndMs : nowMs
  const totalSpan = displayEndMs - shiftStartMs
  if (totalSpan <= 0) return null

  const hasFuture = shiftEndMs != null && nowMs < shiftEndMs

  const hourTicks = []
  for (let t = shiftStartMs; t <= displayEndMs; t += SAAT_MS) hourTicks.push(t)
  if (hourTicks[hourTicks.length - 1] !== displayEndMs) hourTicks.push(displayEndMs)

  /*
   * Vardiya tam saatte bitmiyorsa (ör. 15:05) son tam saat işareti
   * (15:00) ile gerçek bitiş birbirine çok yakın düşüyor — ikisinin
   * metni ekseninde üst üste binip okunaksız oluyordu (yaşanmış hata,
   * ekran görüntüsüyle bildirildi: "1510005" gibi çakışan metin).
   * Aradaki tam saat ETİKETİ gizlenir (ızgara çizgisi zaten yok, o zaten
   * `hourTicks.slice(0, -1)` ile ayrı çiziliyor), sadece gerçek bitiş
   * saati gösterilir.
   */
  const minLabelGapMs = totalSpan * 0.035
  const hideTickIndex =
    hourTicks.length > 1 && hourTicks[hourTicks.length - 1] - hourTicks[hourTicks.length - 2] < minLabelGapMs
      ? hourTicks.length - 2
      : -1

  const nowPct = ((nowMs - shiftStartMs) / totalSpan) * 100

  return (
    <div className="clockbar">
      <div className="clockbar-nav-row">
        <button
          type="button"
          className="clockbar-nav-button"
          onClick={goToPrev}
          disabled={prevDisabled}
          aria-label="Önceki olay"
        >
          ‹
        </button>

        <div className="clockbar-timeline">
          {intervals.map((interval) => {
            if (interval.eventId !== activeId) return null

            const leftPct = ((interval.startMs - shiftStartMs) / totalSpan) * 100
            const widthPct = Math.max((interval.durationMs / totalSpan) * 100, 0.6)
            const durationLabel = formatDelta(Math.round(interval.durationMs / 60000))
            const range = interval.ongoing
              ? `${formatShortTime(new Date(interval.startMs))} – şimdi`
              : `${formatShortTime(new Date(interval.startMs))} – ${formatShortTime(new Date(interval.endMs))}`
            /* Balon segmentin ortasına oturur ama kenara çok yakınsa (ilk/son
             * segment) taşıp kart dışına çıkmasın diye %6-%94 arasına
             * kelepçelenir. */
            const tipLeftPct = Math.min(94, Math.max(6, leftPct + widthPct / 2))

            return (
              <div key={interval.eventId} className="clockbar-tip" style={{ left: `${tipLeftPct}%` }}>
                <span className="clockbar-tip-reason">{reasonLabel(interval, runsById)}</span>
                <span className="clockbar-tip-meta">
                  {range} · {durationLabel}
                </span>
                {onEdit && (
                  <button type="button" className="clockbar-tip-edit" onClick={() => onEdit(interval)}>
                    Düzenle
                  </button>
                )}
              </div>
            )
          })}

          {hasFuture && (
            <div className="clockbar-now-label" style={{ left: `${nowPct}%` }}>
              <small>Şimdi</small>
              {formatShortTime(new Date(nowMs))}
            </div>
          )}

          <div className="clockbar-track">
            <div className="clockbar-hourgrid" style={{ '--hours': hourTicks.length - 1 }}>
              {hourTicks.slice(0, -1).map((tick) => (
                <div key={tick} />
              ))}
            </div>

            {intervals.map((interval) => {
              const leftPct = ((interval.startMs - shiftStartMs) / totalSpan) * 100
              const widthPct = Math.max((interval.durationMs / totalSpan) * 100, 0.6)

              return (
                <button
                  key={interval.eventId}
                  type="button"
                  className={`clockbar-seg clockbar-seg--${segmentKind(interval)}${
                    interval.eventId === activeId ? ' clockbar-seg--active' : ''
                  }`}
                  style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                  aria-label={`${reasonLabel(interval, runsById)}, ${formatShortTime(new Date(interval.startMs))}`}
                  onClick={() =>
                    setActiveId((current) => (current === interval.eventId ? null : interval.eventId))
                  }
                />
              )
            })}

            {hasFuture && <div className="clockbar-future" style={{ left: `${nowPct}%`, right: 0 }} />}
          </div>

          <div className="clockbar-axis">
            {hourTicks.map((tick, index) => {
              if (index === hideTickIndex) return null
              return (
                <span key={tick} style={{ left: `${((tick - shiftStartMs) / totalSpan) * 100}%` }}>
                  {formatShortTime(new Date(tick))}
                </span>
              )
            })}
          </div>
        </div>

        <button
          type="button"
          className="clockbar-nav-button"
          onClick={goToNext}
          disabled={nextDisabled}
          aria-label="Sonraki olay"
        >
          ›
        </button>
      </div>

      {/*
       * `compact`: dar bir yerde (ör. operatörün Ana ekranı, hiç
       * kaymaması istenen bir ekran) lejant + ipucu metni fazla dikey yer
       * kaplıyordu — renk zaten durumu anlatıyor, dokunma davranışı
       * (balon açma) lejant görünmese de aynen çalışır.
       */}
      {!compact && (
        <div className="clockbar-legend">
          <span className="clockbar-legend-item">
            <span className="clockbar-legend-dot clockbar-legend-dot--uretim" />
            Üretim
          </span>
          <span className="clockbar-legend-item">
            <span className="clockbar-legend-dot clockbar-legend-dot--durus" />
            Duruş
          </span>
          <span className="clockbar-legend-item">
            <span className="clockbar-legend-dot clockbar-legend-dot--mola" />
            Mola
          </span>
          <span className="clockbar-legend-hint">
            {onEdit ? 'Sebebi görmek ve düzenlemek için bir bloğa dokun' : 'Sebebi görmek için bir bloğa dokun'}
          </span>
        </div>
      )}
    </div>
  )
}

export default ShiftClockBar

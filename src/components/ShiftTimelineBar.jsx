import { useState } from 'react'
import { formatDuration } from '../lib/duration'
import { formatShortTime } from '../lib/time'
import './ShiftTimelineBar.css'

/*
 * Vardiyanın tamamını TEK bakışta gösteren yatay şerit — "Vardiya
 * bölümleri"ndeki metin listesinin yanında, aynı veriyi (buildIntervals'tan
 * gelen aralıklar) görsel bir okuma olarak sunar. Üç durum var, üçü de her
 * zaman aynı andon rengini taşır (status paleti — kategorik değil, sabit).
 *
 * dataviz kuralı: ≥2 seri her zaman lejant + kimlik renkte kalmasın; burada
 * 3 sabit durum olduğu için kalıcı bir lejant satırı var (renk körü/gri
 * tonda ekran görüntüsünde bile "hangi renk ne" ayrımı metinden okunsun).
 * Segmentler arası 2px zemin boşluğu (mark spec) — bitişik renkler
 * birbirine karışmasın diye.
 */

const KIND_LABEL = { uretim: 'Üretim', durus: 'Duruş', mola: 'Mola' }

function ShiftTimelineBar({ intervals }) {
  const [hover, setHover] = useState(null)
  const totalMs = intervals.reduce((sum, interval) => sum + interval.durationMs, 0) || 1

  return (
    <div className="shift-timeline">
      <div className="shift-timeline-track">
        {intervals.map((interval, index) => {
          const widthPct = (interval.durationMs / totalMs) * 100
          if (widthPct <= 0) return null
          return (
            <button
              key={interval.eventId ?? index}
              type="button"
              className={`shift-timeline-seg shift-timeline-seg--${interval.kind}`}
              style={{ width: `${widthPct}%` }}
              onMouseEnter={() => setHover(interval)}
              onFocus={() => setHover(interval)}
              onMouseLeave={() => setHover(null)}
              onBlur={() => setHover(null)}
              aria-label={`${KIND_LABEL[interval.kind]} · ${formatShortTime(new Date(interval.startMs))} · ${formatDuration(interval.durationMs)}`}
            />
          )
        })}
      </div>
      <div className="shift-timeline-legend">
        <span className="shift-timeline-legend-item">
          <span className="shift-timeline-swatch shift-timeline-swatch--uretim" />
          Üretim
        </span>
        <span className="shift-timeline-legend-item">
          <span className="shift-timeline-swatch shift-timeline-swatch--durus" />
          Duruş
        </span>
        <span className="shift-timeline-legend-item">
          <span className="shift-timeline-swatch shift-timeline-swatch--mola" />
          Mola
        </span>
        <span className="shift-timeline-hover tnum">
          {hover
            ? `${formatShortTime(new Date(hover.startMs))} · ${KIND_LABEL[hover.kind]}${hover.note ? ` · ${hover.note}` : ''} · ${formatDuration(hover.durationMs)}`
            : ' '}
        </span>
      </div>
    </div>
  )
}

export default ShiftTimelineBar

import { useState } from 'react'
import './ProductionBars.css'

/*
 * Saatlik üretim grafiği — tek seri (paket adedi), tek ton (yeşilin derin
 * varyantı). dataviz kuralı: büyüklük/tek seri → sequential tek hue,
 * gökkuşağı yok, lejant gerekmiyor (başlık zaten neyi gösterdiğini söylüyor).
 * Çubuklar 2px boşlukla ayrılır, üstte hafif yuvarlak uç (mark spec).
 */

function ProductionBars({ buckets, height = 64 }) {
  const [hover, setHover] = useState(null)
  const max = Math.max(1, ...buckets.map((b) => b.paket))

  return (
    <div className="prodbars">
      <div className="prodbars-track" style={{ height }}>
        {buckets.map((bucket) => {
          const pct = (bucket.paket / max) * 100
          return (
            <button
              key={bucket.index}
              type="button"
              className="prodbars-bar"
              style={{ height: `${Math.max(pct, bucket.paket > 0 ? 4 : 2)}%` }}
              onMouseEnter={() => setHover(bucket)}
              onFocus={() => setHover(bucket)}
              onMouseLeave={() => setHover(null)}
              onBlur={() => setHover(null)}
              aria-label={`Saat ${bucket.index + 1}: ${bucket.paket} paket`}
            />
          )
        })}
      </div>
      <div className="prodbars-foot">
        <span>Saat 1</span>
        <span className="prodbars-hover tnum">
          {hover ? `${hover.index + 1}. saat · ${hover.paket} paket` : ' '}
        </span>
        <span>Saat {buckets.length}</span>
      </div>
    </div>
  )
}

export default ProductionBars

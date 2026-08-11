import './RadialGauge.css'

/*
 * Dairesel gösterge — tek bir yüzdeyi (açık kalma oranı, hız verimi, ürün
 * planı ilerlemesi) andon durum renginde bir halka olarak okur. Tek bir
 * değer olduğu için ayrı bir lejant gerekmiyor (dataviz kuralı: tek seri
 * lejant istemez) — başlık zaten neyi gösterdiğini söylüyor. Renk andon'un
 * durum paletinden (iyi/orta/kötü), rastgele/kategorik değil.
 *
 * SVG'de <text> yerine ayrı bir HTML katmanı: rakamlar .tnum ile sabit
 * genişlikte kalsın (SVG text-rendering bunu garanti etmiyor).
 */

function RadialGauge({ value, seviye = null, size = 120, thickness, label, valueLabel }) {
  const stroke = thickness ?? size * 0.11
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const clamped = value == null ? 0 : Math.max(0, Math.min(1, value))
  const dash = circumference * clamped

  const colorClass = seviye ? ` radial-gauge--${seviye}` : ''

  return (
    <div className={`radial-gauge${colorClass}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          className="radial-gauge-track"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={stroke}
          fill="none"
        />
        {value != null && (
          <circle
            className="radial-gauge-fill"
            cx={size / 2}
            cy={size / 2}
            r={radius}
            strokeWidth={stroke}
            fill="none"
            strokeDasharray={`${dash} ${circumference}`}
            strokeLinecap="round"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        )}
      </svg>
      <div className="radial-gauge-center">
        <span className="radial-gauge-value tnum">{valueLabel ?? '—'}</span>
        {label && <span className="radial-gauge-label plate">{label}</span>}
      </div>
    </div>
  )
}

export default RadialGauge

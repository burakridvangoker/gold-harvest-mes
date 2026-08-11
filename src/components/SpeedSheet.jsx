import { useEffect, useState } from 'react'
import './Sheet.css'

/*
 * Çalışma hızı artık kurulumda bir kere sorulan sabit bir hedef değil —
 * operatörün üretim sırasında istediği zaman güncelleyebildiği anlık bir
 * değer. Bu yüzden ayrı, her an ulaşılabilir bir sayfa.
 */
function SpeedSheet({ open, initialValue, onConfirm, onCancel }) {
  const [value, setValue] = useState('')

  useEffect(() => {
    if (open) setValue(initialValue != null ? String(initialValue) : '')
  }, [open, initialValue])

  if (!open) return null

  const parsed = Number(value)
  const valid = value.trim() !== '' && Number.isFinite(parsed) && parsed > 0

  return (
    <div className="sheet-overlay" onClick={onCancel}>
      <div
        className="sheet-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Çalışma hızı"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sheet-handle" />
        <h2 className="sheet-title plate">Çalışma hızı</h2>

        <label className="sheet-field">
          <span className="sheet-field-label">Paket / dakika</span>
          <input
            className="sheet-input tnum"
            type="number"
            inputMode="decimal"
            min="0"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder="Örn. 45"
            autoFocus
          />
        </label>

        <div className="sheet-actions">
          <button type="button" className="sheet-button sheet-button--secondary" onClick={onCancel}>
            Vazgeç
          </button>
          <button
            type="button"
            className="sheet-button sheet-button--primary"
            disabled={!valid}
            onClick={() => onConfirm(parsed)}
          >
            Kaydet
          </button>
        </div>
      </div>
    </div>
  )
}

export default SpeedSheet

import { useShiftList } from '../hooks/useShiftList'
import { formatDuration } from '../lib/duration'
import { formatDateLabel, formatShortTime } from '../lib/time'
import './Sheet.css'
import './ShiftHistoryPicker.css'

/*
 * "Geçmiş vardiyalar" seçici — hem operatör hem müdür ekranı kullanır.
 * Vardiyayı bitirmek veri silmiyor; bu liste her zaman doludur, dokununca
 * o vardiyanın donmuş özetine (ShiftHistoryDetail) geçilir.
 */
function ShiftHistoryPicker({ open, lineCode, onSelect, onClose }) {
  const { shifts, loading } = useShiftList(lineCode)

  if (!open) return null

  return (
    <div className="sheet-overlay" onClick={onClose}>
      <div
        className="sheet-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Geçmiş vardiyalar"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sheet-handle" />
        <h2 className="sheet-title plate">Geçmiş vardiyalar</h2>

        {loading ? (
          <p className="history-picker-empty">Yükleniyor</p>
        ) : shifts.length === 0 ? (
          <p className="history-picker-empty">Henüz kapanmış vardiya yok</p>
        ) : (
          <ul className="history-picker-list">
            {shifts.map((shift) => {
              const startMs = new Date(shift.started_at).getTime()
              const endMs = new Date(shift.ended_at).getTime()

              return (
                <li key={shift.id}>
                  <button
                    type="button"
                    className="history-picker-row"
                    onClick={() => onSelect(shift.id)}
                  >
                    <span className="history-picker-row-main">
                      {formatDateLabel(new Date(startMs))} · {shift.vardiya}. vardiya
                      {shift.operator ? ` · ${shift.operator}` : ''}
                    </span>
                    <span className="history-picker-row-meta tnum">
                      {formatShortTime(new Date(startMs))} – {formatShortTime(new Date(endMs))} ·{' '}
                      {formatDuration(endMs - startMs)}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}

        <div className="sheet-actions">
          <button type="button" className="sheet-button sheet-button--primary" onClick={onClose}>
            Kapat
          </button>
        </div>
      </div>
    </div>
  )
}

export default ShiftHistoryPicker

import { LINE_CODES } from '../lib/lines'
import './LineSelect.css'

/* İşe her başladığında ya da hat değiştirdiğinde önce buradan geçilir. */
function LineSelect({ onSelect }) {
  return (
    <div className="line-select-shell">
      <div className="andon-rail" />
      <div className="line-select-panel">
        <span className="line-select-hint plate">Hangi hat?</span>
        <div className="line-select-list">
          {LINE_CODES.map((code) => (
            <button
              key={code}
              type="button"
              className="line-select-button"
              onClick={() => onSelect(code)}
            >
              {code}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export default LineSelect

import { useEffect, useState } from 'react'
import './ReasonPicker.css'

function ReasonPicker({ open, plansizReasons, planliReasons, onSelect, onSkip, onSubmitNote }) {
  const [noteMode, setNoteMode] = useState(false)
  const [noteText, setNoteText] = useState('')

  useEffect(() => {
    if (open) {
      setNoteMode(false)
      setNoteText('')
    }
  }, [open])

  if (!open) return null

  const handleNoteSubmit = () => {
    const trimmed = noteText.trim()
    if (!trimmed) return
    onSubmitNote(trimmed)
  }

  return (
    <div className="reason-picker-overlay" onClick={onSkip}>
      <div
        className="reason-picker-sheet"
        role="dialog"
        aria-modal="true"
        aria-label="Duruş sebebi seç"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="reason-picker-handle" />
        <h2 className="reason-picker-title">Duruş sebebi</h2>

        <button type="button" className="reason-skip-button" onClick={onSkip}>
          Sonra gir / boş bırak
        </button>

        <div className="reason-picker-scroll">
          {plansizReasons.length > 0 && (
            <section className="reason-group">
              <h3 className="reason-group-title reason-group-title--plansiz">Plansız</h3>
              <div className="reason-group-list">
                {plansizReasons.map((reason) => (
                  <button
                    key={reason.id}
                    type="button"
                    className="reason-button reason-button--plansiz"
                    onClick={() => onSelect(reason.code)}
                  >
                    {reason.label}
                  </button>
                ))}
              </div>
            </section>
          )}

          {planliReasons.length > 0 && (
            <section className="reason-group">
              <h3 className="reason-group-title reason-group-title--planli">Planlı</h3>
              <div className="reason-group-list">
                {planliReasons.map((reason) => (
                  <button
                    key={reason.id}
                    type="button"
                    className="reason-button reason-button--planli"
                    onClick={() => onSelect(reason.code)}
                  >
                    {reason.label}
                  </button>
                ))}
              </div>
            </section>
          )}

          <section className="reason-group">
            {!noteMode ? (
              <button type="button" className="reason-note-toggle" onClick={() => setNoteMode(true)}>
                Serbest yaz…
              </button>
            ) : (
              <div className="reason-note-form">
                <textarea
                  className="reason-note-input"
                  placeholder="Duruş sebebini yaz…"
                  value={noteText}
                  onChange={(event) => setNoteText(event.target.value)}
                  rows={3}
                  autoFocus
                />
                <button
                  type="button"
                  className="reason-note-save"
                  onClick={handleNoteSubmit}
                  disabled={!noteText.trim()}
                >
                  Kaydet
                </button>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}

export default ReasonPicker

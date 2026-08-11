import { useEffect, useRef, useState } from 'react'
import './StopNoteSheet.css'

/*
 * Duruş sebebi — kodsuz.
 *
 * Sahada kod kataloğu kullanılmıyor; operatör ne olduysa kendi cümlesiyle
 * yazıyor. Tekrarlayan notlar frekansa göre üste çıkıp tek dokunuşluk çip
 * oluyor. Kodlar (stop_reasons) zamanla bu çiplerden terfi edecek — kimsenin
 * önceden katalog hazırlaması gerekmiyor.
 *
 * "Sonra gir" hep açık: eksik kayıt, yanlış kayıttan iyidir.
 *
 * Tek bir duruşta birden fazla, ÇAKIŞAN sebep olabiliyor (ör. bobin
 * değişimi + ambalaj ayarı + elektrik arızası aynı anda, ayrı zaman
 * damgalarına bölünecek net bir sıraları yok). Çipler bu yüzden tek
 * dokunuşta ANINDA KAYDETMEZ — çoğul seçilebilir: seçilenler " + " ile
 * birleşip metne yazılır, kayıt hâlâ tek bir "Kaydet" dokunuşuyla olur.
 */

const CHIP_SEPARATOR = /\s*\+\s*/

function StopNoteSheet({ open, initialNote = '', suggestions = [], onSave, onSkip }) {
  const [note, setNote] = useState(initialNote)
  const inputRef = useRef(null)

  useEffect(() => {
    if (open) setNote(initialNote)
  }, [open, initialNote])

  if (!open) return null

  const trimmed = note.trim()
  const parts = note.split(CHIP_SEPARATOR).map((part) => part.trim()).filter(Boolean)

  const toggleChip = (value) => {
    setNote((prev) => {
      const currentParts = prev.split(CHIP_SEPARATOR).map((part) => part.trim()).filter(Boolean)
      const index = currentParts.indexOf(value)

      if (index === -1) currentParts.push(value)
      else currentParts.splice(index, 1)

      return currentParts.join(' + ')
    })
  }

  return (
    <div className="stopnote-overlay" onClick={onSkip}>
      <div
        className="stopnote-sheet"
        role="dialog"
        aria-modal="true"
        aria-label="Duruş sebebi"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="stopnote-handle" />
        <h2 className="stopnote-title plate">Duruş sebebi</h2>

        {suggestions.length > 0 && (
          <div className="stopnote-suggestions">
            <span className="stopnote-suggestions-label plate">Sık girilenler</span>
            <div className="stopnote-chips">
              {suggestions.map((item) => (
                <button
                  key={item.note}
                  type="button"
                  className={`stopnote-chip${parts.includes(item.note) ? ' stopnote-chip--active' : ''}`}
                  aria-pressed={parts.includes(item.note)}
                  onClick={() => toggleChip(item.note)}
                >
                  {item.note}
                  <span className="stopnote-chip-count tnum">{item.adet}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <textarea
          ref={inputRef}
          className="stopnote-input"
          placeholder="Ne oldu? Kendi cümlenle yaz…"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          rows={3}
          autoFocus
        />

        <div className="stopnote-actions">
          <button type="button" className="stopnote-button stopnote-button--later" onClick={onSkip}>
            Sebebi sonra gir
          </button>
          <button
            type="button"
            className="stopnote-button stopnote-button--save"
            onClick={() => onSave(trimmed)}
            disabled={!trimmed}
          >
            Kaydet
          </button>
        </div>
      </div>
    </div>
  )
}

export default StopNoteSheet

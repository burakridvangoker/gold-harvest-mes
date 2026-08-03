import { useMemo, useState } from 'react'
import { buildIntervals, validEditWindow } from '../lib/timeline'
import { formatDuration } from '../lib/duration'
import { formatShortTime } from '../lib/time'
import TimeSheet from './TimeSheet'
import './EventLog.css'

/*
 * Olay geçmişi — düzenleme ve silme yüzeyi.
 *
 * Vardiyada olan her şey tek listede: durum geçişleri ve paletler birlikte,
 * ters kronolojik. Operatör için "ne oldu" tek bir akıştır; ayrı ekranlara
 * bölmek onu aramaya zorlardı.
 *
 * Her satır düzenlenebilir ve silinebilir. Silme iki dokunuş ister.
 */

const KIND_LABELS = {
  uretim: 'Üretim',
  durus: 'Duruş',
  mola: 'Mola',
  palet: 'Palet',
}

function EventLog({
  open,
  events,
  pallets,
  runsById,
  shiftStartMs,
  nowMs,
  onSaveEvent,
  onDeleteEvent,
  onSavePallet,
  onDeletePallet,
  onClose,
  frozen = false,
}) {
  const [editing, setEditing] = useState(null)
  const [draftNote, setDraftNote] = useState('')
  const [draftKoli, setDraftKoli] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)

  const durationByEventId = useMemo(() => {
    const map = new Map()
    for (const interval of buildIntervals(events, nowMs)) {
      map.set(interval.eventId, interval)
    }
    return map
  }, [events, nowMs])

  const entries = useMemo(() => {
    const eventRows = events.map((event) => ({
      type: 'event',
      id: event.id,
      atMs: new Date(event.at).getTime(),
      kind: event.kind,
      note: event.note,
      productRunId: event.product_run_id,
      source: event,
    }))

    const palletRows = pallets.map((pallet) => ({
      type: 'pallet',
      id: pallet.id,
      atMs: new Date(pallet.completed_at).getTime(),
      kind: 'palet',
      koliCount: pallet.koli_count,
      productRunId: pallet.product_run_id,
      source: pallet,
    }))

    return [...eventRows, ...palletRows].sort((a, b) => b.atMs - a.atMs)
  }, [events, pallets])

  if (!open) return null

  const startEdit = (entry) => {
    setEditing(entry)
    setConfirmDelete(false)
    if (entry.type === 'event') setDraftNote(entry.note ?? '')
    else setDraftKoli(String(entry.koliCount ?? ''))
  }

  const closeEdit = () => {
    setEditing(null)
    setConfirmDelete(false)
  }

  const handleConfirm = (valueMs) => {
    if (!editing) return

    if (editing.type === 'event') {
      onSaveEvent(editing.id, { at: new Date(valueMs).toISOString(), note: draftNote.trim() || null })
    } else {
      const koli = parseInt(draftKoli, 10)
      onSavePallet(editing.id, {
        completed_at: new Date(valueMs).toISOString(),
        koli_count: Number.isFinite(koli) && koli > 0 ? koli : editing.koliCount,
      })
    }

    closeEdit()
  }

  const handleDelete = () => {
    if (!confirmDelete) {
      setConfirmDelete(true)
      return
    }

    if (editing.type === 'event') onDeleteEvent(editing.id)
    else onDeletePallet(editing.id)

    closeEdit()
  }

  /*
   * Bir olayın saati komşularını geçemez, yoksa sıra bozulur. Palet kaydı
   * durum geçişi olmadığı için böyle bir kısıt taşımaz.
   */
  const editRange =
    editing?.type === 'event'
      ? validEditWindow(events, editing.id, { shiftStartMs, nowMs })
      : { minMs: shiftStartMs, maxMs: nowMs }

  return (
    <div className="eventlog-overlay">
      <div className="eventlog-sheet" role="dialog" aria-modal="true" aria-label="Olay geçmişi">
        <header className="eventlog-header">
          <h2 className="eventlog-title plate">Olay geçmişi</h2>
          <button type="button" className="eventlog-close" onClick={onClose} aria-label="Kapat">
            ✕
          </button>
        </header>

        {entries.length === 0 ? (
          <p className="eventlog-empty plate">Henüz kayıt yok</p>
        ) : (
          <ul className="eventlog-list">
            {entries.map((entry) => {
              const interval = entry.type === 'event' ? durationByEventId.get(entry.id) : null
              const run = entry.productRunId ? runsById.get(entry.productRunId) : null

              /*
               * 'uretim' ve 'mola' dışındaki HER kind burada duruş gibi ele
               * alınır — addToTotals'taki final else ile aynı desen.
               * Kaldırılmış özelliklerden kalan satırlar bu sayede yanlış
               * bir etikete düşmez.
               */
              const label =
                entry.type === 'pallet'
                  ? `${entry.koliCount} koli`
                  : entry.kind === 'uretim'
                    ? entry.note || run?.urun_adi || '—'
                    : entry.kind === 'mola'
                      ? entry.note || 'Mola'
                      : entry.note || 'Sebep girilmemiş'

              return (
                <li key={`${entry.type}-${entry.id}`}>
                  <button
                    type="button"
                    className={`eventlog-row eventlog-row--${entry.kind}`}
                    onClick={() => startEdit(entry)}
                  >
                    <span className="eventlog-row-time tnum">
                      {formatShortTime(new Date(entry.atMs))}
                    </span>
                    <span className="eventlog-row-body">
                      <span className="eventlog-row-kind plate">{KIND_LABELS[entry.kind]}</span>
                      <span className="eventlog-row-label">{label}</span>
                    </span>
                    <span className="eventlog-row-meta tnum">
                      {interval ? formatDuration(interval.durationMs) : ''}
                      {/* Kapanmış vardiyada son aralık yapısal olarak
                       * ongoing çıkar ama gerçekten sürmüyor. */}
                      {!frozen && interval?.ongoing ? (
                        <span className="eventlog-row-live"> sürüyor</span>
                      ) : null}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <TimeSheet
        open={editing !== null}
        title={editing?.type === 'pallet' ? 'Palet kaydını düzelt' : 'Olayı düzelt'}
        confirmLabel="Kaydet"
        initialMs={editing?.atMs}
        range={editRange}
        onConfirm={handleConfirm}
        onCancel={closeEdit}
      >
        {editing?.type === 'event' ? (
          <label className="eventlog-field">
            <span className="eventlog-field-label plate">Açıklama</span>
            <textarea
              className="eventlog-field-input"
              value={draftNote}
              onChange={(event) => setDraftNote(event.target.value)}
              rows={2}
              placeholder="Serbest metin"
            />
          </label>
        ) : (
          <label className="eventlog-field">
            <span className="eventlog-field-label plate">Koli adedi</span>
            <input
              className="eventlog-field-input tnum"
              type="number"
              inputMode="numeric"
              min="1"
              value={draftKoli}
              onChange={(event) => setDraftKoli(event.target.value)}
            />
          </label>
        )}

        <button
          type="button"
          className={`eventlog-delete${confirmDelete ? ' eventlog-delete--armed' : ''}`}
          onClick={handleDelete}
        >
          {confirmDelete ? 'Emin misin? Dokun, silinsin' : 'Bu kaydı sil'}
        </button>
      </TimeSheet>
    </div>
  )
}

export default EventLog

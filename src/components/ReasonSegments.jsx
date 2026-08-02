import { useState } from 'react'
import { assignLanes, clampToWindow } from '../lib/timeline'
import { formatDuration } from '../lib/duration'
import { formatShortTime } from '../lib/time'
import TimeSheet from './TimeSheet'
import './StopNoteSheet.css'
import './ReasonSegments.css'

/*
 * Duruş içi sebep segmentleri.
 *
 * Sahada tek bir duruş boyunca birbirini ARDIŞIK değil ÇAKIŞIK takip eden
 * birden fazla sebep olabiliyor (net sıraları yok, ör. bobin değişimi
 * 07:00-07:30, ambalaj ayarı 07:15-07:45, elektrik arızası 07:20-07:55).
 * Bunu 3 ayrı 'durus' olayına bölmek var olmayan bir kesinlik uydurmak
 * olurdu — bu yüzden dış durum (uretim/durus/mola) TEK aralık olarak
 * kalır, bu bileşen SADECE o aralığın İÇİNE ikinci, bağımsız bir katman
 * ekler: her segmentin kendi notu + kendi başlangıç/bitişi, `assignLanes`
 * ile çakışanlar ayrı satırlara dağıtılır ki görsel olarak üst üste
 * binmesinler.
 *
 * Saat girişi burada da TimeSheet'in kaydırmalı çarkıyla olur, serbest
 * sürükleme değil — telefonda/eldivenle dakika hassasiyetinde bir
 * segmenti sürüklemek kırılgan bir UX olurdu, çark bu riski ortadan
 * kaldırıyor (bkz. CLAUDE.md'deki <input type="time"> / TimeSheet notu).
 */

const LANE_HEIGHT = 44

function ReasonSegments({ interval, segments, suggestions = [], onAdd, onUpdate, onDelete }) {
  const [draft, setDraft] = useState(null) // null | { id: 'new' | string, note, startMs, endMs }
  const [timeField, setTimeField] = useState(null) // null | 'start' | 'end'

  if (!interval || interval.kind !== 'durus' || interval.durationMs <= 0) return null

  const laned = assignLanes(segments)
  const laneCount = Math.max(1, ...laned.map((segment) => segment.lane + 1))
  const range = { minMs: interval.startMs, maxMs: interval.endMs }

  const openNew = () => setDraft({ id: 'new', note: '', startMs: interval.startMs, endMs: interval.endMs })
  const openEdit = (segment) =>
    setDraft({ id: segment.id, note: segment.note, startMs: segment.startMs, endMs: segment.endMs })

  const closeDraft = () => {
    setDraft(null)
    setTimeField(null)
  }

  const save = () => {
    const note = draft.note.trim()
    if (!note) return

    if (draft.id === 'new') onAdd({ note, startMs: draft.startMs, endMs: draft.endMs })
    else onUpdate(draft.id, { note, startMs: draft.startMs, endMs: draft.endMs })

    closeDraft()
  }

  const remove = () => {
    onDelete(draft.id)
    closeDraft()
  }

  return (
    <div className="reason-segments">
      <div className="reason-segments-head">
        <span className="reason-segments-label plate">Duruş sebepleri</span>
        <button type="button" className="reason-segments-add" onClick={openNew}>
          + Sebep ekle
        </button>
      </div>

      {laned.length > 0 ? (
        <div className="reason-segments-track" style={{ height: laneCount * LANE_HEIGHT }}>
          {laned.map((segment) => {
            const left = ((segment.startMs - interval.startMs) / interval.durationMs) * 100
            const width = ((segment.endMs - segment.startMs) / interval.durationMs) * 100

            return (
              <button
                key={segment.id}
                type="button"
                className="reason-segment"
                style={{
                  left: `${left}%`,
                  width: `${Math.max(width, 1.5)}%`,
                  top: segment.lane * LANE_HEIGHT,
                  height: LANE_HEIGHT - 4,
                }}
                onClick={() => openEdit(segment)}
                title={segment.note}
              >
                <span className="reason-segment-label">{segment.note}</span>
              </button>
            )
          })}
        </div>
      ) : (
        <p className="reason-segments-empty">Henüz sebep eklenmedi</p>
      )}

      {draft && (
        <div className="stopnote-overlay" onClick={closeDraft}>
          <div
            className="stopnote-sheet"
            role="dialog"
            aria-modal="true"
            aria-label="Sebep segmenti"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="stopnote-handle" />
            <h2 className="stopnote-title plate">{draft.id === 'new' ? 'Sebep ekle' : 'Sebebi düzenle'}</h2>

            {suggestions.length > 0 && (
              <div className="stopnote-chips">
                {suggestions.map((item) => (
                  <button
                    key={item.note}
                    type="button"
                    className="stopnote-chip"
                    onClick={() => setDraft((current) => ({ ...current, note: item.note }))}
                  >
                    {item.note}
                  </button>
                ))}
              </div>
            )}

            <textarea
              className="stopnote-input"
              placeholder="Ne oldu?"
              value={draft.note}
              onChange={(event) => setDraft((current) => ({ ...current, note: event.target.value }))}
              rows={2}
              autoFocus
            />

            <div className="reason-segments-times">
              <button type="button" className="reason-segments-time" onClick={() => setTimeField('start')}>
                <span className="reason-segments-time-label plate">Başlangıç</span>
                <span className="tnum">{formatShortTime(new Date(draft.startMs))}</span>
              </button>
              <button type="button" className="reason-segments-time" onClick={() => setTimeField('end')}>
                <span className="reason-segments-time-label plate">Bitiş</span>
                <span className="tnum">{formatShortTime(new Date(draft.endMs))}</span>
              </button>
            </div>
            <p className="reason-segments-duration tnum">
              {formatDuration(Math.max(0, draft.endMs - draft.startMs))}
            </p>

            <div className="stopnote-actions">
              {draft.id !== 'new' && (
                <button type="button" className="stopnote-button stopnote-button--later" onClick={remove}>
                  Sil
                </button>
              )}
              <button type="button" className="stopnote-button stopnote-button--later" onClick={closeDraft}>
                Vazgeç
              </button>
              <button
                type="button"
                className="stopnote-button stopnote-button--save"
                onClick={save}
                disabled={!draft.note.trim()}
              >
                Kaydet
              </button>
            </div>
          </div>
        </div>
      )}

      <TimeSheet
        open={timeField === 'start'}
        title="Sebep ne zaman başladı?"
        confirmLabel="Tamam"
        tone="stop"
        initialMs={draft?.startMs}
        range={range}
        onConfirm={(valueMs) => {
          setDraft((current) => {
            const startMs = clampToWindow(valueMs, range)
            return { ...current, startMs, endMs: Math.max(current.endMs, startMs) }
          })
          setTimeField(null)
        }}
        onCancel={() => setTimeField(null)}
      />

      <TimeSheet
        open={timeField === 'end'}
        title="Sebep ne zaman bitti?"
        confirmLabel="Tamam"
        tone="stop"
        initialMs={draft?.endMs}
        range={range}
        onConfirm={(valueMs) => {
          setDraft((current) => {
            const endMs = clampToWindow(valueMs, range)
            return { ...current, endMs, startMs: Math.min(current.startMs, endMs) }
          })
          setTimeField(null)
        }}
        onCancel={() => setTimeField(null)}
      />
    </div>
  )
}

export default ReasonSegments

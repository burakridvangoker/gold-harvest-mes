import { useEffect, useMemo, useRef, useState } from 'react'
import { clampToWindow } from '../lib/timeline'
import { fromTimeInputValue, toTimeInputValue } from '../lib/time'
import './TimeSheet.css'

/*
 * Geriye dönük saat düzeltme.
 *
 * Operatörün asli görevi makine; telefona olaydan dakikalar sonra girebilir.
 * Bu yüzden durum değiştiren HER aksiyon buradan geçer.
 *
 * Tasarım kuralı: zamanında girdiyse tek dokunuş yetmeli. Varsayılan "şimdi",
 * onay butonu hemen altında. Geç kaldıysa saat/dakika çarkını kaydırır.
 *
 * Saat girişi kaydırmalı çark (telefonda tek elle, bakmadan bile kullanılır).
 * Klavyeyle iki haneli sayı yazmaktan (özellikle native <input type="time">
 * — AM/PM sorunu CLAUDE.md'de kayıtlı) daha hızlı ve dokunmatik ekrana daha
 * uygun. Fare tekerleği ve trackpad ile masaüstünde de çalışır. Çark saati
 * doğrudan seçtirdiği için ayrı bir "−5dk" gibi hızlı geri alma çipine
 * gerek kalmadı, kaldırıldı.
 */

const ITEM_HEIGHT = 48
const VISIBLE_COUNT = 5
const PAD_COUNT = Math.floor(VISIBLE_COUNT / 2)

function relativeLabel(valueMs, nowMs) {
  const diffDk = Math.round((nowMs - valueMs) / 60000)

  if (diffDk <= 0) return 'şimdi'
  if (diffDk === 1) return '1 dakika önce'
  if (diffDk < 60) return `${diffDk} dakika önce`

  const saat = Math.floor(diffDk / 60)
  const dakika = diffDk % 60
  return dakika === 0 ? `${saat} saat önce` : `${saat} sa ${dakika} dk önce`
}

const pad2 = (n) => String(n).padStart(2, '0')

/*
 * Tek bir kaydırmalı sütun (saat ya da dakika). Değer dışarıdan değişirse
 * (çipler, aralık kısıtı) çark o değere kayar; kullanıcı kaydırdığında
 * kaydırma durunca (debounce) en yakın satır değere yuvarlanıp bildirilir.
 */
function WheelColumn({ length, value, onChange, formatItem, label }) {
  const viewportRef = useRef(null)
  const settleTimer = useRef(null)
  const isExternalScroll = useRef(false)

  useEffect(() => {
    const el = viewportRef.current
    if (!el) return

    const target = value * ITEM_HEIGHT
    if (Math.abs(el.scrollTop - target) > 1) {
      isExternalScroll.current = true
      el.scrollTo({ top: target, behavior: 'auto' })
    }
  }, [value])

  const handleScroll = () => {
    if (settleTimer.current) clearTimeout(settleTimer.current)

    settleTimer.current = setTimeout(() => {
      const el = viewportRef.current
      if (!el) return

      if (isExternalScroll.current) {
        isExternalScroll.current = false
        return
      }

      const index = Math.min(length - 1, Math.max(0, Math.round(el.scrollTop / ITEM_HEIGHT)))
      const target = index * ITEM_HEIGHT
      if (Math.abs(el.scrollTop - target) > 1) {
        el.scrollTo({ top: target, behavior: 'smooth' })
      }
      if (index !== value) onChange(index)
    }, 120)
  }

  const selectItem = (index) => {
    const el = viewportRef.current
    if (el) el.scrollTo({ top: index * ITEM_HEIGHT, behavior: 'smooth' })
    if (index !== value) onChange(index)
  }

  return (
    <div className="wheel-column" aria-label={label}>
      <div className="wheel-highlight" aria-hidden="true" />
      <div className="wheel-viewport" ref={viewportRef} onScroll={handleScroll}>
        <div style={{ height: PAD_COUNT * ITEM_HEIGHT }} aria-hidden="true" />
        {Array.from({ length }, (_, i) => (
          <button
            key={i}
            type="button"
            tabIndex={-1}
            className={`wheel-item tnum${i === value ? ' wheel-item--active' : ''}`}
            style={{ height: ITEM_HEIGHT }}
            onClick={() => selectItem(i)}
          >
            {formatItem(i)}
          </button>
        ))}
        <div style={{ height: PAD_COUNT * ITEM_HEIGHT }} aria-hidden="true" />
      </div>
    </div>
  )
}

function TimeSheet({
  open,
  title,
  confirmLabel = 'Onayla',
  tone = 'neutral',
  initialMs,
  range = {},
  onConfirm,
  onCancel,
  children,
}) {
  const [valueMs, setValueMs] = useState(initialMs ?? Date.now())
  const [nowMs, setNowMs] = useState(() => Date.now())
  const wasOpen = useRef(false)

  /*
   * Üst bileşenler initialMs'i genelde canlı "now" state'inden geçirir
   * (saniyede bir güncellenir). Bu efekt [open, initialMs]'e bağlı kalırsa,
   * sayfa açıkken her saniye yeniden tetiklenip operatörün az önce girdiği
   * saati "şimdi"ye resetler — kullanıcı saati hiç değiştiremez. Bu yüzden
   * sadece kapalı→açık geçişinde sıfırlıyoruz, açıkken initialMs değişse bile
   * dokunmuyoruz.
   */
  useEffect(() => {
    if (open && !wasOpen.current) {
      setValueMs(initialMs ?? Date.now())
      setNowMs(Date.now())
    }
    wasOpen.current = open
  }, [open, initialMs])

  useEffect(() => {
    if (!open) return undefined
    const id = setInterval(() => setNowMs(Date.now()), 1000)
    return () => clearInterval(id)
  }, [open])

  const effectiveRange = useMemo(
    () => ({ minMs: range.minMs ?? null, maxMs: range.maxMs ?? nowMs }),
    [range.minMs, range.maxMs, nowMs],
  )

  if (!open) return null

  const [hourStr, minuteStr] = toTimeInputValue(valueMs).split(':')
  const hour = Number(hourStr)
  const minute = Number(minuteStr)

  const setHour = (h) => {
    const composed = fromTimeInputValue(valueMs, `${pad2(h)}:${minuteStr}`)
    if (composed != null) setValueMs(clampToWindow(composed, effectiveRange))
  }

  const setMinute = (m) => {
    const composed = fromTimeInputValue(valueMs, `${hourStr}:${pad2(m)}`)
    if (composed != null) setValueMs(clampToWindow(composed, effectiveRange))
  }

  const atFloor = effectiveRange.minMs != null && valueMs <= effectiveRange.minMs

  return (
    <div className="timesheet-overlay" onClick={onCancel}>
      <div
        className={`timesheet-sheet timesheet-sheet--${tone}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="timesheet-handle" />
        <h2 className="timesheet-title plate">{title}</h2>

        <div className="timesheet-clock-field">
          <span className="timesheet-clock-hint plate">Saat</span>
          {/*
           * Kaydırma tek başına uzak bir değere (ör. 3 saat geri) gitmek
           * için yavaş kalabiliyordu (yaşanmış geri bildirim: "seçerken
           * zorlanabiliyorum") — her sütunun üstünde/altında ok butonu,
           * tek dokunuşla bir adım ilerletir/geriletir. Kaydırma ve satıra
           * dokunma (WheelColumn'daki mevcut davranış) hâlâ aynen çalışır,
           * bu üçüncü, ek bir yol.
           */}
          <div className="timesheet-wheels">
            <div className="wheel-group">
              <button
                type="button"
                className="wheel-step"
                aria-label="Saati bir azalt"
                onClick={() => setHour((hour + 23) % 24)}
              >
                ▲
              </button>
              <WheelColumn length={24} value={hour} onChange={setHour} formatItem={pad2} label="Saat" />
              <button
                type="button"
                className="wheel-step"
                aria-label="Saati bir artır"
                onClick={() => setHour((hour + 1) % 24)}
              >
                ▼
              </button>
            </div>
            <span className="timesheet-clock-colon">:</span>
            <div className="wheel-group">
              <button
                type="button"
                className="wheel-step"
                aria-label="Dakikayı bir azalt"
                onClick={() => setMinute((minute + 59) % 60)}
              >
                ▲
              </button>
              <WheelColumn
                length={60}
                value={minute}
                onChange={setMinute}
                formatItem={pad2}
                label="Dakika"
              />
              <button
                type="button"
                className="wheel-step"
                aria-label="Dakikayı bir artır"
                onClick={() => setMinute((minute + 1) % 60)}
              >
                ▼
              </button>
            </div>
          </div>
        </div>

        <p className={`timesheet-relative${atFloor ? ' timesheet-relative--floor' : ''}`}>
          {atFloor ? 'Daha geriye gidilemez' : relativeLabel(valueMs, nowMs)}
        </p>

        {children ? <div className="timesheet-extra">{children}</div> : null}

        <div className="timesheet-actions">
          <button type="button" className="timesheet-button timesheet-button--cancel" onClick={onCancel}>
            Vazgeç
          </button>
          <button
            type="button"
            className="timesheet-button timesheet-button--confirm"
            onClick={() => onConfirm(valueMs)}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

export default TimeSheet

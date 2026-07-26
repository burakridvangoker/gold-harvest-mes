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
 * onay butonu hemen altında. Geç kaldıysa tek çip daha: "-5dk".
 */

const QUICK_STEPS = [1, 5, 10, 15, 30]

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
const onlyDigits = (value) => value.replace(/\D/g, '').slice(0, 2)

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

  /*
   * Saat/dakika alanları kendi taslak metnini tutar. <input type="time">
   * kullanmıyoruz çünkü o denetim 12/24 saat gösterimini sayfanın değil
   * TARAYICI/OS yerel ayarının diline göre seçiyor (lang="tr-TR" bunu
   * etkilemiyor) — cihaz İngilizce ayarlıysa operatör AM/PM ile
   * karşılaşırdı. <input type="number"> ise başka bir sorun çıkardı:
   * her tuş vuruşunda anlık pad/clamp yapıp değeri geri yazınca native
   * spinner davranışı ve önde sıfır normalizasyonu araya girip "14"
   * yazmaya çalışırken "01" + "4" gibi ara durumları bozuyordu.
   *
   * Çözüm: odaklanan alan serbestçe yazılır (taslak), diğer alan ve dış
   * değişiklikler (hızlı geri alma çipleri) valueMs'ten senkronlanır;
   * asıl değere geçiş yalnızca blur'da veya 2 hane tamamlanınca olur.
   */
  const [hhDraft, setHhDraft] = useState('00')
  const [mmDraft, setMmDraft] = useState('00')
  const focusField = useRef(null)
  const minuteInputRef = useRef(null)
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
      focusField.current = null
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

  useEffect(() => {
    const [h, m] = toTimeInputValue(valueMs).split(':')
    if (focusField.current !== 'hh') setHhDraft(h)
    if (focusField.current !== 'mm') setMmDraft(m)
  }, [valueMs])

  if (!open) return null

  const shiftBy = (dakika) => {
    setValueMs((current) => clampToWindow(current - dakika * 60000, effectiveRange))
  }

  const commit = (field, raw) => {
    const max = field === 'hh' ? 23 : 59
    const parsed = parseInt(raw, 10)
    if (!Number.isFinite(parsed)) return

    const clamped = Math.min(max, Math.max(0, parsed))
    const [h, m] = toTimeInputValue(valueMs).split(':')
    const composed = fromTimeInputValue(
      valueMs,
      field === 'hh' ? `${pad2(clamped)}:${m}` : `${h}:${pad2(clamped)}`,
    )
    if (composed != null) setValueMs(clampToWindow(composed, effectiveRange))
  }

  const handleDraftChange = (field, setDraft) => (event) => {
    const digits = onlyDigits(event.target.value)
    setDraft(digits)

    if (digits.length === 2) {
      commit(field, digits)
      /* 2. hane girilince otomatik dakikaya geç: OTP kutucukları gibi. */
      if (field === 'hh') minuteInputRef.current?.focus()
    }
  }

  const handleBlur = (field, draft) => () => {
    focusField.current = null
    commit(field, draft || '0')
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
          <div className="timesheet-clock">
            <input
              className="timesheet-clock-part tnum"
              type="text"
              inputMode="numeric"
              maxLength={2}
              value={hhDraft}
              onFocus={(event) => {
                focusField.current = 'hh'
                event.target.select()
              }}
              onChange={handleDraftChange('hh', setHhDraft)}
              onBlur={handleBlur('hh', hhDraft)}
              aria-label="Saat"
            />
            <span className="timesheet-clock-colon">:</span>
            <input
              ref={minuteInputRef}
              className="timesheet-clock-part tnum"
              type="text"
              inputMode="numeric"
              maxLength={2}
              value={mmDraft}
              onFocus={(event) => {
                focusField.current = 'mm'
                event.target.select()
              }}
              onChange={handleDraftChange('mm', setMmDraft)}
              onBlur={handleBlur('mm', mmDraft)}
              aria-label="Dakika"
            />
          </div>
        </div>

        <p className={`timesheet-relative${atFloor ? ' timesheet-relative--floor' : ''}`}>
          {atFloor ? 'Daha geriye gidilemez' : relativeLabel(valueMs, nowMs)}
        </p>

        <div className="timesheet-steps">
          {QUICK_STEPS.map((dakika) => {
            const wouldBe = valueMs - dakika * 60000
            const blocked = effectiveRange.minMs != null && wouldBe < effectiveRange.minMs

            return (
              <button
                key={dakika}
                type="button"
                className="timesheet-step"
                onClick={() => shiftBy(dakika)}
                disabled={blocked}
              >
                −{dakika}dk
              </button>
            )
          })}
        </div>

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

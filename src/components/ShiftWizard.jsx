import { useEffect, useMemo, useState } from 'react'
import './ShiftWizard.css'

/*
 * Vardiya / ürün başlatma sihirbazı.
 *
 * Sahada operatör her alanı bilmeyebilir. Bu yüzden yalnızca vardiya ve ürün
 * adı zorunlu; kalan her şey boş geçilebilir ve sonradan düzeltilebilir.
 * Eksik kayıt, uydurma kayıttan iyidir.
 *
 * mode='shift'   → vardiya + ilk ürün (vardiya başında)
 * mode='product' → sadece ürün (vardiya içinde ürün değişimi, Faz 2)
 *
 * DİKKAT: tüm adım panelleri `wizard-track` içinde her zaman birlikte mount
 * edilir, sadece transform ile kaydırılır (adım geçişleri anında olsun diye).
 * Bu yüzden herhangi bir alanda autoFocus KULLANILMAMALI: mode='shift'te
 * "Ürün adı" 2. adımdır, autoFocus sayfa açılır açılmaz o inputa odaklanır
 * ve tarayıcı overflow:hidden konteyneri oraya kaydırır — transform ile
 * senkronsuz kalıp yanlış adımı gösterir. Yaşanmış hata, tekrar eklemeyin.
 */

const VARDIYA_OPTIONS = ['1', '2', '3']
const VARSAYILAN_VARDIYA_SAAT = 8
const VARSAYILAN_KOLI_PER_PALET = 100

const STEP_TITLES = {
  vardiya: 'Vardiya',
  urun: 'Ürün bilgisi',
  parametre: 'Üretim parametreleri',
  palet: 'Palet ve plan',
  numarator: 'Numaratör başlangıcı',
  ozet: 'Özet',
}

const SHIFT_STEPS = ['vardiya', 'urun', 'parametre', 'palet', 'numarator', 'ozet']
const PRODUCT_STEPS = ['urun', 'parametre', 'palet', 'numarator', 'ozet']

const INITIAL_FORM = {
  vardiya: '',
  operator: '',
  vardiyaSaat: String(VARSAYILAN_VARDIYA_SAAT),
  urunAdi: '',
  partiNo: '',
  gramaj: '',
  koliIciAdet: '',
  bosPaketAgirlik: '',
  koliPerPalet: String(VARSAYILAN_KOLI_PER_PALET),
  hedefKoli: '',
  doluPaketBaslangic: '',
  bosPaketBaslangic: '',
}

const toInt = (value) => {
  const parsed = parseInt(value, 10)
  return Number.isFinite(parsed) ? parsed : null
}

const toNum = (value) => {
  const parsed = Number(value)
  return value !== '' && Number.isFinite(parsed) ? parsed : null
}

function ShiftWizard({ open, mode = 'shift', onClose, onSubmit }) {
  const [step, setStep] = useState(0)
  const [form, setForm] = useState(INITIAL_FORM)

  const steps = useMemo(() => (mode === 'shift' ? SHIFT_STEPS : PRODUCT_STEPS), [mode])

  useEffect(() => {
    if (open) {
      setStep(0)
      setForm(INITIAL_FORM)
    }
  }, [open])

  if (!open) return null

  const update = (field) => (event) => {
    const { value } = event.target
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  /* Yalnızca gerçekten gereken iki alan kapı tutuyor. */
  const stepValid = {
    vardiya: form.vardiya !== '',
    urun: form.urunAdi.trim() !== '',
    parametre: true,
    palet: toInt(form.koliPerPalet) > 0,
    numarator: true,
    ozet: true,
  }[steps[step]]

  const isLastStep = step === steps.length - 1

  const handleNext = () => {
    if (!stepValid) return

    if (!isLastStep) {
      setStep((current) => current + 1)
      return
    }

    onSubmit({
      shift:
        mode === 'shift'
          ? {
              vardiya: form.vardiya,
              operator: form.operator.trim() || null,
              hedef_koli: toInt(form.hedefKoli),
              vardiyaSaat: toNum(form.vardiyaSaat) ?? VARSAYILAN_VARDIYA_SAAT,
            }
          : null,
      run: {
        urun_adi: form.urunAdi.trim(),
        parti_no: form.partiNo.trim() || null,
        gramaj: toNum(form.gramaj),
        koli_ici_adet: toInt(form.koliIciAdet),
        bos_paket_agirlik_g: toNum(form.bosPaketAgirlik),
        koli_per_palet: toInt(form.koliPerPalet) ?? VARSAYILAN_KOLI_PER_PALET,
        hedef_koli: mode === 'product' ? toInt(form.hedefKoli) : null,
        dolu_paket_baslangic: toInt(form.doluPaketBaslangic),
        bos_paket_baslangic: toInt(form.bosPaketBaslangic),
      },
    })
  }

  const handleBack = () => {
    if (step === 0) {
      onClose()
      return
    }
    setStep((current) => current - 1)
  }

  const panels = {
    vardiya: (
      <div className="wizard-panel" key="vardiya">
        <div className="wizard-field">
          <span className="wizard-label">Vardiya</span>
          <div className="wizard-segmented">
            {VARDIYA_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                className={`wizard-segment${
                  form.vardiya === option ? ' wizard-segment--active' : ''
                }`}
                onClick={() => setForm((prev) => ({ ...prev, vardiya: option }))}
              >
                {option}.
              </button>
            ))}
          </div>
        </div>
        <label className="wizard-field">
          <span className="wizard-label">Operatör</span>
          <input
            className="wizard-input"
            type="text"
            value={form.operator}
            onChange={update('operator')}
            placeholder="Ad Soyad"
          />
        </label>
        <label className="wizard-field">
          <span className="wizard-label">Vardiya süresi (saat)</span>
          <input
            className="wizard-input"
            type="number"
            inputMode="decimal"
            value={form.vardiyaSaat}
            onChange={update('vardiyaSaat')}
          />
          <span className="wizard-hint">Tempo hesabı bunun üzerinden yapılır.</span>
        </label>
      </div>
    ),

    urun: (
      <div className="wizard-panel" key="urun">
        <label className="wizard-field">
          <span className="wizard-label">Ürün adı</span>
          <input
            className="wizard-input"
            type="text"
            value={form.urunAdi}
            onChange={update('urunAdi')}
            placeholder="Örn. Kuru Kayısı 200g"
          />
        </label>
        <label className="wizard-field">
          <span className="wizard-label">Parti / Seri no</span>
          <input
            className="wizard-input"
            type="text"
            value={form.partiNo}
            onChange={update('partiNo')}
            placeholder="Örn. P-24071"
          />
        </label>
      </div>
    ),

    parametre: (
      <div className="wizard-panel" key="parametre">
        <label className="wizard-field">
          <span className="wizard-label">Gramaj (g)</span>
          <input
            className="wizard-input"
            type="number"
            inputMode="decimal"
            value={form.gramaj}
            onChange={update('gramaj')}
            placeholder="Örn. 200"
          />
        </label>
        <label className="wizard-field">
          <span className="wizard-label">Koli içi adet</span>
          <input
            className="wizard-input"
            type="number"
            inputMode="numeric"
            value={form.koliIciAdet}
            onChange={update('koliIciAdet')}
            placeholder="Örn. 12"
          />
          <span className="wizard-hint">Paket sayısı buradan hesaplanır.</span>
        </label>
        <label className="wizard-field">
          <span className="wizard-label">Boş paket ağırlığı (g)</span>
          <input
            className="wizard-input"
            type="number"
            inputMode="decimal"
            value={form.bosPaketAgirlik}
            onChange={update('bosPaketAgirlik')}
            placeholder="Örn. 3"
          />
          <span className="wizard-hint">
            Ambalaj malzemesinin kendi ağırlığı; ürün bitince fire hesabında kullanılır.
          </span>
        </label>
      </div>
    ),

    palet: (
      <div className="wizard-panel" key="palet">
        <label className="wizard-field">
          <span className="wizard-label">Palet başına koli</span>
          <input
            className="wizard-input"
            type="number"
            inputMode="numeric"
            value={form.koliPerPalet}
            onChange={update('koliPerPalet')}
          />
          <span className="wizard-hint">
            Standart değer. Yarım palet çıkarsa o palette tek tek değiştirilir.
          </span>
        </label>
        <label className="wizard-field">
          <span className="wizard-label">
            {mode === 'shift' ? 'Vardiya hedefi (koli)' : 'Ürün hedefi (koli)'}
          </span>
          <input
            className="wizard-input"
            type="number"
            inputMode="numeric"
            value={form.hedefKoli}
            onChange={update('hedefKoli')}
            placeholder="Örn. 750"
          />
        </label>
      </div>
    ),

    numarator: (
      <div className="wizard-panel" key="numarator">
        <label className="wizard-field">
          <span className="wizard-label">Dolu paket başlangıç no</span>
          <input
            className="wizard-input"
            type="number"
            inputMode="numeric"
            value={form.doluPaketBaslangic}
            onChange={update('doluPaketBaslangic')}
            placeholder="Örn. 10245"
          />
        </label>
        <label className="wizard-field">
          <span className="wizard-label">Boş paket başlangıç no</span>
          <input
            className="wizard-input"
            type="number"
            inputMode="numeric"
            value={form.bosPaketBaslangic}
            onChange={update('bosPaketBaslangic')}
            placeholder="Örn. 5310"
          />
        </label>
        <span className="wizard-hint">Bilmiyorsan boş bırak, sonra girebilirsin.</span>
      </div>
    ),

    ozet: (
      <div className="wizard-panel" key="ozet">
        <dl className="wizard-summary">
          {mode === 'shift' && (
            <>
              <div className="wizard-summary-row">
                <dt>Vardiya</dt>
                <dd>{form.vardiya ? `${form.vardiya}.` : '—'}</dd>
              </div>
              <div className="wizard-summary-row">
                <dt>Operatör</dt>
                <dd>{form.operator || '—'}</dd>
              </div>
              <div className="wizard-summary-row">
                <dt>Süre</dt>
                <dd>{form.vardiyaSaat ? `${form.vardiyaSaat} saat` : '—'}</dd>
              </div>
            </>
          )}
          <div className="wizard-summary-row">
            <dt>Ürün</dt>
            <dd>{form.urunAdi || '—'}</dd>
          </div>
          <div className="wizard-summary-row">
            <dt>Parti no</dt>
            <dd>{form.partiNo || '—'}</dd>
          </div>
          <div className="wizard-summary-row">
            <dt>Gramaj</dt>
            <dd>{form.gramaj ? `${form.gramaj} g` : '—'}</dd>
          </div>
          <div className="wizard-summary-row">
            <dt>Koli içi adet</dt>
            <dd>{form.koliIciAdet || '—'}</dd>
          </div>
          <div className="wizard-summary-row">
            <dt>Boş paket ağırlığı</dt>
            <dd>{form.bosPaketAgirlik ? `${form.bosPaketAgirlik} g` : '—'}</dd>
          </div>
          <div className="wizard-summary-row">
            <dt>Palet başına koli</dt>
            <dd>{form.koliPerPalet || '—'}</dd>
          </div>
          <div className="wizard-summary-row">
            <dt>Hedef</dt>
            <dd>{form.hedefKoli ? `${form.hedefKoli} koli` : '—'}</dd>
          </div>
          <div className="wizard-summary-row">
            <dt>Dolu paket no</dt>
            <dd>{form.doluPaketBaslangic || '—'}</dd>
          </div>
          <div className="wizard-summary-row">
            <dt>Boş paket no</dt>
            <dd>{form.bosPaketBaslangic || '—'}</dd>
          </div>
        </dl>
        <p className="wizard-hint wizard-hint--center">
          Sonraki adımda başlangıç saatini düzeltebilirsin.
        </p>
      </div>
    ),
  }

  return (
    <div className="wizard-overlay">
      <div
        className="wizard-sheet"
        role="dialog"
        aria-modal="true"
        aria-label={mode === 'shift' ? 'Vardiya başlat' : 'Ürün değiştir'}
      >
        <div className="wizard-header">
          <button type="button" className="wizard-close" onClick={onClose} aria-label="Kapat">
            ✕
          </button>
          <span className="wizard-step-label">
            Adım {step + 1}/{steps.length}
          </span>
          <span className="wizard-header-spacer" />
        </div>

        <div className="wizard-progress">
          <div
            className="wizard-progress-fill"
            style={{ width: `${((step + 1) / steps.length) * 100}%` }}
          />
        </div>

        <h2 className="wizard-title">{STEP_TITLES[steps[step]]}</h2>

        <div className="wizard-content">
          <div className="wizard-track" style={{ transform: `translateX(-${step * 100}%)` }}>
            {steps.map((key) => panels[key])}
          </div>
        </div>

        <div className="wizard-actions">
          <button type="button" className="wizard-button wizard-button--back" onClick={handleBack}>
            {step === 0 ? 'Vazgeç' : 'Geri'}
          </button>
          <button
            type="button"
            className={`wizard-button wizard-button--next${
              isLastStep ? ' wizard-button--start' : ''
            }`}
            onClick={handleNext}
            disabled={!stepValid}
          >
            {isLastStep ? 'Devam' : 'Sonraki'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ShiftWizard

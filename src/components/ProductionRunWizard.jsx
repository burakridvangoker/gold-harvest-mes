import { useEffect, useState } from 'react'
import './ProductionRunWizard.css'

const VARDIYA_OPTIONS = ['1', '2', '3']

const STEP_TITLES = [
  'Ürün Bilgisi',
  'Üretim Parametreleri',
  'Operatör / Vardiya',
  'Numaratör Başlangıcı',
  'Özet',
]

const INITIAL_FORM = {
  urunAdi: '',
  partiNo: '',
  gramaj: '',
  koliIciAdet: '',
  hedefHiz: '',
  operator: '',
  vardiya: '',
  doluPaketBaslangic: '',
  bosPaketBaslangic: '',
}

function ProductionRunWizard({ open, onClose, onSubmit }) {
  const [step, setStep] = useState(0)
  const [form, setForm] = useState(INITIAL_FORM)

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

  const stepValid = [
    form.urunAdi.trim() !== '' && form.partiNo.trim() !== '',
    form.gramaj !== '' && form.koliIciAdet !== '' && form.hedefHiz !== '',
    form.operator.trim() !== '' && form.vardiya !== '',
    form.doluPaketBaslangic !== '' && form.bosPaketBaslangic !== '',
    true,
  ][step]

  const isLastStep = step === STEP_TITLES.length - 1

  const handleNext = () => {
    if (!stepValid) return

    if (isLastStep) {
      onSubmit({
        urun_adi: form.urunAdi.trim(),
        parti_no: form.partiNo.trim(),
        gramaj: Number(form.gramaj),
        koli_ici_adet: parseInt(form.koliIciAdet, 10),
        hedef_hiz_pkt_dk: Number(form.hedefHiz),
        operator: form.operator.trim(),
        vardiya: form.vardiya,
        dolu_paket_baslangic: parseInt(form.doluPaketBaslangic, 10),
        bos_paket_baslangic: parseInt(form.bosPaketBaslangic, 10),
      })
      return
    }

    setStep((current) => current + 1)
  }

  const handleBack = () => {
    if (step === 0) {
      onClose()
      return
    }
    setStep((current) => current - 1)
  }

  return (
    <div className="wizard-overlay">
      <div className="wizard-sheet" role="dialog" aria-modal="true" aria-label="Yeni üretim başlat">
        <div className="wizard-header">
          <button type="button" className="wizard-close" onClick={onClose} aria-label="Kapat">
            ✕
          </button>
          <span className="wizard-step-label">
            Adım {step + 1}/{STEP_TITLES.length}
          </span>
          <span className="wizard-header-spacer" />
        </div>

        <div className="wizard-progress">
          <div
            className="wizard-progress-fill"
            style={{ width: `${((step + 1) / STEP_TITLES.length) * 100}%` }}
          />
        </div>

        <h2 className="wizard-title">{STEP_TITLES[step]}</h2>

        <div className="wizard-content">
          <div className="wizard-track" style={{ transform: `translateX(-${step * 100}%)` }}>
            <div className="wizard-panel">
              <label className="wizard-field">
                <span className="wizard-label">Ürün adı</span>
                <input
                  className="wizard-input"
                  type="text"
                  value={form.urunAdi}
                  onChange={update('urunAdi')}
                  placeholder="Örn. Kuru Kayısı 200g"
                  autoFocus
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

            <div className="wizard-panel">
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
              </label>
              <label className="wizard-field">
                <span className="wizard-label">Hedef hız (pkt/dk)</span>
                <input
                  className="wizard-input"
                  type="number"
                  inputMode="decimal"
                  value={form.hedefHiz}
                  onChange={update('hedefHiz')}
                  placeholder="Örn. 45"
                />
              </label>
            </div>

            <div className="wizard-panel">
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
                      {option}. Vardiya
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="wizard-panel">
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
            </div>

            <div className="wizard-panel">
              <dl className="wizard-summary">
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
                  <dt>Hedef hız</dt>
                  <dd>{form.hedefHiz ? `${form.hedefHiz} pkt/dk` : '—'}</dd>
                </div>
                <div className="wizard-summary-row">
                  <dt>Operatör</dt>
                  <dd>{form.operator || '—'}</dd>
                </div>
                <div className="wizard-summary-row">
                  <dt>Vardiya</dt>
                  <dd>{form.vardiya ? `${form.vardiya}. Vardiya` : '—'}</dd>
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
            </div>
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
            {isLastStep ? 'Üretimi Başlat' : 'Sonraki'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ProductionRunWizard

import { useEffect, useMemo, useRef, useState } from 'react'
import { aktifVardiyaNo } from '../lib/time'
import OperatorNameField from './OperatorNameField'
import './ShiftWizard.css'

/*
 * Vardiya / ürün başlatma sihirbazı.
 *
 * Sahada operatör her alanı bilmeyebilir. Bu yüzden yalnızca gerektiği
 * kadarı zorunlu; kalan her şey boş geçilebilir ve sonradan düzeltilebilir.
 * Eksik kayıt, uydurma kayıttan iyidir.
 *
 * mode='shift'   → SADECE vardiya no + operatör. Ne başlangıç saati
 *                  sorulur (vardiyaların saatleri sabit ve belli — bkz.
 *                  src/lib/time.js#vardiyaBaslangici) ne de hedef koli
 *                  (hedef ürün bazlı, mode='product'da sorulur). Ürün
 *                  bilgisi de buradan bilerek çıkarıldı: vardiya çoğu
 *                  zaman bir duruşla başlar (temizlik, arıza, henüz ürün
 *                  belli değil), operatörü vardiyayı açmadan önce ürün
 *                  detayına zorlamak yanlış. Vardiya "durdu" durumunda
 *                  açılır; ürün ne zaman hazır olursa mode='product' ile
 *                  girilir.
 * mode='product' → ürün bilgisi + ürün hedefi (vardiyanın ilk ürünü de,
 *                  sonraki ürün değişimi de aynı akıştan geçer).
 *
 * DİKKAT: tüm adım panelleri `wizard-track` içinde her zaman birlikte mount
 * edilir, sadece transform ile kaydırılır (adım geçişleri anında olsun diye).
 * Bu yüzden herhangi bir alanda autoFocus KULLANILMAMALI — yeni bir adım
 * eklenirse ve o adım ilk adım değilse, autoFocus tarayıcının
 * overflow:hidden konteyneri oraya kaydırmasına yol açar. Yaşanmış hata,
 * tekrar eklemeyin.
 */

const VARDIYA_OPTIONS = ['1', '2', '3']
const VARSAYILAN_KOLI_PER_PALET = 100

const STEP_TITLES = {
  vardiya: 'Vardiya',
  urun: 'Ürün bilgisi',
  parametre: 'Üretim parametreleri',
  palet: 'Palet ve plan',
  numarator: 'Numaratör başlangıcı',
  ozet: 'Özet',
}

const SHIFT_STEPS = ['vardiya']
const PRODUCT_STEPS = ['urun', 'parametre', 'palet', 'numarator', 'ozet']

const INITIAL_FORM = {
  vardiya: '',
  operator: '',
  fisNo: '',
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

function ShiftWizard({ open, mode = 'shift', personnel = [], onClose, onSubmit }) {
  const [step, setStep] = useState(0)
  const [form, setForm] = useState(INITIAL_FORM)
  /* Ön-doldurmanın yazdığı son ad — elle yazılanla karışmasın diye. */
  const autoOperatorRef = useRef('')

  const steps = useMemo(() => (mode === 'shift' ? SHIFT_STEPS : PRODUCT_STEPS), [mode])

  useEffect(() => {
    if (open) {
      setStep(0)
      autoOperatorRef.current = ''
      /*
       * Vardiya adımı şu an içinde bulunulan vardiyayla önceden doldurulur —
       * operatör yanlış vardiyayı seçip saatini (dolayısıyla o vardiyanın
       * "duruş" süresini) saatlerce geriye çekmesin diye. Yine de segmentli
       * seçiciden değiştirilebilir.
       */
      setForm(mode === 'shift' ? { ...INITIAL_FORM, vardiya: String(aktifVardiyaNo()) } : INITIAL_FORM)
    }
  }, [open, mode])

  /*
   * Otomatik operatör ataması: seçili hat+vardiyada TAM BİR Paketleme
   * Operatörü varsa (PFM-11'de öyle) alan onunla kendiliğinden dolar; iki
   * operatör varsa (PFM-4/10) doldurulmaz, ikisi de ekip çiplerinde en
   * üsttedir — tek dokunuş. Elle yazılmış bir ad ASLA ezilmez: yalnızca
   * alan boşken ya da hâlâ bir önceki otomatik değeri taşırken dokunulur
   * (vardiya değişince eski vardiyanın otomatik adı da temizlenir).
   */
  useEffect(() => {
    if (!open || mode !== 'shift' || form.vardiya === '') return
    const vno = Number(form.vardiya)
    const operators = personnel.filter(
      (person) => person.vardiya_no === vno && person.departman === 'Paketleme Operatörü',
    )
    setForm((prev) => {
      const untouched = prev.operator === '' || prev.operator === autoOperatorRef.current
      if (!untouched) return prev
      if (operators.length === 1) {
        autoOperatorRef.current = operators[0].ad_soyad
        return prev.operator === operators[0].ad_soyad ? prev : { ...prev, operator: operators[0].ad_soyad }
      }
      if (prev.operator !== '' && prev.operator === autoOperatorRef.current) {
        autoOperatorRef.current = ''
        return { ...prev, operator: '' }
      }
      return prev
    })
  }, [open, mode, form.vardiya, personnel])

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

    if (mode === 'shift') {
      onSubmit({
        shift: {
          vardiya: form.vardiya,
          operator: form.operator.trim() || null,
          fis_no: form.fisNo.trim() || null,
        },
        run: null,
      })
      return
    }

    onSubmit({
      shift: null,
      run: {
        urun_adi: form.urunAdi.trim(),
        parti_no: form.partiNo.trim() || null,
        gramaj: toNum(form.gramaj),
        koli_ici_adet: toInt(form.koliIciAdet),
        bos_paket_agirlik_g: toNum(form.bosPaketAgirlik),
        koli_per_palet: toInt(form.koliPerPalet) ?? VARSAYILAN_KOLI_PER_PALET,
        hedef_koli: toInt(form.hedefKoli),
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
          <OperatorNameField
            value={form.operator}
            onChange={(value) => setForm((prev) => ({ ...prev, operator: value }))}
            personnel={personnel}
            vardiyaNo={form.vardiya}
            inputClassName="wizard-input"
          />
        </label>
        <label className="wizard-field">
          <span className="wizard-label">Fiş no</span>
          <input
            className="wizard-input"
            type="text"
            inputMode="numeric"
            value={form.fisNo}
            onChange={update('fisNo')}
            placeholder="Örn. 505792"
          />
          <span className="wizard-hint">Bilmiyorsan boş bırak, sonra girebilirsin.</span>
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
          <span className="wizard-label">Ürün hedefi (koli)</span>
          <input
            className="wizard-input"
            type="number"
            inputMode="numeric"
            value={form.hedefKoli}
            onChange={update('hedefKoli')}
            placeholder="Örn. 750"
          />
          <span className="wizard-hint">Bilmiyorsan boş bırak, sonra girebilirsin.</span>
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
        aria-label={mode === 'shift' ? 'Vardiya başlat' : 'Ürün bilgisi'}
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

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from './lib/supabaseClient'
import { getStoredFactory, setStoredFactory, clearStoredFactory } from './lib/factoryStorage'
import './App.css'

const QUICK_FACTORIES = [
  { name: 'Merkez Fabrika', lineCode: 'PFM-11' },
  { name: 'Şok Fabrikası', lineCode: 'SOK-01' },
]

function App() {
  const [factory, setFactory] = useState(() => getStoredFactory())
  const [factoryName, setFactoryName] = useState('')
  const [lineCode, setLineCode] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const handleQuickSelect = (quick) => {
    setFactoryName(quick.name)
    setLineCode(quick.lineCode)
    setError(null)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    const trimmedName = factoryName.trim()
    const trimmedCode = lineCode.trim().toUpperCase()

    if (!trimmedName || !trimmedCode) {
      setError('Fabrika adı ve hat/makine kodu gerekli.')
      return
    }

    setSubmitting(true)
    setError(null)

    const { data: existingLine, error: selectError } = await supabase
      .from('line_status')
      .select('line_code')
      .eq('line_code', trimmedCode)
      .maybeSingle()

    if (selectError) {
      setSubmitting(false)
      setError('Hat kontrol edilemedi: ' + selectError.message)
      return
    }

    if (!existingLine) {
      const { error: insertError } = await supabase
        .from('line_status')
        .insert({ line_code: trimmedCode })

      if (insertError) {
        setSubmitting(false)
        setError('Hat oluşturulamadı: ' + insertError.message)
        return
      }
    }

    const newFactory = { factoryName: trimmedName, lineCode: trimmedCode }
    setStoredFactory(newFactory)
    setSubmitting(false)
    setFactory(newFactory)
  }

  const handleChangeFactory = () => {
    clearStoredFactory()
    setFactoryName('')
    setLineCode('')
    setError(null)
    setFactory(null)
  }

  if (factory) {
    return (
      <div className="setup-screen">
        <div className="setup-card">
          <span className="setup-eyebrow">Seçili Fabrika</span>
          <h1 className="setup-factory-name">{factory.factoryName}</h1>
          <span className="setup-line-code">{factory.lineCode}</span>

          <div className="setup-links">
            <Link to="/operator" className="setup-link setup-link--primary">
              Operatör Paneli
            </Link>
            <Link to="/mudur" className="setup-link setup-link--secondary">
              Müdür Panosu
            </Link>
          </div>

          <button type="button" className="setup-change-button" onClick={handleChangeFactory}>
            Fabrika değiştir
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="setup-screen">
      <form className="setup-card" onSubmit={handleSubmit}>
        <span className="setup-eyebrow">MES Kurulum</span>
        <h1 className="setup-title">Fabrika Seç</h1>
        <p className="setup-subtitle">Bu cihaz hangi fabrika/hat için kullanılacak?</p>

        <div className="setup-quick-picks">
          {QUICK_FACTORIES.map((quick) => (
            <button
              key={quick.lineCode}
              type="button"
              className="setup-quick-button"
              onClick={() => handleQuickSelect(quick)}
            >
              {quick.name}
              <small>{quick.lineCode}</small>
            </button>
          ))}
        </div>

        <label className="setup-field">
          <span>Fabrika Adı</span>
          <input
            type="text"
            value={factoryName}
            onChange={(event) => setFactoryName(event.target.value)}
            placeholder="ör. Merkez Fabrika"
            required
          />
        </label>

        <label className="setup-field">
          <span>Hat / Makine Kodu</span>
          <input
            type="text"
            value={lineCode}
            onChange={(event) => setLineCode(event.target.value)}
            placeholder="ör. PFM-11"
            required
          />
        </label>

        {error && <div className="setup-error">{error}</div>}

        <button type="submit" className="setup-submit-button" disabled={submitting}>
          {submitting ? 'Kaydediliyor...' : 'Devam Et'}
        </button>
      </form>
    </div>
  )
}

export default App

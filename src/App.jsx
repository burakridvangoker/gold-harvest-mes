import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from './lib/supabaseClient'
import { getStoredFactory, setStoredFactory, clearStoredFactory } from './lib/factory'
import './App.css'

const QUICK_PICKS = [
  { factoryName: 'Merkez Fabrika', lineCode: 'PFM-11' },
  { factoryName: 'Şok Fabrikası', lineCode: '' },
]

function App() {
  const [factory, setFactory] = useState(() => getStoredFactory())
  const [factoryName, setFactoryName] = useState('')
  const [lineCode, setLineCode] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const handleQuickPick = (pick) => {
    setFactoryName(pick.factoryName)
    setLineCode(pick.lineCode)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    const trimmedName = factoryName.trim()
    const trimmedCode = lineCode.trim().toUpperCase()

    if (!trimmedName || !trimmedCode) return

    setSaving(true)
    setError(null)

    const { data: existing, error: fetchError } = await supabase
      .from('line_status')
      .select('line_code')
      .eq('line_code', trimmedCode)
      .maybeSingle()

    if (fetchError) {
      setSaving(false)
      setError('Kontrol edilemedi: ' + fetchError.message)
      return
    }

    if (!existing) {
      const { error: insertError } = await supabase
        .from('line_status')
        .insert({ line_code: trimmedCode })

      if (insertError) {
        setSaving(false)
        setError('Hat oluşturulamadı: ' + insertError.message)
        return
      }
    }

    const nextFactory = { factoryName: trimmedName, lineCode: trimmedCode }
    setStoredFactory(nextFactory)
    setFactory(nextFactory)
    setSaving(false)
  }

  const handleChangeFactory = () => {
    clearStoredFactory()
    setFactory(null)
    setFactoryName('')
    setLineCode('')
    setError(null)
  }

  if (factory) {
    return (
      <div className="factory-home">
        <div className="factory-home-card">
          <span className="factory-home-label">Bağlı fabrika</span>
          <h1 className="factory-home-name">{factory.factoryName}</h1>
          <span className="factory-home-code">{factory.lineCode}</span>

          <div className="factory-home-links">
            <Link to="/operator" className="factory-home-button factory-home-button--primary">
              Operatör Paneli
            </Link>
            <Link to="/mudur" className="factory-home-button">
              Müdür Panosu
            </Link>
          </div>

          <button type="button" className="factory-home-change" onClick={handleChangeFactory}>
            Fabrika değiştir
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="factory-home">
      <form className="factory-setup-card" onSubmit={handleSubmit}>
        <h1 className="factory-setup-title">Fabrika seçimi</h1>
        <p className="factory-setup-subtitle">
          Bu cihazın hangi fabrika ve hat için veri gireceğini bir kez ayarlayın.
        </p>

        <div className="factory-setup-picks">
          {QUICK_PICKS.map((pick) => (
            <button
              key={pick.factoryName}
              type="button"
              className="factory-setup-pick"
              onClick={() => handleQuickPick(pick)}
            >
              {pick.factoryName}
            </button>
          ))}
        </div>

        <label className="factory-setup-field">
          <span className="factory-setup-label">Fabrika adı</span>
          <input
            className="factory-setup-input"
            type="text"
            value={factoryName}
            onChange={(event) => setFactoryName(event.target.value)}
            placeholder="Örn. Şok Fabrikası"
          />
        </label>

        <label className="factory-setup-field">
          <span className="factory-setup-label">Hat / makine kodu</span>
          <input
            className="factory-setup-input"
            type="text"
            value={lineCode}
            onChange={(event) => setLineCode(event.target.value)}
            placeholder="Örn. PFM-11"
          />
        </label>

        {error && <div className="factory-setup-error">{error}</div>}

        <button
          type="submit"
          className="factory-setup-submit"
          disabled={saving || !factoryName.trim() || !lineCode.trim()}
        >
          {saving ? 'Kaydediliyor...' : 'Devam et'}
        </button>
      </form>
    </div>
  )
}

export default App

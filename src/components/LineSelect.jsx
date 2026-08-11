import { useState } from 'react'
import { FABRIKALAR, LINE_CODES, normalizeLineCode } from '../lib/lines'
import { useActiveLines } from '../hooks/useActiveLines'
import { useSokLines } from '../hooks/useSokLines'
import { supabase } from '../lib/supabaseClient'
import './LineSelect.css'

/*
 * İşe her başladığında ya da hat değiştirdiğinde önce buradan geçilir.
 *
 * İki adım: önce fabrika, sonra makine. Merkez'in hatları sabit
 * (`LINE_CODES`); Şok fabrikası deneme aşamasında olduğu için makine
 * kodu sahada elle giriliyor ve `line_status`'a yazılıyor.
 *
 * O yazma İSTEĞE BAĞLI DEĞİL, ZORUNLU: `shifts.line_code` şemada
 * `line_status.line_code`'a foreign key ile bağlı. Kayıt önce
 * açılmazsa vardiya başlatma anında FK hatası alınır — yani hata
 * operatörün karşısına çok daha geç ve anlamsız bir yerde çıkardı.
 */
function LineSelect({ onSelect }) {
  const activeLines = useActiveLines()
  const { sokLines, refreshSokLines } = useSokLines()

  /* 'fabrika' | 'merkez' | 'sok' */
  const [adim, setAdim] = useState('fabrika')
  const [yeniAcik, setYeniAcik] = useState(false)
  const [yeniKod, setYeniKod] = useState('')
  const [busy, setBusy] = useState(false)
  const [hata, setHata] = useState(null)

  const geri = () => {
    setAdim('fabrika')
    setYeniAcik(false)
    setYeniKod('')
    setHata(null)
  }

  const yeniMakineyeGec = async () => {
    const kod = normalizeLineCode(yeniKod)
    if (!kod) return

    setBusy(true)
    setHata(null)

    /* Zaten varsa dokunma — aynı makineye ikinci kez girilirse mevcut
     * durumu (ve ona bağlı vardiyaları) sıfırlamamalı. */
    const { error } = await supabase
      .from('line_status')
      .upsert({ line_code: kod }, { onConflict: 'line_code', ignoreDuplicates: true })

    setBusy(false)

    if (error) {
      setHata(`Makine kaydedilemedi: ${error.message}`)
      return
    }

    await refreshSokLines()
    onSelect(kod)
  }

  return (
    <div className="line-select-shell">
      <div className="andon-rail" />
      <div className="line-select-panel">
        {adim === 'fabrika' && (
          <>
            <span className="line-select-hint plate">Hangi fabrika?</span>
            <div className="line-select-list">
              {FABRIKALAR.map((fabrika) => (
                <button
                  key={fabrika.kod}
                  type="button"
                  className="line-select-button"
                  onClick={() => setAdim(fabrika.kod)}
                >
                  {fabrika.ad}
                  <span className="line-select-sub">{fabrika.alt}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {adim === 'merkez' && (
          <>
            <span className="line-select-hint plate">Merkez — hangi hat?</span>
            <div className="line-select-list">
              {LINE_CODES.map((code) => (
                <button
                  key={code}
                  type="button"
                  className="line-select-button"
                  onClick={() => onSelect(code)}
                >
                  {code}
                  {activeLines.has(code) && (
                    <span className="line-select-active-dot" aria-label="Aktif vardiya" />
                  )}
                </button>
              ))}
            </div>
            <button type="button" className="line-select-back plate" onClick={geri}>
              ← Fabrika değiştir
            </button>
          </>
        )}

        {adim === 'sok' && (
          <>
            <span className="line-select-hint plate">Şok — hangi makine?</span>
            <div className="line-select-list">
              {sokLines.map((code) => (
                <button
                  key={code}
                  type="button"
                  className="line-select-button"
                  onClick={() => onSelect(code)}
                >
                  {code}
                  {activeLines.has(code) && (
                    <span className="line-select-active-dot" aria-label="Aktif vardiya" />
                  )}
                </button>
              ))}

              {yeniAcik ? (
                <div className="line-select-new">
                  <label className="line-select-new-label plate" htmlFor="yeni-makine">
                    Makine adı / kodu
                  </label>
                  <input
                    id="yeni-makine"
                    className="line-select-new-input"
                    type="text"
                    value={yeniKod}
                    onChange={(event) => setYeniKod(event.target.value)}
                    placeholder="ör. SOK-1"
                    autoComplete="off"
                  />
                  <span className="line-select-new-hint">
                    Bir kere girilen makine sonraki açılışlarda listede çıkar.
                  </span>
                  {hata && <span className="line-select-error">{hata}</span>}
                  <button
                    type="button"
                    className="line-select-button line-select-button--confirm"
                    disabled={busy || normalizeLineCode(yeniKod) === ''}
                    onClick={yeniMakineyeGec}
                  >
                    {busy ? 'Kaydediliyor…' : 'Devam'}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="line-select-button line-select-button--ghost"
                  onClick={() => setYeniAcik(true)}
                >
                  + Yeni makine
                </button>
              )}
            </div>
            <button type="button" className="line-select-back plate" onClick={geri}>
              ← Fabrika değiştir
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export default LineSelect

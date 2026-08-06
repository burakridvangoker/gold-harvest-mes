import { useMemo, useState } from 'react'
import { runSummaries } from '../lib/timeline'
import { formatShortTime } from '../lib/time'
import ProductDetail from './ProductDetail'
import './Sheet.css'
import './ProductHistory.css'

const toInt = (value) => {
  const parsed = parseInt(value, 10)
  return Number.isFinite(parsed) ? parsed : null
}

const toNum = (value) => {
  const parsed = Number(value)
  return value !== '' && Number.isFinite(parsed) ? parsed : null
}

const runToForm = (run) => ({
  urunAdi: run.urun_adi ?? '',
  partiNo: run.parti_no ?? '',
  gramaj: run.gramaj != null ? String(run.gramaj) : '',
  koliIciAdet: run.koli_ici_adet != null ? String(run.koli_ici_adet) : '',
  bosPaketAgirlik: run.bos_paket_agirlik_g != null ? String(run.bos_paket_agirlik_g) : '',
  koliPerPalet: run.koli_per_palet != null ? String(run.koli_per_palet) : '',
  hedefKoli: run.hedef_koli != null ? String(run.hedef_koli) : '',
  doluPaketBaslangic: run.dolu_paket_baslangic != null ? String(run.dolu_paket_baslangic) : '',
  bosPaketBaslangic: run.bos_paket_baslangic != null ? String(run.bos_paket_baslangic) : '',
  doluPaketBitis: run.dolu_paket_bitis != null ? String(run.dolu_paket_bitis) : '',
  bosPaketBitis: run.bos_paket_bitis != null ? String(run.bos_paket_bitis) : '',
  ortalamaGramaj: run.ortalama_gramaj_g != null ? String(run.ortalama_gramaj_g) : '',
})

/*
 * Vardiya içinde çalışılan her ürün — başlama/bitiş saati kart olarak,
 * dokununca verim/miktar detayı açılır. Aynı ürüne geri dönülmüşse (A→B→A)
 * tek kart olarak kalır: runSpans en erken başlangıç, en geç bitişi verir.
 *
 * "Düzenle" ile kurulumda eksik/yanlış girilen ürün bilgileri (parti no,
 * gramaj, hedef koli, numaratör başlangıcı...) sonradan düzeltilebilir —
 * sahada bu bilgiler genelde eksik girilip sonra hatırlanıyor.
 */
function ProductHistory({ runs, events, pallets, nowMs, onUpdateRun, frozen = false }) {
  const [openId, setOpenId] = useState(null)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState(null)

  const closeSheet = () => {
    setOpenId(null)
    setEditing(false)
  }

  /* Hesap timeline.js'te — aynı rakamları müdür panosundaki ürün detayı da
   * kullanıyor, iki yerde ayrı ayrı hesaplanmasın diye. */
  const summaries = useMemo(
    () => runSummaries(runs, events, pallets, nowMs, { frozen }),
    [runs, events, pallets, nowMs, frozen],
  )

  if (summaries.length === 0) return null

  const open = summaries.find((entry) => entry.run.id === openId) ?? null

  const startEdit = () => {
    setForm(runToForm(open.run))
    setEditing(true)
  }

  const saveEdit = () => {
    onUpdateRun(open.run.id, {
      urun_adi: form.urunAdi.trim(),
      parti_no: form.partiNo.trim() || null,
      gramaj: toNum(form.gramaj),
      koli_ici_adet: toInt(form.koliIciAdet),
      bos_paket_agirlik_g: toNum(form.bosPaketAgirlik),
      koli_per_palet: toInt(form.koliPerPalet),
      hedef_koli: toInt(form.hedefKoli),
      dolu_paket_baslangic: toInt(form.doluPaketBaslangic),
      bos_paket_baslangic: toInt(form.bosPaketBaslangic),
      dolu_paket_bitis: toInt(form.doluPaketBitis),
      bos_paket_bitis: toInt(form.bosPaketBitis),
      ortalama_gramaj_g: toNum(form.ortalamaGramaj),
    })
    setEditing(false)
  }

  return (
    <div className="history-strip">
      <span className="history-strip-label plate">Bu vardiyadaki ürünler</span>
      <div className="history-strip-list">
        {summaries.map(({ run, span }) => (
          <button
            key={run.id}
            type="button"
            className="history-card"
            onClick={() => setOpenId(run.id)}
          >
            <span className="history-card-name">{run.urun_adi}</span>
            <span className="history-card-time tnum">
              {span ? formatShortTime(new Date(span.startMs)) : '—'}
              {' – '}
              {span?.ongoing ? 'sürüyor' : span ? formatShortTime(new Date(span.endMs)) : '—'}
            </span>
          </button>
        ))}
      </div>

      {open ? (
        <div className="sheet-overlay" onClick={closeSheet}>
          <div
            className="sheet-panel"
            role="dialog"
            aria-modal="true"
            aria-label={open.run.urun_adi}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="sheet-handle" />
            <h2 className="sheet-title plate">{open.run.urun_adi}</h2>
            {open.run.parti_no ? (
              <p className="sheet-subtitle">{open.run.parti_no}</p>
            ) : null}

            {editing ? (
              <>
                <label className="sheet-field">
                  <span className="sheet-field-label">Ürün adı</span>
                  <input
                    className="sheet-input"
                    type="text"
                    value={form.urunAdi}
                    onChange={(event) => setForm((prev) => ({ ...prev, urunAdi: event.target.value }))}
                  />
                </label>
                <label className="sheet-field">
                  <span className="sheet-field-label">Parti / Seri no</span>
                  <input
                    className="sheet-input"
                    type="text"
                    value={form.partiNo}
                    onChange={(event) => setForm((prev) => ({ ...prev, partiNo: event.target.value }))}
                  />
                </label>
                <label className="sheet-field">
                  <span className="sheet-field-label">Gramaj (g)</span>
                  <input
                    className="sheet-input tnum"
                    type="number"
                    inputMode="decimal"
                    value={form.gramaj}
                    onChange={(event) => setForm((prev) => ({ ...prev, gramaj: event.target.value }))}
                  />
                </label>
                <label className="sheet-field">
                  <span className="sheet-field-label">Koli içi adet</span>
                  <input
                    className="sheet-input tnum"
                    type="number"
                    inputMode="numeric"
                    value={form.koliIciAdet}
                    onChange={(event) => setForm((prev) => ({ ...prev, koliIciAdet: event.target.value }))}
                  />
                </label>
                <label className="sheet-field">
                  <span className="sheet-field-label">Boş paket ağırlığı (g)</span>
                  <input
                    className="sheet-input tnum"
                    type="number"
                    inputMode="decimal"
                    value={form.bosPaketAgirlik}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, bosPaketAgirlik: event.target.value }))
                    }
                  />
                </label>
                <label className="sheet-field">
                  <span className="sheet-field-label">Palet başına koli</span>
                  <input
                    className="sheet-input tnum"
                    type="number"
                    inputMode="numeric"
                    value={form.koliPerPalet}
                    onChange={(event) => setForm((prev) => ({ ...prev, koliPerPalet: event.target.value }))}
                  />
                </label>
                <label className="sheet-field">
                  <span className="sheet-field-label">Ürün hedefi (koli)</span>
                  <input
                    className="sheet-input tnum"
                    type="number"
                    inputMode="numeric"
                    value={form.hedefKoli}
                    onChange={(event) => setForm((prev) => ({ ...prev, hedefKoli: event.target.value }))}
                  />
                </label>
                <label className="sheet-field">
                  <span className="sheet-field-label">Dolu paket başlangıç no</span>
                  <input
                    className="sheet-input tnum"
                    type="number"
                    inputMode="numeric"
                    value={form.doluPaketBaslangic}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, doluPaketBaslangic: event.target.value }))
                    }
                  />
                </label>
                <label className="sheet-field">
                  <span className="sheet-field-label">Boş paket başlangıç no</span>
                  <input
                    className="sheet-input tnum"
                    type="number"
                    inputMode="numeric"
                    value={form.bosPaketBaslangic}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, bosPaketBaslangic: event.target.value }))
                    }
                  />
                </label>

                {!open.span?.ongoing && (
                  <>
                    <label className="sheet-field">
                      <span className="sheet-field-label">Dolu paket bitiş no</span>
                      <input
                        className="sheet-input tnum"
                        type="number"
                        inputMode="numeric"
                        value={form.doluPaketBitis}
                        onChange={(event) =>
                          setForm((prev) => ({ ...prev, doluPaketBitis: event.target.value }))
                        }
                      />
                    </label>
                    <label className="sheet-field">
                      <span className="sheet-field-label">Boş paket bitiş no</span>
                      <input
                        className="sheet-input tnum"
                        type="number"
                        inputMode="numeric"
                        value={form.bosPaketBitis}
                        onChange={(event) =>
                          setForm((prev) => ({ ...prev, bosPaketBitis: event.target.value }))
                        }
                      />
                    </label>
                    <label className="sheet-field">
                      <span className="sheet-field-label">Ortalama gramaj (g)</span>
                      <input
                        className="sheet-input tnum"
                        type="number"
                        inputMode="decimal"
                        value={form.ortalamaGramaj}
                        onChange={(event) =>
                          setForm((prev) => ({ ...prev, ortalamaGramaj: event.target.value }))
                        }
                      />
                    </label>
                  </>
                )}

                <div className="sheet-actions">
                  <button
                    type="button"
                    className="sheet-button sheet-button--secondary"
                    onClick={() => setEditing(false)}
                  >
                    Vazgeç
                  </button>
                  <button
                    type="button"
                    className="sheet-button sheet-button--primary"
                    disabled={form.urunAdi.trim() === ''}
                    onClick={saveEdit}
                  >
                    Kaydet
                  </button>
                </div>
              </>
            ) : (
              <>
                <ProductDetail ozet={open} />

                <div className="sheet-actions">
                  {onUpdateRun && (
                    <button type="button" className="sheet-button sheet-button--secondary" onClick={startEdit}>
                      Düzenle
                    </button>
                  )}
                  <button type="button" className="sheet-button sheet-button--primary" onClick={closeSheet}>
                    Kapat
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default ProductHistory

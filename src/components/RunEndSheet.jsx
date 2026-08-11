import { useEffect, useState } from 'react'
import { packagingWaste } from '../lib/timeline'
import './Sheet.css'

/*
 * Ürün üretimi bitince (ürün değiştirirken ya da vardiya biterken) sorulur.
 *
 * Toplam koli/paket burada hazır bilgi olarak gösterilir — operatör
 * numaratörleri buna bakarak kontrol edebilsin diye ("üretilen paket 4320
 * civarındaydı, dolu numaratör de öyle mi ilerledi?"). Dolu/boş fark
 * girildikçe ambalaj firesi canlı hesaplanıp gösterilir.
 */
function RunEndSheet({ open, run, koliAdedi, paketAdedi, onConfirm, onCancel }) {
  const [doluBitis, setDoluBitis] = useState('')
  const [bosBitis, setBosBitis] = useState('')
  const [ortalamaGramaj, setOrtalamaGramaj] = useState('')

  useEffect(() => {
    if (open) {
      setDoluBitis('')
      setBosBitis('')
      setOrtalamaGramaj('')
    }
  }, [open])

  if (!open || !run) return null

  const parsedDolu = doluBitis.trim() === '' ? null : Number(doluBitis)
  const parsedBos = bosBitis.trim() === '' ? null : Number(bosBitis)
  const parsedGramaj = ortalamaGramaj.trim() === '' ? null : Number(ortalamaGramaj)

  const waste = packagingWaste({
    doluBaslangic: run.dolu_paket_baslangic,
    doluBitis: parsedDolu,
    bosBaslangic: run.bos_paket_baslangic,
    bosBitis: parsedBos,
    toplamPaket: paketAdedi ?? 0,
    bosPaketAgirlikG: run.bos_paket_agirlik_g,
  })

  const numaratorEksik = run.dolu_paket_baslangic == null || run.bos_paket_baslangic == null

  /*
   * Ürünü bitirmek HİÇBİR koşulda engellenmez. Eskiden buton başlangıç
   * numaratörleri yoksa ya da bitişler boşsa kilitliydi — üstteki metin
   * "yine de kaydedebilirsin" derken buton kapalı kalıyordu (çelişki), ve
   * "Ürünü bitir" tek kapatma yolu olduğu için ürün hiç kapatılamıyordu.
   * Eksik alan fire hesabını atlar, sonradan ürün geçmişinden doldurulur —
   * "eksik alan sonradan doldurulur, uydurma kayıttan iyidir".
   */
  const handleConfirm = () => {
    onConfirm({
      dolu_paket_bitis: Number.isFinite(parsedDolu) ? parsedDolu : null,
      bos_paket_bitis: Number.isFinite(parsedBos) ? parsedBos : null,
      ortalama_gramaj_g: Number.isFinite(parsedGramaj) ? parsedGramaj : null,
    })
  }

  return (
    <div className="sheet-overlay" onClick={onCancel}>
      <div
        className="sheet-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Üretim bitti"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sheet-handle" />
        <h2 className="sheet-title plate">{run.urun_adi} bitti</h2>

        <div className="sheet-stats">
          <div className="sheet-stat-row">
            <span className="sheet-stat-label">Bu üründe üretilen</span>
            <span className="sheet-stat-value tnum">{koliAdedi ?? 0} koli</span>
          </div>
          <div className="sheet-stat-row">
            <span className="sheet-stat-label">Paket karşılığı</span>
            <span className="sheet-stat-value tnum">{paketAdedi ?? '—'}</span>
          </div>
        </div>

        {numaratorEksik ? (
          <p className="sheet-field-hint">
            Bu ürünün başlangıç numaratörleri girilmemiş, fire hesaplanamıyor. Bitiş
            numaratörlerini yine de kaydedebilirsin.
          </p>
        ) : null}

        <label className="sheet-field">
          <span className="sheet-field-label">Dolu paket bitiş no</span>
          <input
            className="sheet-input tnum"
            type="number"
            inputMode="numeric"
            value={doluBitis}
            onChange={(event) => setDoluBitis(event.target.value)}
            placeholder={run.dolu_paket_baslangic != null ? `${run.dolu_paket_baslangic} + …` : 'Örn. 11245'}
            autoFocus
          />
        </label>

        <label className="sheet-field">
          <span className="sheet-field-label">Boş paket bitiş no</span>
          <input
            className="sheet-input tnum"
            type="number"
            inputMode="numeric"
            value={bosBitis}
            onChange={(event) => setBosBitis(event.target.value)}
            placeholder={run.bos_paket_baslangic != null ? `${run.bos_paket_baslangic} + …` : 'Örn. 5320'}
          />
        </label>

        <label className="sheet-field">
          <span className="sheet-field-label">Terazi ortalama gramaj (g)</span>
          <input
            className="sheet-input tnum"
            type="number"
            inputMode="decimal"
            value={ortalamaGramaj}
            onChange={(event) => setOrtalamaGramaj(event.target.value)}
            placeholder="Örn. 201.5"
          />
          <span className="sheet-field-hint">Bilmiyorsan boş bırak, sonra girebilirsin.</span>
        </label>

        {waste ? (
          <div className="sheet-stats">
            <div className="sheet-stat-row">
              <span className="sheet-stat-label">Dolu pakette fire</span>
              <span className="sheet-stat-value tnum">{waste.doluFire} adet</span>
            </div>
            <div className="sheet-stat-row">
              <span className="sheet-stat-label">Ambalaj firesi</span>
              <span className="sheet-stat-value tnum">
                {waste.ambalajFireAdet} adet
                {waste.ambalajFireGram != null ? ` · ${waste.ambalajFireGram} g` : ''}
              </span>
            </div>
          </div>
        ) : null}

        <div className="sheet-actions">
          <button type="button" className="sheet-button sheet-button--secondary" onClick={onCancel}>
            Vazgeç
          </button>
          <button
            type="button"
            className="sheet-button sheet-button--primary"
            onClick={handleConfirm}
          >
            Devam
          </button>
        </div>
      </div>
    </div>
  )
}

export default RunEndSheet

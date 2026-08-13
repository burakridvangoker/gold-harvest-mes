import { useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAllShifts } from '../hooks/useAllShifts'
import { fisNoForRun } from '../lib/timeline'
import { formatDateLabel } from '../lib/time'
import '../components/Sheet.css'
import './VeriGirisiPanel.css'

/*
 * Veri girişi ekranı — sahadaki operatörden ayrı bir rol için: sistemi
 * baştan sona kullanan/kontrol eden/düzelten "veri girişi operatörü".
 * İlk bölüm fiş no mantığı (bkz. CLAUDE.md) — TÜM hatların TÜM
 * vardiyaları (açık + kapanmış) tek listede, fiş no merkezi olarak
 * girilip düzeltilebiliyor. Kağıt fiş elde olmayabilir; eksik alan
 * sonradan doldurulur (genel proje ilkesi burada da geçerli).
 *
 * Bilerek küçük başlıyor — daha fazla bölüm (Logo mutabakatı, vs.)
 * zamanla eklenecek, bu yüzden bileşen tek bir "fiş" fikrine odaklı
 * kalıyor, önceden genişletilmiş bir sekme/iskelet kurulmadı.
 */
function VeriGirisiPanel() {
  const { entries, loading, error } = useAllShifts()
  const [search, setSearch] = useState('')
  const [sadeceEksik, setSadeceEksik] = useState(false)
  const [editKey, setEditKey] = useState(null)
  const [editValue, setEditValue] = useState('')

  const rows = useMemo(() => {
    return entries
      .map(({ shift, runs }) => ({
        key: shift.id,
        shift,
        runs,
        altFisler: runs.map((run) => ({ run, fisNo: fisNoForRun(shift.fis_no, runs, run) })),
      }))
      .sort((a, b) => new Date(b.shift.started_at) - new Date(a.shift.started_at))
  }, [entries])

  const filteredRows = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('tr')

    return rows.filter((row) => {
      if (sadeceEksik && row.shift.fis_no) return false
      if (!query) return true

      const haystack = [row.shift.line_code, row.shift.operator, row.shift.fis_no]
        .filter(Boolean)
        .join(' ')
        .toLocaleLowerCase('tr')

      return haystack.includes(query)
    })
  }, [rows, search, sadeceEksik])

  const eksikSayisi = rows.filter((row) => !row.shift.fis_no).length

  const edit = filteredRows.find((row) => row.key === editKey) ?? rows.find((row) => row.key === editKey) ?? null

  const openEdit = (row) => {
    setEditKey(row.key)
    setEditValue(row.shift.fis_no ?? '')
  }

  const saveFisNo = async () => {
    if (!edit) return
    const value = editValue.trim() || null
    setEditKey(null)
    await supabase.from('shifts').update({ fis_no: value }).eq('id', edit.shift.id)
  }

  const previewAltFisler = edit
    ? edit.runs.map((run) => ({ run, fisNo: fisNoForRun(editValue.trim() || null, edit.runs, run) }))
    : []

  return (
    <div className="veri-shell">
      <div className="andon-rail" />
      <div className="veri-header">
        <span className="veri-title plate">Veri girişi</span>
        <span className="veri-subtitle">Tüm hatlar · fiş no</span>

        <div className="veri-filters">
          <input
            className="veri-search"
            type="text"
            inputMode="search"
            placeholder="Hat, operatör ya da fiş no ara…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <button
            type="button"
            className={`veri-chip${sadeceEksik ? ' veri-chip--active' : ''}`}
            onClick={() => setSadeceEksik((value) => !value)}
          >
            Fiş no eksik{eksikSayisi > 0 ? ` (${eksikSayisi})` : ''}
          </button>
        </div>
      </div>

      <div className="veri-list">
        {loading ? <p className="veri-empty">Yükleniyor…</p> : null}
        {error ? <p className="veri-empty">{error}</p> : null}
        {!loading && !error && filteredRows.length === 0 ? (
          <p className="veri-empty">
            {rows.length === 0 ? 'Henüz vardiya kaydı yok.' : 'Aramayla eşleşen vardiya yok.'}
          </p>
        ) : null}

        {filteredRows.map((row) => {
          const acik = !row.shift.ended_at

          return (
            <button key={row.key} type="button" className="veri-row" onClick={() => openEdit(row)}>
              <div className="veri-row-top">
                <span className="veri-row-line plate">{row.shift.line_code}</span>
                <span className={`veri-row-durum${acik ? ' veri-row-durum--acik' : ''}`}>
                  {acik ? 'Açık' : 'Kapandı'}
                </span>
                <span className="veri-row-date tnum">{formatDateLabel(new Date(row.shift.started_at))}</span>
                <span className="veri-row-vardiya tnum">{row.shift.vardiya}. vardiya</span>
              </div>

              <div className="veri-row-mid">
                <span className="veri-row-operator">{row.shift.operator || 'Operatör girilmedi'}</span>
                {row.shift.fis_no ? (
                  <span className="veri-row-fisno tnum">Fiş {row.shift.fis_no}</span>
                ) : (
                  <span className="veri-row-fisno veri-row-fisno--eksik">Fiş no gir</span>
                )}
              </div>

              {row.altFisler.length > 0 ? (
                <div className="veri-row-alt">
                  {row.altFisler.map(({ run, fisNo }) => (
                    <span key={run.id} className="veri-row-alt-item tnum">
                      {run.urun_adi} · {fisNo ?? '—'}
                    </span>
                  ))}
                </div>
              ) : null}
            </button>
          )
        })}
      </div>

      {edit ? (
        <div className="sheet-overlay" onClick={() => setEditKey(null)}>
          <div
            className="sheet-panel"
            role="dialog"
            aria-modal="true"
            aria-label="Fiş no"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="sheet-handle" />
            <h2 className="sheet-title plate">Fiş no</h2>
            <p className="sheet-subtitle">
              {edit.shift.line_code} · {edit.shift.vardiya}. vardiya ·{' '}
              {formatDateLabel(new Date(edit.shift.started_at))} · {edit.shift.operator || 'Operatör girilmedi'}
            </p>

            <label className="sheet-field">
              <span className="sheet-field-label">Vardiya fiş numarası</span>
              <input
                className="sheet-input"
                type="text"
                inputMode="numeric"
                value={editValue}
                onChange={(event) => setEditValue(event.target.value)}
                placeholder="Örn. 505792"
              />
              <span className="sheet-field-hint">
                Ürün değişince alt fiş (.1, .2…) otomatik türetilir — aşağıda canlı önizleme.
              </span>
            </label>

            {previewAltFisler.length > 0 ? (
              <ul className="veri-preview-list">
                {previewAltFisler.map(({ run, fisNo }) => (
                  <li key={run.id} className="veri-preview-item tnum">
                    <span>{run.urun_adi}</span>
                    <span>{fisNo ?? '—'}</span>
                  </li>
                ))}
              </ul>
            ) : null}

            <div className="sheet-actions">
              <button type="button" className="sheet-button sheet-button--secondary" onClick={() => setEditKey(null)}>
                Vazgeç
              </button>
              <button type="button" className="sheet-button sheet-button--primary" onClick={saveFisNo}>
                Kaydet
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default VeriGirisiPanel

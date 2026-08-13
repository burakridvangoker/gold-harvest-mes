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
 *
 * Listenin BİRİMİ fiş no'dur, vardiya değil — kullanıcı isteği: bir
 * vardiyada 3 ürün çıkarsa Logo'da 3 ayrı fiş no açılır (505792,
 * 505792.1, 505792.2), o yüzden her ürün kendi satırıdır (`fisNoForRun`
 * ile türetilir). Bir vardiyada henüz hiç ürün girilmemişse (tek
 * `durus` olayıyla açılmış, bkz. CLAUDE.md "Vardiya duruştan başlar")
 * gösterilecek bir fiş no'su yoktur ama fiş no YİNE DE önceden
 * girilebilsin diye vardiya tek satır olarak listede kalır.
 */
function VeriGirisiPanel() {
  const { entries, loading, error } = useAllShifts()
  const [search, setSearch] = useState('')
  const [sadeceEksik, setSadeceEksik] = useState(false)
  const [editKey, setEditKey] = useState(null)
  const [editValue, setEditValue] = useState('')

  const rows = useMemo(() => {
    const list = []

    for (const { shift, runs } of entries) {
      if (runs.length === 0) {
        list.push({ key: shift.id, shift, runs, run: null, fisNo: shift.fis_no ?? null })
        continue
      }

      for (const run of runs) {
        list.push({
          key: run.id,
          shift,
          runs,
          run,
          fisNo: fisNoForRun(shift.fis_no, runs, run),
        })
      }
    }

    return list
  }, [entries])

  const filteredRows = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('tr')

    return rows.filter((row) => {
      if (sadeceEksik && row.fisNo) return false
      if (!query) return true

      const haystack = [row.shift.line_code, row.shift.operator, row.run?.urun_adi, row.fisNo]
        .filter(Boolean)
        .join(' ')
        .toLocaleLowerCase('tr')

      return haystack.includes(query)
    })
  }, [rows, search, sadeceEksik])

  const eksikSayisi = rows.filter((row) => !row.fisNo).length

  const editShiftKey = editKey
    ? (rows.find((row) => row.key === editKey)?.shift.id ?? null)
    : null
  const editRows = editShiftKey ? rows.filter((row) => row.shift.id === editShiftKey) : []
  const edit = editRows[0] ?? null

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

  const previewFisler = edit
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
            placeholder="Hat, ürün, operatör ya da fiş no ara…"
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
            {rows.length === 0 ? 'Henüz vardiya kaydı yok.' : 'Aramayla eşleşen fiş yok.'}
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
                <span className="veri-row-urun">
                  {row.run ? row.run.urun_adi : 'Ürün henüz girilmedi'}
                </span>
                {row.fisNo ? (
                  <span className="veri-row-fisno tnum">Fiş {row.fisNo}</span>
                ) : (
                  <span className="veri-row-fisno veri-row-fisno--eksik">Fiş no gir</span>
                )}
              </div>

              <span className="veri-row-operator">{row.shift.operator || 'Operatör girilmedi'}</span>
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
                {previewFisler.length > 1
                  ? 'Bu vardiyanın TÜM ürünleri bu taban numaradan türer — aşağıda her ürünün kendi fiş no\'su canlı önizlenir.'
                  : 'Ürün değişince alt fiş (.1, .2…) otomatik türetilir.'}
              </span>
            </label>

            {previewFisler.length > 1 ? (
              <ul className="veri-preview-list">
                {previewFisler.map(({ run, fisNo }) => (
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

import { useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useOpenShifts } from '../hooks/useOpenShifts'
import { fisNoForRun } from '../lib/timeline'
import { formatShortTime } from '../lib/time'
import '../components/Sheet.css'
import './SevkiyatPanel.css'

/*
 * Sevkiyat ekranı — TÜM hatların açık vardiyalarındaki ürünleri tek
 * listede gösterir. Sevkiyatçı TIR'a yüklerken her paleti işaretler;
 * bu işaret operatöre de anlık yansır (bkz. CLAUDE.md "ŞİMDİ YAPILACAK").
 *
 * Hat seçimi YOK — LineSelect'in aksine, sevkiyatçı hangi hattan palet
 * geleceğini bilmiyor, hepsini aynı anda görmesi gerekiyor.
 */
function SevkiyatPanel() {
  const { entries, loading, error } = useOpenShifts()
  const [detayKey, setDetayKey] = useState(null)

  const rows = useMemo(() => {
    const list = []

    for (const { shift, runs, pallets } of entries) {
      for (const run of runs) {
        const runPallets = pallets
          .filter((pallet) => pallet.product_run_id === run.id)
          .sort((a, b) => new Date(b.completed_at) - new Date(a.completed_at))
        const yuklenen = runPallets.filter((pallet) => pallet.loaded_at).length

        list.push({
          key: run.id,
          shift,
          run,
          runs,
          pallets: runPallets,
          fisNo: fisNoForRun(shift.fis_no, runs, run),
          yuklenen,
          toplam: runPallets.length,
        })
      }
    }

    return list.sort((a, b) => new Date(b.run.created_at) - new Date(a.run.created_at))
  }, [entries])

  const detay = rows.find((row) => row.key === detayKey) ?? null

  const bekleyenUrunSayisi = rows.filter((row) => row.toplam - row.yuklenen > 0).length
  const bekleyenPaletSayisi = rows.reduce((acc, row) => acc + (row.toplam - row.yuklenen), 0)

  const togglePallet = async (pallet) => {
    const next = pallet.loaded_at ? null : new Date().toISOString()
    await supabase.from('pallet_records').update({ loaded_at: next }).eq('id', pallet.id)
  }

  return (
    <div className="sevkiyat-shell">
      <div className="andon-rail" />
      <div className="sevkiyat-header">
        <span className="sevkiyat-title plate">Sevkiyat</span>
        <span className="sevkiyat-subtitle">Tüm hatlar · canlı</span>
        {!loading && !error && rows.length > 0 ? (
          <span className={`sevkiyat-summary tnum${bekleyenPaletSayisi === 0 ? ' sevkiyat-summary--tamam' : ''}`}>
            {bekleyenPaletSayisi === 0
              ? 'Tüm paletler yüklendi'
              : `${bekleyenUrunSayisi} üründe bekleyen palet var · toplam ${bekleyenPaletSayisi}`}
          </span>
        ) : null}
      </div>

      <div className="sevkiyat-list">
        {loading ? <p className="sevkiyat-empty">Yükleniyor…</p> : null}
        {error ? <p className="sevkiyat-empty">{error}</p> : null}
        {!loading && !error && rows.length === 0 ? (
          <p className="sevkiyat-empty">Şu an açık vardiya yok.</p>
        ) : null}

        {rows.map((row) => {
          const tamamMi = row.toplam > 0 && row.yuklenen === row.toplam
          const kismiMi = row.yuklenen > 0 && !tamamMi
          const durum = tamamMi ? 'tamam' : kismiMi ? 'kismi' : 'bekliyor'

          return (
            <button
              key={row.key}
              type="button"
              className={`sevkiyat-row sevkiyat-row--${durum}`}
              onClick={() => setDetayKey(row.key)}
            >
              <div className="sevkiyat-row-body">
                <div className="sevkiyat-row-main">
                  <span className="sevkiyat-row-line plate">{row.shift.line_code}</span>
                  <span className="sevkiyat-row-urun">{row.run.urun_adi}</span>
                </div>
                <div className="sevkiyat-row-sub tnum">
                  {row.fisNo ? (
                    <span>Fiş {row.fisNo}</span>
                  ) : (
                    <span className="sevkiyat-row-muted">Fiş no yok</span>
                  )}
                  <span>·</span>
                  <span>{row.shift.operator || 'Operatör girilmedi'}</span>
                </div>
              </div>
              <div className={`sevkiyat-row-badge sevkiyat-row-badge--${durum}`}>
                <span className="sevkiyat-row-badge-value tnum">
                  {row.yuklenen}/{row.toplam}
                </span>
                <span className="sevkiyat-row-badge-label plate">
                  {tamamMi ? 'Tamam' : 'Palet'}
                </span>
              </div>
            </button>
          )
        })}
      </div>

      {detay ? (
        <div className="sheet-overlay" onClick={() => setDetayKey(null)}>
          <div className="sheet-panel" onClick={(event) => event.stopPropagation()}>
            <div className="sheet-handle" />
            <h2 className="sheet-title">{detay.run.urun_adi}</h2>
            <p className="sheet-subtitle">
              {detay.shift.line_code}
              {detay.fisNo ? ` · Fiş ${detay.fisNo}` : ''} · {detay.shift.operator || 'Operatör girilmedi'}
            </p>

            {detay.pallets.length === 0 ? (
              <p className="sevkiyat-detail-empty">Bu üründe henüz palet kaydı yok.</p>
            ) : (
              <ul className="sevkiyat-pallet-list">
                {detay.pallets.map((pallet) => (
                  <li key={pallet.id}>
                    <button
                      type="button"
                      className={
                        'sevkiyat-pallet-row tnum' +
                        (pallet.loaded_at ? ' sevkiyat-pallet-row--loaded' : '')
                      }
                      onClick={() => togglePallet(pallet)}
                    >
                      <span className="sevkiyat-pallet-check" aria-hidden="true">
                        {pallet.loaded_at ? '✓' : ''}
                      </span>
                      <span>{formatShortTime(new Date(pallet.completed_at))}</span>
                      <span>{pallet.koli_count} koli</span>
                      <span className="sevkiyat-pallet-state">
                        {pallet.loaded_at ? 'Yüklendi' : 'Bekliyor'}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <div className="sheet-actions">
              <button type="button" className="sheet-button sheet-button--primary" onClick={() => setDetayKey(null)}>
                Kapat
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default SevkiyatPanel

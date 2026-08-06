import { formatDuration } from '../lib/duration'
import { formatShortTime } from '../lib/time'

/*
 * Bir ürünün salt-okunur detay gövdesi: süre/miktar/verim satırları,
 * ambalaj firesi ve o ürüne ait palet çıkış saatleri.
 *
 * BİLEREK sadece "gövde" — kendi sheet-overlay/panel kabuğunu taşımıyor.
 * İki yerden kullanılıyor ve kabukları farklı:
 *  - `ProductHistory` (operatör): aynı panelin içinde "Düzenle" ile
 *    düzenleme formuna geçebiliyor.
 *  - `ManagerDashboard`: salt-okunur, sadece "Kapat".
 * Rakamlar `timeline.js#runSummaries`'ten gelir — burada hesap yok, aynı
 * sayı iki ekranda ayrışmasın diye.
 */
function ProductDetail({ ozet }) {
  const { run, zaman, palet, paket, gercekPktDk, acikKalmaOran, performans, waste, paletKayitlari } =
    ozet

  return (
    <>
      <div className="sheet-stats">
        <div className="sheet-stat-row">
          <span className="sheet-stat-label">Süre</span>
          <span className="sheet-stat-value tnum">{formatDuration(zaman.uretimMs)}</span>
        </div>
        <div className="sheet-stat-row">
          <span className="sheet-stat-label">Duruş</span>
          <span className="sheet-stat-value tnum">{formatDuration(zaman.durusMs)}</span>
        </div>
        <div className="sheet-stat-row">
          <span className="sheet-stat-label">Palet</span>
          <span className="sheet-stat-value tnum">{palet.paletAdedi}</span>
        </div>
        <div className="sheet-stat-row">
          <span className="sheet-stat-label">Koli</span>
          <span className="sheet-stat-value tnum">{palet.koliAdedi}</span>
        </div>
        <div className="sheet-stat-row">
          <span className="sheet-stat-label">Paket</span>
          <span className="sheet-stat-value tnum">{paket ?? '—'}</span>
        </div>
        <div className="sheet-stat-row">
          <span className="sheet-stat-label">Gerçekleşen hız</span>
          <span className="sheet-stat-value tnum">
            {gercekPktDk ? `${gercekPktDk.toFixed(1)} pkt/dk` : '—'}
          </span>
        </div>
        <div className="sheet-stat-row">
          <span className="sheet-stat-label">Açık kalma</span>
          <span className="sheet-stat-value tnum">
            {acikKalmaOran != null ? `%${Math.round(acikKalmaOran * 100)}` : '—'}
          </span>
        </div>
        <div className="sheet-stat-row">
          <span className="sheet-stat-label">Hız verimi</span>
          <span className="sheet-stat-value tnum">
            {performans ? `%${Math.round(performans.oran * 100)}` : '—'}
          </span>
        </div>
        {run.hedef_koli ? (
          <div className="sheet-stat-row">
            <span className="sheet-stat-label">Hedef</span>
            <span className="sheet-stat-value tnum">
              {palet.koliAdedi} / {run.hedef_koli} koli
            </span>
          </div>
        ) : null}
      </div>

      {/* Ürün kurulumunda girilen bilgiler — müdür panosunda "bu ürün
        * neydi" sorusunun cevabı burada. */}
      <div className="sheet-stats">
        <div className="sheet-stat-row">
          <span className="sheet-stat-label">Gramaj</span>
          <span className="sheet-stat-value tnum">{run.gramaj ? `${run.gramaj} g` : '—'}</span>
        </div>
        <div className="sheet-stat-row">
          <span className="sheet-stat-label">Koli içi adet</span>
          <span className="sheet-stat-value tnum">{run.koli_ici_adet ?? '—'}</span>
        </div>
        <div className="sheet-stat-row">
          <span className="sheet-stat-label">Çalışma hızı</span>
          <span className="sheet-stat-value tnum">
            {run.calisma_hizi_pkt_dk ? `${run.calisma_hizi_pkt_dk} pkt/dk` : '—'}
          </span>
        </div>
        <div className="sheet-stat-row">
          <span className="sheet-stat-label">Palet başına koli</span>
          <span className="sheet-stat-value tnum">{run.koli_per_palet ?? '—'}</span>
        </div>
      </div>

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
          {run.ortalama_gramaj_g ? (
            <div className="sheet-stat-row">
              <span className="sheet-stat-label">Ortalama gramaj</span>
              <span className="sheet-stat-value tnum">{run.ortalama_gramaj_g} g</span>
            </div>
          ) : null}
        </div>
      ) : null}

      {paletKayitlari.length > 0 ? (
        <div className="history-pallets">
          <span className="history-pallets-label plate">Palet çıkış saatleri</span>
          <ul className="history-pallets-list">
            {paletKayitlari.map((pallet) => (
              <li key={pallet.id} className="history-pallets-row tnum">
                <span>{formatShortTime(new Date(pallet.completed_at))}</span>
                <span>{pallet.koli_count} koli</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </>
  )
}

export default ProductDetail

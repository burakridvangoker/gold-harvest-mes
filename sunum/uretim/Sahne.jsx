import { useEffect, useState } from 'react'
import { SHIFT_START_MS } from './sample-data.js'
import './sahne.css'

/*
 * Video sahnesi — operatörün telefonu ve müdürün panosu AYNI ANDA, aynı
 * veriden. İkisi de gerçek uygulama ekranları; src/ hiç değişmedi.
 *
 * IFRAME ŞART (yaşanmış hata): bileşenleri doğrudan bu ağaca gömünce
 * uygulamanın `vw`/`vh` ölçeği 1920px'lik SAHNE penceresine göre
 * hesaplanıyor — telefon kadrajında sayaç taşıp kırpılıyordu. iframe'in
 * kendi viewport'u var.
 *
 * Telefon BİLEREK neredeyse 1:1 (400px viewport, 0.979 ölçek): öğretici
 * videoda sihirbaz alanlarının, etiketlerin ve girilen değerlerin
 * okunması gerekiyor. Küçültülmüş bir telefonda bunlar kayboluyordu.
 *
 * Altyazı ve imleç sürücü tarafından yönetilir:
 *   window.__sahneAnlat(baslik, alt)  → altyazı (React state, seyrek değişir)
 *   .sahne-imlec / .sahne-tiklama     → doğrudan DOM (her karede değişir,
 *                                        React state'i çok yavaş kalırdı)
 */

const ikiHane = (n) => String(n).padStart(2, '0')

function Sahne() {
  const [simdi, setSimdi] = useState(() => Date.now())
  const [anlati, setAnlati] = useState({ baslik: '', alt: '' })

  useEffect(() => {
    const t = setInterval(() => setSimdi(Date.now()), 1000)
    window.__sahneAnlat = (baslik, alt) => setAnlati({ baslik, alt: alt ?? '' })
    return () => clearInterval(t)
  }, [])

  const gecenDk = Math.max(0, Math.floor((simdi - SHIFT_START_MS) / 60000))
  const saat = `${ikiHane(7 + Math.floor(gecenDk / 60))}:${ikiHane(gecenDk % 60)}`
  const ilerleme = Math.min(100, (gecenDk / 480) * 100)

  return (
    <div className="sahne">
      {/* Açılış/kapanış kartları — görünürlüğü sürücü, body sınıfıyla
          yönetir; `--kart-opaklik` kare kare azaltılıp geçiş elde edilir. */}
      <div className="sahne-kart sahne-kart--acilis">
        <span className="sahne-plaka">PFM-4</span>
        <h1>Bir vardiya, baştan sona</h1>
        <p>Operatörün telefonu ve müdürün panosu — aynı anda, aynı veriden.</p>
        <span className="sahne-kart-not">Vardiya açılışından kapanışına</span>
      </div>

      <div className="sahne-kart sahne-kart--kapanis">
        <h1>Sekiz saat, tek kayıt</h1>
        <div className="sahne-kart-oranlar">
          <div><strong data-kapanis="acik">—</strong><span>AÇIK KALMA</span></div>
          <div><strong data-kapanis="hiz">—</strong><span>HIZ VERİMİ</span></div>
          <div><strong data-kapanis="paket">—</strong><span>PAKET</span></div>
        </div>
        <p>Duruşların ne zaman, ne kadar ve neden yaşandığı — tahmin değil, kayıt.</p>
        <span className="sahne-kart-not">Gold Harvest MES · PFM-4</span>
      </div>

      <header className="sahne-ust">
        <div className="sahne-kimlik">
          <span className="sahne-plaka">PFM-4</span>
          <span className="sahne-vardiya">1. VARDİYA · LEVENT YILDIZ</span>
        </div>
        <div className="sahne-anlati">
          <div className="sahne-anlati-baslik">{anlati.baslik}</div>
          <div className="sahne-anlati-alt">{anlati.alt}</div>
        </div>
        <div className="sahne-saat-kutu">
          <span className="sahne-saat">{saat}</span>
          <span className="sahne-saat-etiket">VARDİYA SAATİ</span>
        </div>
      </header>

      <div className="sahne-ilerleme">
        <div className="sahne-ilerleme-dolgu" style={{ width: `${ilerleme}%` }} />
      </div>

      <div className="sahne-govde">
        <div className="sahne-sutun sahne-sutun--telefon">
          <div className="sahne-etiket">OPERATÖR · TELEFON</div>
          <div className="sahne-telefon">
            <iframe
              className="sahne-telefon-ic"
              src="/?ekran=operator&sade=1&video=1"
              title="Operatör ekranı"
            />
          </div>
        </div>

        <div className="sahne-sutun sahne-sutun--pano">
          <div className="sahne-etiket">MÜDÜR PANOSU · AYNI AN</div>
          <div className="sahne-duvar">
            <iframe className="sahne-duvar-ic" src="/?ekran=mudur&video=1" title="Müdür panosu" />
          </div>
        </div>
      </div>

      {/* Dokunma imleci — sürücü konumlandırır, tıklamada halka genişler. */}
      <div className="sahne-imlec" />
      <div className="sahne-tiklama" />
    </div>
  )
}

export default Sahne

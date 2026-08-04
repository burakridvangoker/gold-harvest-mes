import { useEffect, useState } from 'react'
import { SHIFT_START_MS } from './sample-data.js'
import './sahne.css'

/*
 * Video sahnesi — operatörün telefonu ve müdürün panosu AYNI ANDA, aynı
 * veriden besleniyor. İkisi de gerçek uygulama ekranları; src/ hiç
 * değişmedi.
 *
 * IFRAME ŞART (yaşanmış hata): bileşenleri doğrudan bu ağaca gömünce
 * uygulamanın `vw`/`vh` tabanlı ölçeği 1920px'lik SAHNE penceresine göre
 * hesaplanıyor — telefon kadrajında sayaç taşıp kırpılıyordu. iframe'in
 * kendi viewport'u var, içerideki 400px'lik telefon gerçekten 400px'lik
 * bir ekranmış gibi ölçekleniyor. Küçültme dıştan `transform: scale` ile.
 *
 * Anlatı vardiyanın kendi zaman çizelgesinden geliyor: altyazı o an hangi
 * dakikadaysak ona göre seçiliyor.
 */
const SAHNELER = [
  { dk: 0, baslik: 'Vardiya açıldı', alt: 'Hat “durdu” durumunda başlar — sahada ilk dakikalar temizlik ve hazırlıktır.' },
  { dk: 34, baslik: 'Üretim başladı', alt: 'Operatör BAŞLAT’a bastı. Sayaç ve saat çubuğu aynı anda müdür panosunda da işliyor.' },
  { dk: 56, baslik: 'İlk duruş: bobin değişimi', alt: 'Ekranın tamamı kırmızıya döndü. Duruş süresi ilk saniyeden itibaren sayılıyor.' },
  { dk: 70, baslik: 'Üretim sürüyor', alt: 'Duruş kapandı, süresi sebebiyle birlikte duruş listesine yazıldı.' },
  { dk: 116, baslik: 'Planlı mola', alt: 'Mola amber renkte — arıza değil. Açık kalma oranının paydasına hiç girmiyor.' },
  { dk: 139, baslik: 'Moladan dönüş', alt: 'Makine moladan hemen sonra çalışmıyor; aradaki boşluk gerçek bir duruş olarak kaydediliyor.' },
  { dk: 212, baslik: 'Paletler çıkıyor', alt: 'Her palet kendi ürününe yazılıyor; koli ve paket sayısı otomatik hesaplanıyor.' },
  { dk: 257, baslik: 'İkinci mola', alt: 'Vardiya, mola başlangıçlarına göre bölümlere ayrılıyor.' },
  { dk: 346, baslik: 'Ürün değişimi', alt: 'Topzcorn Çilek bitti. Sayaçlar karışmıyor — yeni ürün sıfırdan başlar, vardiya toplamı korunur.' },
  { dk: 372, baslik: 'Yeni ürün: Natura Karışık', alt: 'Her ürünün kendi süresi, hedefi, açık kalma ve hız verimi ayrı tutuluyor.' },
  { dk: 420, baslik: 'Üçüncü mola', alt: 'Vardiyanın son bölümü başlıyor.' },
  { dk: 440, baslik: 'Son üretim', alt: 'Hedefe göre ne kadar kaldığı ve plana göre önde mi geride mi olunduğu anlık görünüyor.' },
  { dk: 465, baslik: 'Vardiya sonu', alt: 'Sekiz saatin tamamı saat ekseninde: nerede durulduğu, ne kadar sürdüğü ve neden durulduğu.' },
]

function sahneSec(gecenDk) {
  let secili = SAHNELER[0]
  for (const s of SAHNELER) if (gecenDk >= s.dk) secili = s
  return secili
}

const ikiHane = (n) => String(n).padStart(2, '0')

function Sahne() {
  const [simdi, setSimdi] = useState(() => Date.now())

  useEffect(() => {
    const t = setInterval(() => setSimdi(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  const gecenDk = Math.max(0, Math.floor((simdi - SHIFT_START_MS) / 60000))
  const sahne = sahneSec(gecenDk)
  const saat = `${ikiHane(7 + Math.floor(gecenDk / 60))}:${ikiHane(gecenDk % 60)}`
  const ilerleme = Math.min(100, (gecenDk / 480) * 100)

  return (
    <div className="sahne">
      {/*
       * Açılış/kapanış kartları. Görünürlüğü React değil, sürücü yönetiyor:
       * body'ye `kart-acilis`/`kart-kapanis` sınıfı eklenir ve
       * `--kart-opaklik` değişkeni kare kare azaltılarak gerçek bir geçiş
       * (fade) elde edilir. React state kullanılmadı — sürücü kare üretirken
       * yeniden render tetiklemek gereksiz gecikme yaratıyordu.
       */}
      <div className="sahne-kart sahne-kart--acilis">
        <span className="sahne-plaka">PFM-4</span>
        <h1>Bir vardiya, baştan sona</h1>
        <p>Operatörün telefonu ve müdürün panosu — aynı anda, aynı veriden.</p>
        <span className="sahne-kart-not">07:00 → 15:00 · gerçek zamanlı takip</span>
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
          <div className="sahne-anlati-baslik">{sahne.baslik}</div>
          <div className="sahne-anlati-alt">{sahne.alt}</div>
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
        <div className="sahne-sutun">
          <div className="sahne-etiket">OPERATÖR · TELEFON</div>
          <div className="sahne-telefon">
            <iframe
              className="sahne-telefon-ic"
              src="/?ekran=operator&sade=1&video=1"
              title="Operatör ekranı"
            />
          </div>
        </div>

        <div className="sahne-sutun sahne-sutun--genis">
          <div className="sahne-etiket">MÜDÜR PANOSU · AYNI AN</div>
          <div className="sahne-duvar">
            <iframe className="sahne-duvar-ic" src="/?ekran=mudur&video=1" title="Müdür panosu" />
          </div>
        </div>
      </div>
    </div>
  )
}

export default Sahne

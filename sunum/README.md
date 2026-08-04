# Müdür sunumu

İki gönderilebilir dosya: 10 sayfalık tanıtım PDF'i ve bir vardiyanın
baştan sona hızlandırılmış videosu. İkisi de WhatsApp/e-postada kurulum
gerektirmeden açılır.

## İçindekiler

| Dosya | Ne |
|---|---|
| `gold-harvest-mes-sunum.pdf` | **Gönderilecek — 10 sayfalık sunum** |
| `gold-harvest-mes-vardiya.mp4` | **Gönderilecek — 34 sn'lik vardiya videosu** |
| `sunum.html` | Sunumun kaynağı (tarayıcıda da açılır) |
| `gorseller/` | Uygulamadan alınan ekran görüntüleri |
| `fonts/` | IBM Plex Sans + Saira Condensed (uygulamayla aynı) |
| `uretim/` | Görselleri, PDF'i ve videoyu üreten düzenek |

## Gerekli araçlar

`uretim/` altındaki betikler `playwright` ve (video için) `ffmpeg-static`
ister. İkisi de `package.json`'a EKLENMEDİ — uygulamanın kendisiyle
ilgileri yok, sadece bu klasördeki üretim için gerekli:

```bash
npm install --no-save playwright ffmpeg-static
```

## Yeniden üretmek

Ekran görüntüleri **örnek vardiya verisiyle** alınır — bu oturumun canlı
Supabase'e erişimi yok. `uretim/mock-supabase.js` gerçek istemcinin yerine
geçer (`vite.config.js`'teki alias ile); `src/` içindeki sayfa bileşenleri
hiç değişmeden, gerçek kodla çalışır. Örnek veri
`uretim/sample-data.js`'te ve sahadaki gerçek rakamlara yakın tutulmuştur
(açık kalma ~%55, hız verimi ~%67).

```bash
# 1) Örnek verinin ürettiği rakamları kontrol et (opsiyonel)
node sunum/uretim/verify.mjs

# 2) Önizleme sunucusunu başlat
npx vite dev --config sunum/uretim/vite.config.js --port 5199

# 3) Ekran görüntülerini al (sunucu ayakta iken, ayrı terminalde)
node sunum/uretim/shots.cjs

# 4) PDF'i üret — taşma ve üst üste binme kontrolü de yapar
node sunum/uretim/pdf.cjs
```

`pdf.cjs` ayrıca `uretim/kontrol/` altına her slaydın PNG önizlemesini
bırakır; PDF'i açmadan gözle kontrol etmek için.

## Videoyu yeniden üretmek

```bash
# vite sunucusu ayakta iken (yukarıdaki 2. adım):
node sunum/uretim/video.cjs
```

Video, `?ekran=sahne` sayfasını çeker: operatörün telefonu ve müdür
panosu **iframe olarak yan yana**, ikisi de aynı sahte veriden beslenir.
Playwright'ın sahte saati (`context.clock`) 3'er dakika ileri sarılır,
her adımda `window.__mesYenile()` ile realtime taklit edilir ve iki ekran
da yeniden çizer; her adımda bir kare alınır. 480 dakika → ~34 saniye.

Üç tasarım kararı (hepsi yaşanmış bir hatanın sonucu):

- **iframe şart.** Bileşenler doğrudan sahneye gömülünce uygulamanın
  `vw`/`vh` ölçeği 1920px'lik sahne penceresine göre hesaplanıyor,
  telefon kadrajında sayaç taşıyordu. iframe'in kendi viewport'u var.
- **`?video=1` geçişleri kapatır.** Uygulamanın renk geçişleri (0.5 sn)
  gerçek zaman için tasarlandı; ~180× hızda kareler geçişin ortasına
  denk gelip "ÜRETİMDE" yazarken sayacı kırmızı gösteriyordu.
- **`?sade=1`** telefon kadrajında ikincil bölümleri gizler (ikincil
  butonlar, ürün kartları, saat çubuğu) — `src/` hiç değişmeden, sadece
  `body.sade` altında.

Anlatı başlıkları `uretim/Sahne.jsx` içindeki `SAHNELER` tablosunda;
dakikalar `sample-data.js`'teki olaylarla eşleşmeli, yoksa altyazı
ekranda görünen durumla çelişir.

**Gerçek ekran görüntüleriyle değiştirmek istersen:** kendi telefonundan/
bilgisayarından aldığın görüntüleri aynı adlarla `gorseller/` içine koy ve
sadece 4. adımı çalıştır. O zaman `sunum.html`'deki
_"Ekran görüntüleri örnek vardiya verisiyle alınmıştır"_ dipnotunu da sil
(slayt 4).

## Metni değiştirmek

`sunum.html` düz HTML — slaytlar `<section class="slayt">` blokları.
Değiştirdikten sonra 4. adımı çalıştırmak yeterli. Renkler ve yazı tipleri
uygulamanın `src/styles/andon.css` paletinden birebir alınmıştır.

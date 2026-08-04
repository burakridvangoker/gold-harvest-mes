# Müdür sunumu

`gold-harvest-mes-sunum.pdf` — müdüre gönderilecek 10 sayfalık tanıtım
sunumu. WhatsApp/e-postada kurulum gerektirmeden açılır.

## İçindekiler

| Dosya | Ne |
|---|---|
| `gold-harvest-mes-sunum.pdf` | **Gönderilecek dosya** |
| `sunum.html` | Sunumun kaynağı (tarayıcıda da açılır) |
| `gorseller/` | Uygulamadan alınan ekran görüntüleri |
| `fonts/` | IBM Plex Sans + Saira Condensed (uygulamayla aynı) |
| `uretim/` | Görselleri ve PDF'i üreten düzenek |

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

**Gerçek ekran görüntüleriyle değiştirmek istersen:** kendi telefonundan/
bilgisayarından aldığın görüntüleri aynı adlarla `gorseller/` içine koy ve
sadece 4. adımı çalıştır. O zaman `sunum.html`'deki
_"Ekran görüntüleri örnek vardiya verisiyle alınmıştır"_ dipnotunu da sil
(slayt 4).

## Metni değiştirmek

`sunum.html` düz HTML — slaytlar `<section class="slayt">` blokları.
Değiştirdikten sonra 4. adımı çalıştırmak yeterli. Renkler ve yazı tipleri
uygulamanın `src/styles/andon.css` paletinden birebir alınmıştır.

# Müdür sunumu

Gönderilebilir dosyalar: iki ayrı seviyeye yazılmış tanıtım PDF'i ve
öğretici video. Hepsi WhatsApp/e-postada kurulum gerektirmeden açılır.

## İki sunum, iki seviye — karıştırmayın

| Sunum | Kime | Çerçeve |
|---|---|---|
| `gold-harvest-mes-sunum.pdf` (10 sayfa) | **Hat müdürü** | "Şu an göremediğin ne varmış" — sistemin kendisi |
| `sunum-komuta-merkezi.pdf` (11 sayfa) | **Genel müdür** | "Bu bize ne kazandırıyor" — maliyet, vizyon, karar |
| `gold-harvest-mes-genel-mudur.mp4` (~2:52) | **Genel müdür** | Aynı içeriğin video hâli — baştan sona anlatı |
| `genel-mudur/` (11 bölüm, web) | **Genel müdür** | Aynı içeriğin kaydırmalı sayfa hâli |
| `hikaye/` (14 bölüm, web) | **Genel müdür** | "Aynı sabah, farklı bir şekilde" — daha erken bir anlatı denemesi |

Genel müdür sürümü yüz yüze anlatım OLMADAN gönderilmek üzere yazıldı;
dosya kendi başına tüm soruları cevaplamalı. Üç kalıcı kuralı var:

1. **Uydurma rakam yok.** Gold Harvest'in gerçek maliyet verisi bizde
   yok. Bu yüzden sunum formül + açıkça "örnek" etiketli hesap verir
   (slayt 4-5), boşluğu müdür kendi rakamıyla doldurur. Etiketsiz tek
   bir uydurma sayı, seni test eden bir genel müdürün gözünde tüm
   dosyayı değersizleştirir.
2. **Fotokopi en alt basamak.** Müdürün kendi verdiği kanca kabul
   edilir ama orada bitmez — angarya üç katmanlı bir merdiven olarak
   sunulur (kağıt → veri girişi → görünmeyen üretim kaybı). Asıl
   argüman üçüncü basamak: ölçülmediği için faturalanmayan kayıp.
3. **Riskler sorulmadan açılır** (slayt 13), tek kişiye bağımlılık
   dahil. Zayıf tarafı kendin söylemek en güçlü hamledir.

## İçindekiler

| Dosya | Ne |
|---|---|
| `gold-harvest-mes-genel-mudur.mp4` | **Gönderilecek — ~2:52'lik genel müdür videosu** |
| `sunum-komuta-merkezi.pdf` | **Gönderilecek — 11 sayfalık genel müdür sunumu** |
| `gold-harvest-mes-sunum.pdf` | **Gönderilecek — 10 sayfalık hat müdürü sunumu** |
| `gold-harvest-mes-tanitim.mp4` | **Gönderilecek — 2:47'lik öğretici video** (uygulamayı kullanarak) |
| `gold-harvest-mes-vardiya.mp4` | Önceki 34 sn'lik hızlandırılmış sürüm (üreticisi kaldırıldı) |
| `sunum.html` | Hat müdürü sunumunun kaynağı (tarayıcıda da açılır) |
| `sunum-komuta-merkezi.html` | Genel müdür sunumunun kaynağı |
| `video/` | Genel müdür videosunun kaynağı (Remotion projesi) |
| `genel-mudur/` | Genel müdür sayfasının kaynağı (kaydırmalı web) |
| `gorseller/` | Uygulamadan alınan ekran görüntüleri |
| `fonts/` | IBM Plex Sans + Saira Condensed (uygulamayla aynı) |
| `uretim/` | Görselleri, PDF'i ve öğretici videoyu üreten düzenek |

## İki video var — karıştırmayın

| Video | Nasıl üretiliyor | Ne anlatıyor |
|---|---|---|
| `gold-harvest-mes-tanitim.mp4` | `uretim/tanitim.cjs` — Playwright gerçek arayüze **tıklıyor** | Uygulama nasıl kullanılır (öğretici) |
| `gold-harvest-mes-genel-mudur.mp4` | `video/` — Remotion, React ile **çizilen** hareketli grafik | Ne yaptık, ne kazandırıyor, ne yapacağız (anlatı) |

Biri diğerinin yerine geçmez: öğretici video kullanımı gösterir, genel
müdür videosu kararı ister. Ekran görüntüleri ikisinde de gerçek.

## Kaydırmalı hikaye sayfası (`hikaye/`)

Aynı sabahı önce kağıtla, sonra sistemle yaşatan tek sayfalık anlatı.
PDF'in yerine değil yanına: PDF analiz eder, bu sayfa **gösterir**.

```bash
# vite sunucusu ayakta iken önce görselleri tazele, sonra sayfayı üret
node sunum/uretim/shots.cjs
python3 sunum/hikaye/uret.py            # → sunum/hikaye/hikaye.html
python3 sunum/hikaye/uret.py /yol/x.html
```

Kalıcı kararlar:

- **Metin kullanıcının yazdığı hâliyle sabittir.** 14 bölümün cümleleri
  birebir korunur — süslenmez, eklenmez, kısaltılmaz. (Tek istisna: 1.
  bölümdeki hat kodu, ekran görüntüleriyle tutarlı olsun diye PFM-4.)
- **Koyu/açık ritmi anlam taşır**, dekorasyon değil: koyu bölümler
  (1-5, 10, 14) anlatı ve iddia, açık bölümler (6-9, 11-13) kanıt ve
  plan. Sayfa problemden çözüme geçerken karanlıktan aydınlığa çıkar.
  Bu yüzden sayfa `prefers-color-scheme`'i **hiç dinlemez** — izleyicinin
  tema tercihiyle ters çevrilirse anlatı bozulur.
- **Tek çeşit hareket:** bölüm görünür olunca fade-in. Başka efekt yok.
  `prefers-reduced-motion` altında animasyon durur ama her şey son
  hâlinde GÖRÜNÜR kalır — indirgenmiş harekette içerik kaybolmamalı.
- **Her şey gömülü** (fontlar + PNG'ler data URI). Artifact olarak
  yayınlandığında katı CSP dış isteklere izin vermiyor; `<img src="x.png">`
  ve font CDN'i sessizce boşa düşer.
- Türkçe için **latin VE latin-ext** alt kümelerinin ikisi de gömülmeli;
  ğ/ı/ş latin-ext'te, biri eksikse harfler yedek fonta düşer.

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
node sunum/uretim/pdf.cjs                             # hat müdürü sürümü
node sunum/uretim/pdf.cjs sunum-komuta-merkezi.html   # genel müdür sürümü
```

`pdf.cjs` kaynak dosyayı argümanla alır; argümansız çağrı eski
davranışı birebir korur. Önizlemeler sunum başına ayrı klasöre düşer
(`uretim/kontrol/<sunum-adı>/`), biri diğerinin karelerini ezmesin diye.

**Uygulama değiştiğinde ekran görüntüleri BAYATLAR.** `shots.cjs`'i
yeniden çalıştırmadan PDF üretmek, kaldırılmış bir özelliği müdüre
göstermek demektir (yaşandı: "Ürün değiştir" butonu ve kaldırılan
"Müdür panosu görüntülemeleri" bölümü eski görsellerde duruyordu).
Arayüze dokunan her değişiklikten sonra 3. adımı tekrarlayın.

`pdf.cjs` ayrıca `uretim/kontrol/` altına her slaydın PNG önizlemesini
bırakır; PDF'i açmadan gözle kontrol etmek için.

## Öğretici videoyu yeniden üretmek

```bash
# vite sunucusu ayakta iken (yukarıdaki 2. adım):
HIZLI=1 node sunum/uretim/tanitim.cjs   # önce senaryo doğrulama (kare üretmez, ~40 sn)
node sunum/uretim/tanitim.cjs           # tam video (~10 dk)
```

Bu video **hazır veri kullanmaz**: vardiya, ürün, olay ve paletlerin
hepsi senaryo boyunca gerçek arayüze tıklanarak oluşturulur. Akış:
hat seçimi → vardiya açma (ekip çipinden operatör) → müdür panosunda
hattın "aktif" işaretlenmesi → duruş sebebi ("Hazırlık") → 5 adımlık
ürün sihirbazı → çalışma hızı → palet/duruş/mola → ürün değişimi
(numaratör bitişi + yeni ürün) → hızlandırılmış kalan vardiya → müdür
panosunda saat çubuğuna tıklama ve oklarla gezinme → kapanış kartı.

`HIZLI=1` modu kare üretmeden yalnızca senaryoyu koşturur; seçici
hatalarını 10 dakikalık render beklemeden yakalamak için.

Kalıcı tasarım kararları (hepsi yaşanmış bir hatanın sonucu):

- **iframe şart.** Bileşenler doğrudan sahneye gömülünce uygulamanın
  `vw`/`vh` ölçeği 1920px'lik sahne penceresine göre hesaplanıyor,
  telefon kadrajında sayaç taşıyordu. iframe'in kendi viewport'u var.
- **Depo `localStorage`'da.** İki ekran ayrı iframe = ayrı belge; ES
  modülü belge başına ayrı örneklendiği için operatörün açtığı vardiyayı
  müdür panosu hiç görmüyordu. localStorage ortak, üstelik `storage`
  olayı frame'ler arası realtime'ı bedavaya getiriyor.
- **`scrollIntoView` KULLANILMAZ.** Çerçeve sınırını aşıp ana belgeyi de
  kaydırıyor; sahnenin üst şeridi (altyazı, saat) kadraj dışına
  çıkıyordu. Kaydırma yalnızca frame'in kendi görünümünde yapılır.
- **Tıklama koordinatla değil `el.click()` ile.** iframe'ler ölçekli;
  imleç sadece görsel, işlem her hâlükârda çalışır.
- **`?video=1`** geçiş/animasyonları kapatır (renk geçişi ortasında
  yakalanan kareler "ÜRETİMDE" yazarken sayacı kırmızı gösteriyordu).
- **`?sade=1`** telefon kadrajında ikincil bölümleri gizler — ama
  `.operator-secondary` gizlenmez, "Ürün değiştir" akışı oradan başlar.
- **Mock, şema varsayılanlarını doldurmalı** (`default now()`): eksik
  `opened_at` yüzünden operatör paneli "Invalid time value" ile komple
  çöküyordu.

Anlatı başlıkları senaryonun içinde (`tanitim.cjs`, `anlat(...)`
çağrıları) — ekranda görünen durumla çelişmemeli.

**Gerçek ekran görüntüleriyle değiştirmek istersen:** kendi telefonundan/
bilgisayarından aldığın görüntüleri aynı adlarla `gorseller/` içine koy ve
sadece 4. adımı çalıştır. O zaman `sunum.html`'deki
_"Ekran görüntüleri örnek vardiya verisiyle alınmıştır"_ dipnotunu da sil
(slayt 4).

## Genel müdür videosunu yeniden üretmek (`video/`)

Remotion projesi — React ile yazılmış, kare kare render edilen bir video.
`uretim/tanitim.cjs`'in aksine burada uygulamaya HİÇ tıklanmıyor; sahneler
çiziliyor, içlerine `gorseller/`'deki **gerçek** ekran görüntüleri
yerleştiriliyor.

```bash
cd sunum/video
npm i                                  # ilk kurulum
npm run varliklar                      # fonts/ + gorseller/ → public/ eşitle
npx remotion studio --no-open          # önizleme (sahneleri sürükleyerek düzenle)
npx remotion render GoldHarvestMES ../gold-harvest-mes-genel-mudur.mp4
```

**`npm run varliklar` atlanırsa video BAYAT görsel gösterir.** Remotion
yalnızca kendi `public/` klasöründen okuyabildiği için ekran görüntüleri
oraya kopyalanmak zorunda; `shots.cjs` yeniden çalıştırıldığında bu
kopyalar sessizce eskir. Arayüze dokunan her değişiklikten sonra:
`node sunum/uretim/shots.cjs` → `npm run varliklar` → render.

Tek tek sahneye bakmak için (render'ı beklemeden):

```bash
npx remotion still 6-Oranlar /tmp/x.png --frame=300 --scale=0.5
```

Kalıcı kararlar (hepsi yaşanmış bir hatanın sonucu):

- **`text-transform: uppercase` KULLANILMAZ.** Türkçede "i" → "İ" olmalı;
  tarayıcı bunu bu ortamda uygulamadı, `lang="tr"` de çözmedi. İlk
  render'da "ZİNCİRDEKİ YERİMİZ" yerine "ZINCIRDEKI YERIMIZ" çıktı.
  Büyük harf etiketler kaynakta **doğrudan büyük harf yazılır**.
- **Yazı tipleri CSS dosyasından değil `src/fonts.ts`'ten yüklenir.** Bir
  `.css` içindeki `url('/fonts/...')` ifadesini webpack derleme anında
  modül olarak çözmeye çalışıp paketlemeyi kırıyor. `staticFile()` ile
  üretilen yol çalışma anında `<style>` olarak enjekte ediliyor.
  latin + latin-ext ikisi de şart (ğ/ı/ş latin-ext'te).
- **Ekran görüntüsü yaklaşması küçük tutulur** (`Ortak.tsx`, 1 → 1.03).
  Büyük bir yaklaşma görseli kadraj dışına taşırıyor; müdür panosunun
  altı ilk render'da kesilmişti.
- **Kadraja sığmayan görsel küçültülmez, sahne yeniden dengelenir.**
  6. sahneye konan duruş sebepleri karesi okunamayacak kadar küçük
  kalıp dokuya dönüştüğü için tamamen kaldırıldı — o ekran zaten 5.
  sahnedeki müdür panosunun içinde tam boy görünüyor.
- **Bu ortam Remotion'ın kendi Chrome'unu indiremiyor** (`remotion.media`
  ağ izin listesinde değil). `remotion.config.ts` varsa Playwright'ın
  `chrome-headless-shell`'ini kullanıyor; başka makinede o yol yoksa
  satır kendiliğinden atlanır ve Remotion kendi tarayıcısını indirir.

Sahne süreleri `src/Video.tsx` içinde satır içi yazılı (Studio'da
sürüklenerek değiştirilebilsin diye). Değiştirirsen `src/Root.tsx`'teki
`TOPLAM` da güncellenmeli.

## Metni değiştirmek

`sunum.html` düz HTML — slaytlar `<section class="slayt">` blokları.
Değiştirdikten sonra 4. adımı çalıştırmak yeterli. Renkler ve yazı tipleri
uygulamanın `src/styles/andon.css` paletinden birebir alınmıştır.

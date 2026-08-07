# Müdür sunumu

Gönderilebilir dosyalar: iki ayrı seviyeye yazılmış tanıtım PDF'i ve
öğretici video. Hepsi WhatsApp/e-postada kurulum gerektirmeden açılır.

## İki sunum, iki seviye — karıştırmayın

| Sunum | Kime | Çerçeve |
|---|---|---|
| `gold-harvest-mes-sunum.pdf` (10 sayfa) | **Hat müdürü** | "Şu an göremediğin ne varmış" — sistemin kendisi |
| `sunum-komuta-merkezi.pdf` (14 sayfa) | **Genel müdür** | "Bu bize ne kazandırıyor" — maliyet, vizyon, karar |

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
| `sunum-komuta-merkezi.pdf` | **Gönderilecek — 14 sayfalık genel müdür sunumu** |
| `gold-harvest-mes-sunum.pdf` | **Gönderilecek — 10 sayfalık hat müdürü sunumu** |
| `gold-harvest-mes-tanitim.mp4` | **Gönderilecek — 2:47'lik öğretici video** |
| `gold-harvest-mes-vardiya.mp4` | Önceki 34 sn'lik hızlandırılmış sürüm (üreticisi kaldırıldı) |
| `sunum.html` | Hat müdürü sunumunun kaynağı (tarayıcıda da açılır) |
| `sunum-komuta-merkezi.html` | Genel müdür sunumunun kaynağı |
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

## Metni değiştirmek

`sunum.html` düz HTML — slaytlar `<section class="slayt">` blokları.
Değiştirdikten sonra 4. adımı çalıştırmak yeterli. Renkler ve yazı tipleri
uygulamanın `src/styles/andon.css` paletinden birebir alınmıştır.

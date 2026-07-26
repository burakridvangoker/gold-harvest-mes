# Gold Harvest MES

Gıda paketleme hatları (`PFM-4`, `PFM-10`, `PFM-11` — `src/lib/lines.js`)
için üretim takip sistemi. Türkçe UI, Supabase realtime, React + Vite.
Bu dosya projenin kalıcı hafızasıdır — bir sohbet oturumu bitse de burada
yazan kararlar geçerlidir.

**Önemli sınır:** Bu dosya proje bağlamını taşır, konuşma geçmişini
taşımaz. Yeni bir oturum (başka bir hesap, başka bir kişi, limit bitip
devam eden sen) bu repoyu açtığında otomatik okunur ve hızlıca bağlam
kazandırır — ama "hangi mesajda ne konuştuk" bilgisini vermez. Kalıcı
kararlar için bu dosyayı, o anki plan/ilerleme detayları için ilgili
`.md` dosyalarını (varsa) güncel tutun.

## Kurulum ve çalıştırma

```bash
npm install
cp .env.example .env   # VITE_SUPABASE_URL ve VITE_SUPABASE_ANON_KEY doldur
npm run dev            # http://localhost:5173
npm run lint            # oxlint
npm test                 # src/**/*.test.js (Node'un yerleşik test koşucusu, ek bağımlılık yok)
npm run build
```

Rotalar (`src/main.jsx`): `/` (Vite karşılama sayfası, kullanılmıyor),
`/operator` (OperatorPanel), `/mudur` (ManagerDashboard). İkisi de önce
hat seçtirir (`LineSelect`, `useLineCode` — cihaz başına `localStorage`'da
tutulur), seçilen hat plakasına (`.operator-line-code`/`.manager-line-code`)
dokununca hat değiştirilebilir.

Vercel'e deploy edilirken **Production Branch** çalışan geliştirme
branch'ine ayarlı olmalı (`main` değil) — bkz. proje geçmişi. `vercel.json`
SPA rewrite kuralı taşır, olmadan `/operator`/`/mudur` doğrudan girişte 404 verir.

## Veritabanı şeması — sırayla çalıştır

1. `setup_line_status.sql` — hat kaydı
2. `setup_stop_events.sql`, `add_total_durations.sql` — **eski model, bkz. aşağı**
3. `setup_shifts.sql` — `shifts`, `product_runs`
4. `setup_timeline.sql` — `timeline_events`, `pallet_records`
5. `migrate_to_timeline.sql` — `line_status`'u türetilen alanlardan arındırır
6. `add_run_details.sql` — PFM-4/PFM-10 hat kayıtları, `hedef_hiz_pkt_dk` →
   `calisma_hizi_pkt_dk` yeniden adlandırma, `bos_paket_agirlik_g` /
   `ortalama_gramaj_g` kolonları

RLS tüm tablolarda açık, tüm politikalar `using (true)` — henüz
kimlik doğrulama yok, sahada hızlı iterasyon için bilinçli bir tercih.
Yeni bir kullanıcı/rol sistemi eklenirse bu politikalar sıkılaştırılmalı.

## Mimari karar: neden olay kaydı, neden birikmiş sayaç değil

**Bağlam:** Operatörün asli görevi makine, telefona olaydan dakikalar
sonra girebiliyor ("7:30'da makine durdu ama ben 7:35'te girdim").
Bu, sahada her zaman olacak — istisna değil, kural.

**Sonuç:** Süreler (üretim/duruş toplamları, palet/paket sayıları)
**hiçbir yerde saklanmaz**, hep `timeline_events` ve `pallet_records`
tablolarından türetilir (`src/lib/timeline.js`). Eski model
(`add_total_durations.sql`'deki trigger) toplamları birikmiş sayaçta
tutuyordu — bu, geriye dönük saat düzeltmeyi yapısal olarak imkânsız
kılıyordu: bir kere yazılan toplam, geçmiş düzeltilse bile yanlış kalıyordu.

**Zaman çizelgesi modeli:** `timeline_events` bir durumun BAŞLADIĞI anı
tutar; aralık bir sonraki olayın anında biter (bkz. `setup_timeline.sql`
başındaki uzun yorum). Bunun getirdiği üç şey:
- Saat düzeltmek iki komşu aralığı birlikte kaydırır, boşluk/çakışma oluşamaz.
- Olay silmek iki aralığı birleştirir, ekstra mantık gerekmez.
- Eski ürüne dönmek = o ürünün id'siyle yeni bir 'uretim' olayı.

Bu prensibi bozmayın: yeni bir "toplam süre" veya "sayaç" kolonu eklemek
isteyen her değişiklik, bu mimariyi yeniden kırar.

## Duruş sebepleri: kodsuz, kod-üretici

Sahada kod kataloğu kullanılmıyor — operatör ne olduysa serbest metin
yazıyor (`StopNoteSheet`). `stop_reasons` tablosu şemada duruyor ama
Faz 1 UI'ı onu kullanmıyor. `frequentNotes()` (`src/lib/timeline.js`)
tekrarlayan notları sıklığa göre sıralayıp tek dokunuşluk çip olarak
sunuyor — kodlar zamanla buradan, elle katalog yönetimi gerekmeden
terfi edecek. Bu tasarım kasıtlı; erken kod zorunluluğu eklemeyin.

## Çalışma hızı: hedef değil, anlık değer

`product_runs.calisma_hizi_pkt_dk` kurulumda bir kere sorulup kilitlenen
bir "hedef" değil — operatörün üretim sırasında `SpeedSheet` ile istediği
zaman güncelleyebildiği anlık bir değerdir (eski adı `hedef_hiz_pkt_dk`,
`add_run_details.sql`'de yeniden adlandırıldı). `ShiftWizard`'ın kurulum
adımında artık sorulmuyor; operatör ana ekranındaki "Çalışma hızı" satırına
dokunarak her an değiştirir. Yeni bir "hedef hız" ihtiyacı çıkarsa bu ayrı
bir alan olmalı, bu kolonun anlamını geri döndürmeyin.

## Ambalaj firesi hesabı

Her ürün üretimi bitince (`RunEndSheet`, ürün değiştirirken ya da vardiya
biterken tetiklenir) operatörden dolu/boş paket numaratör **bitişi**
istenir (başlangıçları zaten `ShiftWizard`'da alınıyor). Hesap
`packagingWaste()` (`src/lib/timeline.js`) içinde, saf fonksiyon olarak:

- `doluFark = doluBitis - doluBaslangic`, `bosFark = bosBitis - bosBaslangic`
- `doluFire = doluFark - toplamPaket` (üretilen paket, `koliToPaket` ile
  palet kayıtlarından türetilir — burada da saklanmaz)
- `ambalajFireAdet = doluFire + bosFark`, grama çevirmek için
  `product_runs.bos_paket_agirlik_g` ile çarpılır

`bos_paket_agirlik_g` ürün kurulumunda bir kere sorulur (ambalaj malzemesi
değişmedikçe sabit); `ortalama_gramaj_g` ise `RunEndSheet`'te üretim
sonunda teraziden okunan değer olarak. `RunEndSheet` bu hesabı operatör
numaratörleri yazarken CANLI gösterir — kayıttan sonra değil, girerken.

## Ürün geçmişi ve ürün değiştirme

Aynı vardiyada birden çok ürün üretilebilir (Faz 1'in aksine artık UI'da
var). Akış: operatör ekranındaki "Ürün değiştir" → `RunEndSheet` (bitiş
numaratörleri + fire önizleme, aktif `product_run`'a kaydedilir) →
`ShiftWizard mode="product"` (yeni ürün bilgisi) → `TimeSheet` ("yeni
ürüne ne zaman geçildi") → yeni `product_run` satırı + o run'a işaret eden
yeni `uretim` olayı. Eski ürüne dönmek istenirse (henüz UI'da yok, şema
destekliyor) aynı prensip: eski `product_run_id`'siyle yeni bir olay.

`ProductHistory` (`src/components/ProductHistory.jsx`) vardiyadaki her
ürünü `runSpans()` ile (ilk başlangıç → son bitiş, ara dönüşler dahil
değil) kart olarak listeler; karta dokunca süre/palet/koli/paket/verim ve
(varsa) ambalaj firesi detayı açılır. Bu bileşen de kendi hesaplarını
`timeline.js`'ten yapar, hazır veri almaz — kod konumu haritasındaki
kuralla tutarlı.

## Andon tasarım sistemi

`src/styles/andon.css` — ortak tasarım dili. İmza öğesi: **ekranın
kendisi andon lambasıdır**, durum köşedeki bir rozete değil sol
kenardaki tam boy `andon-rail`'e ve sayfa geneli durum yıkamasına yazılır.
Duruş uzadıkça ray nabzı ısrarlanır (`--urgency`, 30 dk'da tam yoğunluk),
`prefers-reduced-motion` altında sabit kontrasta düşer.

**Yazı tipi rolleri ölçüme dayalı, keyfi değil:**
- `.tnum` (IBM Plex Sans) → **tüm sayılar**. Rakamları sabit 600 birim
  genişlikte, saniyelik sayaçlar zıplamaz.
- `.plate` (Saira Condensed) → **sadece büyük harf etiketler**. Bu
  fontun rakamları orantılı (299-489 birim arası) — sayaçta KULLANMAYIN.

Palet: çelik (`--steel-900/800/700/600`) + sinyal (`--signal-run`
yeşil, `--signal-idle` amber, `--signal-stop` kırmızı). Tailwind
slate/mavi varsayılanına dönmeyin, bilinçli bir karardı.

Bilinen tuzaklar (yaşanmış hatalar, tekrar düşmeyin):
- `<input type="time">` KULLANMAYIN — AM/PM gösterimi sayfa diline
  değil tarayıcı/OS yerel ayarına bağlı, `lang` attribute'u etkilemiyor.
  `TimeSheet.jsx`'teki iki-alanlı (saat/dakika) özel kontrolü kullanın.
- Çok adımlı sihirbazlarda (`ShiftWizard.jsx`) tüm adımlar aynı anda
  mount edilir, sadece `transform` ile kaydırılır (adım geçişi anlık
  olsun diye). Bu yüzden hiçbir alanda `autoFocus` kullanmayın — ilk
  adım olmayan bir alanda autoFocus, tarayıcının overflow:hidden
  konteyneri oraya kaydırmasına ve yanlış adımın görünmesine yol açar.

## Kod konumu haritası

- `src/lib/timeline.js` — tüm süre/verim/plan hesabı, saf fonksiyonlar,
  `timeline.test.js` ile test edilir. Yeni türetilmiş bir metrik
  gerekiyorsa buraya eklenir, bileşene değil.
- `src/hooks/useShift.js` — açık vardiya + ürünler + olaylar + paletler.
  Realtime'da **artımlı yama değil yeniden çekme** yapılır: kayıtlar
  düzenlenebilir/silinebilir olduğu için artımlı birleştirme kolayca
  tutarsız düşer. Vardiya başına veri az, yeniden çekmek ucuz.
- `src/components/TimeSheet.jsx` — geriye dönük saat düzeltme, kaydırmalı
  saat/dakika çarkı (`WheelColumn`). Durum değiştiren HER aksiyon
  (başlat/durdur/palet/vardiya bitir/ürün geçişi) buradan geçer.
- `src/components/StopNoteSheet.jsx` — serbest metin duruş notu + sık
  kullanılan çipler.
- `src/components/EventLog.jsx` — olay geçmişi, düzenle/sil yüzeyi.
- `src/components/ShiftWizard.jsx` — vardiya/ürün başlatma. `mode="shift"`
  (vardiya+ilk ürün) ve `mode="product"` (vardiya içi ürün değişimi,
  operatör ekranına bağlı) destekler.
- `src/components/SpeedSheet.jsx` — çalışma hızını istendiği an düzenleme.
- `src/components/RunEndSheet.jsx` — ürün bitişinde numaratör + ambalaj
  fire önizlemesi.
- `src/components/ProductHistory.jsx` — vardiyadaki ürün kartları + detay.
- `src/components/Sheet.css` — SpeedSheet/RunEndSheet/ProductHistory'nin
  paylaştığı nötr alttan-açılan sayfa iskeleti (TimeSheet/StopNoteSheet
  kendi tonlarını taşıdığı için ayrı kaldı).
- `src/components/LineSelect.jsx` + `src/hooks/useLineCode.js` — hat
  seçimi, cihaz başına `localStorage`'da.
- `src/lib/lines.js` — sahadaki hatların tek kaynağı (`LINE_CODES`).

## Faz durumu

**Tamamlandı:** vardiya yaşam döngüsü, zaman çizelgesi + geriye dönük
düzeltme (kaydırmalı saat çarkı), kodsuz duruş notu, olay geçmişi
(düzenle/sil), ayarlanabilir palet/koli, vardiya planı ilerlemesi ve tempo
göstergesi, çoklu hat seçici, aynı vardiyada birden çok ürün (ürün
değiştir akışı), ürün geçmişi kartları, çalışma hızını her an düzenleme,
ambalaj firesi hesabı.

**Yapılmadı:** eski ürüne geri dönüp üretime devam etme UI'ı (şema/`
runSpans` bunu zaten destekliyor, sadece "bu ürüne dön" butonu yok), ürün
bazlı + genel verim ayrımının müdür panosunda ayrı gösterimi, not→kod
terfi arayüzü (`stop_reasons` tablosu şemada duruyor, kullanılmıyor).

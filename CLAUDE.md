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
7. `add_mola.sql` — `timeline_events.kind`'a üçüncü değer: `'mola'`
8. `add_stop_reason_segments.sql` — `stop_reason_segments`, bir duruş
   olayının İÇİNDE çakışabilen sebep segmentleri

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

**Tek duruşta birden fazla, ÇAKIŞAN sebep olabiliyor:** sahada yaşanan
durum — bir duruş boyunca (ör. 55 dakika) üç ayrı sebep (bobin değişimi,
ambalaj ayarı, elektrik arızası gibi) birbirini ARDIŞIK değil ÇAKIŞIK
şekilde takip ediyor (net sıraları yok, operatör hangi sebebin tam ne
zaman başlayıp bittiğini hatırlamıyor/veremiyor). Bunu 3 ayrı `durus`
olayına (3 ayrı zaman damgasıyla) bölmek YANLIŞ olurdu — var olmayan bir
kesinliği uydurmuş oluruz. Doğrusu: aralık TEK bir `durus` olarak kalır,
notu üç sebebi BİRLİKTE taşır.

`StopNoteSheet`'in çipleri bu yüzden tek dokunuşta ANINDA KAYDETMEZ —
çoğul seçilebilir (`toggleChip`, aktif çip vurgulu). Seçilen çipler
`" + "` ile birleşip textarea'ya yazılır, operatör bunun üstüne
serbestçe elle ekleme yapabilir (çip listesinde olmayan bir sebep için),
kayıt hâlâ tek bir "Kaydet" dokunuşuyla olur. `downtimeByNote` bu
birleşik notu TEK bir satır olarak toplar — sebepler çakıştığı için
süreyi sebep başına ayrıştırmak zaten mümkün değil, bu dürüst bir
gösterim.

**`ReasonSegments`: aynı sorun için ikinci, daha derin bir katman —
her sebebin KENDİ zaman kutusu.** Çip-birleştirme (yukarısı) sebepleri
tek bir metinde birleştirir ama HANGİ sebebin ne kadar sürdüğünü
ayıramaz. `ReasonSegments` (`src/components/ReasonSegments.jsx`) bunu
çözer: bir `stop_reason_segments` tablosu (`add_stop_reason_segments.sql`)
— her satır bir `durus` olayının (`event_id`) İÇİNE, KENDİ `start_at`/
`end_at`'i olan bir sebep kaydı. Segmentler birbirleriyle ÇAKIŞABİLİR
(bobin değişimi 07:00-07:30, ambalaj ayarı 07:15-07:45 gibi) — bu, dış
`timeline_events` modelinin ÇAKIŞMASIZ tek sıralı yapısını hiç bozmaz,
sadece TEK bir `durus` olayının içine ikinci, bağımsız bir katman ekler
(dış durum/süre hesapları tamamen etkilenmeden kalır).

- `src/lib/timeline.js#assignLanes` — çakışan segmentleri ayrı görsel
  satırlara (lane) dağıtır, klasik interval-graph boyama.
- `src/lib/timeline.js#groupSegmentsByEvent` — ham DB satırlarını
  `event_id`'ye göre gruplar, ms'e çevirir (`buildIntervals`'ın
  `timeline_events` için yaptığının aynısı).
- `downtimeByNote(intervals, { segmentsByEventId })` — bir duruşun
  segmentleri varsa süreyi HER SEGMENTİN kendi notuna atar (toplam,
  segmentler çakıştığı için gerçek duruş süresinden FAZLA çıkabilir —
  bu doğru bir gösterim, aynı anda birden fazla şey oluyordu demektir).
  Segmenti olmayan duruşlarda eski davranış (tüm süre, interval.note)
  aynen çalışmaya devam eder — geriye dönük uyumlu.
- Saat girişi burada da `TimeSheet`'in kaydırmalı çarkıyla olur, serbest
  sürükleme DEĞİL — telefonda/eldivenle bir segmentin ucunu sürükleyip
  bırakmak kırılgan bir UX olurdu (yanlış dokunuş/kayma riski); çark bu
  riski ortadan kaldırıyor. Bu bilinçli bir seçim: ekranda "sürüklenebilir
  çubuk" gibi görünse de, saat DEĞİŞTİRME işlemi hep dokunup çarkla
  onaylama üzerinden gider.
- Ana ekranda gösterilir (OperatorPanel, aktif/son aralık `durus` ise) —
  "Olay geçmişi"ne girmeden, olay tam yaşanırken ya da hemen sonra sebep
  eklenip düzenlenebilir. `useShift.js`'e `segments` eklendi (aynı
  realtime + yeniden-çekme deseni, `stop_reason_segments` da `TABLES`
  listesinde).

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

## Vardiya duruştan başlar, ürün bilgisi sonra girilir

`ShiftWizard mode="shift"` artık SADECE vardiya no + operatör sorar —
ne başlangıç saati ne de hedef koli. Vardiyaların saatleri sahada sabit
ve belli (1. 07-15, 2. 15-23, 3. 23-07, üçü de 8 saat) — `createShift`
bunu operatöre sormaz, `src/lib/time.js#vardiyaBaslangici` ile hesaplar
(3. vardiya gece yarısını geçtiği için "bugünkü" saat henüz gelmediyse
bir gün geriye düşer).

**Vardiya seçimi otomatik ön-doldurulur:** operatör segmentli seçiciden
istediği vardiyayı seçebilir ama sihirbaz açılışta `src/lib/time.js#
aktifVardiyaNo` ile şu an içinde bulunulan vardiyayı önceden işaretler.
Sebep: yanlış vardiya seçilirse (`vardiyaBaslangici` gerçek saatle
tutarsız bir seçim için de kör kör bir başlangıç hesaplar) o vardiyanın
"duruş" süresi saatlerce geriye gidebiliyor — sahada yaşandı (23:10'da
"1. vardiya" seçilince o sabah 07:00'den beri "durdu" gösteren bir
vardiya oluştu). Otomatik ön-doldurma bu sınıf hatayı ortadan kaldırır;
tamamen engellemek istenmedi çünkü operatör vardiyasından birkaç dakika
önce/sonra girip bilerek farklı bir vardiya seçebilmeli. Hedef koli ürün
bazlı olduğu için (`product_runs.hedef_koli`, her ürün kendi hedefini
`ShiftWizard mode="product"`'ta
sorar) vardiya kurulumunda hiç sorulmaz.

Vardiya açılınca `createShift` bir `product_run` oluşturmaz, sadece
`product_run_id: null` olan bir `durus` olayı yazar: vardiya "DURDU"
durumunda başlar. Sahada vardiyanın ilk dakikaları genelde temizlik/
arıza/bekleme oluyor, operatörü vardiyayı açmadan önce ürün detayına
(gramaj, parti no, numaratör...) zorlamak yanlış bir varsayımdı.

Ana ekranda `activeRun` yoksa birincil buton "ÜRÜN BAŞLAT" olur ve
doğrudan `ShiftWizard mode="product"`'ı açar (aradaki `RunEndSheet`
atlanır — bitirilecek bir ürün henüz yok). Operatör hazır olunca ürün
bilgisini girer, `TimeSheet` ile "Üretim ne zaman başladı?" diye sorulur,
ilk `product_run` + ona işaret eden `uretim` olayı öyle oluşur.

**Plan/tempo takibi ürün bazlı:** `paceStatus` artık `shift.hedef_koli`
değil `activeRun.hedef_koli` ile çalışır; pencere aktif ürünün kendi
başlangıcından (`runSpans`) vardiyanın planlı bitişine kadardır. Bir
ürünün hedefi yoksa (boş bırakılmışsa) plan bloğu hiç gösterilmez —
vardiya genelinde ayrı bir hedef kolonu artık yok.

**Bu ürün / vardiya toplamı hiç karıştırılmasın:** Yaşanmış hata — ürün
değiştirince yeni ürünün adının hemen altında ESKİ ürünün palet/koli/
paket sayısı görünüyordu, çünkü `.operator-counts`/`today-figures`
her zaman `palletTotals(pallets)` (TÜM vardiya, ürün ayrımı yok)
kullanıyordu. Artık iki ayrı gösterim var:
- **Bu ürün** — aktif `product_run`'a ait palet/koli/paket
  (`palletTotalsByRun(pallets).get(activeRun.id)`), ürün adının hemen
  altında (operatörde `.operator-counts-section`, müdürde
  `.now-run-figures`).
- **Vardiya toplamı** — TÜM ürünlerin toplamı (`palletTotals(pallets)`),
  ayrı ve küçük bir satırda (operatörde `.operator-shift-totals`,
  müdürde zaten ayrı olan "VARDİYA" bölgesi).

Yeni bir ürüne geçilince "Bu ürün" sıfırdan başlar, "Vardiya toplamı"
değişmeden kalır — ikisi asla aynı kutuda gösterilmemeli.

## Mola: üçüncü durum, açık kalmaya girmez

Vardiyada 3 planlı mola var. Operatör ekranında BAŞLAT/DURDUR'un yanında
üçüncü bir buton: **MOLA**. Basınca `timeline_events.kind='mola'` yazılır
(`add_mola.sql` ile şemaya eklendi — eskiden sadece `'uretim'`/`'durus'`
vardı). `currentState()` üç değerden birini döner: `uretimde` / `durdu` /
`molada`; andon rengi `molada` için de `--signal-idle` (amber) — kırmızı
duruşla karışmasın diye kasıtlı.

**Mola dönüşü direkt duruşa geçer, üretime değil:** "MOLA BİTTİ" butonu
`kind='durus'` bir olay yazar (not otomatik "Moladan dönüş" — operatöre
ayrıca sorulmaz), üretim ancak BAŞLAT'a basılınca başlar. Sahada makine
moladan hemen sonra anında çalışmıyor, bir-iki dakika içinde tekrar
başlıyor — bu ara boşluk gerçek bir "duruş", mola değil.

**Mola bir ürüne bağlı değil:** vardiya "durdu" durumunda başlar (bkz.
yukarısı) ve operatör ilk ürünü girmeden de dakikalarca durabilir; MOLA
butonu bu yüzden `activeRun` şartına BAĞLI DEĞİL (`+1 PALET`'in aksine —
o gerçekten bir ürüne ait olmak zorunda, `pallet_records.product_run_id`
`not null`). `OperatorPanel`'in ana buton mantığında `isMola` kontrolü
her zaman `!activeRun` kontrolünden ÖNCE gelmeli — aksi halde ürün
girilmeden başlatılan bir mola bitirilemez, buton "ÜRÜN BAŞLAT" gösterip
ürün sihirbazını açar (yaşanmış hata, tekrar düşmeyin).

**Açık kalma oranının paydasına hiç girmez:** `shiftTotals`/`totalsByRun`
artık `molaMs`'i `uretimMs`/`durusMs`'ten ayrı tutuyor (`emptyTotals()`),
ve `toplamMs` (açık kalma paydası) SADECE `uretimMs + durusMs`'ten
oluşuyor. Bilinçli karar: 3 planlı mola yüzünden açık kalma oranı hep
düşük görünmesin — mola gerçek "makine arızası/duruşu" değil, planlı bir
ara. `downtimeByNote` de mola'yı zaten hariç tutuyor (`kind !== 'durus'`
filtresi), "Duruş sebepleri" listesine hiç girmiyor.

**Vardiya bölümleri (çeyrekler):** `timeline.js#shiftSegments` vardiyayı
mola BAŞLANGIÇLARINA göre böler — N mola → N+1 bölüm (3 mola → 4 bölüm).
Müdür panosunda "Son olaylar" tek bir uzun liste yerine bu bölümler yan
yana (`zone--quarters`/`quarters-row`), her bölümün kendi olayları kendi
içinde alt alta. `ShiftHistoryDetail`'de (donmuş özet) de aynı görünüm var
— operatörün "Olay geçmişi" (`EventLog`, düzenleme yüzeyi) düz kronolojik
liste olarak kaldı, düzenlemek için en basiti bu.

**Palet çıkış saatleri: her ürünün KENDİ listesi, tek ortak liste değil.**
İlk sürümde tek, vardiya geneli bir "Palet çıkış saatleri" listesi vardı —
hangi paletin hangi ürüne ait olduğu belirsizdi (yaşanmış şikayet: yeni
ürüne (natura karışık) geçildiğinde bu liste hâlâ eski ürünün (kuru üzüm)
paletlerini gösteriyordu, çünkü `pallets` filtrelenmeden tek listede
basılıyordu). Artık üç yüzeyde de palet listesi `pallet.product_run_id`'ye
göre filtrelenip HER ürünün kendi kartında/satırında ayrı ayrı gösteriliyor:
- `ManagerDashboard` — `.plan-row-pallets`, her ürün satırının
  (`.plan-row`) içinde, o satırın `run.id`'sine ait paletler.
- `OperatorPanel`/`ShiftHistoryDetail` — `ProductHistory`'nin detay
  sayfasında (`.history-pallets`), açılan ürün kartının kendi paletleri.
`palletTotalsByRun` zaten aggregate rakamlar için run bazlıydı; bu liste de
aynı prensiple `product_run_id` filtresiyle run bazlı hale getirildi. Üç
ayrı CSS sınıf adı (`.plan-row-pallets*` / `.history-pallets*`) bilerek:
bu yüzeylerin ölçeği (duvar ekranı vw / telefon-donmuş özet rem) farklı,
aynı adı paylaşırlarsa yanlış ölçek sızabilir.

**Vardiya toplam paketi: yaşanmış hesap hatası, `timeline.js#shiftPaket`
ile düzeltildi.** Üç yüzeyde de (`ManagerDashboard`, `OperatorPanel`,
`ShiftHistoryDetail`) toplam paket eskiden `koliToPaket(TÜM koli,
TEK bir ürünün koli_ici_adet'i)` ile hesaplanıyordu — vardiyada birden
çok ürün varsa (farklı `koli_ici_adet` değerleri) bu yanlış: 30 koli
kuru üzüm (koli içi 7 = 210 paket) + 0 koli natura (koli içi 12) iken
toplam "210" değil aktif ürünün 12'siyle çarpılıp "360" çıkıyordu.
Doğrusu: her ürün KENDİ `koli_ici_adet`'iyle hesaplanıp toplanır
(`shiftPaket(runs, paletlerByRun)`). Tek bir `koli_ici_adet` ile TÜM
koliyi çarpan bir kod görürseniz bu hata geri gelmiş demektir.

**Vardiya toplamı "1+2" gibi ürün bazlı katkılara ayrılır**
(`formatBreakdown`, `src/lib/duration.js`): Palet/Koli/Paket rakamları
artık düz bir toplam değil, paleti çıkmış her ürünün kendi katkısı
`+` ile ayrılmış olarak gösteriliyor (ör. "1+2 palet · 30+16 koli ·
210+192 paket") — yeni ürünün paletleri çıktıkça toplamın hangi
üründen büyüdüğü tek bakışta belli olsun diye. Katkısı 0 olan ürünler
(henüz paleti çıkmamış) listeye girmez, tek ürün/tek katkı varsa
gereksiz "+" eklenmez, düz sayı gösterilir. Üç yüzeyde de aynı desen
(`contributingRuns`/`paletParts`/`koliParts`/`paketParts`).

## Müdür panosu: iki oran, birbirine karıştırılmasın

`ManagerDashboard`'daki "Vardiya toplamı" bölgesi iki ayrı, her zaman
görünen oran gösterir (`src/pages/ManagerDashboard.jsx`, `.oran-group`).
Başlık bilerek "Vardiya" değil "**Vardiya toplamı**": tek ürünlü bir
vardiyada bu bölümün palet/koli/paket rakamları o tek ürünün rakamlarıyla
birebir aynı görünüyor, "toplamı" ibaresi olmadan aktif ürüne aitmiş gibi
okunuyordu (yaşanmış karışıklık: "Şimdi" bölgesindeki aktif ürünün kendi
sayısı 0 iken hemen altındaki "Vardiya" 1 palet/30 koli/360 paket
gösterince kullanıcı bunun da aktif ürüne ait olduğunu sanmıştı).

- **Açık kalma oranı** — `shiftTotals(intervals).zamanKullanimi`: vardiya
  boyunca makinenin ne kadarının "uretim" durumunda geçtiği (duruşlar
  dahil toplam süreye oran). Vardiya geneli, aktif ürüne bağlı değil.
- **Hız verimi** — `timeline.js#hizVerimi`: AKTİF ürünün açık kaldığı
  sürede, o ürüne girilen `calisma_hizi_pkt_dk`'ya göre üretilen paket
  sayısının kaç saatlik "net iş"e karşılık geldiği. Örnek: 6 saat açık
  kaldı ama üretilen paket hıza göre yalnızca 5 saatlik işe denk
  geliyorsa %83 — mikro-duruşları ve hız düşüşünü, açık kalma oranından
  bağımsız olarak yakalar. Bilinçli olarak aktif ürüne göre kapsanır
  (vardiya geneline göre değil): paket/süre vardiya genelinden alınıp
  sadece aktif ürünün hızıyla bölünseydi, önceki üründen kalan paletler
  yeni ürünün birkaç dakikalık çalışma süresine bölünüp %1000+ gibi
  anlamsız değerler üretiyordu — yaşanmış hata, tekrar düşmeyin.

Bu ikisi eskiden tek bir slotu paylaşıyordu (ürün hedefi varsa açık kalma
oranı hiç gösterilmiyordu) — kullanıcı ikisinin de HER ZAMAN ayrı ayrı
görünmesini istedi. Ürün hedefi ilerlemesi (`paceStatus`) üçüncü, farklı
bir kavram: tek bir ürünün kendi hedefine göre önde/geride olması. Bu
yüzden ayrı bir yerde (`.plan-stack`) altta gösterilir.

**Ürün planı da ürün bazlı satırlara ayrılır:** vardiyada birden çok ürün
varsa (`runs`) her birinin kendi satırı olur, sıra `runs`'ın TERSİ (`sira`
azalan) — aktif/en yeni ürün en üstte, bitmiş ürünler altta. Aktif ürünün
satırı canlıdır (`nowMs = now`), kutusuz/düz görünür; üretimi bitmiş bir
ürünün satırı kendi son anına (`runSpans(...).endMs`) dondurulur ve
`.plan-row--frozen` ile "mühürlü paket" kutusuna alınır (kenarlık +
zemin, sadece soluklaştırma değil) — "üretimi bitti, bir daha değişmez"
anlamında altta durur. Aktif satırdan sonraki ilk mühürlü satır ayrıca
`.plan-row--frozen-first` ile belirgin bir üst çizgi alır — aktif ürünle
karışmasın diye net bir ayraç (yaşanmış şikayet: yeni ürüne geçilince
bitmiş ürünün rakamları yeni ürünle karman çorman görünüyordu, sadece
opaklık farkı yetmiyordu). Yeni ürüne geçince onun kendi satırı en üstte,
canlı olarak belirir; eski aktif satır bir alt satıra düşüp mühürlenir.
Her satır kendi ilerleme çubuğunu (`.plan-row-track`/`.plan-row-fill`)
taşır — sadece sayı değil, görsel bir "çubuk" da olsun istendi.

**Her ürünün kendi açık kalma / hız verimi de satırında gösterilir**
(`.plan-row-metrics`): üsttekiler (`.oran-group`) genel/aktif ürüne göreyken,
buradakiler o SATIRIN kendi `product_run_id`'sine ait `totalsByRun`/
`palletTotalsByRun` değerlerinden hesaplanır — geçmiş bir ürünün kendi
performansı da kalıcı olarak görünür kalsın diye. Hedefi olmayan bir ürün
de (ilerleme çubuğu/hedef metni olmadan) yine de bu iki metrikle listeye
girer; sadece hedefe bağlı kısımlar (`pace`) opsiyoneldir.

**Her satır ayrıca kendi ham palet/koli/paket sayısını da taşır**
(`.plan-row-counts`, açık kalma/hız verimi yüzdelerinin hemen altında) —
üsteki "Vardiya toplamı" bölümündeki Palet/Koli/Paket rakamının HANGİ
üründen geldiği tek bakışta görülsün diye. Bu olmadan (yaşanmış
karışıklık) vardiya toplamı tek bir ürünün rakamıyla birebir aynı
görününce "bu rakam nereden geliyor" belirsiz kalıyordu; artık aynı
sayı (ör. 360 paket) doğrudan o ürünün kendi satırında da yazıyor.

## Geçmiş vardiyalar: vardiyayı bitirmek veri silmez

Sahada yaşanan bir korku: "vardiyayı bitir dersem her şey sıfırlanacak
sanıyorum". Yanlış — `useShift.js`'in gerçeği: "Vardiyayı bitir" sadece
`shifts.ended_at`'i doldurur; o satır ve ona bağlı `product_runs`/
`timeline_events`/`pallet_records` veritabanında SONSUZA KADAR kalır
(CLAUDE.md'nin en üstteki "olay kaydı, birikmiş sayaç değil" ilkesi zaten
bunu garanti ediyor — hiçbir yerde otomatik/saat bazlı bir silme veya
sıfırlama YOK). Asıl eksik canlı `useShift`'in SADECE `ended_at is null`
olan vardiyayı çekmesiydi — vardiya kapanınca ekran "Açık vardiya yok"
diyordu ve kapanan vardiyaya bakacak hiçbir yol yoktu; veri kaybolmamıştı
ama pratikte ulaşılamıyordu.

**Çözüm — "Geçmiş vardiyalar":**
- `src/hooks/useShiftList.js` — bir hattın KAPANMIŞ vardiyalarını listeler.
- `src/hooks/useShiftById.js` — `useShift.js` ile birebir aynı üç sorgu
  deseni, sadece "açık vardiya" filtresi yerine doğrudan `shiftId`. Açık
  ya da kapanmış fark etmez, herhangi bir vardiyanın tam paketini çeker.
- `src/components/ShiftHistoryPicker.jsx` — her iki ekranın da kullandığı
  paylaşılan seçici sheet.
- `src/components/ShiftHistoryDetail.jsx` — donmuş özet. `nowMs` HER ZAMAN
  `shift.ended_at`'e sabit (canlı saat değil) — vardiya o an nasıl
  bittiyse öyle kalır, "bir paket gibi durur". Hesaplar `timeline.js`'teki
  AYNI saf fonksiyonlarla (yeni bir hesap yok). BAŞLAT/DURDUR/+1 PALET/
  Ürün değiştir/Vardiyayı bitir hiç yok — bunlar "şu an bir şey oluyor"
  demek, kapanmış bir vardiyada anlamsız.
- **Operatör ekranı düzeltebilir, müdür panosu salt-okunur**: `readOnly`
  prop'u bunu ayırıyor. OperatorPanel zaten tüm yazma altyapısını (guard,
  EventLog, ProductHistory'nin Düzenle'si) taşıyor; kapanmış bir vardiyada
  unutulan duruş notu/yanlış palet/eksik ürün bilgisi hâlâ düzeltilebilir.
  ManagerDashboard hiç yazma çağrısı içermiyor, sadece rakamlar.
- `ProductHistory`/`EventLog`'a `frozen` prop'u eklendi: kapanmış bir
  vardiyanın SON aralığı yapısal olarak `ongoing:true` çıkar (bir sonraki
  olay olmadığı için), ama bu "hâlâ üretimde/sürüyor" demek değil —
  `frozen` bu yanıltıcı etiketi bastırır, süre zaten donuk olduğu için
  değişmiyor.
- Her iki ekranda da hem "Açık vardiya yok" boş ekranında hem canlı vardiya
  varken üstte "Geçmiş vardiyalar" girişi var — vardiya bitmeden de geçmişe
  bakılabilsin diye.

## Müdür panosunda liste kesmeleri kaldırıldı

Eskiden "Son olaylar" `RECENT_EVENTS_LIMIT = 8` ile, "Duruş sebepleri"
`downtimeByNote`'un varsayılan `limit = 5`'i ile kesiliyordu (o zaman
sayfa hiç kaydırılamıyordu, sabit yükseklik vardı). Sayfa artık
kaydırılabilir olduğu için bu keyfi kesmeler kaldırıldı —
`downtimeByNote`'un varsayılanı artık `Infinity`, çağıran yer limit
vermedikçe hiçbir sebep gizlenmiyor. Operatörün "Olay geçmişi"nde gördüğü
sayıyla aynı. `ShiftHistoryDetail` de aynı ilkeyle tam liste gösterir.

## Ürün geçmişi ve ürün değiştirme

Aynı vardiyada birden çok ürün üretilebilir. Bir ürün üretimdeyken ikinci/
üçüncü ürüne geçiş akışı farklı: operatör ekranındaki "Ürün değiştir" →
`RunEndSheet` (bitiş numaratörleri + fire önizleme, aktif `product_run`'a
kaydedilir) → `ShiftWizard mode="product"` (yeni ürün bilgisi) →
`TimeSheet` ("yeni ürüne ne zaman geçildi") → yeni `product_run` satırı +
o run'a işaret eden yeni `uretim` olayı. Eski ürüne dönmek istenirse
(henüz UI'da yok, şema destekliyor) aynı prensip: eski `product_run_id`'
siyle yeni bir olay.

`ProductHistory` (`src/components/ProductHistory.jsx`) vardiyadaki her
ürünü `runSpans()` ile (ilk başlangıç → son bitiş, ara dönüşler dahil
değil) kart olarak listeler; karta dokunca süre/palet/koli/paket/verim ve
(varsa) ambalaj firesi detayı açılır. Bu bileşen de kendi hesaplarını
`timeline.js`'ten yapar, hazır veri almaz — kod konumu haritasındaki
kuralla tutarlı.

Detay sayfasındaki "Düzenle" ile ürün kurulumunda girilen bilgiler
(ürün adı, parti no, gramaj, koli içi adet, boş paket ağırlığı, palet
başına koli, hedef koli, dolu/boş paket başlangıç no) sonradan
düzeltilebilir — sahada bu alanlar sıkça eksik/yanlış girilip
hatırlandıkça düzeltiliyor. `OperatorPanel`'deki `updateRun` bu formdan
gelen patch'i doğrudan `product_runs` satırına yazar (`SpeedSheet`'in
`calisma_hizi_pkt_dk` güncellemesiyle aynı desen). Bitiş numaratörleri
(dolu/boş paket bitiş no, ortalama gramaj) sadece üretimi bitmiş bir
ürün için gösterilir (`!span.ongoing`) — aktif üründe henüz bitiş yok.

**Operatör adı da sonradan düzeltilebilir:** `OperatorPanel` başlığında
artık "{vardiya}. vardiya · {operatör}" satırı var (`.operator-shift-info`,
önceden hiç gösterilmiyordu), dokununca ad-soyad düzenlenebiliyor
(`updateOperator` → `shifts.operator`). Vardiya NUMARASI kasıtlı olarak
düzenlenemez — değiştirmek `planlanan_bitis`/`started_at`'i de değiştirmeyi
gerektirir ki bu tüm ürünlerin `paceStatus` hesaplarını geriye dönük
bozar; yanlış vardiya seçildiyse çözüm o vardiyayı bitirip doğrusunu
yeniden açmak (vardiyalar ucuz, yeniden oluşturmak sorun değil).

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
- `ManagerDashboard` başta `height:100dvh; overflow:hidden` ile "duvara
  asılı ekran, sayfa hiç kaydırılmaz" diye tasarlanmıştı. Vardiyada birden
  çok ürün olunca (`.plan-stack` büyür) içerik gerçek TV boyundan uzun
  bir pencerede (ör. masaüstü tarayıcı) taşıyor, "Duruş sebepleri"/"Son
  olaylar" hiç görünmüyordu. `min-height: 100dvh`'ye çevrildi — sayfa artık
  gerektiğinde kaydırılabilir, sığdığında zaten fark etmez.

## Kod konumu haritası

- `src/lib/timeline.js` — tüm süre/verim/plan hesabı, saf fonksiyonlar,
  `timeline.test.js` ile test edilir. Yeni türetilmiş bir metrik
  gerekiyorsa buraya eklenir, bileşene değil.
- `src/components/ReasonSegments.jsx` — bir duruş aralığının İÇİNDE,
  çakışabilen sebep segmentleri (bkz. "Duruş sebepleri" bölümü).
  `stop_reason_segments` tablosu, `groupSegmentsByEvent`/`assignLanes`
  (`timeline.js`) ile beslenir.
- `src/hooks/useShift.js` — açık vardiya + ürünler + olaylar + paletler.
  Realtime'da **artımlı yama değil yeniden çekme** yapılır: kayıtlar
  düzenlenebilir/silinebilir olduğu için artımlı birleştirme kolayca
  tutarsız düşer. Vardiya başına veri az, yeniden çekmek ucuz.
  Ayrıca `visibilitychange`/`focus` olayında da yeniden çeker — telefon
  ekranı kilitlenip açıldığında mobil tarayıcılar websocket'i askıya
  alabiliyor, realtime olayı hiç gelmeyebilir; sekme tekrar görünür
  olduğunda bu boşluğu kapatır. `useShiftList.js`/`useShiftById.js` de
  aynı deseni taşır.
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
  `frozen` prop'u kapanmış vardiya görünümünde "sürüyor" yanlış etiketini
  bastırır.
- `src/components/Sheet.css` — SpeedSheet/RunEndSheet/ProductHistory'nin
  paylaştığı nötr alttan-açılan sayfa iskeleti (TimeSheet/StopNoteSheet
  kendi tonlarını taşıdığı için ayrı kaldı).
- `src/components/LineSelect.jsx` + `src/hooks/useLineCode.js` — hat
  seçimi, cihaz başına `localStorage`'da.
- `src/lib/lines.js` — sahadaki hatların tek kaynağı (`LINE_CODES`).
- `src/hooks/useShiftList.js` + `src/hooks/useShiftById.js` — geçmiş
  vardiyalar veri katmanı (bkz. "Geçmiş vardiyalar" bölümü).
- `src/components/ShiftHistoryPicker.jsx` + `ShiftHistoryDetail.jsx` —
  geçmiş vardiya seçici ve donmuş özet; ManagerDashboard.css'in vw/clamp
  ölçeğini KULLANMAZ, kendi taşınabilir rem ölçeği var (telefonda da
  duvar ekranında da gömülüyor).

## Faz durumu

**Tamamlandı:** vardiya yaşam döngüsü, zaman çizelgesi + geriye dönük
düzeltme (kaydırmalı saat çarkı), kodsuz duruş notu, olay geçmişi
(düzenle/sil), ayarlanabilir palet/koli, vardiya planı ilerlemesi ve tempo
göstergesi, çoklu hat seçici, aynı vardiyada birden çok ürün (ürün
değiştir akışı), ürün geçmişi kartları, çalışma hızını her an düzenleme,
ambalaj firesi hesabı, müdür panosunda ürün bazlı + genel verim ayrımı
(açık kalma/hız verimi hem vardiya genelinde/aktif üründe hem her ürünün
kendi satırında), geçmiş vardiyalar (donmuş özet + operatörde düzeltme,
müdürde salt-okunur), mola (üçüncü durum, açık kalmaya girmez), vardiya
bölümleri/çeyrekler (mola başlangıçlarına göre yan yana), palet çıkış
saatleri listesi.

**Yapılmadı:** eski ürüne geri dönüp üretime devam etme UI'ı (şema/`
runSpans` bunu zaten destekliyor, sadece "bu ürüne dön" butonu yok), not→kod
terfi arayüzü (`stop_reasons` tablosu şemada duruyor, kullanılmıyor).

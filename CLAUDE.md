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
9. `setup_personnel.sql` — `personnel` tablosu (GH VARDİYA'dan tek
   yönlü kopya)
10. `seed_personnel.sql` — PFM-4/10/11 vardiya çizelgesinden 56 kişi
11. `add_personnel_hat.sql` — `personnel.line_code`, listeyi hatta göre
    filtreler
12. `add_personnel_vardiya.sql` — `personnel.vardiya_no`, otomatik ekip
    ataması/ön-doldurma için
13. `add_manager_visits.sql` — `manager_dashboard_visits`, müdür panosu
    ne zaman/ne kadar açıldı (anonim)

RLS tüm tablolarda açık, tüm politikalar `using (true)` — henüz
kimlik doğrulama yok, sahada hızlı iterasyon için bilinçli bir tercih.
Yeni bir kullanıcı/rol sistemi eklenirse bu politikalar sıkılaştırılmalı.

**Yeni bir SQL migration dosyası oluşturulduğunda (ya da var olan bir
tabloya elle bir değişiklik gerektiğinde), dosya adını söylemek
yetmez — tam SQL içeriği sohbette gösterilir**, kullanıcı doğrudan
kopyalayıp Supabase SQL Editor'e yapıştırabilsin diye. Bu oturumun
Supabase projesine yazma erişimi yok; migration'lar hep kullanıcı
tarafından elle çalıştırılıyor.

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
ara. `downtimeByNote` de mola'yı zaten hariç tutuyor (`segmentKind(interval)
!== 'durus'` filtresi), "Duruş sebepleri" listesine hiç girmiyor.

**`timeline.js#segmentKind`: tek doğru "bu aralık duruş mu" kontrolü.**
Kaldırılmış bir özellikten (ör. eski hazırlık) DB'de kalan bir satırın
`kind`'ı `'uretim'`/`'durus'`/`'mola'` DIŞINDA bir değer taşıyabilir —
event kaydı asla silinmiyor (bkz. dosya başı), sahada gerçekten yaşandı.
`addToTotals`/`currentState`/`downtimeByNote` bunu hep "uretim/mola
DIŞINDAKİ HER ŞEY duruş" mantığıyla (catch-all `else`) doğru ele alıyordu,
ama CSS sınıfı doğrudan `` `*-row--${interval.kind}` `` gibi ham `kind`'a
basan yerler (ör. `ShiftClockBar`, "Son olaylar" satırları, `EventLog`,
`ShiftHistoryDetail`) sınıfsız/renksiz (dolayısıyla track zemin rengiyle
GRİ) kalıyordu — yaşanmış hata, kullanıcı ekran görüntüsüyle bildirdi.
`segmentKind(interval)` bu deseni tek yerde toplar (`'uretim'`/`'mola'`/
`'durus'` döner); ham `interval.kind`'ı className interpolasyonuna ya da
`kind === 'durus'` exact-match kontrolüne (ör. `ReasonSegments`'in aktif
duruş şartı) sokan her yeni kod bunu KULLANMALI.

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

**Ürün satırına dokununca operatördekinin AYNISI detay açılır.** Kullanıcı
isteği: "müdür ekranında ürünün üstüne bastığımda da tüm detayları
görebileyim, operatör ekranındaki gibi ambalaj firesi, ürün bilgileri."
Satır (`.plan-row`) artık `role="button"` + `tabIndex` ile tıklanabilir
(`.plan-stack-hint` ile "Ürün detayı için satıra dokun" ipucu), açılan
sayfa `ProductHistory`'nin detayıyla BİREBİR aynı gövdeyi kullanır.

- `src/components/ProductDetail.jsx` — ortak, salt-okunur detay GÖVDESİ.
  Bilerek kendi `sheet-overlay`/`sheet-panel` kabuğunu TAŞIMAZ: iki
  çağıranın kabuğu farklı (operatörde aynı panelin içinde "Düzenle" ile
  forma geçiliyor, müdürde sadece "Kapat"). Kabuğu paylaştırmaya
  kalkışmayın — düzenleme formu operatöre özel kalmalı, müdür panosunda
  hiçbir yazma çağrısı yok (bkz. "Geçmiş vardiyalar" bölümündeki
  `readOnly` ayrımı).
- `timeline.js#runSummaries(runs, events, pallets, nowMs, { frozen })` —
  ürün başına süre/palet/paket/gerçek hız/açık kalma/hız verimi/ambalaj
  firesi/palet kayıtları. Eskiden bu hesap `ProductHistory`'nin içindeki
  bir `useMemo`'ydu; iki ekranın aynı rakamı ayrı ayrı hesaplaması
  (ve zamanla ayrışması) riskine karşı `timeline.js`'e taşındı — kod
  konumu haritasındaki "türetilmiş metrik bileşene değil buraya" kuralı.

**Duvar ölçeği ortak, tek yerde:** `Sheet.css`'in temel rem ölçeği
1920px'lik duvar ekranında devasa rakamların yanında minicik kalıyor
(bkz. `wall` prop'unun hikâyesi). Bu yüzden müdür panosunun detay
sayfası `sheet-overlay--wall` sınıfını taşır. Ölçek kuralları artık
`Sheet.css`'te, `.history-detail--wall` ile TEK bir selector listesinde
paylaşılıyor (önceden yalnız `ShiftHistoryDetail.css`'teydi) — iki
yüzey aynı ekranda açıldığı için ayrı ayrı büyütülüp birbirinden
kayması anlamsızdı. Duvar varyantında `.sheet-actions` ayrıca
YAPIŞKANDIR (`position: sticky`): büyük punto + uzun palet listesi
paneli 92dvh'yi aşınca "Kapat" ekranın altında kalıyordu. Telefon
yüzeyleri bu sınıfların altında olmadığı için hiç etkilenmez.

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
- **`ShiftClockBar` donmuş özette de var — yaşanmış eksiklik, düzeltildi.**
  İlk sürümde `ShiftClockBar` sadece canlı ekranlarda (ManagerDashboard,
  OperatorPanel) render ediliyordu; `ShiftHistoryDetail` sadece metinsel
  "Vardiya bölümleri" listesini gösteriyordu — kullanıcı geçmiş bir
  vardiyaya bakınca saat eksenli çubuğun HİÇ görünmediğini fark etti
  ("bugün yaptığımız zaman çubuğu geçmiş vardiyalarda gözükmüyor").
  Düzeltme: `ShiftHistoryDetail` de aynı bileşeni, aynı üç canlı ekran
  gibi kullanır — `shiftEndMs` BİLEREK verilmez (vardiya kapandığı için
  "planlanan bitişe göre gelecek/taralı kısım" kavramı burada anlamsız,
  eksen doğrudan `nowMs = shift.ended_at`'e kadar uzanır, "Şimdi" çizgisi
  hiç çıkmaz). `onEdit` sadece `readOnly` değilken verilir (operatör
  ekranı) — `logFocusEventId` state'i + `EventLog`'un `focusEventId`
  prop'u üstünden OperatorPanel'deki AYNI "balonda Düzenle → olay
  geçmişinde o kayda odaklan" akışı burada da çalışır.
- **`wall` prop'u — sadece müdür panosunda büyük/canlı tipografi.**
  Kullanıcı geçmiş vardiyaya bakınca canlı ekranın "şık/dinamik" hissinin
  kaybolduğunu bildirdi ("yazılar küçük"). `ShiftHistoryDetail` kendi
  taşınabilir rem ölçeğini KORUYOR (telefonda da gömülüyor — bkz. dosya
  başındaki not) ama `ManagerDashboard` artık `wall` prop'unu `true`
  geçiriyor; bu, kök `div`'e `history-detail--wall` ekliyor ve SADECE bu
  sınıfın altında başlık/oranlar/rakamlar/alt başlıklar
  `ManagerDashboard.css`'in vw/clamp aileleriyle (`.zone-title`,
  `.now-elapsed` vb. ile aynı değerler) büyütülüyor — temel rem
  değerleri değişmedi, `OperatorPanel`'in geçmiş vardiya görünümü
  (`wall` hiç geçirilmiyor) bundan hiç etkilenmiyor. Kullanıcı bilinçli
  olarak "sadece müdür panosunda büyüsün" seçeneğini seçti (telefon/duvar
  tek ölçek alternatifine karşı).
  **Yaşanmış hata — rakam etiketin üstüne bindi:** `.history-detail-ratio`
  (ve `-figure`)'ın temel `gap: 0.15rem`'i küçük (1.5rem) rakamlar için
  yeterliydi ama wall varyantının 5.5rem'e kadar çıkan rakamıyla
  birlikte `index.css`'teki global `line-height: 145%` yüzünden rakamın
  görünmez satır kutusu alttaki etiketin ÜSTÜNE biniyordu ("%0" ile
  "AÇIK KALMA" üst üste bindi, ekran görüntüsüyle bildirildi).
  `ManagerDashboard`'ın kendi devasa rakamları (`.now-elapsed` vb.) aynı
  sebeple `line-height`'ı hep AÇIKÇA sıkıştırır — `history-detail--wall`
  altında `.history-detail-ratio-value`/`-figure dd` için de aynı
  prensip uygulandı (`line-height: 1` / `1.15`), `gap` de büyütüldü.
  **Kapsam genişletildi — `ProductHistory` da dahil:** ilk sürümde
  `wall` sadece `ShiftHistoryDetail`'in KENDİ başlık/oran/rakamlarını
  büyütüyordu; içine gömülü `ProductHistory` (ürün kartları + detay
  sayfası) ve onun paylaştığı `Sheet.css` hiç büyümüyordu — müdür
  panosunda bir ürün kartına dokununca aniden küçük/sıkışık bir sayfa
  açılıyordu. Ekstra bir JS prop gerekmedi: `ProductHistory` zaten
  `.history-detail--wall`'ın DOM içinde render edildiği için (position:
  fixed sheet'ler dahil, CSS cascade DOM konumuna bakar) saf descendant
  selector'larla (`.history-detail--wall .history-card`,
  `.sheet-title`, `.sheet-stat-value` vb.) büyütüldü — `ProductHistory.css`/
  `Sheet.css`'in kendisi hiç değişmedi, diğer ekranlar (`SpeedSheet`/
  `RunEndSheet`, OperatorPanel'in canlı `ProductHistory`'si) etkilenmedi.

## Personel listesi: GH VARDİYA'dan tek yönlü kopya, FK yok

Operatör adı serbest metin yüzünden aynı kişi farklı yazımlarla
("Kadir Gülerer" / "kadir gulerer") çoğalıyordu. Çözüm: GH VARDİYA
(ayrı proje, vardiya/personel planlama uygulaması) veritabanındaki
personel listesinin MES'in kendi Supabase'ine TEK YÖNLÜ kopyası —
`personnel` tablosu (`setup_personnel.sql`), veri `seed_personnel.sql`
ile yüklenir (GH VARDİYA'dan CSV export ya da ekran görüntüsü →
insert'ler üretilir; ilk seed PFM-4/10/11 Dublex vardiya çizelgesinin
ekran görüntüsünden çıkarıldı, GH kodu → `sicil_no`, rol → `departman`.
Listeyi güncellemek = yeni bir döküm ile seed'i yeniden üretip
çalıştırmak). İki veritabanı arasında canlı bağlantı BİLİNÇLİ olarak
yok — kapsam dışı.

**`shifts.operator` TEXT olarak kaldı, FK eklenmedi.** Seçim alanı bu
metni listeden sadece DOLDURUR: listeden seçilse de elle yazılsa da aynı
kolona aynı türde yazılır. Bu sayede (a) mevcut tablolara dokunulmadı,
(b) eski kayıtlardaki serbest adlar aynen geçerli, (c) fallback bedava.
Sıkı ilişki ("bu paleti kim girdi") ileride auth ile birlikte gelir.

**UI deseni dropdown DEĞİL, StopNoteSheet'in çip deseni:**
`OperatorNameField` (`src/components/OperatorNameField.jsx`) — normal
yazılabilir input + altında yazdıkça süzülen personel çipleri (Türkçe
duyarsız `toLocaleLowerCase('tr')` substring). Liste boşsa/yüklenemezse
çip bölgesi hiç render edilmez, alan bugünkü düz haliyle çalışır —
**operatör hiçbir durumda seçime zorlanmaz ya da kilitlenmez.** Veri
`usePersonnel` hook'undan (`src/hooks/usePersonnel.js`): hata bilinçli
yutulur (boş liste = fallback), realtime yok (statik kopya). Alan,
gömüldüğü yüzeyin input stilini `inputClassName` ile alır
(`wizard-input`/`sheet-input`). Üç kullanım yeri: `ShiftWizard` vardiya
adımı, `OperatorPanel` operatör sheet'i, `ShiftHistoryDetail` operatör
sheet'i (`readOnly` iken liste hiç çekilmez). Operatör sheet'lerindeki
eski `autoFocus` bilinçli kaldırıldı: mobilde klavye açılınca çipler
görünmüyordu, önce çipten seçme şansı kalsın diye.

Bu iş `feature/personel-entegrasyon` dalında geliştirildi, sonra
`feature/tasarim-v2` üstüne kuruldu; ikisi de artık production dalına
(`claude/detailed-spec-questions-b7n4w4`, Vercel Production Branch)
merge edildi.

**Otomatik ekip ataması (`vardiya_no`, `add_personnel_vardiya.sql`):**
kaynak çizelgede her kişinin vardiyası (1/2/3) da vardı; bu da kopyalandı.
Sahada vardiya atamaları SABİT (rotasyon yok — kullanıcı doğruladı).
Davranış üç kural:
- `ShiftWizard` vardiya adımında seçili hat+vardiyanın ekibi
  "Bu vardiyanın ekibi" etiketiyle çip olarak listelenir (Paketleme
  Operatörü önce ve `.opname-chip--operator` ile vurgulu); ekip listesi
  alan doluyken de görünür kalır (yalnızca yazarak ararken süzgece döner)
  ve ekipte 6'lık kesme uygulanmaz.
- **Ön-doldurma:** hat+vardiyada TAM BİR Paketleme Operatörü varsa
  (PFM-11 böyle) alan onunla kendiliğinden dolar; İKİ operatör varsa
  (PFM-4/10 böyle) alan boş bırakılır, iki operatör çipi üstte — sistem
  iki kişi arasında tahmin yürütmez, tek dokunuş operatöre kalır.
- **Elle yazılan ad ASLA ezilmez:** ön-doldurma yalnızca alan boşken ya
  da hâlâ önceki otomatik değeri taşırken yazar (`autoOperatorRef`,
  `ShiftWizard.jsx`). Vardiya değişince eski vardiyanın otomatik adı
  temizlenir/güncellenir, operatörün kendi yazdığı isim olduğu gibi kalır.
`OperatorNameField`'ın `vardiyaNo` prop'u opsiyoneldir: operatör
sheet'leri `shift.vardiya` geçirir (ekip-önce sıralama), prop verilmezse
davranış eski düz alfabetik halidir.

**Liste hatta göre filtrelenir.** GH VARDİYA'nın kaynak tablosu kişileri
zaten hatlara göre gruplamıştı (4-PFM Dublex / 10-PFM Dublex /
11-PFM Dublex); ilk sürümde bu bilgi atlanmış, tüm hatlarda aynı 56
kişilik ortak havuz gösteriliyordu (yaşanmış karışıklık: PFM-4 ekranında
PFM-10'a kayıtlı biri de çıkıyordu). `personnel.line_code` kolonu
(`add_personnel_hat.sql` — `setup_personnel.sql` zaten çalıştırılmıştı,
o yüzden ayrı bir ALTER dosyası, projenin `add_*.sql` deseniyle tutarlı)
ve `usePersonnel(lineCode, enabled)` artık `line_code = lineCode` VEYA
`line_code is null` filtresiyle çalışıyor. `is null` bilinçli bir kaçış
kapısı: hangi hatta çalıştığı belirsiz/hatlar arası ortak bir kişi
girilirse (satırında `line_code` boş bırakılırsa) o kişi HER hatta
görünmeye devam eder — CLAUDE.md'nin "eksik alan sonradan doldurulur,
uydurma kayıttan iyidir" ilkesiyle tutarlı.

## Müdür panosu görüntüleme kaydı — arka planda yazılıyor, gösterimi kaldırıldı

Kullanıcı isteği: müdür panosunun ne zaman/ne kadar açıldığını görmek
istedi. Kimin baktığı BİLEREK tutulmuyor — login yok, isim de
sorulmuyor (kullanıcı "kim baktı diye bişey yapmayalım" dedi, teklif
edilen isim alanı reddedildi). `manager_dashboard_visits`
(`add_manager_visits.sql`) sadece `line_code` + `opened_at` +
`last_seen_at` tutar.

**Kayıt akışı (`ManagerDashboard.jsx`):** panoya girildiğinde bir satır
eklenir (`opened_at = now()`), açık kaldığı sürece 20 saniyede bir
`last_seen_at` güncellenir (heartbeat) — sekme aniden kapanırsa
(`beforeunload` mobilde güvenilir ateşlenmiyor) süre son heartbeat'te
kalır, tam kapanış anı değil ama yeterince yakın bir tahmin.
Unmount'ta da best-effort bir son güncelleme denenir.

**Arka plandaki sekme sorunu (yaşanmış durum):** sekme arka plana
düşünce mobil tarayıcılar `setInterval`'i büyük ölçüde durdurur/
yavaşlatır (pil tasarrufu) — 20 saniyelik heartbeat arka planda hiç
ateşlenmeyebilir, kullanıcı "sekme dakikalarca açık ama kayıt '1 dk
altı' gösteriyor" diye bildirdi. Çözüm tam değil (arka planda JS
çalıştırmayı zorlayamayız) ama `visibilitychange`/`focus` ile sekme
tekrar öne geldiği ANDA bir ping atılır — süre panoya her dönüşte
güncel tutulur, sadece saf arka plan süresi sayılmaz (zaten kimse
bakmıyordu demektir, dürüst bir sınırlama).

**Bu tek başına yetmedi — ikinci, daha derin bir sorun (yaşanmış
durum):** kullanıcı `visibilitychange` düzeltmesinden sonra bile
operatör ekranında art arda 4-5 ayrı "1 dk altı" kaydı gördü (hepsi
birbirine yakın saatlerde). Kök sebep: Android'de arka plana düşen bir
sekme genelde SADECE yavaşlatılmıyor, bellek boşaltmak için tamamen
KAPATILIYOR — sekme tekrar öne gelince "devam" değil SIFIRDAN yeniden
yükleniyor, React yeniden mount oluyor, ziyaret efekti en baştan
çalışıp alakasız yeni bir satır açıyor. Çözüm: ziyaret kimliği artık
`sessionStorage`'a da yazılıyor (`mes_manager_visit` anahtarı) —
sessionStorage sayfa yeniden yüklense de AYNI sekme için kalıcı kalır
(gerçek kapatma/yeni sekmede sıfırlanır). Mount'ta önce sessionStorage
kontrol edilir: aynı hat için `VISIT_RESUME_WINDOW_MS` (30 dk) içinde
bir kayıt varsa YENİ satır açılmaz, o kaydın `last_seen_at`'i
güncellenir — "aynı bakışın devamı" sayılır. 30 dakikalık pencere,
unutulmuş çok eski bir kaydın sonsuza dek büyümesini engeller.

**Gösterim kaldırıldı (yaşanmış karar):** İlk sürümde bu veri SADECE
operatör ekranında (`OperatorPanel.jsx`, "Müdür panosu görüntülemeleri"
satırı, `useDashboardVisits` hook'u ile son 10 kayıt) gösteriliyordu —
müdür panosunun kendisi hiç okumuyordu/göstermiyordu, ManagerDashboard
sadece YAZIYORDU. Kullanıcı sonradan bu bölümü operatör ekranından
kaldırılmasını istedi; `useDashboardVisits.js` hook'u ve
`.operator-visits*` CSS'i de bununla birlikte silindi (başka hiçbir
yerden kullanılmıyordu). **`ManagerDashboard.jsx`'in yazma tarafı
BİLEREK dokunulmadı** — `manager_dashboard_visits` tablosuna kayıt
(`opened_at`/`last_seen_at` heartbeat) hâlâ oluyor, sadece hiçbir yerde
gösterilmiyor. Görüntüleme geri istenirse veri zaten orada duruyor,
sadece yeni bir okuma yüzeyi eklemek yeterli.

## Müdür panosunda liste kesmeleri kaldırıldı

Eskiden "Son olaylar" `RECENT_EVENTS_LIMIT = 8` ile, "Duruş sebepleri"
`downtimeByNote`'un varsayılan `limit = 5`'i ile kesiliyordu (o zaman
sayfa hiç kaydırılamıyordu, sabit yükseklik vardı). Sayfa artık
kaydırılabilir olduğu için bu keyfi kesmeler kaldırıldı —
`downtimeByNote`'un varsayılanı artık `Infinity`, çağıran yer limit
vermedikçe hiçbir sebep gizlenmiyor. Operatörün "Olay geçmişi"nde gördüğü
sayıyla aynı. `ShiftHistoryDetail` de aynı ilkeyle tam liste gösterir.

## Ürün geçmişi ve ürün değiştirme

Aynı vardiyada birden çok ürün üretilebilir.

**"Ürünü bitir" ve "Yeni ürün" AYRI iki iştir — birbirine bağlanmamalı.**
Eskiden tek bir "Ürün değiştir" butonu vardı ve akış `RunEndSheet` →
`ShiftWizard mode="product"` diye zincirlenmişti; yani ürünü bitirmenin
TEK yolu yeni bir ürüne geçmekti. Sahada bu karşılığı olmayan bir
zorlamaydı: "ürün bitti ama şimdilik yenisine geçmiyorum" çok normal
(vardiya sonu, uzun temizlik, ürün beklemesi). İkisi ayrıldı:

- **Ürünü bitir** (aktif ürün varken): `RunEndSheet` (bitiş numaratörleri
  + fire önizleme, aktif `product_run`'a kaydedilir) → `TimeSheet` ("Ürün
  ne zaman bitti?") → `product_run_id`'si **açıkça null** olan bir `durus`
  olayı (`note: 'Ürün bitişi'`, otomatik — "Moladan dönüş" ile aynı
  desen). Aktif ürün kalmaz, ana buton "ÜRÜN BAŞLAT"a döner.
- **Yeni ürün** (her zaman): doğrudan `ShiftWizard mode="product"` →
  `TimeSheet` → yeni `product_run` satırı + o run'a işaret eden `uretim`
  olayı. Aktif ürün varken basılırsa eski ürün örtük olarak orada biter
  (A→B davranışı korundu).

**`timeline.js#aktifUrun` bu ayrımın temeli:** aktif ürün, son olayın
işaret ettiği üründür; son olayın `product_run_id`'si null ise aktif ürün
YOKTUR. Eskiden burada koşulsuz bir `runs[runs.length - 1]` yedeği vardı,
o yüzden ürün bitirilse bile son ürün "aktif" görünüyordu. Yedek artık
yalnızca hiç olay yokken devrede. `OperatorPanel` ve `ManagerDashboard`
ikisi de bu fonksiyonu kullanır — ayrı ayrı hesaplamayın.

**`RunEndSheet` operatörü ASLA kilitlemez.** Kaydet butonu eskiden
başlangıç numaratörleri yoksa ya da bitişler boşsa devre dışıydı; üstteki
metin "yine de kaydedebilirsin" derken buton kapalıydı (çelişki) ve
"Ürünü bitir" tek kapatma yolu olduğu için ürün hiç kapatılamıyordu.
Artık eksik alanlar `null` kaydedilir, fire hesabı atlanır, bilgi
sonradan ürün geçmişinden doldurulur.

Eski ürüne dönmek istenirse (henüz UI'da yok, şema destekliyor) aynı
prensip: eski `product_run_id`'siyle yeni bir olay.

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

## Andon tasarım sistemi — v2 "Porselen Andon"

`src/styles/andon.css` — ortak tasarım dili. `feature/tasarim-v2`'de
koyu çelik tema açık porselene çevrildi, sonra production dalına
(`claude/detailed-spec-questions-b7n4w4`) merge edildi — artık canlı
tema bu. Hikâye: ilk sürümün iki malzemesi (çelik + baskısız film)
TERSİNE döndü — film beyazı artık zemin, çeliğin yeşilimsi karası artık
mürekkep. Sıcak "krem" değil; gıda sahasının hijyen beyazı, hafif
yeşilimsi porselen.

İmza öğesi korunup tersine döndü: **ekranın kendisi andon lambasıdır.**
Koyu temada sol kenardaki dikey raydı; şimdi ekranın EN ÜSTÜNDE tam
genişlikte dilimli bir **lamba bandı** (aynı `.andon-rail`, kabuklar
`flex-direction: column` olduğu için yatay) + ekranın üç kenarını saran
**durum çerçevesi** (kabuk `border`'ı, üst kenarı bandın kendisi) var —
makinelerin boyalı emniyet kenarı gibi tek bir durum halkası. Sayfa
geneli durum yıkaması devam ediyor. Duruş uzadıkça bandın nabzı
ısrarlanır (`--urgency`, 30 dk'da tam yoğunluk), `prefers-reduced-motion`
altında sabit kontrasta düşer.

**Yazı tipi rolleri ölçüme dayalı, keyfi değil (v2'de DEĞİŞMEDİ):**
- `.tnum` (IBM Plex Sans) → **tüm sayılar**. Rakamları sabit 600 birim
  genişlikte, saniyelik sayaçlar zıplamaz.
- `.plate` (Saira Condensed) → **sadece büyük harf etiketler**. Bu
  fontun rakamları orantılı (299-489 birim arası) — sayaçta KULLANMAYIN.

**Palet — değişken ADLARI eski, ANLAMLARI çevrildi** (~3.000 satır
bileşen CSS'i bu adlara yazılmıştı; adları değil değerleri çevirmek tüm
sistemi tek noktadan döndürdü): `--steel-900..600` artık porselen
tonları (zemin → kenarlık), `--film` artık mürekkep (metin). Üç yeni
kavram:
- `--ink` — sinyal renkli yüzeydeki metin HER ZAMAN koyu mürekkep
  (güvenlik levhası dili), tema ne olursa olsun sabit.
- `--signal-*-text` / `--status-text` — parlak lamba renkleri açık
  zeminde METİN olarak okunmaz; yazıya dönüşen her sinyal bu derin
  varyantları kullanır (`color: var(--status)` görürseniz v2'de hata —
  metinse `--status-text` olmalı).
- Dolgulu = basılabilir grameri açık temada "beyaz kart + saç teli
  kenar + yumuşak gölge + radius" ile konuşur (`--shadow-soft`).
Tailwind slate/mavi varsayılanına ya da sıcak krem/serif kombinasyonuna
dönmeyin, ikisi de bilinçli olarak reddedildi.

**Veri görselleştirme (bu dalın ikinci turu — "sadece renk değişmiş"
geri bildirimi üzerine eklendi):** Kullanıcı ilk turdan sonra "açık
temaya çevirmekten başka manyak bir şey görmedim" dedi — haklıydı, ilk
tur sadece palet dönüşümüydü. Bu turda gerçek veri görselleştirmeleri
eklendi, `dataviz` skill'i (`node .../scripts/validate_palette.js`)
kullanılarak:
- `src/components/RadialGauge.jsx` — tek değerli dairesel gösterge
  (SVG halka + `.tnum` merkez etiket). Müdür panosunda açık kalma/hız
  verimi, operatör panelinde ürün planı ilerlemesi. Renk andon durum
  paletinden (`--signal-*-text`, iyi/orta/kötü) — kategorik değil,
  durum. Tek değer olduğu için lejant gerekmiyor (dataviz kuralı).
- `src/components/ShiftClockBar.jsx` — müdür panosunda "Duruş
  sebepleri"nin hemen üstünde, vardiyanın TAMAMINI SAATE bağlı (07:00 →
  planlanan bitiş 15:00 gibi) gösteren yatay çubuk. İlk sürümü
  (`ShiftTimelineBar.jsx`, silindi) segment genişliklerini "şimdiye
  kadar geçen süre"ye oranlıyordu — vardiya yeni başlamışken tüm çubuk
  doluymuş gibi görünüyordu, saatle ilişki kurulamıyordu. `ShiftClockBar`
  genişlikleri vardiyanın TAM planlanan süresine oranlar: henüz
  gelmemiş kısım taralı zemin olarak görünür, dikey "ŞİMDİ" çizgisi
  nerede olunduğunu gösterir (vardiya uzarsa — `nowMs` planlanan bitişi
  geçtiyse — eksen "şimdi"ye kadar uzar, gelecek hiç gösterilmez).
  Kullanıcı isteği üzerine metin etiketleri bilerek çubuğun ÜSTÜNDE
  değil (renk zaten durumu anlatıyor); sebep/ürün adı + dakika cinsinden
  süre sadece bir segmente DOKUNUNCA (hover değil — sahada dokunmatik
  ekran/duvar ekranı, `tap` state `activeId` ile) beliren bir balonda
  gösterilir. Palet doğrulaması `ShiftTimelineBar`'daki gibi aynı
  gerekçeyle: segment dolgusu ham sinyal rengiyle, METİN/etiketler
  `--signal-*-text` ile; 3 sabit durum + her zaman görünen lejant + tıklanan
  balondaki metin etiketiyle CVD ayrımı "secondary encoding" şartıyla
  kabul edilebilir.
  **CSS tuzağı (yaşanmış hata):** balon (`.clockbar-tip`) `.clockbar-timeline`
  içinde `bottom: 100%` ile üstte konumlanıyordu; konteynerin
  `padding-top`'unu artırmak balona daha fazla boşluk AÇMADI, çünkü
  `bottom: 100%` bir absolute elemanı konumlanma bloğunun `padding-top`'tan
  BAĞIMSIZ üst kenarına (y=0) sabitler. Düzeltme: `.clockbar-timeline`'a
  `--tip-offset` custom property'si (balonun oturacağı boşluğun tek
  kaynağı), balon `top: calc(var(--tip-offset) - 0.5rem)` +
  `transform: translate(-50%, -100%)` ile konumlanıyor — "şimdi" çizgisi
  de aynı değişkeni kullanır, ikisi otomatik senkron kalır.
  **Önceki/sonraki oku (`.clockbar-nav-row`/`.clockbar-nav-button`):**
  çok kısa segmentler (birkaç dakikalık duruş/mola) duvar ekranında/
  telefonda parmakla tam isabet ettirmesi zor — kullanıcı isteği üzerine
  çubuğun İKİ YANINA nötr (andon sinyal rengi taşımayan) ok butonu
  eklendi, `intervals` dizisindeki (zaten kronolojik) sırayı `activeId`
  üstünden adım adım gezdiriyor. Hiçbir segment seçili değilken
  "sonraki" ilk segmentten, "önceki" son segmentten başlar; her iki uçta
  kendi yönündeki buton devre dışı kalır (`prevDisabled`/`nextDisabled`).
  Segmente doğrudan dokunma davranışı DEĞİŞMEDİ, oklar ek bir yol.
  **Eksen etiketi çakışması (yaşanmış hata):** vardiya tam saatte
  bitmiyorsa (ör. planlanan 15:00 ama gerçek bitiş 15:05) `hourTicks`'e
  hem tam saat işareti hem gerçek bitiş ekleniyordu — ikisi birbirine çok
  yakın düşünce metinleri üst üste binip okunaksız oluyordu ("15:00" ve
  "15:05" çakışıp "1510005" gibi görünüyordu, ekran görüntüsüyle
  bildirildi). Düzeltme: son iki işaret arası `totalSpan`'ın %3.5'inden
  yakınsa aradaki tam saat İŞARETİNİN METNİ gizlenir (`hideTickIndex`),
  sadece gerçek bitiş gösterilir — ızgara çizgileri etkilenmez.
- **"Saatlik üretim (paket)" grafiği KALDIRILDI.** Bir süre
  `ProductionBars.jsx` + `timeline.js#hourlyPaket` ile müdür panosunda
  saatlik paket kovaları çizilmişti. Kullanıcı sahada bakınca "bu bölme
  ne işe yarıyor" dedi ve kaldırılmasını istedi: kova sınırı paletin
  ÇIKTIĞI ana bağlı, üretim ise sürekli — bir palet 09:58'de de 10:02'de
  de çıkabildiği için çubuklar saatler arasında zıplıyor, gerçek bir
  tempo bilgisi vermiyordu. Aynı soruyu `ShiftClockBar` (saate bağlı,
  gerçek aralıklar) ve `hizVerimi` (hız düşüşünü doğrudan ölçen) zaten
  daha dürüst cevaplıyor. Bileşen, CSS'i, `hourlyPaket` ve testleri
  komple silindi — geri eklenecekse önce "bu, ClockBar'ın vermediği
  hangi bilgiyi veriyor" sorusu cevaplanmalı.

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
- `OperatorPanel` da benzer bir "sabit kabuk + içeride kayan bölge"
  tasarımı taşıyor (`.operator-shell` sabit yükseklik, sadece
  `.operator-readout` kendi içinde kayar — BAŞLAT/DURDUR hiç ekran
  dışına kaçmasın diye, bkz. dosyanın kendi yorumu) ama BAŞKA bir hata
  yaşandı: gerçek telefonda (mobil site modu) sayfa aşağı hiç kaymıyordu,
  "masaüstü sitesi" moduna geçilince sorun kayboluyordu. İlk denenen
  düzeltme (`100dvh` → `100svh`, adres çubuğunun canlı yeniden
  hesaplamasının kaydırma hareketini iptal ettiği varsayımıyla) sorunu
  ÇÖZMEDİ — kök sebep başka çıktı: `ShiftClockBar` eklenince sabit
  içerik (başlık + saat çubuğu + ikincil butonlar) küçük telefon
  ekranlarında `.operator-readout` boş olsa bile viewport'u aşabiliyordu;
  bu durumda `.operator-actions` (BAŞLAT/MOLA/+1 PALET) ekranın altından
  TAŞIP `overflow: hidden` tarafından kırpılıyor, hiçbir şekilde
  ERİŞİLEMEZ oluyordu — masaüstü modunda sayfa küçültülerek (zoom-out)
  gösterildiği için aynı içerik sığıyor, sorun hiç ortaya çıkmıyordu.
  İlk düzeltme (`.operator-shell`'in `overflow:hidden`'ını `overflow-y:
  auto` yapmak, `.operator-readout` KENDİ İÇİNDE de ayrıca `overflow-y:
  auto` kalmaya devam ederek) de YETERSİZ çıktı — iç içe iki BAĞIMSIZ
  kaydırma konteyneri (kabuk + readout) mobilde kararsız davrandı:
  kullanıcı aynı sayfanın aynı durumda bir seferinde `.operator-readout`
  içeriğinin (Duruş süresi/sebepleri, Bu ürün, Vardiya toplamı, Müdür
  panosu listesi) TAMAMEN KAYBOLDUĞUNU, bir sonraki yüklemede yerinde
  olduğunu gösteren iki ekran görüntüsü attı. Kesin düzeltme: TEK bir
  kaydırma alanına indirildi — `.operator-readout`'un kendi
  `overflow-y:auto`'su tamamen kaldırıldı, `.operator-shell` artık sabit
  `height` değil `min-height:100svh` (ManagerDashboard'un aynı sınıf
  soruna verdiği çözümle birebir aynı prensip). Sığdığında görünüm
  birebir aynı (BAŞLAT en altta, kaydırma gerekmez); sığmadığında SAYFA
  doğal olarak kayar. Bedel: BAŞLAT artık "hiçbir koşulda asla kaymaz"
  değil — ama bu, içeriğin bazen tamamen kaybolmasından kesinlikle iyidir.

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
- `src/components/ProductDetail.jsx` — ürün detayının salt-okunur ortak
  gövdesi; `ProductHistory` (operatör) ve `ManagerDashboard` (müdür)
  ikisi de bunu kullanır, kabuğu kendileri sarar.
- `src/components/Sheet.css` — SpeedSheet/RunEndSheet/ProductHistory'nin
  paylaştığı nötr alttan-açılan sayfa iskeleti (TimeSheet/StopNoteSheet
  kendi tonlarını taşıdığı için ayrı kaldı). Duvar ölçeği varyantları
  (`.history-detail--wall` / `.sheet-overlay--wall`) da burada.
- `src/components/LineSelect.jsx` + `src/hooks/useLineCode.js` — hat
  seçimi, cihaz başına `localStorage`'da.
- `src/lib/lines.js` — sahadaki hatların tek kaynağı (`LINE_CODES`).
- `src/components/OperatorNameField.jsx` + `src/hooks/usePersonnel.js` —
  operatör adı alanı: serbest metin + personel çipleri (bkz. "Personel
  listesi" bölümü).
- `src/hooks/useShiftList.js` + `src/hooks/useShiftById.js` — geçmiş
  vardiyalar veri katmanı (bkz. "Geçmiş vardiyalar" bölümü).
- `src/components/ShiftHistoryPicker.jsx` + `ShiftHistoryDetail.jsx` —
  geçmiş vardiya seçici ve donmuş özet; ManagerDashboard.css'in vw/clamp
  ölçeğini KULLANMAZ, kendi taşınabilir rem ölçeği var (telefonda da
  duvar ekranında da gömülüyor).

## Müdür sunumu (`sunum/`)

Müdüre önden gönderilmek üzere hazırlanmış 10 sayfalık tanıtım PDF'i ve
onu üreten düzenek. Ayrıntılar `sunum/README.md`'de. İki kalıcı karar:

- **Sunumda kod geçmez.** React/Supabase/şema anlatılmaz; müdürün gördüğü
  tek şey "şu an göremediğim ne varmış". En değerli slayt açık kalma ile
  hız verimi ayrımı (bkz. "Müdür panosu: iki oran" bölümü) — çoğu sahada
  "makine çalıştı mı" bilinir, "çalışırken ne kadar yavaş çalıştı"
  bilinmez.
- **Ekran görüntüleri örnek veriyle üretilir.** Bu oturumun canlı
  Supabase'e erişimi yok; `sunum/uretim/mock-supabase.js` gerçek
  istemcinin yerine `vite.config.js` alias'ıyla geçer, `src/` içindeki
  sayfa bileşenleri HİÇ DEĞİŞMEDEN gerçek kodla çalışır. Örnek veri
  (`sample-data.js`) sahadaki gerçek rakamlara yakın tutulur — parlak
  ama gerçekçi olmayan rakam uydurulmaz; düşük açık kalma oranı zaten
  sunumun argümanının kendisi. Playwright saati sabitler (`page.clock`)
  ve mock "şimdi"den sonraki kayıtları kırpar, böylece ekran her zaman o
  anın tutarlı halini gösterir. Tarayıcı saat dilimi
  `Europe/Istanbul`'a sabitlenmeli — `time.js` görüntülemede bunu
  sabitliyor ama container UTC, yoksa saatler 3 saat kayıyor (yaşanmış).

`pdf.cjs` her slaydı ölçer: içerik taşması ve sayfa numarasıyla üst üste
binme otomatik raporlanır (bu oturumda üst üste binen metin hataları
defalarca yaşandı; gözle bakmak yetmiyor).

**Öğretici tanıtım videosu (`gold-harvest-mes-tanitim.mp4`,
`uretim/tanitim.cjs`):** ~2:47'lik, uygulamayı GERÇEKTEN kullanan demo —
operatörün telefonu ve müdür panosu yan yana. Hiçbir kayıt önceden yok;
vardiya, ürün, olay ve paletler senaryo boyunca gerçek arayüze
tıklanarak oluşturuluyor. `HIZLI=1` ile kare üretmeden yalnızca senaryo
koşturulup seçici hataları ucuza yakalanır.

Kalıcı kurallar (hepsi yaşanmış hatadan):
- **Ekranlar iframe olmalı.** Bileşenleri doğrudan sahneye gömmek
  uygulamanın `vw`/`vh` ölçeğini 1920px'lik sahne penceresine bağlıyor,
  telefon kadrajında sayaç taşıyor. iframe'in kendi viewport'u var.
- **Mock deposu `localStorage`'da olmalı.** İki iframe = iki ayrı belge;
  ES modülü belge başına ayrı örneklendiği için operatörün açtığı
  vardiyayı müdür panosu HİÇ görmüyordu ("Açık vardiya yok"). Ortak
  depo + `storage` olayı, frame'ler arası realtime'ı da çözüyor.
- **`scrollIntoView` kullanılmaz.** Çerçeve sınırını aşıp ANA belgeyi de
  kaydırıyor; sahnenin üst şeridi (altyazı, saat, ilerleme) kadrajdan
  çıkıyordu. Kaydırma yalnızca frame'in kendi görünümünde yapılır.
- **Tıklama koordinatla değil `el.click()` ile.** iframe'ler `transform:
  scale` taşıyor; imleç sadece görsel, işlem her hâlükârda çalışır.
- **Mock, şema varsayılanlarını (`default now()`) doldurmalı.** Eksik
  `opened_at` yüzünden operatör paneli `new Date(undefined)` ile
  "Invalid time value" fırlatıp komple çöküyordu.
- **`?video=1`** geçiş/animasyonları kapatır; **`?sade=1`** telefon
  kadrajını sadeleştirir ama `.operator-secondary`'yi GİZLEMEZ ("Ürün
  değiştir" akışı oradan başlıyor). **`?hazir=1`** ise PDF görselleri
  için önceden dolu vardiyayı yükler (`hazir-vardiya.js`).
- **Altyazı ekrandaki durumla çelişmemeli** — anlatı `tanitim.cjs`
  içindeki `anlat(...)` çağrılarında.

Önceki 34 sn'lik hızlandırılmış sürüm (`gold-harvest-mes-vardiya.mp4`)
dosya olarak duruyor ama üreticisi kaldırıldı; öğretici sürüm onu
kapsıyor.

`playwright` ve `ffmpeg-static` bilinçli olarak `package.json`'a
eklenmedi (uygulamayla ilgileri yok, sadece bu klasör için):
`npm install --no-save playwright ffmpeg-static`. **Dikkat:** `--no-save`
ile kurulum yaparken tek komutta İKİSİNİ birden vermek gerekiyor; tek
başına kurmak, `package.json`'da kayıtlı olmayan diğerini
node_modules'dan düşürüyor (yaşanmış).

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
saatleri listesi, çoklu sebep desteği (StopNoteSheet çip birleştirme +
ReasonSegments zaman çubuğu), personel listesi entegrasyonu (hatta göre
filtre, otomatik ekip ataması/ön-doldurma), Porselen Andon v2 (açık
tema) ve gerçek veri görselleştirmeleri (dairesel göstergeler, vardiya
zaman şeridi), "Ürünü bitir" / "Yeni ürün" ayrımı, müdür panosunda
ürün satırına dokununca açılan tam ürün detayı (ortak `ProductDetail`).

**Yapılmadı:** eski ürüne geri dönüp üretime devam etme UI'ı (şema/`
runSpans` bunu zaten destekliyor, sadece "bu ürüne dön" butonu yok), not→kod
terfi arayüzü (`stop_reasons` tablosu şemada duruyor, kullanılmıyor).

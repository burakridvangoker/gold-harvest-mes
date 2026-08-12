-- Personel listesi verisi — GH VARDİYA'nın PFM-4/10/11 Dublex hatları
-- vardiya çizelgesinden (ekran görüntüsü) tek yönlü aktarım.
--
-- GH kodu -> sicil_no, rol (Paketleme Operatörü / Besleme Personeli /
-- Paketleme Personeli) -> departman, kaynak tablodaki hat grubu ->
-- line_code (src/lib/lines.js#LINE_CODES ile birebir), sütun grubu ->
-- vardiya_no (çizelgede her hat satırı üç sütun grubuydu: 1./2./3.
-- vardiya). Operatör adı alanı bu sayede seçili hattın seçili
-- vardiyasının ekibini öne çıkarır ve tek operatörlü vardiyada alanı
-- önceden doldurur (bkz. add_personnel_hat.sql, add_personnel_vardiya.sql).
--
-- Tek yönlü kopya olduğu için idempotent: her çalıştırmada tablo
-- sıfırlanıp yeniden doldurulur. Liste güncellenmek istendiğinde GH
-- VARDİYA'dan yeni bir döküm alınıp bu dosya yeniden üretilir.
--
-- ---------------------------------------------------------------------
-- 1. VARDİYA GÜNCELLEMESİ (yeni çizelge ekran görüntüsünden)
--
-- PFM-4/10/11'in 1. vardiya ekipleri yeni çizelgeyle değiştirildi.
-- 2. ve 3. vardiyalara BİLEREK dokunulmadı — kullanıcı yalnızca 1.
-- vardiyanın güncellenmesini istedi.
--
-- BİLİNEN TUTARSIZLIK: yeni 1. vardiya ekibindeki kişilerin çoğu 2.
-- vardiyada da kayıtlı görünüyor (ör. Arda Kanburoğlu hem PFM-4/1 hem
-- PFM-4/2; Aleyna Eş PFM-4/1 ve PFM-11/2; İzzet Bacak PFM-11/1 ve
-- PFM-4/2). Bu, ilk aktarımdaki sütun eşleşmesinin kaymış olabileceğine
-- işaret ediyor. 2. ve 3. vardiyaların yeni dökümü geldiğinde bu dosya
-- baştan üretilmeli ve kopyalar temizlenmeli.
-- ---------------------------------------------------------------------

delete from public.personnel;

insert into public.personnel (ad_soyad, departman, sicil_no, line_code, vardiya_no) values
  -- 4-PFM Dublex — 1. vardiya (yeni çizelge)
  ('Arda Kanburoğlu', 'Paketleme Operatörü', 'GH2737', 'PFM-4', 1),
  ('Ayhan Çağlar', 'Paketleme Operatörü', 'GH2505', 'PFM-4', 1),
  ('Fatma Gül Gülerer', 'Besleme Personeli', 'GH0346', 'PFM-4', 1),
  ('Kezban Sezer', 'Paketleme Personeli', 'GH1657', 'PFM-4', 1),
  ('Melike Yıldırım', 'Paketleme Personeli', 'GH3192', 'PFM-4', 1),
  ('Aleyna Eş', 'Paketleme Personeli', 'GH3063', 'PFM-4', 1),

  -- 4-PFM Dublex — 2. ve 3. vardiya (dokunulmadı)
  ('Arda Kanburoğlu', 'Paketleme Operatörü', 'GH2737', 'PFM-4', 2),
  ('Kadir Gülerer', 'Paketleme Operatörü', 'GH2935', 'PFM-4', 3),
  ('Ayhan Çağlar', 'Paketleme Operatörü', 'GH2505', 'PFM-4', 2),
  ('Mehmet Gökçe', 'Paketleme Operatörü', 'GH2990', 'PFM-4', 3),
  ('Fatma Gül Gülerer', 'Besleme Personeli', 'GH0346', 'PFM-4', 2),
  ('Aylin Tuna', 'Besleme Personeli', 'GH3176', 'PFM-4', 3),
  ('Kezban Sezer', 'Paketleme Personeli', 'GH1657', 'PFM-4', 2),
  ('Emel Kisecik', 'Paketleme Personeli', 'GH0911', 'PFM-4', 3),
  ('Melike Yıldırım', 'Paketleme Personeli', 'GH3192', 'PFM-4', 2),
  ('Nurgül Belyurt', 'Paketleme Personeli', 'GH2680', 'PFM-4', 3),
  ('İzzet Bacak', 'Paketleme Personeli', 'GH2217', 'PFM-4', 2),
  ('Serpil Özmen', 'Paketleme Personeli', 'GH3086', 'PFM-4', 3),

  -- 10-PFM Dublex — 1. vardiya (yeni çizelge)
  ('Özcan Acemoğlu', 'Paketleme Operatörü', 'GH1372', 'PFM-10', 1),
  ('Alperen Olçay', 'Paketleme Operatörü', 'GH3040', 'PFM-10', 1),
  ('Nilgün Tanrıver', 'Besleme Personeli', 'GH1852', 'PFM-10', 1),
  ('Fatma Yıldız', 'Paketleme Personeli', 'GH2878', 'PFM-10', 1),
  ('Rukiye Çeşme', 'Paketleme Personeli', 'GH2021', 'PFM-10', 1),
  ('Zeynep Çekiç', 'Paketleme Personeli', 'GH1843', 'PFM-10', 1),

  -- 10-PFM Dublex — 2. ve 3. vardiya (dokunulmadı)
  ('Özcan Acemoğlu', 'Paketleme Operatörü', 'GH1372', 'PFM-10', 2),
  ('Mehmet Bayram', 'Paketleme Operatörü', 'GH2855', 'PFM-10', 3),
  ('Alperen Olçay', 'Paketleme Operatörü', 'GH3040', 'PFM-10', 2),
  ('Yusuf Hanay-aday', 'Paketleme Operatörü', 'GH3136', 'PFM-10', 3),
  ('Nilgün Tanrıver', 'Besleme Personeli', 'GH1852', 'PFM-10', 2),
  ('Emin Gökcen', 'Besleme Personeli', 'GH3167', 'PFM-10', 3),
  ('Fatma Yıldız', 'Paketleme Personeli', 'GH2878', 'PFM-10', 2),
  ('Melisa Oral', 'Paketleme Personeli', 'GH2651', 'PFM-10', 3),
  ('Rukiye Çeşme', 'Paketleme Personeli', 'GH2021', 'PFM-10', 2),
  ('Şenay Doğan', 'Paketleme Personeli', 'GH0301', 'PFM-10', 3),
  ('Zeynep Çekiç', 'Paketleme Personeli', 'GH1843', 'PFM-10', 2),
  ('Gülizar Ali', 'Paketleme Personeli', 'GH1400', 'PFM-10', 3),
  ('Emine Nisa Çetintaş', 'Paketleme Personeli', 'GH3156', 'PFM-10', 3),

  -- 11-PFM Dublex — 1. vardiya (yeni çizelge)
  ('Emin Talha Gören', 'Paketleme Operatörü', 'GH2943', 'PFM-11', 1),
  ('Berkay Aygurlu', 'Besleme Personeli', 'GH3129', 'PFM-11', 1),
  ('Fatma Olum', 'Besleme Personeli', 'GH0659', 'PFM-11', 1),
  ('İzzet Bacak', 'Besleme Personeli', 'GH2217', 'PFM-11', 1),
  ('Şaziye Yapıcı', 'Paketleme Personeli', 'GH1405', 'PFM-11', 1),
  ('Elifgül Gültekin', 'Paketleme Personeli', 'GH3150', 'PFM-11', 1),

  -- 11-PFM Dublex — 2. ve 3. vardiya (dokunulmadı)
  ('Emin Talha Gören', 'Paketleme Operatörü', 'GH2943', 'PFM-11', 2),
  ('Furkan Saylağ', 'Paketleme Operatörü', 'GH1855', 'PFM-11', 3),
  ('Berkay Aygurlu', 'Besleme Personeli', 'GH3129', 'PFM-11', 2),
  ('Yusuf Arda Çakır', 'Besleme Personeli', 'GH3039', 'PFM-11', 3),
  ('Fatma Olum', 'Besleme Personeli', 'GH0659', 'PFM-11', 2),
  ('Kader Şahan', 'Besleme Personeli', 'GH2166', 'PFM-11', 3),
  ('Merve Zeynep Ateş', 'Paketleme Personeli', 'GH3178', 'PFM-11', 2),
  ('Medine Şimşek', 'Paketleme Personeli', 'GH2386', 'PFM-11', 3),
  ('Şaziye Yapıcı', 'Paketleme Personeli', 'GH1405', 'PFM-11', 2),
  ('Fadime Durin', 'Paketleme Personeli', 'GH2224', 'PFM-11', 3),
  ('Aleyna Eş', 'Paketleme Personeli', 'GH3063', 'PFM-11', 2),
  ('Gizem Keskin', 'Paketleme Personeli', 'GH2712', 'PFM-11', 3);

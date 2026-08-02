-- Personel listesi verisi — GH VARDİYA'nın PFM-4/10/11 Dublex hatları
-- vardiya çizelgesinden (ekran görüntüsü) tek seferlik aktarım.
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

delete from public.personnel;

insert into public.personnel (ad_soyad, departman, sicil_no, line_code, vardiya_no) values
  -- 4-PFM Dublex
  ('Levent Yıldız', 'Paketleme Operatörü', 'GH2082', 'PFM-4', 1),
  ('Arda Kanburoğlu', 'Paketleme Operatörü', 'GH2737', 'PFM-4', 2),
  ('Kadir Gülerer', 'Paketleme Operatörü', 'GH2935', 'PFM-4', 3),
  ('İsmail Yelek', 'Paketleme Operatörü', 'GH0077', 'PFM-4', 1),
  ('Ayhan Çağlar', 'Paketleme Operatörü', 'GH2505', 'PFM-4', 2),
  ('Mehmet Gökçe', 'Paketleme Operatörü', 'GH2990', 'PFM-4', 3),
  ('Keziban Şimşek', 'Besleme Personeli', 'GH2336', 'PFM-4', 1),
  ('Fatma Gül Gülerer', 'Besleme Personeli', 'GH0346', 'PFM-4', 2),
  ('Aylin Tuna', 'Besleme Personeli', 'GH3176', 'PFM-4', 3),
  ('Emine Kambur', 'Paketleme Personeli', 'GH0016', 'PFM-4', 1),
  ('Kezban Sezer', 'Paketleme Personeli', 'GH1657', 'PFM-4', 2),
  ('Emel Kisecik', 'Paketleme Personeli', 'GH0911', 'PFM-4', 3),
  ('Döndü Akkaya', 'Paketleme Personeli', 'GH2898', 'PFM-4', 1),
  ('Melike Yıldırım', 'Paketleme Personeli', 'GH3192', 'PFM-4', 2),
  ('Nurgül Belyurt', 'Paketleme Personeli', 'GH2680', 'PFM-4', 3),
  ('Efe Özyurt', 'Paketleme Personeli', 'GH2677', 'PFM-4', 1),
  ('İzzet Bacak', 'Paketleme Personeli', 'GH2217', 'PFM-4', 2),
  ('Serpil Özmen', 'Paketleme Personeli', 'GH3086', 'PFM-4', 3),

  -- 10-PFM Dublex
  ('Ahmet Emirhan Doğan', 'Paketleme Operatörü', 'GH1964', 'PFM-10', 1),
  ('Özcan Acemoğlu', 'Paketleme Operatörü', 'GH1372', 'PFM-10', 2),
  ('Mehmet Bayram', 'Paketleme Operatörü', 'GH2855', 'PFM-10', 3),
  ('Cihan Orak', 'Paketleme Operatörü', 'GH2940', 'PFM-10', 1),
  ('Alperen Olçay', 'Paketleme Operatörü', 'GH3040', 'PFM-10', 2),
  ('Yusuf Hanay-aday', 'Paketleme Operatörü', 'GH3136', 'PFM-10', 3),
  ('Emre Balcı', 'Besleme Personeli', 'GH2589', 'PFM-10', 1),
  ('Nilgün Tanrıver', 'Besleme Personeli', 'GH1852', 'PFM-10', 2),
  ('Emin Gökcen', 'Besleme Personeli', 'GH3167', 'PFM-10', 3),
  ('Gülsüm Boztepe', 'Paketleme Personeli', 'GH3033', 'PFM-10', 1),
  ('Fatma Yıldız', 'Paketleme Personeli', 'GH2878', 'PFM-10', 2),
  ('Melisa Oral', 'Paketleme Personeli', 'GH2651', 'PFM-10', 3),
  ('Hatice Uysal', 'Paketleme Personeli', 'GH0600', 'PFM-10', 1),
  ('Rukiye Çeşme', 'Paketleme Personeli', 'GH2021', 'PFM-10', 2),
  ('Şenay Doğan', 'Paketleme Personeli', 'GH0301', 'PFM-10', 3),
  ('Feyza Mertoğlu', 'Paketleme Personeli', 'GH1656', 'PFM-10', 1),
  ('Zeynep Çekiç', 'Paketleme Personeli', 'GH1843', 'PFM-10', 2),
  ('Gülizar Ali', 'Paketleme Personeli', 'GH1400', 'PFM-10', 3),
  ('Emine Nisa Çetintaş', 'Paketleme Personeli', 'GH3156', 'PFM-10', 3),

  -- 11-PFM Dublex
  ('Önder Altay', 'Paketleme Operatörü', 'GH2902', 'PFM-11', 1),
  ('Emin Talha Gören', 'Paketleme Operatörü', 'GH2943', 'PFM-11', 2),
  ('Furkan Saylağ', 'Paketleme Operatörü', 'GH1855', 'PFM-11', 3),
  ('Bayram Kolsuz', 'Besleme Personeli', 'GH2480', 'PFM-11', 1),
  ('Berkay Aygurlu', 'Besleme Personeli', 'GH3129', 'PFM-11', 2),
  ('Yusuf Arda Çakır', 'Besleme Personeli', 'GH3039', 'PFM-11', 3),
  ('Hamide Havva Uyar', 'Besleme Personeli', 'GH2492', 'PFM-11', 1),
  ('Fatma Olum', 'Besleme Personeli', 'GH0659', 'PFM-11', 2),
  ('Kader Şahan', 'Besleme Personeli', 'GH2166', 'PFM-11', 3),
  ('Burak Rıdvan Göker', 'Besleme Personeli', 'GH3151', 'PFM-11', 1),
  ('Mukaddes Solmaz', 'Paketleme Personeli', 'GH2926', 'PFM-11', 1),
  ('Merve Zeynep Ateş', 'Paketleme Personeli', 'GH3178', 'PFM-11', 2),
  ('Medine Şimşek', 'Paketleme Personeli', 'GH2386', 'PFM-11', 3),
  ('Beyzanur Çuhadar', 'Paketleme Personeli', 'GH3180', 'PFM-11', 1),
  ('Şaziye Yapıcı', 'Paketleme Personeli', 'GH1405', 'PFM-11', 2),
  ('Fadime Durin', 'Paketleme Personeli', 'GH2224', 'PFM-11', 3),
  ('İbrahim Samethan Çeşme', 'Paketleme Personeli', 'GH3139', 'PFM-11', 1),
  ('Aleyna Eş', 'Paketleme Personeli', 'GH3063', 'PFM-11', 2),
  ('Gizem Keskin', 'Paketleme Personeli', 'GH2712', 'PFM-11', 3);

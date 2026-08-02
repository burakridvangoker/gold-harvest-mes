-- Personel listesi verisi — GH VARDİYA'nın PFM-4/10/11 Dublex hatları
-- vardiya çizelgesinden (ekran görüntüsü) tek seferlik aktarım.
--
-- GH kodu -> sicil_no, rol (Paketleme Operatörü / Besleme Personeli /
-- Paketleme Personeli) -> departman, kaynak tablodaki hat grubu ->
-- line_code (src/lib/lines.js#LINE_CODES ile birebir: 'PFM-4' / 'PFM-10' /
-- 'PFM-11'). Operatör adı alanı bu sayede sadece seçili hattın kendi
-- personelini önerir (bkz. add_personnel_hat.sql).
--
-- Tek yönlü kopya olduğu için idempotent: her çalıştırmada tablo
-- sıfırlanıp yeniden doldurulur. Liste güncellenmek istendiğinde GH
-- VARDİYA'dan yeni bir döküm alınıp bu dosya yeniden üretilir.

delete from public.personnel;

insert into public.personnel (ad_soyad, departman, sicil_no, line_code) values
  -- 4-PFM Dublex
  ('Levent Yıldız', 'Paketleme Operatörü', 'GH2082', 'PFM-4'),
  ('Arda Kanburoğlu', 'Paketleme Operatörü', 'GH2737', 'PFM-4'),
  ('Kadir Gülerer', 'Paketleme Operatörü', 'GH2935', 'PFM-4'),
  ('İsmail Yelek', 'Paketleme Operatörü', 'GH0077', 'PFM-4'),
  ('Ayhan Çağlar', 'Paketleme Operatörü', 'GH2505', 'PFM-4'),
  ('Mehmet Gökçe', 'Paketleme Operatörü', 'GH2990', 'PFM-4'),
  ('Keziban Şimşek', 'Besleme Personeli', 'GH2336', 'PFM-4'),
  ('Fatma Gül Gülerer', 'Besleme Personeli', 'GH0346', 'PFM-4'),
  ('Aylin Tuna', 'Besleme Personeli', 'GH3176', 'PFM-4'),
  ('Emine Kambur', 'Paketleme Personeli', 'GH0016', 'PFM-4'),
  ('Kezban Sezer', 'Paketleme Personeli', 'GH1657', 'PFM-4'),
  ('Emel Kisecik', 'Paketleme Personeli', 'GH0911', 'PFM-4'),
  ('Döndü Akkaya', 'Paketleme Personeli', 'GH2898', 'PFM-4'),
  ('Melike Yıldırım', 'Paketleme Personeli', 'GH3192', 'PFM-4'),
  ('Nurgül Belyurt', 'Paketleme Personeli', 'GH2680', 'PFM-4'),
  ('Efe Özyurt', 'Paketleme Personeli', 'GH2677', 'PFM-4'),
  ('İzzet Bacak', 'Paketleme Personeli', 'GH2217', 'PFM-4'),
  ('Serpil Özmen', 'Paketleme Personeli', 'GH3086', 'PFM-4'),

  -- 10-PFM Dublex
  ('Ahmet Emirhan Doğan', 'Paketleme Operatörü', 'GH1964', 'PFM-10'),
  ('Özcan Acemoğlu', 'Paketleme Operatörü', 'GH1372', 'PFM-10'),
  ('Mehmet Bayram', 'Paketleme Operatörü', 'GH2855', 'PFM-10'),
  ('Cihan Orak', 'Paketleme Operatörü', 'GH2940', 'PFM-10'),
  ('Alperen Olçay', 'Paketleme Operatörü', 'GH3040', 'PFM-10'),
  ('Yusuf Hanay-aday', 'Paketleme Operatörü', 'GH3136', 'PFM-10'),
  ('Emre Balcı', 'Besleme Personeli', 'GH2589', 'PFM-10'),
  ('Nilgün Tanrıver', 'Besleme Personeli', 'GH1852', 'PFM-10'),
  ('Emin Gökcen', 'Besleme Personeli', 'GH3167', 'PFM-10'),
  ('Gülsüm Boztepe', 'Paketleme Personeli', 'GH3033', 'PFM-10'),
  ('Fatma Yıldız', 'Paketleme Personeli', 'GH2878', 'PFM-10'),
  ('Melisa Oral', 'Paketleme Personeli', 'GH2651', 'PFM-10'),
  ('Hatice Uysal', 'Paketleme Personeli', 'GH0600', 'PFM-10'),
  ('Rukiye Çeşme', 'Paketleme Personeli', 'GH2021', 'PFM-10'),
  ('Şenay Doğan', 'Paketleme Personeli', 'GH0301', 'PFM-10'),
  ('Feyza Mertoğlu', 'Paketleme Personeli', 'GH1656', 'PFM-10'),
  ('Zeynep Çekiç', 'Paketleme Personeli', 'GH1843', 'PFM-10'),
  ('Gülizar Ali', 'Paketleme Personeli', 'GH1400', 'PFM-10'),
  ('Emine Nisa Çetintaş', 'Paketleme Personeli', 'GH3156', 'PFM-10'),

  -- 11-PFM Dublex
  ('Önder Altay', 'Paketleme Operatörü', 'GH2902', 'PFM-11'),
  ('Emin Talha Gören', 'Paketleme Operatörü', 'GH2943', 'PFM-11'),
  ('Furkan Saylağ', 'Paketleme Operatörü', 'GH1855', 'PFM-11'),
  ('Bayram Kolsuz', 'Besleme Personeli', 'GH2480', 'PFM-11'),
  ('Berkay Aygurlu', 'Besleme Personeli', 'GH3129', 'PFM-11'),
  ('Yusuf Arda Çakır', 'Besleme Personeli', 'GH3039', 'PFM-11'),
  ('Hamide Havva Uyar', 'Besleme Personeli', 'GH2492', 'PFM-11'),
  ('Fatma Olum', 'Besleme Personeli', 'GH0659', 'PFM-11'),
  ('Kader Şahan', 'Besleme Personeli', 'GH2166', 'PFM-11'),
  ('Burak Rıdvan Göker', 'Besleme Personeli', 'GH3151', 'PFM-11'),
  ('Mukaddes Solmaz', 'Paketleme Personeli', 'GH2926', 'PFM-11'),
  ('Merve Zeynep Ateş', 'Paketleme Personeli', 'GH3178', 'PFM-11'),
  ('Medine Şimşek', 'Paketleme Personeli', 'GH2386', 'PFM-11'),
  ('Beyzanur Çuhadar', 'Paketleme Personeli', 'GH3180', 'PFM-11'),
  ('Şaziye Yapıcı', 'Paketleme Personeli', 'GH1405', 'PFM-11'),
  ('Fadime Durin', 'Paketleme Personeli', 'GH2224', 'PFM-11'),
  ('İbrahim Samethan Çeşme', 'Paketleme Personeli', 'GH3139', 'PFM-11'),
  ('Aleyna Eş', 'Paketleme Personeli', 'GH3063', 'PFM-11'),
  ('Gizem Keskin', 'Paketleme Personeli', 'GH2712', 'PFM-11');

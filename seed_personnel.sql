-- Personel listesi verisi — GH VARDİYA'nın PFM-4/10/11 Dublex hatları
-- vardiya çizelgesinden (ekran görüntüsü) tek seferlik aktarım.
--
-- GH kodu -> sicil_no, rol (Paketleme Operatörü / Besleme Personeli /
-- Paketleme Personeli) -> departman. Hangi hatta çalıştığı ayrıca
-- tutulmuyor — kişi hatlar arası geçebiliyor, MES'te operatör seçimi
-- zaten ayrı bir hat seçiminden (LineSelect) sonra yapılıyor.
--
-- Tek yönlü kopya olduğu için idempotent: her çalıştırmada tablo
-- sıfırlanıp yeniden doldurulur. Liste güncellenmek istendiğinde GH
-- VARDİYA'dan yeni bir döküm alınıp bu dosya yeniden üretilir.

delete from public.personnel;

insert into public.personnel (ad_soyad, departman, sicil_no) values
  -- 4-PFM Dublex
  ('Levent Yıldız', 'Paketleme Operatörü', 'GH2082'),
  ('Arda Kanburoğlu', 'Paketleme Operatörü', 'GH2737'),
  ('Kadir Gülerer', 'Paketleme Operatörü', 'GH2935'),
  ('İsmail Yelek', 'Paketleme Operatörü', 'GH0077'),
  ('Ayhan Çağlar', 'Paketleme Operatörü', 'GH2505'),
  ('Mehmet Gökçe', 'Paketleme Operatörü', 'GH2990'),
  ('Keziban Şimşek', 'Besleme Personeli', 'GH2336'),
  ('Fatma Gül Gülerer', 'Besleme Personeli', 'GH0346'),
  ('Aylin Tuna', 'Besleme Personeli', 'GH3176'),
  ('Emine Kambur', 'Paketleme Personeli', 'GH0016'),
  ('Kezban Sezer', 'Paketleme Personeli', 'GH1657'),
  ('Emel Kisecik', 'Paketleme Personeli', 'GH0911'),
  ('Döndü Akkaya', 'Paketleme Personeli', 'GH2898'),
  ('Melike Yıldırım', 'Paketleme Personeli', 'GH3192'),
  ('Nurgül Belyurt', 'Paketleme Personeli', 'GH2680'),
  ('Efe Özyurt', 'Paketleme Personeli', 'GH2677'),
  ('İzzet Bacak', 'Paketleme Personeli', 'GH2217'),
  ('Serpil Özmen', 'Paketleme Personeli', 'GH3086'),

  -- 10-PFM Dublex
  ('Ahmet Emirhan Doğan', 'Paketleme Operatörü', 'GH1964'),
  ('Özcan Acemoğlu', 'Paketleme Operatörü', 'GH1372'),
  ('Mehmet Bayram', 'Paketleme Operatörü', 'GH2855'),
  ('Cihan Orak', 'Paketleme Operatörü', 'GH2940'),
  ('Alperen Olçay', 'Paketleme Operatörü', 'GH3040'),
  ('Yusuf Hanay-aday', 'Paketleme Operatörü', 'GH3136'),
  ('Emre Balcı', 'Besleme Personeli', 'GH2589'),
  ('Nilgün Tanrıver', 'Besleme Personeli', 'GH1852'),
  ('Emin Gökcen', 'Besleme Personeli', 'GH3167'),
  ('Gülsüm Boztepe', 'Paketleme Personeli', 'GH3033'),
  ('Fatma Yıldız', 'Paketleme Personeli', 'GH2878'),
  ('Melisa Oral', 'Paketleme Personeli', 'GH2651'),
  ('Hatice Uysal', 'Paketleme Personeli', 'GH0600'),
  ('Rukiye Çeşme', 'Paketleme Personeli', 'GH2021'),
  ('Şenay Doğan', 'Paketleme Personeli', 'GH0301'),
  ('Feyza Mertoğlu', 'Paketleme Personeli', 'GH1656'),
  ('Zeynep Çekiç', 'Paketleme Personeli', 'GH1843'),
  ('Gülizar Ali', 'Paketleme Personeli', 'GH1400'),
  ('Emine Nisa Çetintaş', 'Paketleme Personeli', 'GH3156'),

  -- 11-PFM Dublex
  ('Önder Altay', 'Paketleme Operatörü', 'GH2902'),
  ('Emin Talha Gören', 'Paketleme Operatörü', 'GH2943'),
  ('Furkan Saylağ', 'Paketleme Operatörü', 'GH1855'),
  ('Bayram Kolsuz', 'Besleme Personeli', 'GH2480'),
  ('Berkay Aygurlu', 'Besleme Personeli', 'GH3129'),
  ('Yusuf Arda Çakır', 'Besleme Personeli', 'GH3039'),
  ('Hamide Havva Uyar', 'Besleme Personeli', 'GH2492'),
  ('Fatma Olum', 'Besleme Personeli', 'GH0659'),
  ('Kader Şahan', 'Besleme Personeli', 'GH2166'),
  ('Burak Rıdvan Göker', 'Besleme Personeli', 'GH3151'),
  ('Mukaddes Solmaz', 'Paketleme Personeli', 'GH2926'),
  ('Merve Zeynep Ateş', 'Paketleme Personeli', 'GH3178'),
  ('Medine Şimşek', 'Paketleme Personeli', 'GH2386'),
  ('Beyzanur Çuhadar', 'Paketleme Personeli', 'GH3180'),
  ('Şaziye Yapıcı', 'Paketleme Personeli', 'GH1405'),
  ('Fadime Durin', 'Paketleme Personeli', 'GH2224'),
  ('İbrahim Samethan Çeşme', 'Paketleme Personeli', 'GH3139'),
  ('Aleyna Eş', 'Paketleme Personeli', 'GH3063'),
  ('Gizem Keskin', 'Paketleme Personeli', 'GH2712');

-- Personel listesini hatta göre filtrelemek için: her kişi hangi hatta
-- kayıtlı. GH VARDİYA'daki vardiya çizelgesi zaten kişileri hatlara göre
-- gruplamıştı (4-PFM Dublex / 10-PFM Dublex / 11-PFM Dublex); bu bilgiyi
-- MES tarafında da kullanmak için ayrı bir kolon.
--
-- Nullable: line_code boş bırakılan bir kişi HER hatta görünür — hangi
-- hatta çalıştığı belirsiz ya da hatlar arası ortak kullanılan biri için
-- bilinçli bir kaçış kapısı (bkz. usePersonnel.js filtre mantığı).
--
-- setup_personnel.sql zaten çalıştırılmıştı; o dosyayı değiştirmek yerine
-- projedeki yerleşik desenle (add_mola.sql, add_run_details.sql) yeni bir
-- ALTER dosyası.

alter table public.personnel add column if not exists line_code text;

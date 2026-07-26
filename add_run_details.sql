-- Çoklu hat, çalışma hızı, ambalaj firesi (MES)
--
-- Bu dosyayı migrate_to_timeline.sql'den SONRA çalıştır.

-- Çoklu hat: PFM-4 ve PFM-10 kayıtları (PFM-11 zaten vardı).
insert into public.line_status (line_code) values ('PFM-4'), ('PFM-10')
on conflict (line_code) do nothing;

-- Hedef hız → çalışma hızı: artık kurulumda bir kere sorulan sabit bir hedef
-- değil, operatörün üretim sırasında istediği zaman güncelleyebildiği anlık
-- bir değer. Aynı sütun, gerçek anlamına uysun diye yeniden adlandırıldı.
alter table public.product_runs rename column hedef_hiz_pkt_dk to calisma_hizi_pkt_dk;

comment on column public.product_runs.calisma_hizi_pkt_dk is
  'Operatörün istediği zaman güncelleyebildiği anlık çalışma hızı (pkt/dk)';

-- Ambalaj firesi hesabı için: boş paket ağırlığı ürün kurulumunda bir kere
-- sorulur (paketleme malzemesi değişmedikçe sabit). Ortalama gramaj ise her
-- ürün üretiminin SONUNDA, teraziden okunan ortalama değer olarak girilir.
alter table public.product_runs
  add column if not exists bos_paket_agirlik_g numeric
    check (bos_paket_agirlik_g is null or bos_paket_agirlik_g > 0),
  add column if not exists ortalama_gramaj_g numeric
    check (ortalama_gramaj_g is null or ortalama_gramaj_g > 0);

comment on column public.product_runs.bos_paket_agirlik_g is
  'Tek boş paketin ağırlığı (g); ambalaj firesini grama çevirmek için';
comment on column public.product_runs.ortalama_gramaj_g is
  'Üretim sonunda teraziden okunan ortalama net gramaj';

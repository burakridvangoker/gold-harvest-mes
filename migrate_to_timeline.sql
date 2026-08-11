-- line_status'u türetilen alanlardan arındır (MES)
--
-- NEDEN: total_production_seconds / total_downtime_seconds birer birikmiş
-- sayaçtı ve trg_line_status_timestamps her durum değişiminde içlerine
-- now() - status_changed_at farkını ekliyordu.
--
-- Bu, operatörün "duruş aslında 5 dakika önce başlamıştı" demesini yapısal
-- olarak imkânsız kılıyordu: toplam bir kez yazıldıktan sonra geçmişi
-- düzeltmek onu geri almıyordu.
--
-- Artık tek gerçek kaynak timeline_events ve pallet_records. Süreler,
-- palet ve paket sayıları hep oradan türetilir; hiçbiri saklanmaz.
-- line_status yalnızca hat kaydı (registry) olarak kalır.
--
-- Bu dosyayı setup_shifts.sql ve setup_timeline.sql'den SONRA çalıştır.

-- Eski birikim trigger'ı ve fonksiyonu
drop trigger if exists trg_line_status_timestamps on public.line_status;
drop function if exists public.set_line_status_timestamps();

-- Türetilen kolonlar
alter table public.line_status
  drop column if exists total_production_seconds,
  drop column if exists total_downtime_seconds,
  drop column if exists pallet_count,
  drop column if exists package_count,
  drop column if exists status,
  drop column if exists status_changed_at;

comment on table public.line_status is
  'Hat kaydı (registry). Durum ve sayaçlar burada tutulmaz, timeline_events ve pallet_records üzerinden türetilir.';

-- Sadece updated_at damgası kalır
create trigger trg_line_status_updated_at
before update on public.line_status
for each row execute function public.set_updated_at();

-- stop_events yerini timeline_events aldı. Üretimde anlamlı veri yoksa
-- bu tabloyu düşürebilirsin; veri varsa önce taşı, sonra düşür.
--
--   drop table if exists public.stop_events;
--
-- stop_reasons DURUR: kodlar şimdilik kullanılmıyor ama tekrarlayan
-- serbest metin notlar zamanla buraya terfi edecek.

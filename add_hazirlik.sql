-- Hazırlık: mola'nın ikizi, dördüncü bir 'kind' değeri.
--
-- Vardiya/ürün başlamadan önceki makine ayarı (ör. bobinden boş paket
-- ayarı) gerçek bir duruş değil — ama bugüne kadar 'durus' olarak
-- kaydedildiği için açık kalma oranını haksız yere düşürüyor, "duruş
-- sebepleri" listesine bir arızaymış gibi giriyordu. Mola'nın çözdüğü
-- sorunun birebir aynısı: kendi 'kind' değeri olmadan not metnine
-- bakarak ayırmak kırılgan olurdu (bkz. add_mola.sql'in gerekçesi).

alter table public.timeline_events
  drop constraint if exists timeline_events_kind_check;

alter table public.timeline_events
  add constraint timeline_events_kind_check check (kind in ('uretim', 'durus', 'mola', 'hazirlik'));

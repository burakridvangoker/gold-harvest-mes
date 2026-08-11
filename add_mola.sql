-- Mola: üretim/duruşun yanına üçüncü, planlı bir durum.
--
-- Neden ayrı bir 'kind' değeri (duruş + not değil): açık kalma / hız verimi
-- oranları molayı tamamen dışarıda bırakır (bkz. src/lib/timeline.js —
-- shiftTotals artık molaMs'i ayrı tutuyor, toplamMs hesabına katmıyor).
-- Bunu güvenilir yapmanın tek yolu molanın kendi 'kind' değeri olması;
-- not metnine bakarak ayırmak kırılgan olurdu.

alter table public.timeline_events
  drop constraint if exists timeline_events_kind_check;

alter table public.timeline_events
  add constraint timeline_events_kind_check check (kind in ('uretim', 'durus', 'mola'));

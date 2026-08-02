-- Duruş sebebi segmentleri: bir 'durus' olayının İÇİNDE, çakışabilen,
-- kendi başlangıç/bitişi olan sebep kayıtları.
--
-- NEDEN AYRI TABLO, timeline_events'e yeni bir 'kind' değil: timeline_events
-- tek sıralı, ÇAKIŞMASIZ bir zaman çizelgesi modeline dayanıyor (her olay
-- bir sonrakinin başladığı anda biter, bkz. setup_timeline.sql'in başındaki
-- tasarım kararı). Sahada tek bir duruş içinde birbirini ARDIŞIK değil
-- ÇAKIŞIK takip eden birden fazla sebep olabiliyor (net sıraları yok, ör.
-- bobin değişimi 07:00-07:30, ambalaj ayarı 07:15-07:45, elektrik arızası
-- 07:20-07:55) — bunu tek sıralı modele zorlamak (3 ayrı 'durus' olayı
-- gibi) var olmayan bir kesinlik uydurmak olurdu.
--
-- Bu tablo o modele hiç dokunmadan, mevcut BİR 'durus' olayının (event_id)
-- İÇİNE ikinci, bağımsız bir katman ekliyor: dış durum (uretim/durus/
-- mola/hazirlik) tek sıralı kalır, süre/oran hesapları (shiftTotals,
-- zamanKullanimi...) hiç etkilenmez; segmentler sadece "hangi sebep ne
-- zaman etkiliydi" raporlaması için var. start_at/end_at ebeveyn duruş
-- aralığının sınırları İÇİNDE kalmalı (uygulama katmanında doğrulanır,
-- burada zorunlu kılınmaz — timeline_events gibi olaylar
-- düzenlenebilir/silinebilir olduğu için katı bir DB kısıtı kırılgan olur).

create table if not exists public.stop_reason_segments (
  id uuid primary key default gen_random_uuid(),

  -- timeline_events/pallet_records ile aynı desen: line_code + shift_id
  -- doğrudan tutulur ki useShift.js'in realtime filtresi
  -- (line_code=eq.X) join gerekmeden çalışsın.
  line_code text not null references public.line_status (line_code),
  shift_id uuid not null references public.shifts (id) on delete cascade,
  event_id uuid not null references public.timeline_events (id) on delete cascade,

  note text not null,
  start_at timestamptz not null,
  end_at timestamptz not null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint stop_reason_segments_range check (end_at >= start_at)
);

comment on table public.stop_reason_segments is 'Bir duruş olayı içindeki, çakışabilen sebep segmentleri (MES)';
comment on column public.stop_reason_segments.event_id is 'Ebeveyn durus olayı (timeline_events.id)';

create index if not exists idx_stop_reason_segments_event on public.stop_reason_segments (event_id);
create index if not exists idx_stop_reason_segments_shift on public.stop_reason_segments (shift_id);

drop trigger if exists trg_stop_reason_segments_updated_at on public.stop_reason_segments;
create trigger trg_stop_reason_segments_updated_at
before update on public.stop_reason_segments
for each row execute function public.set_updated_at();

alter table public.stop_reason_segments enable row level security;

drop policy if exists "stop_reason_segments_select_all" on public.stop_reason_segments;
drop policy if exists "stop_reason_segments_insert_all" on public.stop_reason_segments;
drop policy if exists "stop_reason_segments_update_all" on public.stop_reason_segments;
drop policy if exists "stop_reason_segments_delete_all" on public.stop_reason_segments;

create policy "stop_reason_segments_select_all" on public.stop_reason_segments for select using (true);
create policy "stop_reason_segments_insert_all" on public.stop_reason_segments for insert with check (true);
create policy "stop_reason_segments_update_all" on public.stop_reason_segments for update using (true) with check (true);
create policy "stop_reason_segments_delete_all" on public.stop_reason_segments for delete using (true);

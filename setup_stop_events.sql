create table public.stop_reasons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  label text not null,
  category text not null
    check (category in ('planli', 'plansiz')),
  sort_order integer not null,
  active boolean not null default true
);

comment on table public.stop_reasons is 'Duruş kodu kataloğu (MES)';

create table public.stop_events (
  id uuid primary key default gen_random_uuid(),
  line_code text not null references public.line_status (line_code),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  reason_code text references public.stop_reasons (code),
  reason_note text,
  created_at timestamptz not null default now(),

  constraint stop_events_ended_after_started
    check (ended_at is null or ended_at >= started_at)
);

comment on table public.stop_events is 'Hat duruş olayı kayıtları (MES)';

create index idx_stop_events_line_code on public.stop_events (line_code);
create index idx_stop_events_open on public.stop_events (line_code) where ended_at is null;

insert into public.stop_reasons (code, label, category, sort_order) values
  ('OAY', 'Ölçme/Ayar', 'plansiz', 1),
  ('KCD', 'Küçük duruş', 'plansiz', 2),
  ('KD', 'Kalite duruşu', 'plansiz', 3),
  ('ARZ1', 'Mekanik arıza', 'plansiz', 4),
  ('TMZ', 'Temizlik', 'plansiz', 5),
  ('ÜB', 'Ürün bekleme', 'plansiz', 6),
  ('PKD', 'Plan/Malzeme bekleme', 'plansiz', 7),
  ('ARZ2', 'Elektrik arıza', 'plansiz', 8),
  ('FB', 'Forklift bekleme', 'plansiz', 9),
  ('YON', 'Yönetim/bekleme', 'plansiz', 10),
  ('PLN1', 'Yemek molası', 'planli', 1),
  ('PLN2', 'Çay molası', 'planli', 2),
  ('PLN3', 'Vardiya sonu temizlik', 'planli', 3),
  ('PLN5', 'Makine/Malzeme deneme', 'planli', 4),
  ('PLN6', 'Dedektör/Kodlama/Onay', 'planli', 5),
  ('PLN9', 'Ürün değişimi', 'planli', 6),
  ('PLN10', 'Bobin değişimi', 'planli', 7),
  ('PLN11', 'Oksijen bobin değişimi', 'planli', 8),
  ('PLN12', 'Ribon değişimi', 'planli', 9),
  ('PLN13', 'Zipper değişimi', 'planli', 10),
  ('PLN4', 'Eğitim', 'planli', 11),
  ('PLN7', 'Planlı bakım', 'planli', 12),
  ('PLN8', 'Dış kesinti', 'planli', 13)
on conflict (code) do nothing;

alter table public.stop_reasons enable row level security;

create policy "stop_reasons_select_all"
  on public.stop_reasons for select
  using (true);

create policy "stop_reasons_insert_all"
  on public.stop_reasons for insert
  with check (true);

create policy "stop_reasons_update_all"
  on public.stop_reasons for update
  using (true)
  with check (true);

alter table public.stop_events enable row level security;

create policy "stop_events_select_all"
  on public.stop_events for select
  using (true);

create policy "stop_events_insert_all"
  on public.stop_events for insert
  with check (true);

create policy "stop_events_update_all"
  on public.stop_events for update
  using (true)
  with check (true);

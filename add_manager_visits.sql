-- Müdür panosu görüntüleme kaydı.
--
-- Kimin baktığı takip edilmiyor (bilinçli karar — login yok, isim de
-- sorulmuyor); sadece "bu hattın müdür panosu ne zaman açıldı, ne kadar
-- açık kaldı" anonim olarak kaydediliyor. ManagerDashboard açılınca bir
-- satır eklenir (opened_at = now()), açık kaldığı sürece periyodik olarak
-- last_seen_at güncellenir (heartbeat) — sekme aniden kapanırsa süre son
-- heartbeat'te kalır, tam kapanış anı değil ama yeterince yakın bir tahmin.
-- Operatör ekranında bu kayıtlar listelenir.

create table if not exists public.manager_dashboard_visits (
  id uuid primary key default gen_random_uuid(),
  line_code text not null references public.line_status (line_code),
  opened_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

comment on table public.manager_dashboard_visits is 'Müdür panosu ne zaman/ne kadar açıldı — anonim (MES)';

create index if not exists idx_manager_visits_line_opened
  on public.manager_dashboard_visits (line_code, opened_at desc);

alter table public.manager_dashboard_visits enable row level security;

drop policy if exists "manager_visits_select_all" on public.manager_dashboard_visits;
drop policy if exists "manager_visits_insert_all" on public.manager_dashboard_visits;
drop policy if exists "manager_visits_update_all" on public.manager_dashboard_visits;

create policy "manager_visits_select_all" on public.manager_dashboard_visits for select using (true);
create policy "manager_visits_insert_all" on public.manager_dashboard_visits for insert with check (true);
create policy "manager_visits_update_all" on public.manager_dashboard_visits for update using (true) with check (true);

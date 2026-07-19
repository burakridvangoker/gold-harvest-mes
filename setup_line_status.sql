create table public.line_status (
  id uuid primary key default gen_random_uuid(),
  line_code text not null unique,
  status text not null default 'beklemede'
    check (status in ('beklemede', 'uretimde', 'durdu')),
  pallet_count integer not null default 0 check (pallet_count >= 0),
  package_count integer not null default 0 check (package_count >= 0),

  status_changed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.line_status is 'Üretim hatlarının anlık durumu (MES)';

create or replace function public.set_line_status_timestamps()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  if new.status is distinct from old.status then
    new.status_changed_at = now();
  end if;
  return new;
end;
$$;

create trigger trg_line_status_timestamps
before update on public.line_status
for each row
execute function public.set_line_status_timestamps();

insert into public.line_status (line_code, status, pallet_count, package_count)
values ('PFM-11', 'beklemede', 0, 0)
on conflict (line_code) do nothing;

alter table public.line_status enable row level security;

create policy "line_status_select_all"
  on public.line_status for select
  using (true);

create policy "line_status_insert_all"
  on public.line_status for insert
  with check (true);

create policy "line_status_update_all"
  on public.line_status for update
  using (true)
  with check (true);

alter table public.line_status
  add column if not exists total_production_seconds bigint not null default 0,
  add column if not exists total_downtime_seconds bigint not null default 0;

create or replace function public.set_line_status_timestamps()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();

  if new.status is distinct from old.status then
    if old.status = 'uretimde' then
      new.total_production_seconds := old.total_production_seconds
        + floor(extract(epoch from (now() - old.status_changed_at)))::bigint;
    else
      new.total_downtime_seconds := old.total_downtime_seconds
        + floor(extract(epoch from (now() - old.status_changed_at)))::bigint;
    end if;

    new.status_changed_at := now();
  end if;

  return new;
end;
$$;

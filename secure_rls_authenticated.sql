-- Security lock: restrict MES tables to logged-in (authenticated) users only.
--
-- The original policies on line_status, stop_reasons and stop_events were
-- created without a "to <role>" clause, which in Postgres defaults to
-- PUBLIC — i.e. they applied to every Postgres role, including Supabase's
-- "anon" role. In practice this meant anyone holding the public anon API
-- key (which ships in the frontend bundle) could read and write these
-- tables with no login at all.
--
-- This migration drops those policies and recreates them scoped
-- "to authenticated", so a valid Supabase Auth session (see
-- supabase.auth.signInWithPassword in the app) is required for any access.
-- The "anon" role loses all access to these tables once this migration runs.
--
-- Run this in the Supabase SQL editor (or via `supabase db push` /
-- `psql`) against the project database.

-- line_status ----------------------------------------------------------
drop policy if exists "line_status_select_all" on public.line_status;
drop policy if exists "line_status_insert_all" on public.line_status;
drop policy if exists "line_status_update_all" on public.line_status;

create policy "line_status_select_authenticated"
  on public.line_status for select
  to authenticated
  using (true);

create policy "line_status_insert_authenticated"
  on public.line_status for insert
  to authenticated
  with check (true);

create policy "line_status_update_authenticated"
  on public.line_status for update
  to authenticated
  using (true)
  with check (true);

-- stop_reasons -----------------------------------------------------------
drop policy if exists "stop_reasons_select_all" on public.stop_reasons;
drop policy if exists "stop_reasons_insert_all" on public.stop_reasons;
drop policy if exists "stop_reasons_update_all" on public.stop_reasons;

create policy "stop_reasons_select_authenticated"
  on public.stop_reasons for select
  to authenticated
  using (true);

create policy "stop_reasons_insert_authenticated"
  on public.stop_reasons for insert
  to authenticated
  with check (true);

create policy "stop_reasons_update_authenticated"
  on public.stop_reasons for update
  to authenticated
  using (true)
  with check (true);

-- stop_events ------------------------------------------------------------
drop policy if exists "stop_events_select_all" on public.stop_events;
drop policy if exists "stop_events_insert_all" on public.stop_events;
drop policy if exists "stop_events_update_all" on public.stop_events;

create policy "stop_events_select_authenticated"
  on public.stop_events for select
  to authenticated
  using (true);

create policy "stop_events_insert_authenticated"
  on public.stop_events for insert
  to authenticated
  with check (true);

create policy "stop_events_update_authenticated"
  on public.stop_events for update
  to authenticated
  using (true)
  with check (true);

-- production_runs ----------------------------------------------------------
-- setup_production_runs.sql in this repo is empty, so this table was
-- apparently created directly in the Supabase dashboard and its policy
-- names are unknown here. Make sure RLS is on, drop the common naming
-- variants if present (safe no-ops otherwise), then create
-- authenticated-only policies matching the pattern above.
alter table public.production_runs enable row level security;

drop policy if exists "production_runs_select_all" on public.production_runs;
drop policy if exists "production_runs_insert_all" on public.production_runs;
drop policy if exists "production_runs_update_all" on public.production_runs;
drop policy if exists "Enable read access for all users" on public.production_runs;
drop policy if exists "Enable insert for all users" on public.production_runs;
drop policy if exists "Enable update for all users" on public.production_runs;

create policy "production_runs_select_authenticated"
  on public.production_runs for select
  to authenticated
  using (true);

create policy "production_runs_insert_authenticated"
  on public.production_runs for insert
  to authenticated
  with check (true);

create policy "production_runs_update_authenticated"
  on public.production_runs for update
  to authenticated
  using (true)
  with check (true);

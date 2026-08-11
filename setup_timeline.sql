-- Zaman çizelgesi ve palet çıktısı (MES)
--
-- TASARIM KARARI — neden aralık değil de geçiş noktası:
--
-- timeline_events bir durumun BAŞLADIĞI anı tutar. O aralık, bir sonraki
-- olayın "at" değerinde biter (son olay hâlâ sürüyordur).
--
-- Aralıkları (started_at, ended_at) çifti olarak saklasaydık, operatör bir
-- saati geriye çektiğinde komşu aralığın da elle onarılması gerekirdi; bir
-- adım atlanınca çakışma ya da boşluk oluşurdu. Geçiş noktası modelinde:
--
--   * Bir saati düzeltmek iki komşu aralığı birlikte kaydırır.
--   * Bir olayı silmek iki aralığı birleştirir.
--   * Eski ürüne geri dönmek = product_run_id'si o ürün olan yeni bir
--     'uretim' olayı. Başka hiçbir şey gerekmez.
--
-- Bu yüzden süreler HİÇBİR YERDE saklanmaz, hep bu tablodan türetilir.
-- (Bkz. src/lib/timeline.js)

create table if not exists public.timeline_events (
  id uuid primary key default gen_random_uuid(),
  line_code text not null references public.line_status (line_code),
  shift_id uuid not null references public.shifts (id) on delete cascade,

  -- Hangi ürün çalışılıyordu. Duruşlarda da doludur (o duruş o ürüne yazılır).
  product_run_id uuid references public.product_runs (id) on delete set null,

  -- Olayın gerçekleştiği an. Operatör telefona geç girebilir; bu alan
  -- geriye dönük düzenlenebilir ve sistemin tüm hesabı buna dayanır.
  at timestamptz not null default now(),

  kind text not null check (kind in ('uretim', 'durus')),

  -- Duruş sebebi serbest metin. Kodlar şimdilik kullanılmıyor; tekrarlayan
  -- notlar zamanla stop_reasons kataloğuna terfi edecek.
  note text,
  reason_code text references public.stop_reasons (code),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.timeline_events is 'Hat durum geçişleri; süreler bundan türetilir (MES)';
comment on column public.timeline_events.at is 'Geriye dönük düzenlenebilir. Tüm süre hesabının kaynağı.';
comment on column public.timeline_events.note is 'Serbest metin duruş açıklaması; kod zorunlu değil';

create index if not exists idx_timeline_shift on public.timeline_events (shift_id, at);
create index if not exists idx_timeline_line_at on public.timeline_events (line_code, at desc);
create index if not exists idx_timeline_run on public.timeline_events (product_run_id);

create trigger trg_timeline_events_updated_at
before update on public.timeline_events
for each row execute function public.set_updated_at();

create table if not exists public.pallet_records (
  id uuid primary key default gen_random_uuid(),
  line_code text not null references public.line_status (line_code),
  shift_id uuid not null references public.shifts (id) on delete cascade,
  product_run_id uuid not null references public.product_runs (id) on delete cascade,

  -- Paletin tamamlandığı an; geriye dönük düzenlenebilir.
  completed_at timestamptz not null default now(),

  -- Bu paletteki koli adedi. Ürünün koli_per_palet değerinden kopyalanır;
  -- yarım palet (ör. 60) burada tek tek düzeltilir.
  koli_count integer not null check (koli_count > 0),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.pallet_records is 'Tamamlanan palet kayıtları (MES)';
comment on column public.pallet_records.koli_count is 'Bu paletteki koli adedi; standarttan farklı olabilir';

create index if not exists idx_pallets_shift on public.pallet_records (shift_id, completed_at desc);
create index if not exists idx_pallets_run on public.pallet_records (product_run_id);

create trigger trg_pallet_records_updated_at
before update on public.pallet_records
for each row execute function public.set_updated_at();

alter table public.timeline_events enable row level security;
alter table public.pallet_records enable row level security;

create policy "timeline_events_select_all" on public.timeline_events for select using (true);
create policy "timeline_events_insert_all" on public.timeline_events for insert with check (true);
create policy "timeline_events_update_all" on public.timeline_events for update using (true) with check (true);
create policy "timeline_events_delete_all" on public.timeline_events for delete using (true);

create policy "pallet_records_select_all" on public.pallet_records for select using (true);
create policy "pallet_records_insert_all" on public.pallet_records for insert with check (true);
create policy "pallet_records_update_all" on public.pallet_records for update using (true) with check (true);
create policy "pallet_records_delete_all" on public.pallet_records for delete using (true);

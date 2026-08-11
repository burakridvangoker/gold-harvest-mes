-- Vardiya ve ürün çalışması (MES)
--
-- Vardiya, bir operatörün bir hatta geçirdiği süredir ve her şeyin kabıdır.
-- Bir vardiyada birden çok ürün çalışılabilir; aynı ürün birden çok kez
-- çalışılabilir (araya başka ürün girip sonra geri dönülebilir).

-- Ortak updated_at damgası
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.shifts (
  id uuid primary key default gen_random_uuid(),
  line_code text not null references public.line_status (line_code),
  vardiya text not null,
  operator text,

  -- Vardiyanın gerçek başlangıcı. Operatör telefona geç girebileceği için
  -- now() değil, kullanıcının girdiği saat yazılır ve sonradan düzeltilebilir.
  started_at timestamptz not null default now(),
  ended_at timestamptz,

  -- Vardiyanın planlanan bitişi. Tempo hesabı ("18 dk öndesin") buna dayanır;
  -- gerçek bitiş (ended_at) vardiya kapanınca yazılır.
  planlanan_bitis timestamptz,

  -- Vardiya üretim planı (koli). Operatör ilerlemeyi buna göre görür.
  hedef_koli integer check (hedef_koli is null or hedef_koli > 0),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint shifts_ended_after_started
    check (ended_at is null or ended_at >= started_at)
);

comment on table public.shifts is 'Vardiya kayıtları (MES)';
comment on column public.shifts.started_at is 'Geriye dönük düzenlenebilir: operatör olayı sonradan girebilir';
comment on column public.shifts.planlanan_bitis is 'Tempo hesabının referansı; gerçek bitiş için ended_at';
comment on column public.shifts.hedef_koli is 'Vardiya üretim planı, koli cinsinden';

create index if not exists idx_shifts_line_code on public.shifts (line_code, started_at desc);
create index if not exists idx_shifts_open on public.shifts (line_code) where ended_at is null;

create trigger trg_shifts_updated_at
before update on public.shifts
for each row execute function public.set_updated_at();

create table if not exists public.product_runs (
  id uuid primary key default gen_random_uuid(),
  shift_id uuid not null references public.shifts (id) on delete cascade,
  line_code text not null references public.line_status (line_code),

  urun_adi text not null,
  parti_no text,
  gramaj numeric check (gramaj is null or gramaj > 0),
  koli_ici_adet integer check (koli_ici_adet is null or koli_ici_adet > 0),
  hedef_hiz_pkt_dk numeric check (hedef_hiz_pkt_dk is null or hedef_hiz_pkt_dk > 0),

  -- Palet başına standart koli adedi. Kayısı 100 ile başlar ama yarıda
  -- 60'a dönebilir; bu değer sonraki paletler için değiştirilebilir,
  -- tek tek paletler kendi koli_count değerini taşır.
  koli_per_palet integer not null default 100 check (koli_per_palet > 0),

  -- Ürüne özel hedef (opsiyonel). Boşsa vardiya hedefi geçerlidir.
  hedef_koli integer check (hedef_koli is null or hedef_koli > 0),

  dolu_paket_baslangic integer,
  bos_paket_baslangic integer,
  dolu_paket_bitis integer,
  bos_paket_bitis integer,

  sira integer not null default 1,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.product_runs is 'Vardiya içindeki ürün çalışmaları (MES)';
comment on column public.product_runs.koli_per_palet is 'Palet başına standart koli; paletler bu değeri kopyalar, sonradan tek tek değiştirilebilir';
comment on column public.product_runs.sira is 'Vardiya içindeki sıra; aynı ürüne geri dönülürse yeni satır açılmaz, yeni timeline olayı yazılır';

create index if not exists idx_product_runs_shift on public.product_runs (shift_id, sira);
create index if not exists idx_product_runs_line on public.product_runs (line_code);

create trigger trg_product_runs_updated_at
before update on public.product_runs
for each row execute function public.set_updated_at();

alter table public.shifts enable row level security;
alter table public.product_runs enable row level security;

-- Operatör kendi kaydını düzeltebilmeli ve silebilmeli: DELETE dahil.
create policy "shifts_select_all" on public.shifts for select using (true);
create policy "shifts_insert_all" on public.shifts for insert with check (true);
create policy "shifts_update_all" on public.shifts for update using (true) with check (true);
create policy "shifts_delete_all" on public.shifts for delete using (true);

create policy "product_runs_select_all" on public.product_runs for select using (true);
create policy "product_runs_insert_all" on public.product_runs for insert with check (true);
create policy "product_runs_update_all" on public.product_runs for update using (true) with check (true);
create policy "product_runs_delete_all" on public.product_runs for delete using (true);

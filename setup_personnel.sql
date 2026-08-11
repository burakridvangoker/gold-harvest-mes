-- Personel listesi — GH VARDİYA'dan TEK YÖNLÜ kopya.
--
-- Amaç: operatör adının serbest metin yüzünden farklı yazımlarla
-- ("Kadir Gülerer" / "kadir gulerer") çoğalmasını önlemek. Operatör adı
-- alanı bu listeden tek dokunuşla doldurulabiliyor; ama shifts.operator
-- TEXT kolonu olduğu gibi kalıyor (FK yok) — listeden seçilse de elle
-- yazılsa da aynı kolona aynı türde yazılır. Böylece:
--   * mevcut tablolara dokunulmaz, eski kayıtlar aynen geçerli kalır,
--   * liste yüklenemezse / kişi listede yoksa serbest metin fallback'i
--     bedavadır (operatör hiçbir durumda kilitli kalmaz).
--
-- Gerçek kaynak GH VARDİYA'nın veritabanıdır; bu tablo sadece kopyadır.
-- Güncellemek için GH VARDİYA'dan yeni CSV alınıp seed_personnel.sql
-- yeniden üretilir ve çalıştırılır (canlı bağlantı bilinçli olarak yok —
-- iki veritabanını birbirine bağlamak kapsam dışı bırakıldı).

create table public.personnel (
  id uuid primary key default gen_random_uuid(),
  ad_soyad text not null,
  departman text,
  sicil_no text,
  aktif boolean not null default true,
  created_at timestamptz not null default now()
);

-- RLS diğer tablolarla aynı desende açık ama serbest (henüz auth yok);
-- kullanıcı/rol sistemi gelirse hepsiyle birlikte sıkılaştırılır.
alter table public.personnel enable row level security;

create policy "personnel_select_all" on public.personnel for select using (true);
create policy "personnel_insert_all" on public.personnel for insert with check (true);
create policy "personnel_update_all" on public.personnel for update using (true) with check (true);
create policy "personnel_delete_all" on public.personnel for delete using (true);

-- Sevkiyat canlı eşleştirme: bir paletin TIR'a ne zaman yüklendiği.
--
-- null = henüz yüklenmedi. Sevkiyatçı bir paleti işaretleyince dolar,
-- tekrar dokununca geri null'a çekilebilir (yanlış işaretleme telafisi).
-- Palet kaydının kendisi (koli_count, completed_at) bu alandan bağımsız —
-- yükleme sadece bir durum bayrağı, miktarı değiştirmez.

alter table public.pallet_records
  add column if not exists loaded_at timestamptz;

comment on column public.pallet_records.loaded_at is
  'Palet TIR''a yüklenirken sevkiyat ekranından işaretlenir; null = henüz yüklenmedi';

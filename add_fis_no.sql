-- Vardiyaya özel fiş no (Logo'daki fiş numarasının MES karşılığı).
--
-- Opsiyonel: vardiya açılışında boş bırakılıp sonradan da girilebilir
-- (CLAUDE.md ilkesi — eksik alan sonradan doldurulur, uydurma kayıttan
-- iyidir). Alt fiş no (ör. 505792.1) DB'de ayrı satır olarak SAKLANMAZ,
-- görüntülemede türetilir (bkz. src/lib/timeline.js#fisNoForRun):
-- vardiyadaki ürünler sira'ya göre dizilir, ilk ürün fis_no'yu çıplak
-- gösterir, N'inci ürün "{fis_no}.{N-1}" gösterir.

alter table public.shifts
  add column if not exists fis_no text;

comment on column public.shifts.fis_no is
  'Logo''daki vardiya fiş numarası (opsiyonel, sonradan girilebilir); alt fiş no görüntülemede türetilir';

-- Otomatik ekip ataması için: her kişinin hangi vardiyada (1/2/3)
-- çalıştığı. Kaynak GH VARDİYA çizelgesinde bu bilgi zaten vardı
-- (her hat satırında üç sütun grubu = 1./2./3. vardiya); line_code gibi
-- bu da MES tarafına kopyalanıyor. Vardiya atamaları sahada SABİT
-- (rotasyon yok — kullanıcı doğruladı), o yüzden ön-doldurma güvenilir;
-- yine de değişirse liste yeni bir seed ile güncellenir.
--
-- Nullable: vardiya_no boş bırakılan kişi hiçbir vardiyada elenmez,
-- sadece "bu vardiyanın ekibi" bölümünde öne çıkmaz — add_personnel_hat.sql
-- ile aynı kaçış kapısı deseni.

alter table public.personnel add column if not exists vardiya_no int;

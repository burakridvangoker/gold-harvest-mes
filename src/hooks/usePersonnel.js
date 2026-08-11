import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

/*
 * Personel listesi — GH VARDİYA'dan kopyalanan `personnel` tablosu
 * (bkz. setup_personnel.sql). Operatör adı alanındaki tek dokunuşluk
 * çipleri besler.
 *
 * Hatta göre filtrelenir: sadece o `lineCode`'a kayıtlı kişiler VEYA
 * `line_code` hiç girilmemiş (hatlar arası ortak / belirsiz) kişiler
 * gelir — kaynak GH VARDİYA tablosu kişileri hatlara göre grupluyordu,
 * MES tarafında da aynı ayrım korunuyor.
 *
 * Hata BİLİNÇLİ olarak yutuluyor: tablo yoksa, sorgu başarısızsa ya da
 * liste boşsa sonuç aynı — çip yok, alan düz serbest metin olarak çalışır.
 * Operatör hiçbir durumda bir hata ekranıyla ya da kilitli bir alanla
 * karşılaşmamalı; liste bir kolaylık, önkoşul değil.
 *
 * Realtime/refetch yok: liste statik bir kopya, sayfa açılışında bir kez
 * çekmek yeterli.
 */
export function usePersonnel(lineCode, enabled = true) {
  const [personnel, setPersonnel] = useState([])

  useEffect(() => {
    if (!enabled || !lineCode) {
      setPersonnel([])
      return undefined
    }

    let isMounted = true

    async function fetchPersonnel() {
      const { data, error } = await supabase
        .from('personnel')
        .select('id, ad_soyad, departman, sicil_no, line_code, vardiya_no')
        .eq('aktif', true)
        .or(`line_code.eq.${lineCode},line_code.is.null`)
        .order('ad_soyad')

      if (isMounted && !error) {
        setPersonnel(data ?? [])
      }
    }

    fetchPersonnel()

    return () => {
      isMounted = false
    }
  }, [lineCode, enabled])

  return personnel
}

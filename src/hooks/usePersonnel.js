import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

/*
 * Personel listesi — GH VARDİYA'dan kopyalanan `personnel` tablosu
 * (bkz. setup_personnel.sql). Operatör adı alanındaki tek dokunuşluk
 * çipleri besler.
 *
 * Hata BİLİNÇLİ olarak yutuluyor: tablo yoksa, sorgu başarısızsa ya da
 * liste boşsa sonuç aynı — çip yok, alan düz serbest metin olarak çalışır.
 * Operatör hiçbir durumda bir hata ekranıyla ya da kilitli bir alanla
 * karşılaşmamalı; liste bir kolaylık, önkoşul değil.
 *
 * Realtime/refetch yok: liste statik bir kopya, sayfa açılışında bir kez
 * çekmek yeterli.
 */
export function usePersonnel(enabled = true) {
  const [personnel, setPersonnel] = useState([])

  useEffect(() => {
    if (!enabled) return undefined

    let isMounted = true

    async function fetchPersonnel() {
      const { data, error } = await supabase
        .from('personnel')
        .select('id, ad_soyad, departman, sicil_no')
        .eq('aktif', true)
        .order('ad_soyad')

      if (isMounted && !error) {
        setPersonnel(data ?? [])
      }
    }

    fetchPersonnel()

    return () => {
      isMounted = false
    }
  }, [enabled])

  return personnel
}

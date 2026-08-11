import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { LINE_CODES } from '../lib/lines'

/*
 * Şok fabrikasının makineleri — yani `line_status`'ta kayıtlı olup
 * Merkez'in sabit listesinde (`LINE_CODES`) OLMAYAN her hat kodu.
 *
 * Sahada elle girilen makineler buraya düşer; bir kere girilen makine
 * sonraki açılışlarda listeden seçilir, tekrar yazılmasına gerek kalmaz.
 *
 * Hata bilinçli olarak yutulur (boş liste = yedek davranış): liste
 * gelmezse operatör yine "yeni makine" ile devam edebilir, ekran
 * kilitlenmez — `usePersonnel`'deki aynı desen.
 */
export function useSokLines() {
  const [lines, setLines] = useState([])

  const refresh = useCallback(async () => {
    const { data } = await supabase.from('line_status').select('line_code')
    const kodlar = (data ?? [])
      .map((row) => row.line_code)
      .filter((code) => !LINE_CODES.includes(code))
      .sort((a, b) => a.localeCompare(b, 'tr'))
    setLines(kodlar)
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { sokLines: lines, refreshSokLines: refresh }
}

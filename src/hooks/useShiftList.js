import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

/*
 * Bir hattın KAPANMIŞ vardiyalarının listesi — "Geçmiş vardiyalar" seçici
 * için. Vardiyayı bitirmek veri silmez; bu liste onu kanıtlıyor. Sadece
 * liste satırı için yeterli alanlar çekilir, tam paket useShiftById'de.
 */
export function useShiftList(lineCode) {
  const [shifts, setShifts] = useState([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!lineCode) {
      setShifts([])
      setLoading(false)
      return
    }

    const { data } = await supabase
      .from('shifts')
      .select('*')
      .eq('line_code', lineCode)
      .not('ended_at', 'is', null)
      .order('started_at', { ascending: false })

    setShifts(data ?? [])
    setLoading(false)
  }, [lineCode])

  useEffect(() => {
    let isMounted = true

    if (!lineCode) {
      setLoading(false)
      return undefined
    }

    refresh()

    const channel = supabase.channel(`shift_history_${lineCode}`)
    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'shifts', filter: `line_code=eq.${lineCode}` },
      () => {
        if (isMounted) refresh()
      },
    )
    channel.subscribe()

    return () => {
      isMounted = false
      supabase.removeChannel(channel)
    }
  }, [lineCode, refresh])

  return { shifts, loading }
}

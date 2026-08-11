import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

/*
 * Hangi hatlarda şu an açık (bitmemiş) bir vardiya var — hat seçim
 * ekranında sade bir "aktif" göstergesi için. "Aktif" = açık vardiya
 * var demek; üretimde/durmuş/molada farkı gözetilmiyor, sadece "şu an
 * biri bu hattı çalıştırıyor" sinyali.
 */
export function useActiveLines() {
  const [activeLines, setActiveLines] = useState(new Set())

  const refresh = useCallback(async () => {
    const { data } = await supabase.from('shifts').select('line_code').is('ended_at', null)
    setActiveLines(new Set((data ?? []).map((row) => row.line_code)))
  }, [])

  useEffect(() => {
    let isMounted = true

    refresh()

    const channel = supabase.channel('active_lines')
    channel.on('postgres_changes', { event: '*', schema: 'public', table: 'shifts' }, () => {
      if (isMounted) refresh()
    })
    channel.subscribe()

    return () => {
      isMounted = false
      supabase.removeChannel(channel)
    }
  }, [refresh])

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh()
    }

    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onVisible)

    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', onVisible)
    }
  }, [refresh])

  return activeLines
}

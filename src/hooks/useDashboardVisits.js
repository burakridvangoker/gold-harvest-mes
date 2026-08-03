import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const VISIT_LIMIT = 10

/*
 * Müdür panosunun bir hatta ne zaman/ne kadar açıldığı — anonim, kimin
 * baktığı tutulmuyor (bkz. add_manager_visits.sql). Operatör ekranında
 * son birkaç görüntülemeyi listelemek için.
 */
export function useDashboardVisits(lineCode) {
  const [visits, setVisits] = useState([])

  const refresh = useCallback(async () => {
    if (!lineCode) {
      setVisits([])
      return
    }

    const { data } = await supabase
      .from('manager_dashboard_visits')
      .select('id, opened_at, last_seen_at')
      .eq('line_code', lineCode)
      .order('opened_at', { ascending: false })
      .limit(VISIT_LIMIT)

    setVisits(data ?? [])
  }, [lineCode])

  useEffect(() => {
    let isMounted = true

    refresh()

    const channel = supabase.channel(`manager_dashboard_visits_${lineCode}`)
    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'manager_dashboard_visits' },
      () => {
        if (isMounted) refresh()
      },
    )
    channel.subscribe()

    return () => {
      isMounted = false
      supabase.removeChannel(channel)
    }
  }, [refresh, lineCode])

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

  return visits
}

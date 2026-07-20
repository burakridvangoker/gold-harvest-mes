import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export function useActiveProductionRun(lineCode) {
  const [run, setRun] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchRun = useCallback(async () => {
    const { data } = await supabase
      .from('production_runs')
      .select('*')
      .eq('line_code', lineCode)
      .is('ended_at', null)
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    setRun(data ?? null)
    setLoading(false)
  }, [lineCode])

  useEffect(() => {
    let isMounted = true

    fetchRun()

    const channel = supabase
      .channel(`production_runs_${lineCode}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'production_runs',
          filter: `line_code=eq.${lineCode}`,
        },
        () => {
          if (isMounted) fetchRun()
        },
      )
      .subscribe()

    return () => {
      isMounted = false
      supabase.removeChannel(channel)
    }
  }, [lineCode, fetchRun])

  return { run, loading }
}

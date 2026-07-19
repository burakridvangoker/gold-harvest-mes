import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export function useStopReasons() {
  const [reasons, setReasons] = useState([])

  useEffect(() => {
    let isMounted = true

    async function fetchReasons() {
      const { data, error } = await supabase
        .from('stop_reasons')
        .select('*')
        .eq('active', true)
        .order('sort_order', { ascending: true })

      if (isMounted && !error) {
        setReasons(data ?? [])
      }
    }

    fetchReasons()

    return () => {
      isMounted = false
    }
  }, [])

  return reasons
}

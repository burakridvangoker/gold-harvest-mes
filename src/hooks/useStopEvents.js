import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const FETCH_LIMIT = 300

export function useStopEvents(lineCode) {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    async function fetchEvents() {
      const { data, error } = await supabase
        .from('stop_events')
        .select('*')
        .eq('line_code', lineCode)
        .order('started_at', { ascending: false })
        .limit(FETCH_LIMIT)

      if (isMounted && !error) {
        setEvents(data ?? [])
      }
      if (isMounted) setLoading(false)
    }

    fetchEvents()

    const channel = supabase
      .channel(`stop_events_${lineCode}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'stop_events',
          filter: `line_code=eq.${lineCode}`,
        },
        (payload) => {
          setEvents((prev) => {
            if (payload.eventType === 'INSERT') {
              return [payload.new, ...prev].slice(0, FETCH_LIMIT)
            }
            if (payload.eventType === 'UPDATE') {
              return prev.map((event) => (event.id === payload.new.id ? payload.new : event))
            }
            if (payload.eventType === 'DELETE') {
              return prev.filter((event) => event.id !== payload.old.id)
            }
            return prev
          })
        },
      )
      .subscribe()

    return () => {
      isMounted = false
      supabase.removeChannel(channel)
    }
  }, [lineCode])

  return { events, loading }
}

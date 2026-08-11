import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export function useLineStatus(lineCode) {
  const [line, setLine] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!lineCode) {
      setLoading(false)
      return
    }

    let isMounted = true

    async function fetchLine() {
      const { data, error } = await supabase
        .from('line_status')
        .select('*')
        .eq('line_code', lineCode)
        .single()

      if (!isMounted) return

      if (error) {
        setError('Veri yüklenemedi: ' + error.message)
      } else {
        setLine(data)
      }
      setLoading(false)
    }

    fetchLine()

    const channel = supabase
      .channel(`line_status_${lineCode}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'line_status',
          filter: `line_code=eq.${lineCode}`,
        },
        (payload) => {
          if (payload.new) setLine(payload.new)
        },
      )
      .subscribe()

    return () => {
      isMounted = false
      supabase.removeChannel(channel)
    }
  }, [lineCode])

  return { line, setLine, loading, error, setError }
}

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

/*
 * Belirli bir vardiyanın (açık ya da kapanmış, fark etmez) tam paketi —
 * "Geçmiş vardiyalar" görünümü için. useShift.js ile birebir aynı üç
 * sorgu deseni, tek fark: "açık vardiya" filtresi yerine doğrudan id.
 */
const TABLES = ['shifts', 'product_runs', 'timeline_events', 'pallet_records']

export function useShiftById(shiftId) {
  const [shift, setShift] = useState(null)
  const [runs, setRuns] = useState([])
  const [events, setEvents] = useState([])
  const [pallets, setPallets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const refresh = useCallback(async () => {
    if (!shiftId) {
      setShift(null)
      setRuns([])
      setEvents([])
      setPallets([])
      setError(null)
      setLoading(false)
      return
    }

    const { data: targetShift, error: shiftError } = await supabase
      .from('shifts')
      .select('*')
      .eq('id', shiftId)
      .maybeSingle()

    if (shiftError || !targetShift) {
      setError(shiftError ? 'Vardiya okunamadı: ' + shiftError.message : null)
      setShift(null)
      setRuns([])
      setEvents([])
      setPallets([])
      setLoading(false)
      return
    }

    const [runsResult, eventsResult, palletsResult] = await Promise.all([
      supabase.from('product_runs').select('*').eq('shift_id', shiftId).order('sira'),
      supabase.from('timeline_events').select('*').eq('shift_id', shiftId).order('at'),
      supabase.from('pallet_records').select('*').eq('shift_id', shiftId).order('completed_at'),
    ])

    const failure = runsResult.error || eventsResult.error || palletsResult.error

    setError(failure ? 'Vardiya verisi okunamadı: ' + failure.message : null)
    setShift(targetShift)
    setRuns(runsResult.data ?? [])
    setEvents(eventsResult.data ?? [])
    setPallets(palletsResult.data ?? [])
    setLoading(false)
  }, [shiftId])

  useEffect(() => {
    let isMounted = true

    if (!shiftId) {
      setLoading(false)
      return undefined
    }

    refresh()

    const channel = supabase.channel(`shift_by_id_${shiftId}`)

    for (const table of TABLES) {
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table, filter: table === 'shifts' ? `id=eq.${shiftId}` : `shift_id=eq.${shiftId}` },
        () => {
          if (isMounted) refresh()
        },
      )
    }

    channel.subscribe()

    return () => {
      isMounted = false
      supabase.removeChannel(channel)
    }
  }, [shiftId, refresh])

  /* Mobil tarayıcılar arka planda websocket'i askıya alabiliyor — sekme
   * tekrar görünür olduğunda yeniden çekerek olası boşluğu kapatır. */
  useEffect(() => {
    if (!shiftId) return undefined

    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh()
    }

    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onVisible)

    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', onVisible)
    }
  }, [shiftId, refresh])

  return { shift, runs, events, pallets, loading, error, setError, refresh }
}

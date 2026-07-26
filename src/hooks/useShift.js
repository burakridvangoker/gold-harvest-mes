import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

/*
 * Açık vardiyayı ve ona bağlı her şeyi yükler.
 *
 * Realtime olaylarında artımlı yama yerine yeniden çekme yapıyoruz: kayıtlar
 * düzenlenebilir ve silinebilir olduğu için (geriye dönük saat düzeltme),
 * artımlı birleştirme kolayca tutarsız duruma düşerdi. Vardiya başına veri
 * birkaç yüz satır; yeniden çekmek ucuz.
 */

const TABLES = ['shifts', 'product_runs', 'timeline_events', 'pallet_records']

export function useShift(lineCode) {
  const [shift, setShift] = useState(null)
  const [runs, setRuns] = useState([])
  const [events, setEvents] = useState([])
  const [pallets, setPallets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const refresh = useCallback(async () => {
    const { data: openShift, error: shiftError } = await supabase
      .from('shifts')
      .select('*')
      .eq('line_code', lineCode)
      .is('ended_at', null)
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (shiftError) {
      setError('Vardiya okunamadı: ' + shiftError.message)
      setLoading(false)
      return
    }

    if (!openShift) {
      setShift(null)
      setRuns([])
      setEvents([])
      setPallets([])
      setError(null)
      setLoading(false)
      return
    }

    const [runsResult, eventsResult, palletsResult] = await Promise.all([
      supabase.from('product_runs').select('*').eq('shift_id', openShift.id).order('sira'),
      supabase.from('timeline_events').select('*').eq('shift_id', openShift.id).order('at'),
      supabase
        .from('pallet_records')
        .select('*')
        .eq('shift_id', openShift.id)
        .order('completed_at'),
    ])

    const failure = runsResult.error || eventsResult.error || palletsResult.error

    if (failure) {
      setError('Vardiya verisi okunamadı: ' + failure.message)
    } else {
      setError(null)
    }

    setShift(openShift)
    setRuns(runsResult.data ?? [])
    setEvents(eventsResult.data ?? [])
    setPallets(palletsResult.data ?? [])
    setLoading(false)
  }, [lineCode])

  useEffect(() => {
    let isMounted = true

    const run = async () => {
      await refresh()
      if (!isMounted) return
    }

    run()

    const channel = supabase.channel(`shift_${lineCode}`)

    for (const table of TABLES) {
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table, filter: `line_code=eq.${lineCode}` },
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
  }, [lineCode, refresh])

  return { shift, runs, events, pallets, loading, error, setError, refresh }
}

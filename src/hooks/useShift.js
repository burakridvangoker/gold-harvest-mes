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

const TABLES = ['shifts', 'product_runs', 'timeline_events', 'pallet_records', 'stop_reason_segments']

export function useShift(lineCode) {
  const [shift, setShift] = useState(null)
  const [runs, setRuns] = useState([])
  const [events, setEvents] = useState([])
  const [pallets, setPallets] = useState([])
  const [segments, setSegments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const refresh = useCallback(async () => {
    if (!lineCode) {
      setShift(null)
      setRuns([])
      setEvents([])
      setPallets([])
      setSegments([])
      setError(null)
      setLoading(false)
      return
    }

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
      setSegments([])
      setError(null)
      setLoading(false)
      return
    }

    const [runsResult, eventsResult, palletsResult, segmentsResult] = await Promise.all([
      supabase.from('product_runs').select('*').eq('shift_id', openShift.id).order('sira'),
      supabase.from('timeline_events').select('*').eq('shift_id', openShift.id).order('at'),
      supabase
        .from('pallet_records')
        .select('*')
        .eq('shift_id', openShift.id)
        .order('completed_at'),
      supabase
        .from('stop_reason_segments')
        .select('*')
        .eq('shift_id', openShift.id)
        .order('start_at'),
    ])

    const failure =
      runsResult.error || eventsResult.error || palletsResult.error || segmentsResult.error

    if (failure) {
      setError('Vardiya verisi okunamadı: ' + failure.message)
    } else {
      setError(null)
    }

    setShift(openShift)
    setRuns(runsResult.data ?? [])
    setEvents(eventsResult.data ?? [])
    setPallets(palletsResult.data ?? [])
    setSegments(segmentsResult.data ?? [])
    setLoading(false)
  }, [lineCode])

  useEffect(() => {
    let isMounted = true

    if (!lineCode) {
      setLoading(false)
      return undefined
    }

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

  /*
   * Telefon ekranı kilitlenip açıldığında ya da sekme arka planda kalıp
   * geri gelindiğinde mobil tarayıcılar websocket bağlantısını askıya
   * alabiliyor — realtime olayı hiç gelmeyebilir. Sekme/pencere tekrar
   * görünür olduğunda yeniden çekerek bu boşluğu kapatıyoruz.
   */
  useEffect(() => {
    if (!lineCode) return undefined

    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh()
    }

    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onVisible)

    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', onVisible)
    }
  }, [lineCode, refresh])

  return { shift, runs, events, pallets, segments, loading, error, setError, refresh }
}

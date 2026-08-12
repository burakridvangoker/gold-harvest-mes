import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

/*
 * Sevkiyat ekranı için: TÜM hatların (Merkez + Şok) açık vardiyaları,
 * her birinin ürünleri ve paletleriyle birlikte. `useShift.js` ile aynı
 * desen (realtime + yeniden çekme), tek farkı `line_code` filtresi
 * olmadan tüm hatları kapsaması.
 *
 * Dönen `entries`: [{ shift, runs, pallets }], en yeni vardiya önde.
 */

const TABLES = ['shifts', 'product_runs', 'pallet_records']

export function useOpenShifts() {
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const refresh = useCallback(async () => {
    const { data: shifts, error: shiftsError } = await supabase
      .from('shifts')
      .select('*')
      .is('ended_at', null)
      .order('started_at', { ascending: false })

    if (shiftsError) {
      setError('Vardiyalar okunamadı: ' + shiftsError.message)
      setLoading(false)
      return
    }

    if (!shifts || shifts.length === 0) {
      setEntries([])
      setError(null)
      setLoading(false)
      return
    }

    const shiftIds = shifts.map((shift) => shift.id)

    const [runsResult, palletsResult] = await Promise.all([
      supabase.from('product_runs').select('*').in('shift_id', shiftIds).order('sira'),
      supabase.from('pallet_records').select('*').in('shift_id', shiftIds).order('completed_at'),
    ])

    const failure = runsResult.error || palletsResult.error
    if (failure) {
      setError('Vardiya verisi okunamadı: ' + failure.message)
    } else {
      setError(null)
    }

    const runs = runsResult.data ?? []
    const pallets = palletsResult.data ?? []

    setEntries(
      shifts.map((shift) => ({
        shift,
        runs: runs.filter((run) => run.shift_id === shift.id),
        pallets: pallets.filter((pallet) => pallet.shift_id === shift.id),
      })),
    )
    setLoading(false)
  }, [])

  useEffect(() => {
    let isMounted = true

    refresh()

    const channel = supabase.channel('open_shifts')

    for (const table of TABLES) {
      channel.on('postgres_changes', { event: '*', schema: 'public', table }, () => {
        if (isMounted) refresh()
      })
    }

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

  return { entries, loading, error, refresh }
}

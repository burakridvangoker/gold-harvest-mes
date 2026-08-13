import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

/*
 * Veri girişi ekranı için: TÜM hatların TÜM vardiyaları (açık + kapanmış),
 * ürünleri/olayları/paletleriyle birlikte. `useOpenShifts.js` ile aynı
 * desen (realtime + yeniden çekme, tüm hatlar), tek fark `ended_at is
 * null` filtresinin OLMAMASI — bu ekranın işi geçmişe dönük fiş no
 * mutabakatı da kapsıyor, kapanmış bir vardiyaya artık erişilemez
 * olmamalı.
 *
 * Olaylar + paletler de çekiliyor (`useShift.js`'in tek-vardiyalık
 * setiyle aynı alanlar) — veri girişi operatörü artık miktar/personel
 * bilgisini kağıttan elle girmiyor, MES'in zaten hesapladığı özeti
 * (`timeline.js#runSummaries`) KONTROL ediyor. Bu yüzden sevkiyat
 * ekranının aksine `stop_reason_segments` hariç her şey burada.
 *
 * Dönen `entries`: [{ shift, runs, events, pallets }], en yeni vardiya önde.
 */

const TABLES = ['shifts', 'product_runs', 'timeline_events', 'pallet_records']

export function useAllShifts() {
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const refresh = useCallback(async () => {
    const { data: shifts, error: shiftsError } = await supabase
      .from('shifts')
      .select('*')
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

    const [runsResult, eventsResult, palletsResult] = await Promise.all([
      supabase.from('product_runs').select('*').in('shift_id', shiftIds).order('sira'),
      supabase.from('timeline_events').select('*').in('shift_id', shiftIds).order('at'),
      supabase.from('pallet_records').select('*').in('shift_id', shiftIds).order('completed_at'),
    ])

    const failure = runsResult.error || eventsResult.error || palletsResult.error
    if (failure) {
      setError('Vardiya verisi okunamadı: ' + failure.message)
    } else {
      setError(null)
    }

    const runs = runsResult.data ?? []
    const events = eventsResult.data ?? []
    const pallets = palletsResult.data ?? []

    setEntries(
      shifts.map((shift) => ({
        shift,
        runs: runs.filter((run) => run.shift_id === shift.id),
        events: events.filter((event) => event.shift_id === shift.id),
        pallets: pallets.filter((pallet) => pallet.shift_id === shift.id),
      })),
    )
    setLoading(false)
  }, [])

  useEffect(() => {
    let isMounted = true

    refresh()

    const channel = supabase.channel('all_shifts')

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

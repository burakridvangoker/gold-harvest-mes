import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

/*
 * Veri girişi ekranı için: TÜM hatların TÜM vardiyaları (açık + kapanmış),
 * ürünleriyle birlikte. `useOpenShifts.js` ile aynı desen (realtime +
 * yeniden çekme, tüm hatlar), tek fark `ended_at is null` filtresinin
 * OLMAMASI — bu ekranın işi geçmişe dönük fiş no mutabakatı da kapsıyor,
 * kapanmış bir vardiyaya artık erişilemez olmamalı.
 *
 * Palet kayıtları burada çekilmiyor — fiş no bölümü ürün/vardiya
 * seviyesinde çalışıyor, palete ihtiyaç yok (sevkiyat ekranından farkı).
 *
 * Dönen `entries`: [{ shift, runs }], en yeni vardiya önde.
 */

const TABLES = ['shifts', 'product_runs']

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

    const { data: runs, error: runsError } = await supabase
      .from('product_runs')
      .select('*')
      .in('shift_id', shiftIds)
      .order('sira')

    if (runsError) {
      setError('Ürün verisi okunamadı: ' + runsError.message)
    } else {
      setError(null)
    }

    const runList = runs ?? []

    setEntries(
      shifts.map((shift) => ({
        shift,
        runs: runList.filter((run) => run.shift_id === shift.id),
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

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { frequentNotes } from '../lib/timeline'

/*
 * Duruş notu önerileri, hattın geçmişinden.
 *
 * Kod kataloğu yerine burası çalışıyor: operatör ne yazdıysa tekrar ettikçe
 * yukarı çıkıyor ve tek dokunuşluk çipe dönüşüyor. Kodlar zamanla buradan
 * terfi edecek, kimsenin önceden katalog kurması gerekmiyor.
 *
 * Vardiya değil hat geçmişine bakılır; yeni vardiyanın ilk duruşunda da
 * öneri çıksın diye.
 */

const LOOKBACK = 300

export function useFrequentNotes(lineCode, limit = 6) {
  const [notes, setNotes] = useState([])

  useEffect(() => {
    let isMounted = true

    async function fetchNotes() {
      const { data, error } = await supabase
        .from('timeline_events')
        .select('id, at, note')
        .eq('line_code', lineCode)
        .eq('kind', 'durus')
        .not('note', 'is', null)
        .order('at', { ascending: false })
        .limit(LOOKBACK)

      if (isMounted && !error) {
        setNotes(frequentNotes(data ?? [], limit))
      }
    }

    fetchNotes()

    const channel = supabase
      .channel(`notes_${lineCode}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'timeline_events',
          filter: `line_code=eq.${lineCode}`,
        },
        () => {
          if (isMounted) fetchNotes()
        },
      )
      .subscribe()

    return () => {
      isMounted = false
      supabase.removeChannel(channel)
    }
  }, [lineCode, limit])

  return notes
}

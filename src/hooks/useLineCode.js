import { useCallback, useState } from 'react'

/*
 * Hangi makineye bakıldığı cihaza bağlı, sunucuya değil — aynı telefon
 * genelde aynı hattın başında durur. localStorage'da tutulur, "hat
 * değiştir" ile istendiğinde sıfırlanabilir.
 */
const STORAGE_KEY = 'gh-mes-line-code'

export function useLineCode() {
  const [lineCode, setLineCode] = useState(() => localStorage.getItem(STORAGE_KEY))

  const selectLine = useCallback((code) => {
    localStorage.setItem(STORAGE_KEY, code)
    setLineCode(code)
  }, [])

  const clearLine = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    setLineCode(null)
  }, [])

  return { lineCode, selectLine, clearLine }
}

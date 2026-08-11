const STORAGE_KEY = 'ghm.factory'

export function getStoredFactory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed?.lineCode || !parsed?.factoryName) return null
    return parsed
  } catch {
    return null
  }
}

export function setStoredFactory(factory) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(factory))
}

export function clearStoredFactory() {
  localStorage.removeItem(STORAGE_KEY)
}

// Hook de modo oscuro: aplica la clase `dark` en <html> y persiste la preferencia.
import { useCallback, useEffect, useState } from 'react'
import { getSettings, saveSettings } from '../lib/storage.js'

export function useTheme() {
  const [dark, setDark] = useState(() => getSettings().dark)

  useEffect(() => {
    const root = document.documentElement
    if (dark) root.classList.add('dark')
    else root.classList.remove('dark')
    const s = getSettings()
    saveSettings({ ...s, dark })
  }, [dark])

  const toggle = useCallback(() => setDark((d) => !d), [])
  return { dark, toggle }
}

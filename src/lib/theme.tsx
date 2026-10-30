import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

type Ctx = { dark: boolean; toggle: () => void }
const ThemeCtx = createContext<Ctx>({ dark: false, toggle: () => {} })

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [dark, setDark] = useState(() => {
    try {
      const saved = localStorage.getItem('agencyos-theme')
      if (saved) return saved === 'dark'
    } catch {}
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false
  })

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    try {
      localStorage.setItem('agencyos-theme', dark ? 'dark' : 'light')
    } catch {}
  }, [dark])

  return <ThemeCtx.Provider value={{ dark, toggle: () => setDark((d) => !d) }}>{children}</ThemeCtx.Provider>
}

export const useTheme = () => useContext(ThemeCtx)

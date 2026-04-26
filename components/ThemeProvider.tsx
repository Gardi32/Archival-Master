'use client'
import { createContext, useContext, useEffect, useState } from 'react'

export type AppTheme = 'orange' | 'blue' | 'purple' | 'green' | 'cyan' | 'rose'

interface ThemeContextValue {
  theme: AppTheme
  setTheme: (t: AppTheme) => void
}

const ThemeContext = createContext<ThemeContextValue>({ theme: 'orange', setTheme: () => {} })

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<AppTheme>('orange')

  useEffect(() => {
    const saved = localStorage.getItem('am-theme') as AppTheme | null
    if (saved) applyTheme(saved)
  }, [])

  function applyTheme(t: AppTheme) {
    setThemeState(t)
    localStorage.setItem('am-theme', t)
    if (t === 'orange') {
      document.documentElement.removeAttribute('data-theme')
    } else {
      document.documentElement.setAttribute('data-theme', t)
    }
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme: applyTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}

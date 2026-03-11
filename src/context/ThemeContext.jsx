import { createContext, useContext, useEffect, useState } from 'react'

const ThemeContext = createContext(null)

export function ThemeProvider({ children }) {
  const [dark, setDark] = useState(() => {
    // Dark é o padrão — só usa light se explicitamente salvo
    return localStorage.getItem('psr-theme') !== 'light'
  })

  useEffect(() => {
    const root = document.documentElement
    if (dark) {
      root.classList.add('dark')
      localStorage.setItem('psr-theme', 'dark')
      // Atualiza theme-color do browser (barra do Chrome no Android)
      document.getElementById('theme-color-meta')?.setAttribute('content', '#111827')
    } else {
      root.classList.remove('dark')
      localStorage.setItem('psr-theme', 'light')
      document.getElementById('theme-color-meta')?.setAttribute('content', '#ffffff')
    }
  }, [dark])

  return (
    <ThemeContext.Provider value={{ dark, toggle: () => setDark(d => !d) }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme deve ser usado dentro de ThemeProvider')
  return ctx

}

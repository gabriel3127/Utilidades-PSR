// src/components/shared/ThemeToggle.jsx
import { useTheme } from '@/context/ThemeContext'

// dark=true  → mostra ☀️ (clicar vai para claro)
// dark=false → mostra 🌙 (clicar vai para escuro)
export function ThemeToggle({ collapsed = false }) {
  const { dark, toggle } = useTheme()

  if (collapsed) {
    return (
      <button
        onClick={toggle}
        title={dark ? 'Modo claro' : 'Modo escuro'}
        style={{
          width: '100%', background: 'rgba(255,255,255,0.04)',
          border: '1px solid #334155', borderRadius: 8,
          color: dark ? '#fbbf24' : '#818cf8',
          cursor: 'pointer', fontSize: 14,
          padding: '7px 0', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
        }}
      >
        {dark ? '☀️' : '🌙'}
      </button>
    )
  }

  return (
    <button
      onClick={toggle}
      style={{
        width: '100%', background: 'rgba(255,255,255,0.04)',
        border: '1px solid #334155', borderRadius: 8,
        color: '#94a3b8', cursor: 'pointer', fontSize: 12,
        fontWeight: 600, padding: '7px 10px', fontFamily: 'inherit',
        display: 'flex', alignItems: 'center', gap: 8,
        transition: 'all 0.15s',
      }}
    >
      <span style={{ fontSize: 14 }}>{dark ? '☀️' : '🌙'}</span>
      <span>{dark ? 'Modo claro' : 'Modo escuro'}</span>
    </button>
  )
}

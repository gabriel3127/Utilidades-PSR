export function Spinner({ size = 24, color = '#6366f1' }) {
  return (
    <div style={{
      width: size, height: size,
      border: `${Math.max(2, size / 10)}px solid rgba(255,255,255,0.1)`,
      borderTopColor: color,
      borderRadius: '50%',
      animation: 'spin 0.7s linear infinite',
      display: 'inline-block',
    }} />
  )
}
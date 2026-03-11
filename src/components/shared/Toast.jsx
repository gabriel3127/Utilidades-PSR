export function Toast({ toasts = [], onDismiss }) {
  if (!toasts.length) return null

  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
      display: 'flex', flexDirection: 'column', gap: 8,
      maxWidth: 360,
    }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '12px 16px',
          borderRadius: 10,
          fontSize: 13, fontWeight: 500,
          boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
          animation: 'fadeIn 0.2s ease-out',
          background:
            t.type === 'error'   ? '#450a0a' :
            t.type === 'warning' ? '#422006' : '#052e16',
          color:
            t.type === 'error'   ? '#fca5a5' :
            t.type === 'warning' ? '#fcd34d' : '#86efac',
          border: `1px solid ${
            t.type === 'error'   ? '#7f1d1d' :
            t.type === 'warning' ? '#78350f' : '#14532d'
          }`,
        }}>
          <span style={{ fontSize: 15 }}>
            {t.type === 'error' ? '✕' : t.type === 'warning' ? '⚠' : '✓'}
          </span>
          <span style={{ flex: 1 }}>{t.message}</span>
          {onDismiss && (
            <button onClick={() => onDismiss(t.id)} style={{
              background: 'none', border: 'none', color: 'inherit',
              cursor: 'pointer', fontSize: 14, opacity: 0.6,
              padding: '0 2px', lineHeight: 1,
            }}>✕</button>
          )}
        </div>
      ))}
    </div>
  )
}
// src/components/shared/NotificationBell.jsx
import { useState, useRef, useEffect } from 'react'
import { useNotifications } from '@/hooks/useNotifications'

const ICON_MAP = {
  occ_created: '⚠️',
  occ_urgent:  '🚨',
  vis_created: '🔧',
}

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)  return 'agora'
  if (m < 60) return `${m}min`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}d`
}

export function NotificationBell({ userId, dark = true }) {
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications(userId)
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  // Fechar ao clicar fora
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const bg        = dark ? '#1e293b' : '#ffffff'
  const border    = dark ? '#334155' : '#e2e8f0'
  const textMain  = dark ? '#e2e8f0' : '#0f172a'
  const textMuted = dark ? '#64748b' : '#94a3b8'

  const handleClick = (n) => {
    if (!n.lida) markRead(n.id)
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {/* Botão sino */}
      <button onClick={() => setOpen(o => !o)} style={{
        background: 'none', border: 'none', cursor: 'pointer',
        padding: 6, position: 'relative', display: 'flex', alignItems: 'center',
        borderRadius: 8,
        background: open ? (dark ? 'rgba(99,102,241,0.15)' : '#f1f5f9') : 'none',
      }}>
        <span style={{ fontSize: 20, lineHeight: 1 }}>🔔</span>
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute', top: 2, right: 2,
            background: '#ef4444', color: '#fff',
            borderRadius: '50%', minWidth: 16, height: 16, padding: '0 3px',
            fontSize: 10, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            lineHeight: 1, border: `2px solid ${bg}`,
          }}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)', right: 0, zIndex: 1000,
          background: bg, border: `1px solid ${border}`,
          borderRadius: 14, width: 340, maxHeight: 480,
          boxShadow: '0 12px 40px rgba(0,0,0,0.35)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>

          {/* Header dropdown */}
          <div style={{
            padding: '14px 16px 10px',
            borderBottom: `1px solid ${border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            flexShrink: 0,
          }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: textMain }}>
              Notificações
              {unreadCount > 0 && (
                <span style={{
                  marginLeft: 8, background: '#ef4444', color: '#fff',
                  borderRadius: 20, padding: '1px 7px', fontSize: 11, fontWeight: 700,
                }}>{unreadCount}</span>
              )}
            </div>
            {unreadCount > 0 && (
              <button onClick={markAllRead} style={{
                background: 'none', border: 'none', color: '#6366f1',
                fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
              }}>Marcar todas como lidas</button>
            )}
          </div>

          {/* Lista */}
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {notifications.length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: textMuted }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>🔔</div>
                <div style={{ fontSize: 13 }}>Nenhuma notificação</div>
              </div>
            ) : notifications.map(n => (
              <div key={n.id} onClick={() => handleClick(n)} style={{
                padding: '12px 16px',
                borderBottom: `1px solid ${border}`,
                background: n.lida ? 'transparent' : (dark ? 'rgba(99,102,241,0.07)' : 'rgba(99,102,241,0.04)'),
                cursor: 'pointer', transition: 'background 0.12s',
                display: 'flex', gap: 10, alignItems: 'flex-start',
              }}
                onMouseEnter={e => e.currentTarget.style.background = dark ? '#334155' : '#f8fafc'}
                onMouseLeave={e => e.currentTarget.style.background = n.lida ? 'transparent' : (dark ? 'rgba(99,102,241,0.07)' : 'rgba(99,102,241,0.04)')}
              >
                {/* Ícone */}
                <div style={{
                  width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                  background: dark ? '#0f172a' : '#f1f5f9',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
                }}>
                  {ICON_MAP[n.tipo] || '🔔'}
                </div>

                {/* Conteúdo */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 13, fontWeight: n.lida ? 500 : 700,
                    color: n.lida ? textMuted : textMain,
                    lineHeight: 1.4, marginBottom: 2,
                  }}>
                    {n.titulo}
                  </div>
                  {n.descricao && (
                    <div style={{ fontSize: 11, color: textMuted, lineHeight: 1.4, marginBottom: 4 }}>
                      {n.descricao}
                    </div>
                  )}
                  <div style={{ fontSize: 10, color: textMuted }}>
                    {timeAgo(n.created_at)}
                  </div>
                </div>

                {/* Ponto não lido */}
                {!n.lida && (
                  <div style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: '#6366f1', flexShrink: 0, marginTop: 4,
                  }} />
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
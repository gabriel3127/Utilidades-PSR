import { useState, useEffect, useCallback } from 'react'
import { differenceInDays, parseISO } from 'date-fns'
import { supabase } from '@/lib/supabase'
import { ThemeProvider, useTheme } from '@/context/ThemeContext'
import { AppProvider } from '@/context/AppContext'
import { ThemeToggle } from '@/components/shared/ThemeToggle'
import { Toast } from '@/components/shared/Toast'
import { Spinner } from '@/components/shared/Spinner'
import { NotificationBell } from '@/components/shared/NotificationBell'
import { LoginPage } from '@/pages/LoginPage'
import { PipelinePage } from '@/pages/PipelinePage'
import { OccurrencesPage } from '@/pages/OccurrencesPage'
import { VisitsPage } from '@/pages/VisitsPage'
import { AdminPage } from '@/pages/AdminPage'
import { ImportPage } from '@/pages/ImportPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { ProfilePrefsModal } from '@/pages/ProfilePrefsModal'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { useNotifications, requestNotificationPermission } from '@/hooks/useNotifications'
import { GLOBAL_STYLES, PIPELINES } from '@/constants'
import { ResetPasswordPage } from '@/pages/ResetPasswordPage'

// ─── Detecção de dispositivo ──────────────────────────────────────────────────
const isMobile = () => window.innerWidth < 768

function useToast() {
  const [toasts, setToasts] = useState([])
  const show = useCallback((message, type = 'success') => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000)
  }, [])
  const dismiss = useCallback((id) => setToasts(prev => prev.filter(t => t.id !== id)), [])
  return { toasts, show, dismiss }
}

function OfflineBanner({ online, pendingCount }) {
  if (online && pendingCount.total === 0) return null
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
      background: online ? '#10b981' : '#f59e0b',
      color: '#fff', padding: '7px 16px',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      fontSize: 13, fontWeight: 600,
    }}>
      <span>{online ? '🔄' : '📶'}</span>
      <span>
        {online
          ? `Sincronizando ${pendingCount.total} item${pendingCount.total > 1 ? 's' : ''}...`
          : 'Sem internet — dados salvos localmente'}
      </span>
    </div>
  )
}

// ─── MobileHome ───────────────────────────────────────────────────────────────
function MobileHome({ profile, user, onNavigate, onSignOut, can }) {
  const { dark, toggle } = useTheme()

  const bg      = dark ? '#0f172a' : '#f8fafc'
  const surface = dark ? '#1e293b' : '#ffffff'
  const border  = dark ? '#334155' : '#e2e8f0'
  const text    = dark ? '#f1f5f9' : '#0f172a'
  const muted   = dark ? '#64748b' : '#94a3b8'
  const dim     = dark ? '#475569' : '#cbd5e1'

  const apps = [
    can('occ_create') && {
      id: 'occurrences', label: 'Nova Ocorrência', description: 'Registrar um problema',
      icon: '⚠️', color: '#f97316', gradient: 'linear-gradient(135deg, #ea580c 0%, #f97316 100%)',
    },
    can('vis_create') && {
      id: 'visits', label: 'Nova Visita', description: 'Registrar visita a cliente',
      icon: '🔧', color: '#0ea5e9', gradient: 'linear-gradient(135deg, #0284c7 0%, #0ea5e9 100%)',
    },
  ].filter(Boolean)

  return (
    <div style={{ minHeight: '100vh', background: bg, fontFamily: 'inherit' }}>
      {/* Topbar */}
      <div style={{ background: surface, borderBottom: `1px solid ${border}`, padding: '0 20px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 20 }}>📦</span>
          <div style={{ fontWeight: 700, fontSize: 13, color: text }}>PSR Embalagens</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <NotificationBell userId={user?.id} dark={dark} />
          {/* Botão tema */}
          <button onClick={toggle} style={{ background: dark ? '#334155' : '#f1f5f9', border: `1px solid ${border}`, borderRadius: '50%', width: 34, height: 34, cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {dark ? '☀️' : '🌙'}
          </button>
          <button onClick={onSignOut} style={{ background: 'none', border: 'none', color: dim, cursor: 'pointer', fontSize: 16, padding: 4 }}>⏻</button>
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: '32px 20px' }}>
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: text, marginBottom: 4 }}>Olá, {profile?.name?.split(' ')[0] || 'bem-vindo'} 👋</div>
          <div style={{ fontSize: 13, color: muted }}>O que você vai registrar hoje?</div>
        </div>

        {apps.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🔒</div>
            <div style={{ fontSize: 14, color: muted }}>Sem permissão para criar registros</div>
            <div style={{ fontSize: 12, color: dim, marginTop: 4 }}>Use o computador para acessar o sistema completo</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {apps.map(app => (
              <button key={app.id} onClick={() => onNavigate(app.id)}
                style={{ background: surface, border: `1px solid ${border}`, borderLeft: `4px solid ${app.color}`, borderRadius: 14, padding: '22px 20px', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ width: 52, height: 52, borderRadius: 14, background: app.gradient, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, boxShadow: `0 4px 12px ${app.color}44` }}>{app.icon}</div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: text, marginBottom: 4 }}>{app.label}</div>
                  <div style={{ fontSize: 12, color: muted }}>{app.description}</div>
                </div>
                <div style={{ marginLeft: 'auto', fontSize: 18, color: app.color }}>→</div>
              </button>
            ))}
          </div>
        )}

        <div style={{ marginTop: 40, padding: '14px 16px', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.15)', borderRadius: 12, fontSize: 12, color: muted, textAlign: 'center', lineHeight: 1.6 }}>
          💻 Para acessar o pipeline, dashboard e configurações, use o <strong style={{ color: '#818cf8' }}>computador</strong>
        </div>
      </div>
    </div>
  )
}

// ─── HomeScreen (desktop) ─────────────────────────────────────────────────────
function HomeScreen({ profile, user, onNavigate, onSignOut, isAdmin, can, canDashboard, canAdmin }) {
  const { dark } = useTheme()
  const [showPrefs, setShowPrefs] = useState(false)
  const [avatarOpen, setAvatarOpen] = useState(false)

  const apps = [
    can('view_pipeline') && { id: 'pipeline', label: 'Pipeline CRM', description: 'Gestão de clientes e vendas', icon: '📊', color: '#6366f1', gradient: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' },
    (can('occ_create') || can('occ_view_own') || can('occ_view_all')) && { id: 'occurrences', label: 'Ocorrências', description: 'Registrar e acompanhar problemas', icon: '⚠️', color: '#f97316', gradient: 'linear-gradient(135deg, #ea580c 0%, #f97316 100%)' },
    (can('vis_create') || can('vis_view_own') || can('vis_view_all')) && { id: 'visits', label: 'Visitas Técnicas', description: 'Registrar visitas a clientes', icon: '🔧', color: '#0ea5e9', gradient: 'linear-gradient(135deg, #0284c7 0%, #0ea5e9 100%)' },
    canDashboard && { id: 'dashboard', label: 'Dashboard', description: 'Estatísticas e indicadores', icon: '📈', color: '#10b981', gradient: 'linear-gradient(135deg, #059669 0%, #10b981 100%)' },
  ].filter(Boolean)

  const bg = dark ? '#0f172a' : '#f1f5f9', card = dark ? '#1e293b' : '#ffffff'
  const border = dark ? '#334155' : '#e2e8f0', text = dark ? '#f1f5f9' : '#0f172a', muted = dark ? '#94a3b8' : '#64748b'

  return (
    <div style={{ minHeight: '100vh', background: bg, fontFamily: 'inherit' }}>
      <div style={{ background: dark ? '#1e293b' : '#ffffff', borderBottom: `1px solid ${border}`, padding: '0 24px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 22 }}>📦</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: text, letterSpacing: '-0.3px' }}>PSR Embalagens</div>
            <div style={{ fontSize: 11, color: muted }}>Sistema de Gestão</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <ThemeToggle collapsed={false} />
          <NotificationBell userId={user?.id} dark={dark} />
          {canAdmin && (
            <button onClick={() => onNavigate('admin')} style={{ background: 'transparent', border: `1px solid ${border}`, borderRadius: 8, color: muted, cursor: 'pointer', fontSize: 12, padding: '6px 12px', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6 }}>⚙️ Admin</button>
          )}
          <div style={{ position: 'relative' }}>
            <button onClick={() => setAvatarOpen(o => !o)} style={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, color: '#fff', border: 'none', cursor: 'pointer' }}>
              {(profile?.name || profile?.email || 'U')[0].toUpperCase()}
            </button>
            {avatarOpen && (
              <div style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, zIndex: 200, background: dark ? '#1e293b' : '#fff', border: `1px solid ${border}`, borderRadius: 12, minWidth: 180, boxShadow: '0 8px 30px rgba(0,0,0,0.3)', overflow: 'hidden' }}>
                <div style={{ padding: '12px 14px', borderBottom: `1px solid ${border}` }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: text }}>{profile?.name || profile?.email}</div>
                  <div style={{ fontSize: 11, color: muted, marginTop: 2, textTransform: 'capitalize' }}>{profile?.role || 'usuário'}</div>
                </div>
                <button onClick={() => { setShowPrefs(true); setAvatarOpen(false) }} style={{ width: '100%', padding: '10px 14px', background: 'none', border: 'none', color: muted, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8 }}>🔔 Preferências de notificação</button>
                <button onClick={onSignOut} style={{ width: '100%', padding: '10px 14px', background: 'none', border: 'none', borderTop: `1px solid ${border}`, color: '#ef4444', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8 }}>⏻ Sair</button>
              </div>
            )}
          </div>
        </div>
      </div>
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '48px 24px' }}>
        <div style={{ marginBottom: 40 }}>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: text, marginBottom: 6 }}>Olá, {profile?.name?.split(' ')[0] || 'bem-vindo'} 👋</h1>
          <p style={{ fontSize: 14, color: muted }}>Selecione uma aplicação para continuar</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
          {apps.map(app => <AppCard key={app.id} app={app} card={card} border={border} text={text} muted={muted} onClick={() => onNavigate(app.id)} />)}
        </div>
        {apps.length === 0 && (
          <div style={{ textAlign: 'center', padding: '80px 0', color: muted }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: text, marginBottom: 8 }}>Sem acesso configurado</div>
            <div style={{ fontSize: 13 }}>Contate o administrador.</div>
          </div>
        )}
      </div>
      {showPrefs && <ProfilePrefsModal onClose={() => setShowPrefs(false)} />}
    </div>
  )
}

function AppCard({ app, card, border, text, muted, onClick }) {
  const [hovered, setHovered] = useState(false)
  return (
    <button onClick={onClick} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{ background: card, border: `1px solid ${hovered ? app.color : border}`, borderRadius: 16, padding: '28px 24px', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', transition: 'all 0.15s', transform: hovered ? 'translateY(-2px)' : 'none', boxShadow: hovered ? `0 8px 24px ${app.color}22` : '0 1px 3px rgba(0,0,0,0.08)', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ width: 52, height: 52, borderRadius: 14, background: app.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, boxShadow: `0 4px 12px ${app.color}44` }}>{app.icon}</div>
      <div>
        <div style={{ fontSize: 15, fontWeight: 700, color: text, marginBottom: 4 }}>{app.label}</div>
        <div style={{ fontSize: 12, color: muted, lineHeight: 1.5 }}>{app.description}</div>
      </div>
      <div style={{ fontSize: 12, fontWeight: 600, color: app.color, opacity: hovered ? 1 : 0, transition: 'opacity 0.15s' }}>Abrir →</div>
    </button>
  )
}

// ─── AppShell ─────────────────────────────────────────────────────────────────
// Usado por: Pipeline, Import, Admin, Dashboard
// A sidebar é sempre dark (design intencional — igual ao sistema antigo)
// O conteúdo usa background levemente diferente do preto puro para melhor contraste
function AppShell({ children, activeApp, setActiveApp, profile, isAdmin, can, canAdmin, onHome, onSignOut, activePipeline, setActivePipeline, accessiblePipelines, collapsed, setCollapsed }) {
  const { dark } = useTheme()
  const w = collapsed ? 56 : 220

  // Sidebar: sempre dark
  const sidebarBg     = '#1e293b'
  const sidebarBorder = '#334155'

  // Conteúdo: respeita tema
  const contentBg = dark ? '#0f172a' : '#f8fafc'

  const item = (active) => ({
    width: '100%',
    background: active ? 'rgba(99,102,241,0.2)' : 'transparent',
    color: active ? '#c7d2fe' : '#94a3b8',
    border: 'none', borderRadius: 8,
    padding: collapsed ? '9px 0' : '8px 10px',
    fontSize: 12, fontWeight: 600,
    cursor: 'pointer', fontFamily: 'inherit',
    display: 'flex', alignItems: 'center',
    justifyContent: collapsed ? 'center' : 'flex-start',
    gap: 8, marginBottom: 2, transition: 'all 0.12s',
  })

  const sectionLabel = (label) => collapsed ? null : (
    <div style={{ fontSize: 10, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '8px 8px 4px' }}>{label}</div>
  )

  // Nav content varia por módulo ativo
  const renderNav = () => {
    if (activeApp === 'pipeline' || activeApp === 'import') return (
      <>
        {sectionLabel('Pipelines')}
        {accessiblePipelines.map(p => (
          <button key={p.id}
            onClick={() => { setActivePipeline(p.id); setActiveApp('pipeline') }}
            title={collapsed ? p.label : undefined}
            style={item(activeApp === 'pipeline' && activePipeline === p.id)}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.color, flexShrink: 0 }} />
            {!collapsed && <span style={{ lineHeight: 1.3 }}>{p.label}</span>}
          </button>
        ))}
        <div style={{ borderTop: `1px solid ${sidebarBorder}`, margin: '8px 0' }} />
        {can('import_excel') && (
          <button onClick={() => setActiveApp('import')} title={collapsed ? 'Importar' : undefined} style={item(activeApp === 'import')}>
            <span>📊</span>{!collapsed && <span>Importar Excel</span>}
          </button>
        )}
      </>
    )

    if (activeApp === 'admin') return (
      <>
        {sectionLabel('Administração')}
        {[
          { id: 'users',   icon: '👥', label: 'Usuários'       },
          { id: 'perfis',  icon: '🎭', label: 'Perfis'         },
          { id: 'setores', icon: '🏢', label: 'Setores'        },
          { id: 'visitas', icon: '🔧', label: 'Tipos de Visita'},
          { id: 'tags',    icon: '🏷️', label: 'Tags'           },
          { id: 'config',  icon: '⚙️', label: 'Configurações'  },
        ].map(t => (
          <button key={t.id}
            onClick={() => window.dispatchEvent(new CustomEvent('psr:admin-tab', { detail: t.id }))}
            title={collapsed ? t.label : undefined}
            style={item(false)}>
            <span>{t.icon}</span>{!collapsed && <span>{t.label}</span>}
          </button>
        ))}
      </>
    )

    if (activeApp === 'dashboard') return (
      <>
        {sectionLabel('Dashboard')}
        {[
          { id: 'geral',       icon: '📈', label: 'Visão Geral'  },
          { id: 'pipeline',    icon: '💼', label: 'Pipeline'     },
          { id: 'ocorrencias', icon: '⚠️', label: 'Ocorrências'  },
          { id: 'visitas',     icon: '🔧', label: 'Visitas'      },
        ].map(t => (
          <button key={t.id}
            onClick={() => window.dispatchEvent(new CustomEvent('psr:dash-tab', { detail: t.id }))}
            title={collapsed ? t.label : undefined}
            style={item(false)}>
            <span>{t.icon}</span>{!collapsed && <span>{t.label}</span>}
          </button>
        ))}
      </>
    )

    return null
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: contentBg }}>
      {/* Sidebar — sempre dark */}
      <div style={{ width: w, background: sidebarBg, borderRight: `1px solid ${sidebarBorder}`, display: 'flex', flexDirection: 'column', height: '100vh', position: 'fixed', left: 0, top: 0, zIndex: 100, transition: 'width 0.2s', overflow: 'hidden' }}>
        <div style={{ padding: '10px 8px', borderBottom: `1px solid ${sidebarBorder}`, flexShrink: 0 }}>
          <button onClick={onHome} title="Início" style={item(false)}>
            <span style={{ fontSize: 13 }}>←</span>{!collapsed && <span>Início</span>}
          </button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
          {renderNav()}
        </div>
        <div style={{ padding: '8px', borderTop: `1px solid ${sidebarBorder}`, flexShrink: 0 }}>
          {canAdmin && activeApp !== 'admin' && (
            <button onClick={() => setActiveApp('admin')} title={collapsed ? 'Admin' : undefined} style={item(false)}>
              <span>⚙️</span>{!collapsed && <span>Admin</span>}
            </button>
          )}
          <div style={{ marginTop: 4 }}><ThemeToggle collapsed={collapsed} /></div>
        </div>
        <div style={{ padding: '10px 8px', borderTop: `1px solid ${sidebarBorder}`, display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 11, color: '#fff', flexShrink: 0 }}>
            {(profile?.name || profile?.email || 'U')[0].toUpperCase()}
          </div>
          {!collapsed && <>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{profile?.name || profile?.email}</div>
              <div style={{ fontSize: 10, color: '#475569', textTransform: 'capitalize' }}>{profile?.role || 'usuário'}</div>
            </div>
            <button onClick={onSignOut} title="Sair" style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: 15, padding: 2, lineHeight: 1 }}>⏻</button>
          </>}
          <button onClick={() => setCollapsed(c => !c)} style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${sidebarBorder}`, borderRadius: 6, color: '#475569', cursor: 'pointer', fontSize: 10, padding: '3px 5px', flexShrink: 0 }}>
            {collapsed ? '▶' : '◀'}
          </button>
        </div>
      </div>
      {/* Conteúdo — padding lateral para respirar */}
      <div style={{ marginLeft: w, flex: 1, transition: 'margin-left 0.2s', minWidth: 0, padding: '24px 28px', boxSizing: 'border-box', background: contentBg }}>
        {children}
      </div>
    </div>
  )
}

// ─── MainApp ──────────────────────────────────────────────────────────────────
function MainApp({ user, profile }) {
  const [activeApp, setActiveApp]           = useState(null)
  const [activePipeline, setActivePipeline] = useState(null)
  const [columns, setColumns]               = useState([])
  const [cards, setCards]                   = useState([])
  const [notifRules, setNotifRules]         = useState([])
  const [notifications, setNotifications]   = useState([])
  const [allUsers, setAllUsers]             = useState([])
  const [locationTags, setLocationTags]     = useState([])
  const [appSettings, setAppSettings]       = useState({ days_without_purchase_alert: 30, days_with_sale_threshold: 60 })
  const [collapsed, setCollapsed]           = useState(false)
  const { toasts, show: showToast, dismiss } = useToast()
  const { online, pendingCount, refreshPending } = useOnlineStatus()
  const { dark } = useTheme()

  const mobile  = isMobile()
  const isAdmin = profile?.role === 'admin'

  // Verifica permissão: primeiro module_permissions do usuário, depois role_permissions global, depois legado
  const can = (key) => {
    if (isAdmin) return true
    const mp = profile?.module_permissions
    // Mapeamento de chaves legadas para nova estrutura
    const modMap = {
      view_pipeline:  () => mp?.pipeline?.enabled,
      pip_create:     () => mp?.pipeline?.enabled && mp?.pipeline?.can_create,
      pip_edit:       () => mp?.pipeline?.enabled && mp?.pipeline?.can_edit,
      pip_delete:     () => mp?.pipeline?.enabled && mp?.pipeline?.can_delete,
      import_excel:   () => mp?.pipeline?.enabled && mp?.pipeline?.can_import,
      pip_config:     () => mp?.pipeline?.enabled && mp?.pipeline?.can_config,
      occ_create:     () => mp?.occurrences?.enabled && mp?.occurrences?.can_create,
      occ_view_own:   () => mp?.occurrences?.enabled,
      occ_view_all:   () => mp?.occurrences?.enabled && mp?.occurrences?.view_all,
      occ_resolve:    () => mp?.occurrences?.enabled && mp?.occurrences?.can_resolve,
      occ_edit:       () => mp?.occurrences?.enabled && mp?.occurrences?.can_edit,
      occ_delete:     () => mp?.occurrences?.enabled && mp?.occurrences?.can_delete,
      occ_export:     () => mp?.occurrences?.enabled && mp?.occurrences?.can_export,
      vis_create:     () => mp?.visits?.enabled && mp?.visits?.can_create,
      vis_view_own:   () => mp?.visits?.enabled,
      vis_view_all:   () => mp?.visits?.enabled && mp?.visits?.view_all,
      vis_edit:       () => mp?.visits?.enabled && mp?.visits?.can_edit,
      vis_delete:     () => mp?.visits?.enabled && mp?.visits?.can_delete,
      vis_export:     () => mp?.visits?.enabled && mp?.visits?.can_export,
      view_dashboard: () => mp?.dashboard?.enabled,
      view_admin:     () => mp?.admin_panel?.enabled,
    }
    if (mp && Object.keys(mp).length > 0 && modMap[key]) return !!(modMap[key]())
    // Fallback legado
    return !!(profile?.permissions?.[key])
  }

  const canDashboard = isAdmin || profile?.role === 'gerente' || can('view_dashboard')
  const canAdmin     = isAdmin || can('view_admin')

  const accessiblePipelines = PIPELINES.filter(p =>
    isAdmin || profile?.role === 'gerente' ||
    (profile?.module_permissions?.pipeline?.enabled && (profile?.module_permissions?.pipeline?.pipelines || []).includes(p.id)) ||
    (profile?.pipelines || []).includes(p.id)
  )

  useEffect(() => {
    if (accessiblePipelines.length > 0 && !activePipeline) setActivePipeline(accessiblePipelines[0].id)
  }, [profile])

  useEffect(() => {
    const onOcc = (e) => { refreshPending(); showToast(`${e.detail?.count || ''} ocorrência(s) sincronizada(s)`) }
    const onVis = (e) => { refreshPending(); showToast(`${e.detail?.count || ''} visita(s) sincronizada(s)`) }
    window.addEventListener('psr:occurrences-synced', onOcc)
    window.addEventListener('psr:visits-synced', onVis)
    return () => { window.removeEventListener('psr:occurrences-synced', onOcc); window.removeEventListener('psr:visits-synced', onVis) }
  }, [showToast, refreshPending])

  useEffect(() => {
    supabase.from('app_settings').select('*').eq('id', 'global').single()
      .then(({ data }) => { if (data) setAppSettings(prev => ({ ...prev, ...data })) })
  }, [])

  const loadData = useCallback(async () => {
    if (!activePipeline) return
    const [colRes, cardRes, ruleRes, userRes, locRes, rolePermRes] = await Promise.all([
      supabase.from('pipeline_columns').select('*').eq('pipeline_id', activePipeline).order('position'),
      supabase.from('pipeline_cards').select('*').eq('pipeline_id', activePipeline).order('position'),
      supabase.from('notification_rules').select('*').eq('pipeline_id', activePipeline),
      supabase.from('profiles').select('id,name,role,pipelines,permissions,module_permissions').eq('active', true),
      supabase.from('location_tags').select('*').order('name'),
      supabase.from('role_permissions').select('role,permissions'),
    ])
    if (colRes.data)  setColumns(colRes.data)
    if (cardRes.data) setCards(cardRes.data)
    if (ruleRes.data) setNotifRules(ruleRes.data)
    if (userRes.data) {
      // Mapa de permissões por role (salvas pelo admin)
      const rolePerms = {}
      rolePermRes.data?.forEach(rp => { rolePerms[rp.role] = rp.permissions })

      const filtered = userRes.data.filter(u => {
        if (u.role === 'admin' || u.role === 'gerente') return true
        // 1. module_permissions salvo diretamente no usuário
        const mp = u.module_permissions
        if (mp && Object.keys(mp).length > 0) {
          return mp.pipeline?.enabled && (mp.pipeline.pipelines || []).includes(activePipeline)
        }
        // 2. Sem module_permissions — usar role_permissions (configurado pelo admin na aba Perfis)
        const rp = rolePerms[u.role]
        if (rp) {
          return rp.pipeline?.enabled && (rp.pipeline.pipelines || []).includes(activePipeline)
        }
        // 3. Legado: campo pipelines[] direto no profile
        if ((u.pipelines || []).includes(activePipeline)) return true
        return false
      })
      setAllUsers(filtered)
    }
    if (locRes.data)  setLocationTags(locRes.data)
  }, [activePipeline])

  useEffect(() => { loadData() }, [loadData])

  useEffect(() => {
    if (!cards.length || !columns.length) return
    columns.forEach(col => {
      if (!col.max_days || !col.auto_move_to_column_id) return
      cards
        .filter(c => c.column_id === col.id && c.updated_at && differenceInDays(new Date(), parseISO(c.updated_at)) >= col.max_days)
        .forEach(async card => {
          const now = new Date().toISOString()
          await supabase.from('pipeline_cards').update({ column_id: col.auto_move_to_column_id, updated_at: now }).eq('id', card.id)
          setCards(prev => prev.map(c => c.id === card.id ? { ...c, column_id: col.auto_move_to_column_id, updated_at: now } : c))
        })
    })
  }, [cards, columns])

  const onSignOut = async () => { await supabase.auth.signOut() }
  const bannerH   = (!online || pendingCount.total > 0) ? 36 : 0

  // ── Grupo sidebar: Pipeline, Import, Admin, Dashboard ──
  const sidebarApps = ['pipeline', 'import', 'admin', 'dashboard']

  const ctx = {
    user, profile, isAdmin, can, onSignOut,
    activePipeline, setActivePipeline, accessiblePipelines,
    columns, setColumns, cards, setCards,
    notifRules, setNotifRules, notifications, setNotifications,
    allUsers, locationTags, setLocationTags,
    appSettings, setAppSettings,
    loadData, showToast, online, pendingCount, refreshPending,
    dark,
  }

  return (
    <AppProvider value={ctx}>
      <OfflineBanner online={online} pendingCount={pendingCount} />
      <Toast toasts={toasts} onDismiss={dismiss} />

      <div style={{ paddingTop: bannerH }}>

        {/* ── MOBILE ─────────────────────────────────────────────── */}
        {mobile && !activeApp && (
          <MobileHome profile={profile} user={user} can={can} onNavigate={setActiveApp} onSignOut={onSignOut} />
        )}
        {mobile && activeApp === 'occurrences' && <OccurrencesPage onBack={() => setActiveApp(null)} />}
        {mobile && activeApp === 'visits'      && <VisitsPage      onBack={() => setActiveApp(null)} />}

        {/* ── DESKTOP: Home ──────────────────────────────────────── */}
        {!mobile && !activeApp && (
          <HomeScreen profile={profile} user={user} isAdmin={isAdmin} can={can} canDashboard={canDashboard} canAdmin={canAdmin} onNavigate={setActiveApp} onSignOut={onSignOut} />
        )}

        {/* ── DESKTOP: Ocorrências — sem sidebar, topbar na própria página ── */}
        {!mobile && activeApp === 'occurrences' && (
          <OccurrencesPage onBack={() => setActiveApp(null)} />
        )}

        {/* ── DESKTOP: Visitas — sem sidebar, topbar na própria página ── */}
        {!mobile && activeApp === 'visits' && (
          <VisitsPage onBack={() => setActiveApp(null)} />
        )}

        {/* ── DESKTOP: Pipeline, Import, Admin, Dashboard — sidebar ── */}
        {!mobile && activeApp && sidebarApps.includes(activeApp) && (
          <AppShell
            activeApp={activeApp} setActiveApp={setActiveApp}
            profile={profile} isAdmin={isAdmin} can={can} canAdmin={canAdmin}
            onHome={() => setActiveApp(null)} onSignOut={onSignOut}
            activePipeline={activePipeline} setActivePipeline={setActivePipeline}
            accessiblePipelines={accessiblePipelines}
            collapsed={collapsed} setCollapsed={setCollapsed}
          >
            {activeApp === 'pipeline'  && can('view_pipeline') && <PipelinePage />}
            {activeApp === 'import'    && <ImportPage />}
            {activeApp === 'admin'     && canAdmin && <AdminPage />}
            {activeApp === 'dashboard' && canDashboard && <DashboardPage onBack={() => setActiveApp(null)} />}
          </AppShell>
        )}

      </div>
    </AppProvider>
  )
}

// ─── Root ─────────────────────────────────────────────────────────────────────
function Root() {
  const [session, setSession] = useState(undefined)
  const [profile, setProfile] = useState(null)
  const [isRecovery,  setIsRecovery]  = useState(false)

  useEffect(() => {
    const hash = window.location.hash
    if (hash.includes('type=recovery')) {
      setIsRecovery(true)
    }
    
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session?.user) loadProfile(session.user.id)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setSession(session)
      if (session?.user) loadProfile(session.user.id)
      else setProfile(null)
    })
    return () => subscription.unsubscribe()
  }, [])

  const loadProfile = async (uid) => {
    // Carrega perfil do usuário + permissões do role (salvas pelo admin)
    const [{ data: profileData }, { data: rolePermsData }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', uid).single(),
      supabase.from('role_permissions').select('role, permissions, label, icon'),
    ])

    if (!profileData) return

      if (profileData.active === false) {
    await supabase.auth.signOut()
    return
  }

    // Se o usuário não tem module_permissions próprias, aplica as do role
    const roleMap = {}
    rolePermsData?.forEach(rp => { roleMap[rp.role] = rp })

    const mp = profileData.module_permissions
    const hasOwnPerms = mp && Object.keys(mp).length > 0

    if (!hasOwnPerms && roleMap[profileData.role]?.permissions) {
      profileData.module_permissions = roleMap[profileData.role].permissions
    }

    // Aplica label/icon customizado do role se existir
    if (roleMap[profileData.role]?.label) {
      profileData._roleLabel = roleMap[profileData.role].label
      profileData._roleIcon  = roleMap[profileData.role].icon
    }

    setProfile(profileData)

    // Pedir permissão de notificação do browser (só pede uma vez, o browser lembra)
    requestNotificationPermission()
  }

  if (session === undefined) return (
    <div style={{ minHeight: '100vh', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
      <span style={{ fontSize: 40 }}>📦</span><Spinner size={28} />
    </div>
  )

  if (!session) return <LoginPage />
  return <MainApp user={session.user} profile={profile} />
}

  export default function App() {
  return <ThemeProvider><Root /></ThemeProvider>
}
/**
 * SidebarLayout — Pipeline, DashboardPage, AdminPage
 *
 * Props:
 *   sidebarContent : (collapsed: boolean) => ReactNode
 *   children       : ReactNode
 *   onBack         : () => void
 *   profile        : { name, email, role }
 *   onLogout?      : () => void
 */
import { useState } from 'react'
import { useTheme } from '@/context/ThemeContext'

export function SidebarLayout({ sidebarContent, children, onBack, profile, onLogout }) {
  const { dark, toggle } = useTheme()
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950">

      {/* ── Sidebar ──────────────────────────────────────────────── */}
      <aside
        style={{ width: collapsed ? 56 : 280, minWidth: collapsed ? 56 : 280 }}
        className="flex flex-col h-full transition-[width] duration-200
          bg-[#1a2236] border-r border-white/5 z-10">

        {/* Topo */}
        <div className="flex items-center h-14 px-3 border-b border-white/5 flex-shrink-0 gap-2">
          {!collapsed && (
            <button onClick={onBack}
              className="flex-1 flex items-center gap-1.5 bg-transparent border-none cursor-pointer
                text-slate-400 hover:text-slate-200 text-[13px] font-semibold p-0 transition-colors">
              ← Início
            </button>
          )}
          {collapsed && <div className="flex-1" />}
          <button onClick={() => setCollapsed(c => !c)}
            className="w-7 h-7 flex-shrink-0 flex items-center justify-center rounded-lg
              bg-white/5 hover:bg-white/10 text-slate-400 hover:text-slate-200
              border-none cursor-pointer transition-colors text-[10px] font-bold">
            {collapsed ? '▶' : '◀'}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden py-2 px-2">
          {sidebarContent(collapsed)}
        </nav>

        {/* Footer */}
        <div className="flex-shrink-0 border-t border-white/5 p-2 space-y-1">
          {/* Theme toggle */}
          <div className={`flex items-center gap-2 px-2 py-1.5 rounded-lg
            ${collapsed ? 'justify-center' : 'justify-between'}`}>
            {!collapsed && (
              <span className="text-[12px] text-slate-500">🌙 Modo escuro</span>
            )}
            <button onClick={toggle}
              style={{ width: 36, height: 20 }}
              className={`relative rounded-full border-none cursor-pointer flex-shrink-0
                transition-colors ${dark ? 'bg-indigo-500' : 'bg-slate-600'}`}>
              <div style={{ left: dark ? 18 : 2 }}
                className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-[left] duration-150" />
            </button>
          </div>

          {/* User */}
          {profile && (
            <div className={`flex items-center gap-2.5 px-2 py-1.5 rounded-lg
              ${collapsed ? 'justify-center' : ''}`}>
              <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center
                text-[11px] font-bold text-white bg-gradient-to-br from-indigo-500 to-violet-500">
                {(profile.name || profile.email || 'U')[0].toUpperCase()}
              </div>
              {!collapsed && (
                <>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] font-semibold text-slate-300 truncate">
                      {profile.name || profile.email}
                    </div>
                    <div className="text-[10px] text-slate-500 capitalize">{profile.role}</div>
                  </div>
                  {onLogout && (
                    <button onClick={onLogout} title="Sair"
                      className="w-6 h-6 flex items-center justify-center rounded-md
                        text-slate-500 hover:text-red-400 hover:bg-red-500/10
                        bg-transparent border-none cursor-pointer transition-colors text-sm">
                      ⏻
                    </button>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </aside>

      {/* ── Main ─────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden min-w-0">
        {children}
      </main>
    </div>
  )
}

/* ── Primitivos reutilizáveis ──────────────────────────────────────────────── */

/** Item de navegação na sidebar */
export function SidebarNavItem({ icon, label, active, onClick, collapsed, badge, dotColor }) {
  return (
    <button onClick={onClick} title={collapsed ? label : undefined}
      className={`w-full flex items-center gap-2.5 rounded-lg text-left cursor-pointer
        border-none transition-all mb-0.5
        ${collapsed ? 'justify-center px-0 py-2.5' : 'px-3 py-2.5'}
        ${active
          ? 'bg-indigo-500/20 text-indigo-300'
          : 'bg-transparent text-slate-400 hover:bg-white/5 hover:text-slate-200'
        }`}>
      {dotColor
        ? <span style={{ background: dotColor }} className="w-2 h-2 rounded-full flex-shrink-0" />
        : <span className="flex-shrink-0 text-[15px] leading-none w-5 text-center">{icon}</span>
      }
      {!collapsed && <span className="flex-1 text-[13px] font-medium truncate">{label}</span>}
      {!collapsed && badge > 0 && (
        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-400">
          {badge}
        </span>
      )}
    </button>
  )
}

/** Separador de grupo com label */
export function SidebarDivider({ label, collapsed }) {
  if (collapsed) return <div className="my-1.5 mx-1 border-t border-white/5" />
  return (
    <div className="px-3 pt-4 pb-1.5">
      <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">{label}</span>
    </div>
  )
}
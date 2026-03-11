/**
 * TopbarLayout — OccurrencesPage, VisitsPage
 *
 * Props:
 *   title      : string
 *   subtitle?  : string
 *   action?    : ReactNode   (botão "+ Nova")
 *   filters?   : ReactNode   (busca, selects de filtro)
 *   onBack     : () => void
 *   children   : ReactNode
 */
import { useTheme } from '@/context/ThemeContext'

export function TopbarLayout({ title, subtitle, action, filters, onBack, children }) {
  const { dark, toggle } = useTheme()

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950">

      {/* ── Header ───────────────────────────────────────────────── */}
      <header className="flex-shrink-0 bg-white dark:bg-slate-900
        border-b border-slate-200 dark:border-slate-800">

        {/* Linha principal */}
        <div className="flex items-center gap-3 px-6 h-14">
          <button onClick={onBack}
            className="flex-shrink-0 flex items-center gap-1.5 bg-transparent border-none
              cursor-pointer text-slate-400 hover:text-slate-600 dark:hover:text-slate-300
              text-[13px] font-semibold p-0 transition-colors">
            ← Início
          </button>

          <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 flex-shrink-0" />

          <div className="flex-1 min-w-0">
            <div className="text-[17px] font-bold text-slate-900 dark:text-slate-100 leading-tight truncate">
              {title}
            </div>
            {subtitle && (
              <div className="text-[12px] text-slate-400 mt-0.5 truncate">{subtitle}</div>
            )}
          </div>

          {action && <div className="flex-shrink-0">{action}</div>}
        </div>

        {/* Linha de filtros (opcional) */}
        {filters && (
          <div className="px-6 pb-3">
            {filters}
          </div>
        )}
      </header>

      {/* ── Conteúdo ─────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        {children}
      </div>
    </div>
  )
}
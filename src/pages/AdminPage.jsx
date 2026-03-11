import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { useApp } from "@/context/AppContext"
import { Modal } from "@/components/shared/Modal"
import { FormField } from "@/components/shared/FormField"
import { PIPELINES } from "@/constants"

const card     = `bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 mb-4`
const input    = `w-full px-3 py-2.5 rounded-xl text-[13px] outline-none transition-colors bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:border-indigo-400 dark:focus:border-indigo-500 placeholder:text-slate-400`
const btnPrimary = `inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-[13px] font-semibold bg-gradient-to-br from-indigo-500 to-violet-500 text-white border-none cursor-pointer hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed`
const btnEdit    = `px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors border bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 border-indigo-500/20 hover:bg-indigo-500/20`
const btnDanger  = `px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors border bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/20`

const COLORS_PRESET = ["#ef4444","#f97316","#f59e0b","#10b981","#3b82f6","#8b5cf6","#ec4899","#06b6d4","#64748b","#6366f1"]

const TABS = [
  { id: "users",   label: "Usuários",       icon: "👥" },
  { id: "perfis",  label: "Perfis",          icon: "🎭" },
  { id: "setores", label: "Setores",         icon: "🏢" },
  { id: "visitas", label: "Tipos de Visita", icon: "🔧" },
  { id: "tags",    label: "Tags",            icon: "🏷️" },
  { id: "config",  label: "Configurações",   icon: "⚙️" },
]

const ROLES = [
  { id: "admin",               icon: "👑", label: "Administrador",       desc: "Acesso total, incluindo painel admin" },
  { id: "gerente",             icon: "🔷", label: "Gerente",             desc: "Tudo exceto painel de administração" },
  { id: "vendedor",            icon: "💼", label: "Vendedor (Pipeline)", desc: "Acesso ao pipeline de vendas" },
  { id: "ocorrencias",         icon: "⚠️", label: "Ocorrências",         desc: "Somente módulo de ocorrências" },
  { id: "ocorrencias_visitas", icon: "🔧", label: "Ocor. + Visitas",     desc: "Ocorrências e visitas técnicas" },
]

const DEFAULT_PERMS = {
  admin: {
    pipeline:    { enabled: true,  pipelines: PIPELINES.map(p => p.id), can_create: true, can_edit: true, can_delete: true, can_import: true, can_config: true },
    occurrences: { enabled: true,  setores: [],    can_create: true,  can_edit: true,  can_resolve: true, can_delete: true,  can_export: true,  view_all: true  },
    visits:      { enabled: true,  setores: [],    can_create: true,  can_edit: true,  can_delete: true,  can_export: true,  view_all: true  },
    dashboard:   { enabled: true  },
    admin_panel: { enabled: true  },
  },
  gerente: {
    pipeline:    { enabled: true,  pipelines: PIPELINES.map(p => p.id), can_create: true, can_edit: true, can_delete: false, can_import: true, can_config: false },
    occurrences: { enabled: true,  setores: [],    can_create: false, can_edit: false, can_resolve: true, can_delete: false, can_export: true,  view_all: true  },
    visits:      { enabled: true,  setores: [],    can_create: false, can_edit: false, can_delete: false, can_export: true,  view_all: true  },
    dashboard:   { enabled: true  },
    admin_panel: { enabled: false },
  },
  vendedor: {
    pipeline:    { enabled: true,  pipelines: [],  can_create: true, can_edit: true, can_delete: false, can_import: false, can_config: false },
    occurrences: { enabled: false, setores: [],    can_create: false, can_edit: false, can_resolve: false, can_delete: false, can_export: false, view_all: false },
    visits:      { enabled: false, setores: [],    can_create: false, can_edit: false, can_delete: false,  can_export: false, view_all: false },
    dashboard:   { enabled: false },
    admin_panel: { enabled: false },
  },
  ocorrencias: {
    pipeline:    { enabled: false, pipelines: [], can_create: false, can_edit: false, can_delete: false, can_import: false, can_config: false },
    occurrences: { enabled: true,  setores: [],   can_create: true,  can_edit: false, can_resolve: false, can_delete: false, can_export: false, view_all: false },
    visits:      { enabled: false, setores: [],   can_create: false, can_edit: false, can_delete: false,  can_export: false, view_all: false },
    dashboard:   { enabled: false },
    admin_panel: { enabled: false },
  },
  ocorrencias_visitas: {
    pipeline:    { enabled: false, pipelines: [], can_create: false, can_edit: false, can_delete: false, can_import: false, can_config: false },
    occurrences: { enabled: true,  setores: [],   can_create: true,  can_edit: false, can_resolve: false, can_delete: false, can_export: false, view_all: false },
    visits:      { enabled: true,  setores: [],   can_create: true,  can_edit: false, can_delete: false,  can_export: false, view_all: false },
    dashboard:   { enabled: false },
    admin_panel: { enabled: false },
  },
}

const BLANK_PERMS = {
  pipeline:    { enabled: false, pipelines: [], can_create: false, can_edit: false, can_delete: false, can_import: false, can_config: false },
  occurrences: { enabled: false, setores: [],   can_create: false, can_edit: false, can_resolve: false, can_delete: false, can_export: false, view_all: false },
  visits:      { enabled: false, setores: [],   can_create: false, can_edit: false, can_delete: false,  can_export: false, view_all: false },
  dashboard:   { enabled: false },
  admin_panel: { enabled: false },
}

const BLANK_USER = { name: "", email: "", password: "", role: "vendedor", module_permissions: DEFAULT_PERMS.vendedor }

function ColorPicker({ value, onChange }) {
  return (
    <div className="flex gap-1.5 flex-wrap items-center">
      {COLORS_PRESET.map(c => (
        <button key={c} onClick={() => onChange(c)}
          style={{ background: c, outline: value === c ? `3px solid ${c}` : 'none', outlineOffset: 2 }}
          className="w-6 h-6 rounded-full border-none cursor-pointer flex-shrink-0" />
      ))}
      <input type="color" value={value || "#6366f1"} onChange={e => onChange(e.target.value)}
        className="w-6 h-6 border-none bg-transparent cursor-pointer p-0 rounded" />
    </div>
  )
}

function Toggle({ checked, onChange, label, small }) {
  return (
    <div className="flex items-center justify-between gap-3">
      {label && <span className={`text-slate-500 dark:text-slate-400 ${small ? 'text-[12px]' : 'text-[13px]'}`}>{label}</span>}
      <button onClick={onChange} style={{ width: small ? 36 : 44, height: small ? 20 : 24 }}
        className={`relative rounded-full border-2 cursor-pointer p-0 flex-shrink-0 transition-all ${checked ? 'bg-indigo-500 border-indigo-500' : 'bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-700'}`}>
        <div style={{ left: checked ? (small ? 18 : 22) : 2 }}
          className={`absolute top-0.5 rounded-full bg-white shadow transition-[left] duration-150 ${small ? 'w-3 h-3' : 'w-4 h-4'}`} />
      </button>
    </div>
  )
}

function EmptyState({ icon, text }) {
  return <div className="text-center py-10 text-slate-400"><div className="text-4xl mb-2">{icon}</div><div className="text-[13px]">{text}</div></div>
}
function Label({ children }) {
  return <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">{children}</div>
}

function Check({ checked, onChange, label }) {
  return (
    <label className={`flex items-center gap-2 cursor-pointer px-2.5 py-1.5 rounded-lg border transition-colors select-none
      ${checked ? 'border-indigo-500/35 bg-indigo-500/8 text-indigo-400' : 'border-slate-200 dark:border-slate-700 text-slate-400'}`}>
      <input type="checkbox" checked={!!checked} onChange={onChange} className="accent-indigo-500 w-3.5 h-3.5 flex-shrink-0" />
      <span className="text-[11px] leading-tight">{label}</span>
    </label>
  )
}

function SectionBox({ title, icon, enabled, onToggle, children }) {
  return (
    <div className={`rounded-xl border transition-colors overflow-hidden ${enabled ? 'border-indigo-500/25 bg-indigo-500/5 dark:bg-indigo-500/5' : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40'}`}>
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-base">{icon}</span>
          <span className={`text-[13px] font-semibold ${enabled ? 'text-slate-800 dark:text-slate-200' : 'text-slate-400'}`}>{title}</span>
        </div>
        <Toggle checked={!!enabled} onChange={onToggle} small />
      </div>
      {enabled && <div className="px-4 pb-4 pt-1 border-t border-indigo-500/15 dark:border-indigo-500/10">{children}</div>}
    </div>
  )
}

function ModulePermissions({ perms: rawPerms, onChange, setores }) {
  const perms = {
    pipeline:    { enabled: false, pipelines: [], can_create: false, can_edit: false, can_delete: false, can_import: false, can_config: false, ...(rawPerms?.pipeline    || {}) },
    occurrences: { enabled: false, setores: [],   can_create: false, can_edit: false, can_resolve: false, can_delete: false, can_export: false, view_all: false, ...(rawPerms?.occurrences || {}) },
    visits:      { enabled: false, setores: [],   can_create: false, can_edit: false, can_delete: false,  can_export: false, view_all: false,  ...(rawPerms?.visits      || {}) },
    dashboard:   { enabled: false, ...(rawPerms?.dashboard   || {}) },
    admin_panel: { enabled: false, ...(rawPerms?.admin_panel || {}) },
  }
  const upd = (mod, k, v) => onChange({ ...perms, [mod]: { ...perms[mod], [k]: v } })
  const toggleArr = (arr, id) => arr.includes(id) ? arr.filter(x => x !== id) : [...arr, id]

  return (
    <div className="flex flex-col gap-3">
      <SectionBox title="Pipeline de Vendas" icon="💼"
        enabled={perms.pipeline.enabled}
        onToggle={() => upd("pipeline", "enabled", !perms.pipeline.enabled)}>
        <div className="mt-3">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Pipelines com acesso</div>
          <div className="flex flex-col gap-1.5 mb-3">
            {PIPELINES.map(p => (
              <label key={p.id} className={`flex items-center gap-2.5 cursor-pointer px-3 py-2 rounded-lg border transition-colors
                ${(perms.pipeline.pipelines || []).includes(p.id) ? 'border-indigo-500/30 bg-indigo-500/10' : 'border-slate-200 dark:border-slate-700'}`}>
                <input type="checkbox" checked={(perms.pipeline.pipelines || []).includes(p.id)}
                  onChange={() => upd("pipeline", "pipelines", toggleArr(perms.pipeline.pipelines || [], p.id))}
                  className="accent-indigo-500 flex-shrink-0" />
                <span style={{ background: p.color }} className="w-2 h-2 rounded-full flex-shrink-0" />
                <span className={`text-[12px] ${(perms.pipeline.pipelines || []).includes(p.id) ? 'text-indigo-400' : 'text-slate-400'}`}>{p.label}</span>
              </label>
            ))}
          </div>
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Ações permitidas</div>
          <div className="grid grid-cols-2 gap-1.5">
            <Check checked={perms.pipeline.can_create}  onChange={() => upd("pipeline","can_create",  !perms.pipeline.can_create)}  label="Criar deals" />
            <Check checked={perms.pipeline.can_edit}    onChange={() => upd("pipeline","can_edit",    !perms.pipeline.can_edit)}    label="Editar deals" />
            <Check checked={perms.pipeline.can_delete}  onChange={() => upd("pipeline","can_delete",  !perms.pipeline.can_delete)}  label="Excluir deals" />
            <Check checked={perms.pipeline.can_import}  onChange={() => upd("pipeline","can_import",  !perms.pipeline.can_import)}  label="Importar Excel" />
            <Check checked={perms.pipeline.can_config}  onChange={() => upd("pipeline","can_config",  !perms.pipeline.can_config)}  label="Configurar estágios/colunas" />
          </div>
        </div>
      </SectionBox>

      <SectionBox title="Ocorrências" icon="⚠️"
        enabled={perms.occurrences.enabled}
        onToggle={() => upd("occurrences", "enabled", !perms.occurrences.enabled)}>
        <div className="mt-3">
          {setores.length > 0 && (
            <>
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                Setores permitidos <span className="font-normal normal-case">(vazio = todos)</span>
              </div>
              <div className="flex flex-col gap-1.5 mb-3">
                {setores.map(s => (
                  <label key={s.id} className={`flex items-center gap-2.5 cursor-pointer px-3 py-2 rounded-lg border transition-colors
                    ${(perms.occurrences.setores || []).includes(s.id) ? 'border-orange-500/30 bg-orange-500/10' : 'border-slate-200 dark:border-slate-700'}`}>
                    <input type="checkbox" checked={(perms.occurrences.setores || []).includes(s.id)}
                      onChange={() => upd("occurrences", "setores", toggleArr(perms.occurrences.setores || [], s.id))}
                      className="accent-orange-500 flex-shrink-0" />
                    <span className={`text-[12px] ${(perms.occurrences.setores || []).includes(s.id) ? 'text-orange-400' : 'text-slate-400'}`}>{s.nome}</span>
                  </label>
                ))}
              </div>
            </>
          )}
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Ações permitidas</div>
          <div className="grid grid-cols-2 gap-1.5">
            <Check checked={perms.occurrences.can_create}  onChange={() => upd("occurrences","can_create",  !perms.occurrences.can_create)}  label="Criar ocorrência" />
            <Check checked={perms.occurrences.view_all}    onChange={() => upd("occurrences","view_all",    !perms.occurrences.view_all)}    label="Ver todas (não só próprias)" />
            <Check checked={perms.occurrences.can_resolve} onChange={() => upd("occurrences","can_resolve", !perms.occurrences.can_resolve)} label="Resolver/fechar" />
            <Check checked={perms.occurrences.can_edit}    onChange={() => upd("occurrences","can_edit",    !perms.occurrences.can_edit)}    label="Editar qualquer" />
            <Check checked={perms.occurrences.can_delete}  onChange={() => upd("occurrences","can_delete",  !perms.occurrences.can_delete)}  label="Excluir" />
            <Check checked={perms.occurrences.can_export}  onChange={() => upd("occurrences","can_export",  !perms.occurrences.can_export)}  label="Exportar relatório" />
          </div>
        </div>
      </SectionBox>

      <SectionBox title="Visitas Técnicas" icon="🔧"
        enabled={perms.visits.enabled}
        onToggle={() => upd("visits", "enabled", !perms.visits.enabled)}>
        <div className="mt-3">
          {setores.length > 0 && (
            <>
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                Setores permitidos <span className="font-normal normal-case">(vazio = todos)</span>
              </div>
              <div className="flex flex-col gap-1.5 mb-3">
                {setores.map(s => (
                  <label key={s.id} className={`flex items-center gap-2.5 cursor-pointer px-3 py-2 rounded-lg border transition-colors
                    ${(perms.visits.setores || []).includes(s.id) ? 'border-orange-500/30 bg-orange-500/10' : 'border-slate-200 dark:border-slate-700'}`}>
                    <input type="checkbox" checked={(perms.visits.setores || []).includes(s.id)}
                      onChange={() => upd("visits", "setores", toggleArr(perms.visits.setores || [], s.id))}
                      className="accent-orange-500 flex-shrink-0" />
                    <span className={`text-[12px] ${(perms.visits.setores || []).includes(s.id) ? 'text-orange-400' : 'text-slate-400'}`}>{s.nome}</span>
                  </label>
                ))}
              </div>
            </>
          )}
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Ações permitidas</div>
          <div className="grid grid-cols-2 gap-1.5">
            <Check checked={perms.visits.can_create} onChange={() => upd("visits","can_create", !perms.visits.can_create)} label="Criar visita" />
            <Check checked={perms.visits.view_all}   onChange={() => upd("visits","view_all",   !perms.visits.view_all)}   label="Ver todas (não só próprias)" />
            <Check checked={perms.visits.can_edit}   onChange={() => upd("visits","can_edit",   !perms.visits.can_edit)}   label="Editar qualquer" />
            <Check checked={perms.visits.can_delete} onChange={() => upd("visits","can_delete", !perms.visits.can_delete)} label="Excluir" />
            <Check checked={perms.visits.can_export} onChange={() => upd("visits","can_export", !perms.visits.can_export)} label="Exportar relatório" />
          </div>
        </div>
      </SectionBox>

      <SectionBox title="Dashboard" icon="📊"
        enabled={perms.dashboard?.enabled}
        onToggle={() => upd("dashboard", "enabled", !perms.dashboard?.enabled)}>
        <div className="mt-2 text-[12px] text-slate-400">
          Acesso ao painel de métricas, gráficos e relatórios consolidados.
        </div>
      </SectionBox>

      <SectionBox title="Painel de Administração" icon="⚙️"
        enabled={perms.admin_panel?.enabled}
        onToggle={() => upd("admin_panel", "enabled", !perms.admin_panel?.enabled)}>
        <div className="mt-2 text-[12px] text-amber-500 dark:text-amber-400">
          ⚠️ Permite gerenciar usuários, perfis, setores e configurações do sistema.
        </div>
      </SectionBox>
    </div>
  )
}

function EditUserModal({ user, onClose, onSave }) {
  const [form,       setForm]       = useState({ ...user })
  const [loading,    setLoading]    = useState(false)
  const [roleLabels, setRoleLabels] = useState({})
  const setField = (k, v) => setForm(p => ({ ...p, [k]: v }))
  const handleSave = async () => { setLoading(true); await onSave(form); setLoading(false) }

  useEffect(() => {
    supabase.from("role_permissions").select("role,label,icon").then(({ data }) => {
      const map = {}
      data?.forEach(r => { map[r.role] = { label: r.label, icon: r.icon } })
      setRoleLabels(map)
    })
  }, [])

  const rl = (r) => {
    const saved = roleLabels[r.id]
    return { icon: saved?.icon || r.icon, label: saved?.label || r.label }
  }

  return (
    <Modal title={`Editar — ${user.name}`} onClose={onClose} width={460}>
      <div className="flex flex-col gap-4">
        <FormField label="Nome completo">
          <input value={form.name} onChange={e => setField("name", e.target.value)} className={input} autoFocus />
        </FormField>
        <FormField label="Perfil">
          <div className="flex flex-col gap-2 mt-1">
            {ROLES.map(r => {
              const { icon, label } = rl(r)
              return (
                <label key={r.id} className={`flex items-start gap-3 cursor-pointer px-3.5 py-2.5 rounded-xl border transition-all
                  ${form.role === r.id ? 'border-indigo-500/50 bg-indigo-500/8 dark:bg-indigo-500/10' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'}`}>
                  <input type="radio" checked={form.role === r.id} onChange={() => setField("role", r.id)} className="accent-indigo-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className={`text-[13px] font-semibold ${form.role === r.id ? 'text-indigo-400' : 'text-slate-700 dark:text-slate-300'}`}>{icon} {label}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">{r.desc}</div>
                  </div>
                </label>
              )
            })}
          </div>
        </FormField>
        <FormField label="Status">
          <Toggle checked={form.active !== false} label={form.active !== false ? "Ativo" : "Inativo"} onChange={() => setField("active", !form.active)} />
        </FormField>
        <div className="text-[11px] text-slate-400 bg-slate-50 dark:bg-slate-900 rounded-xl px-3 py-2.5 border border-slate-200 dark:border-slate-700">
          💡 Para ajustar permissões detalhadas do perfil, acesse <strong className="text-indigo-400">Perfis</strong> na barra lateral.
        </div>
      </div>
      <div className="flex justify-between gap-2 mt-5">
        <button onClick={onClose} className="px-4 py-2.5 rounded-xl text-[13px] font-semibold border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors bg-transparent">Cancelar</button>
        <button onClick={handleSave} disabled={loading || !form.name.trim()} className={btnPrimary}>{loading ? "Salvando..." : "✓ Salvar"}</button>
      </div>
    </Modal>
  )
}

function UserFormModal({ user, setores, onClose, onSave, isCreate }) {
  const [step,    setStep]    = useState(1)
  const [form,    setForm]    = useState(user || BLANK_USER)
  const [loading, setLoading] = useState(false)
  const totalSteps = 3

  const setField = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const handleRoleChange = (role) => {
    setForm(p => ({
      ...p, role,
      module_permissions: DEFAULT_PERMS[role] ? JSON.parse(JSON.stringify(DEFAULT_PERMS[role])) : BLANK_PERMS,
    }))
  }

  const canProceed = () => {
    if (step === 1) return form.name.trim() && form.email.trim() && form.password.length >= 6
    return true
  }

  const handleSave = async () => { setLoading(true); await onSave(form); setLoading(false) }
  const selectedRole = ROLES.find(r => r.id === form.role)

  return (
    <Modal title="Cadastrar usuário" onClose={onClose} width={580}>
      <div className="flex items-center gap-2 mb-6">
        {Array.from({ length: totalSteps }, (_, i) => i + 1).map(s => (
          <div key={s} className="flex items-center gap-2 flex-1">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-colors
              ${s < step ? 'bg-indigo-500 text-white' : s === step ? 'bg-indigo-500 text-white ring-4 ring-indigo-500/20' : 'bg-slate-200 dark:bg-slate-700 text-slate-400'}`}>
              {s < step ? "✓" : s}
            </div>
            {s < totalSteps && <div className={`flex-1 h-0.5 transition-colors ${s < step ? 'bg-indigo-500' : 'bg-slate-200 dark:bg-slate-700'}`} />}
          </div>
        ))}
      </div>

      {step === 1 && (
        <div className="flex flex-col gap-3">
          <div className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Dados básicos</div>
          <FormField label="Nome completo *">
            <input value={form.name} onChange={e => setField("name", e.target.value)} placeholder="Nome do usuário" className={input} autoFocus />
          </FormField>
          <FormField label="Email *">
            <input value={form.email} onChange={e => setField("email", e.target.value)} type="email" placeholder="email@empresa.com" className={input} />
          </FormField>
          <FormField label="Senha temporária * (mín. 6 caracteres)">
            <input value={form.password} onChange={e => setField("password", e.target.value)} type="password" placeholder="••••••••" className={input} />
          </FormField>
        </div>
      )}

      {step === 2 && (
        <div className="flex flex-col gap-3">
          <div className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Escolha o perfil</div>
          <div className="text-xs text-slate-400 mb-2">O perfil define as permissões padrão. No próximo passo você pode ajustá-las.</div>
          <div className="flex flex-col gap-2">
            {ROLES.map(r => (
              <label key={r.id} className={`flex items-start gap-3 cursor-pointer px-3.5 py-3 rounded-xl border transition-all
                ${form.role === r.id ? 'border-indigo-500/50 bg-indigo-500/8 dark:bg-indigo-500/10' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'}`}>
                <input type="radio" checked={form.role === r.id} onChange={() => handleRoleChange(r.id)} className="accent-indigo-500 mt-0.5 flex-shrink-0" />
                <div>
                  <div className={`text-[13px] font-semibold ${form.role === r.id ? 'text-indigo-400' : 'text-slate-700 dark:text-slate-300'}`}>{r.icon} {r.label}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">{r.desc}</div>
                </div>
              </label>
            ))}
          </div>
        </div>
      )}

      {step === 3 && (
        <div>
          <div className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Permissões — {selectedRole?.icon} {selectedRole?.label}
          </div>
          <div className="text-xs text-slate-400 mb-4">Pré-configurado para o perfil. Ajuste conforme necessário.</div>
          <div className="max-h-[50vh] overflow-y-auto pr-1">
            <ModulePermissions
              perms={form.module_permissions || BLANK_PERMS}
              onChange={mp => setField("module_permissions", mp)}
              setores={setores}
            />
          </div>
        </div>
      )}

      <div className="flex justify-between gap-2 mt-6">
        <button onClick={() => step > 1 ? setStep(s => s - 1) : onClose()}
          className="px-4 py-2.5 rounded-xl text-[13px] font-semibold border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors bg-transparent">
          {step === 1 ? "Cancelar" : "← Voltar"}
        </button>
        {step < totalSteps
          ? <button onClick={() => setStep(s => s + 1)} disabled={!canProceed()} className={btnPrimary}>Continuar →</button>
          : <button onClick={handleSave} disabled={loading} className={btnPrimary}>{loading ? "Salvando..." : "✓ Cadastrar"}</button>
        }
      </div>
    </Modal>
  )
}

function TabUsuarios({ showToast, me }) {
  const [users,       setUsers]       = useState([])
  const [setores,     setSetores]     = useState([])
  const [roleLabels,  setRoleLabels]  = useState({})
  const [showCreate,  setShowCreate]  = useState(false)
  const [editingUser, setEditingUser] = useState(null)

  useEffect(() => {
    supabase.from("profiles").select("*").order("name").then(({ data }) => setUsers(data || []))
    supabase.from("setores").select("id,nome").eq("ativo", true).order("nome").then(({ data }) => setSetores(data || []))
    supabase.from("role_permissions").select("role,label,icon").then(({ data }) => {
      const map = {}
      data?.forEach(r => { map[r.role] = { label: r.label, icon: r.icon } })
      setRoleLabels(map)
    })
  }, [])

  const rl = (roleId) => {
    const saved = roleLabels[roleId]
    const fallback = ROLES.find(r => r.id === roleId)
    return `${saved?.icon || fallback?.icon || ''} ${saved?.label || fallback?.label || roleId}`
  }

  const createUser = async (form) => {
    if (!form.name || !form.email || !form.password) return showToast("Preencha nome, email e senha", "error")
    const { data: authData, error } = await supabase.auth.signUp({
      email: form.email, password: form.password, options: { data: { name: form.name } }
    })
    if (error) return showToast(error.message, "error")
    if (authData.user) {
      await supabase.from("profiles").update({
        role: form.role,
        name: form.name,
        module_permissions: form.module_permissions,
      }).eq("id", authData.user.id)
      const { data } = await supabase.from("profiles").select("*").order("name")
      if (data) setUsers(data)
    }
    setShowCreate(false)
    showToast("Usuário criado!")
  }

  const saveUser = async (form) => {
    // Busca permissões do novo role para aplicar
    const { data: rolePermData } = await supabase
      .from("role_permissions")
      .select("permissions")
      .eq("role", form.role)
      .single()

    const newPerms = rolePermData?.permissions
      || DEFAULT_PERMS[form.role]
      || BLANK_PERMS

    const { error } = await supabase.from("profiles").update({
      name: form.name,
      role: form.role,
      active: form.active !== false,
      module_permissions: newPerms,  // ← sempre sobrescreve com as do role
    }).eq("id", form.id)

    if (error) return showToast(error.message, "error")
    setUsers(prev => prev.map(u => u.id === form.id ? { ...u, ...form, module_permissions: newPerms } : u))
    setEditingUser(null)
    showToast("Usuário atualizado!")
  }

  const grouped = {
    admin:               users.filter(u => u.role === "admin"),
    gerente:             users.filter(u => u.role === "gerente"),
    vendedor:            users.filter(u => u.role === "vendedor" || u.role === "user"),
    ocorrencias_visitas: users.filter(u => u.role === "ocorrencias_visitas"),
    ocorrencias:         users.filter(u => u.role === "ocorrencias"),
    outros:              users.filter(u => !["admin","gerente","vendedor","user","ocorrencias","ocorrencias_visitas"].includes(u.role)),
  }

  const permSummary = (u) => {
    const mp = u.module_permissions
    if (!mp) return null
    const tags = []
    if (mp.pipeline?.enabled)    tags.push({ label: `${(mp.pipeline.pipelines||[]).length || "todos"} pipeline${(mp.pipeline.pipelines||[]).length === 1 ? "" : "s"}`, color: "indigo" })
    if (mp.occurrences?.enabled) tags.push({ label: `ocorrências${(mp.occurrences.setores||[]).length > 0 ? ` (${mp.occurrences.setores.length} setor)` : ""}`, color: "orange" })
    if (mp.visits?.enabled)      tags.push({ label: `visitas${(mp.visits.setores||[]).length > 0 ? ` (${mp.visits.setores.length} setor)` : ""}`, color: "sky" })
    return tags
  }

  const RoleSection = ({ label, list }) => list.length === 0 ? null : (
    <div className="mb-1">
      <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-1 mb-1 mt-3 first:mt-0">{label} ({list.length})</div>
      {list.map(u => {
        const tags = permSummary(u)
        return (
          <div key={u.id} className="flex items-center gap-2.5 py-3 border-b border-slate-100 dark:border-slate-700 last:border-0">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs text-white flex-shrink-0 ${u.active === false ? 'bg-slate-400 dark:bg-slate-600' : 'bg-gradient-to-br from-indigo-500 to-violet-500'}`}>
              {(u.name || "U")[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className={`text-[13px] font-semibold ${u.active === false ? 'text-slate-400' : 'text-slate-900 dark:text-slate-200'}`}>
                {u.name}
                {u.id === me?.id && <span className="text-[10px] text-slate-400 ml-1">(você)</span>}
                {u.active === false && <span className="text-[10px] text-red-400 ml-1.5">inativo</span>}
              </div>
              {tags && tags.length > 0 && (
                <div className="flex gap-1.5 mt-0.5 flex-wrap">
                  {tags.map((t, i) => (
                    <span key={i} className={`text-[10px] font-semibold px-1.5 py-0.5 rounded
                      ${t.color === "indigo" ? "text-indigo-400 bg-indigo-500/10"
                      : t.color === "orange" ? "text-orange-400 bg-orange-500/10"
                      : "text-sky-400 bg-sky-500/10"}`}>{t.label}</span>
                  ))}
                </div>
              )}
            </div>
            {u.id !== me?.id && (
              <button onClick={() => setEditingUser({
                ...u,
                module_permissions: u.module_permissions || JSON.parse(JSON.stringify(DEFAULT_PERMS[u.role] || BLANK_PERMS)),
                active: u.active !== false,
              })} className={btnEdit}>Editar</button>
            )}
          </div>
        )
      })}
    </div>
  )

  return (
    <>
      <div className={card}>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-bold text-slate-900 dark:text-slate-100">Usuários do sistema</div>
            <div className="text-xs text-slate-400 mt-0.5">{users.length} usuário{users.length !== 1 ? "s" : ""} cadastrado{users.length !== 1 ? "s" : ""}</div>
          </div>
          <button onClick={() => setShowCreate(true)} className={btnPrimary}>+ Cadastrar</button>
        </div>
      </div>
      <div className={card}>
        {users.length === 0 ? <EmptyState icon="👥" text="Nenhum usuário cadastrado" /> : (
          <>
            <RoleSection label={rl("admin")}               list={grouped.admin} />
            <RoleSection label={rl("gerente")}             list={grouped.gerente} />
            <RoleSection label={rl("vendedor")}            list={grouped.vendedor} />
            <RoleSection label={rl("ocorrencias_visitas")} list={grouped.ocorrencias_visitas} />
            <RoleSection label={rl("ocorrencias")}         list={grouped.ocorrencias} />
            <RoleSection label="👤 Outros"                 list={grouped.outros} />
          </>
        )}
      </div>
      {showCreate  && <UserFormModal setores={setores} onClose={() => setShowCreate(false)} onSave={createUser} showToast={showToast} />}
      {editingUser && <EditUserModal user={editingUser} onClose={() => setEditingUser(null)} onSave={saveUser} />}
    </>
  )
}

function TabPerfis({ showToast }) {
  const [setores,    setSetores]    = useState([])
  const [perfsData,  setPerfsData]  = useState(null)
  const [activeRole, setActiveRole] = useState("admin")
  const [saving,     setSaving]     = useState(false)
  const [editName,   setEditName]   = useState(false)
  const [nameForm,   setNameForm]   = useState({ label: "", icon: "" })

  useEffect(() => {
    supabase.from("setores").select("id,nome").eq("ativo", true).order("nome").then(({ data }) => setSetores(data || []))
    supabase.from("role_permissions").select("*").then(({ data }) => {
      const map = {}
      ROLES.forEach(r => {
        const saved = data?.find(x => x.role === r.id)
        map[r.id] = {
          permissions: saved?.permissions ?? JSON.parse(JSON.stringify(DEFAULT_PERMS[r.id] || BLANK_PERMS)),
          label:       saved?.label ?? r.label,
          icon:        saved?.icon  ?? r.icon,
        }
      })
      setPerfsData(map)
    })
  }, [])

  const getLabel = (roleId) => perfsData?.[roleId]?.label || ROLES.find(r => r.id === roleId)?.label || roleId
  const getIcon  = (roleId) => perfsData?.[roleId]?.icon  || ROLES.find(r => r.id === roleId)?.icon  || "👤"

  const openEditName = () => { setNameForm({ label: getLabel(activeRole), icon: getIcon(activeRole) }); setEditName(true) }

  const saveNameOnly = async () => {
    if (!nameForm.label.trim()) return
    setSaving(true)
    const { error } = await supabase.from("role_permissions").upsert(
      { role: activeRole, label: nameForm.label.trim(), icon: nameForm.icon || getIcon(activeRole) },
      { onConflict: "role" }
    )
    if (!error) {
      setPerfsData(prev => ({ ...prev, [activeRole]: { ...prev[activeRole], label: nameForm.label.trim(), icon: nameForm.icon || getIcon(activeRole) } }))
      showToast("Nome atualizado!")
    } else showToast(error.message, "error")
    setSaving(false); setEditName(false)
  }

  const save = async () => {
    if (!perfsData) return
    setSaving(true)
    const d = perfsData[activeRole]

    // 1. Salvar na tabela role_permissions
    const { error } = await supabase.from("role_permissions").upsert(
      { role: activeRole, permissions: d.permissions, label: d.label, icon: d.icon },
      { onConflict: "role" }
    )
    if (error) { showToast(error.message, "error"); setSaving(false); return }

    // 2. Propagar para usuários do role sem permissões customizadas
    const { data: usersWithRole } = await supabase
      .from("profiles")
      .select("id, module_permissions")
      .eq("role", activeRole)

    if (usersWithRole?.length) {
      const usersToUpdate = usersWithRole.filter(u => {
        const mp = u.module_permissions
        return !mp || Object.keys(mp).length === 0
      })
      if (usersToUpdate.length > 0) {
        await supabase
          .from("profiles")
          .update({ module_permissions: d.permissions })
          .in("id", usersToUpdate.map(u => u.id))
      }
    }

    showToast(`Permissões de "${getLabel(activeRole)}" salvas!${usersWithRole?.length ? ` (${usersWithRole.length} usuário(s) atualizado(s))` : ""}`)
    setSaving(false)
  }

  const resetToDefault = () => {
    if (!perfsData) return
    setPerfsData(prev => ({ ...prev, [activeRole]: { ...prev[activeRole], permissions: JSON.parse(JSON.stringify(DEFAULT_PERMS[activeRole] || BLANK_PERMS)) } }))
    showToast("Permissões revertidas ao padrão", "warning")
  }

  if (!perfsData) return <div className="text-slate-400 p-8 text-center text-sm">Carregando...</div>

  const ICONS = ["👑","🔷","💼","⚠️","🔧","🚗","🏢","📋","🎯","👤","🛠️","📦","🚀","💡","🔑","🌟"]

  return (
    <div>
      <div className={card + " !p-3"}>
        <div className="flex gap-2 flex-wrap">
          {ROLES.map(r => (
            <button key={r.id} onClick={() => { setActiveRole(r.id); setEditName(false) }}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-[13px] font-semibold border transition-all cursor-pointer
                ${activeRole === r.id
                  ? 'bg-indigo-500 border-indigo-500 text-white'
                  : 'bg-transparent border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-indigo-400 hover:text-indigo-400'}`}>
              <span>{getIcon(r.id)}</span>
              <span>{getLabel(r.id)}</span>
            </button>
          ))}
        </div>
      </div>

      {editName ? (
        <div className={card}>
          <div className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-4">✏️ Renomear perfil</div>
          <div className="flex flex-col gap-3">
            <FormField label="Nome do perfil">
              <input value={nameForm.label} onChange={e => setNameForm(p => ({ ...p, label: e.target.value }))}
                className={input} autoFocus onKeyDown={e => e.key === "Enter" && saveNameOnly()} />
            </FormField>
            <FormField label="Ícone (emoji)">
              <div className="flex flex-col gap-2">
                <input value={nameForm.icon} onChange={e => setNameForm(p => ({ ...p, icon: e.target.value }))}
                  className={input + " w-24"} maxLength={4} placeholder="👤" />
                <div className="flex gap-1.5 flex-wrap">
                  {ICONS.map(ic => (
                    <button key={ic} onClick={() => setNameForm(p => ({ ...p, icon: ic }))}
                      className={`w-8 h-8 rounded-lg text-base border cursor-pointer transition-colors
                        ${nameForm.icon === ic ? 'border-indigo-500 bg-indigo-500/15' : 'border-slate-200 dark:border-slate-700 bg-transparent hover:border-indigo-400'}`}>
                      {ic}
                    </button>
                  ))}
                </div>
              </div>
            </FormField>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={saveNameOnly} disabled={saving || !nameForm.label.trim()} className={btnPrimary}>
              {saving ? "Salvando..." : "✓ Salvar nome"}
            </button>
            <button onClick={() => setEditName(false)} className={btnEdit}>Cancelar</button>
          </div>
        </div>
      ) : (
        <div className={card}>
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg">{getIcon(activeRole)}</span>
                <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{getLabel(activeRole)}</span>
                <button onClick={openEditName}
                  className="text-[11px] text-slate-400 hover:text-indigo-400 transition-colors cursor-pointer bg-transparent border-none p-0 ml-1">
                  ✏️ renomear
                </button>
              </div>
              <div className="text-xs text-slate-400 mt-1">{ROLES.find(r => r.id === activeRole)?.desc}</div>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <button onClick={resetToDefault} className={btnEdit}>↺ Padrão</button>
              <button onClick={save} disabled={saving} className={btnPrimary}>{saving ? "Salvando..." : "💾 Salvar"}</button>
            </div>
          </div>
          {activeRole === "admin" && (
            <div className="mb-4 px-3.5 py-3 rounded-xl bg-amber-500/8 border border-amber-500/20 text-[12px] text-amber-600 dark:text-amber-400">
              ⚠️ Administradores têm acesso total por padrão. Alterar estas permissões afeta todos os admins.
            </div>
          )}
          <ModulePermissions
            perms={perfsData[activeRole]?.permissions || BLANK_PERMS}
            onChange={mp => setPerfsData(prev => ({ ...prev, [activeRole]: { ...prev[activeRole], permissions: mp } }))}
            setores={setores}
          />
        </div>
      )}
    </div>
  )
}

function TabSetores({ showToast }) {
  const [setores,   setSetores]   = useState([])
  const [tipos,     setTipos]     = useState([])
  const [expanded,  setExpanded]  = useState({})
  const [editSetor, setEditSetor] = useState(null)
  const [nomeSetor, setNomeSetor] = useState("")
  const [saving,    setSaving]    = useState(false)
  const [editTipo,  setEditTipo]  = useState(null)
  const [tipoForm,  setTipoForm]  = useState({ nome: "", cor: "#ef4444" })

  useEffect(() => {
    supabase.from("setores").select("*").order("nome").then(({ data }) => setSetores(data || []))
    supabase.from("tipos_problema").select("*").order("nome").then(({ data }) => setTipos(data || []))
  }, [])

  const saveSetor = async () => {
    if (!nomeSetor.trim()) return; setSaving(true)
    if (editSetor) {
      const { error } = await supabase.from("setores").update({ nome: nomeSetor.trim() }).eq("id", editSetor.id)
      if (!error) setSetores(prev => prev.map(s => s.id === editSetor.id ? { ...s, nome: nomeSetor.trim() } : s))
      showToast(error ? error.message : "Setor atualizado!", error ? "error" : undefined)
    } else {
      const { data, error } = await supabase.from("setores").insert({ nome: nomeSetor.trim() }).select().single()
      if (!error) { setSetores(prev => [...prev, data]); showToast("Setor criado!") } else showToast(error.message, "error")
    }
    setEditSetor(null); setNomeSetor(""); setSaving(false)
  }

  const deleteSetor = async (s) => {
    const [r1, r2, r3] = await Promise.all([
      supabase.from("occurrences").select("id", { count: "exact", head: true }).eq("setor_id", s.id),
      supabase.from("visits").select("id", { count: "exact", head: true }).eq("setor_id", s.id),
      supabase.from("tipos_problema").select("id", { count: "exact", head: true }).eq("setor_id", s.id),
    ])
    const total = (r1.count||0) + (r2.count||0) + (r3.count||0)
    if (total > 0) return showToast(`Não é possível excluir: ${r1.count||0} ocorrência(s), ${r2.count||0} visita(s), ${r3.count||0} tipo(s) vinculados.`, "error")
    const { error } = await supabase.from("setores").delete().eq("id", s.id)
    if (!error) { setSetores(prev => prev.filter(x => x.id !== s.id)); showToast("Setor excluído", "warning") }
    else showToast(error.message, "error")
  }

  const toggleAtivo  = async s => { await supabase.from("setores").update({ ativo: !s.ativo }).eq("id", s.id); setSetores(prev => prev.map(x => x.id === s.id ? { ...x, ativo: !x.ativo } : x)) }
  const toggleDoc    = async s => { await supabase.from("setores").update({ requer_documento: !s.requer_documento }).eq("id", s.id); setSetores(prev => prev.map(x => x.id === s.id ? { ...x, requer_documento: !x.requer_documento } : x)); showToast(s.requer_documento ? "Documento desativado" : "Documento obrigatório ativado") }
  const toggleExpand = id => setExpanded(prev => ({ ...prev, [id]: !prev[id] }))

  const openNewTipo  = (setorId) => { setEditTipo({ setor_id: setorId, _new: true }); setTipoForm({ nome: "", cor: "#ef4444" }) }
  const openEditTipo = (t)       => { setEditTipo(t); setTipoForm({ nome: t.nome, cor: t.cor || "#ef4444" }) }

  const saveTipo = async () => {
    if (!tipoForm.nome.trim()) return
    const payload = { nome: tipoForm.nome.trim(), cor: tipoForm.cor, setor_id: editTipo.setor_id || null }
    if (editTipo._new) {
      const { data, error } = await supabase.from("tipos_problema").insert(payload).select().single()
      if (!error) { setTipos(prev => [...prev, data]); showToast("Tipo criado!") } else showToast(error.message, "error")
    } else {
      const { error } = await supabase.from("tipos_problema").update(payload).eq("id", editTipo.id)
      if (!error) { setTipos(prev => prev.map(t => t.id === editTipo.id ? { ...t, ...payload } : t)); showToast("Tipo atualizado!") }
      else showToast(error.message, "error")
    }
    setEditTipo(null)
  }

  const deleteTipo = async (t) => {
    const { count } = await supabase.from("occurrences").select("id", { count: "exact", head: true }).eq("tipo_problema_id", t.id)
    if (count > 0) return showToast(`Não é possível excluir: ${count} ocorrência(s) vinculada(s).`, "error")
    const { error } = await supabase.from("tipos_problema").delete().eq("id", t.id)
    if (!error) { setTipos(prev => prev.filter(x => x.id !== t.id)); showToast("Tipo excluído", "warning") }
    else showToast(error.message, "error")
  }

  const toggleAtivoTipo = async t => { await supabase.from("tipos_problema").update({ ativo: !t.ativo }).eq("id", t.id); setTipos(prev => prev.map(x => x.id === t.id ? { ...x, ativo: !x.ativo } : x)) }
  const tiposSemSetor   = tipos.filter(t => !t.setor_id)

  return (
    <>
      <div className={card}>
        <div className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-3.5">
          {editSetor ? `Editar: ${editSetor.nome}` : "Novo setor"}
        </div>
        <div className="flex gap-2">
          <input value={nomeSetor} onChange={e => setNomeSetor(e.target.value)} onKeyDown={e => e.key === "Enter" && saveSetor()}
            placeholder="Nome do setor..." className={input + " flex-1"} />
          <button onClick={saveSetor} disabled={saving || !nomeSetor.trim()} className={btnPrimary + " whitespace-nowrap"}>
            {editSetor ? "Salvar" : "+ Criar"}
          </button>
          {editSetor && <button onClick={() => { setEditSetor(null); setNomeSetor("") }} className={btnEdit}>Cancelar</button>}
        </div>
      </div>

      <div className={card}>
        <Label>Setores ({setores.length})</Label>
        {setores.length === 0 ? <EmptyState icon="🏢" text="Nenhum setor cadastrado" /> : setores.map(s => {
          const tiposDoSetor = tipos.filter(t => t.setor_id === s.id)
          const isOpen = !!expanded[s.id]
          return (
            <div key={s.id} className="border border-slate-100 dark:border-slate-700 rounded-xl mb-3 overflow-hidden">
              <div className="flex items-center gap-3 p-3.5">
                <button onClick={() => toggleExpand(s.id)}
                  className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs flex-shrink-0 transition-colors border cursor-pointer
                    ${isOpen ? 'bg-indigo-500/15 border-indigo-500/30 text-indigo-400' : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-400'}`}>
                  {isOpen ? "▲" : "▼"}
                </button>
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-semibold ${s.ativo ? 'text-slate-900 dark:text-slate-200' : 'text-slate-400'}`}>{s.nome}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    {tiposDoSetor.length} tipo{tiposDoSetor.length !== 1 ? "s" : ""}
                    {!s.ativo && " · inativo"}
                    {s.requer_documento && " · 📄 requer doc"}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Toggle checked={!!s.ativo} onChange={() => toggleAtivo(s)} small />
                  <Toggle checked={!!s.requer_documento} label="📄" onChange={() => toggleDoc(s)} small />
                  <button onClick={() => { setEditSetor(s); setNomeSetor(s.nome) }} className={btnEdit}>Editar</button>
                  <button onClick={() => deleteSetor(s)} className={btnDanger}>🗑</button>
                </div>
              </div>
              {isOpen && (
                <div className="border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60">
                  {tiposDoSetor.length === 0
                    ? <div className="px-4 py-3 text-[12px] text-slate-400">Nenhum tipo de problema neste setor.</div>
                    : tiposDoSetor.map(t => (
                      <div key={t.id} className="flex items-center gap-2.5 px-4 py-2.5 border-b border-slate-100 dark:border-slate-700/60 last:border-0">
                        <div style={{ background: t.cor || "#6366f1" }} className="w-3 h-3 rounded-full flex-shrink-0" />
                        <span className={`flex-1 text-[13px] font-semibold ${t.ativo ? 'text-slate-800 dark:text-slate-200' : 'text-slate-400 line-through'}`}>{t.nome}</span>
                        <Toggle checked={!!t.ativo} onChange={() => toggleAtivoTipo(t)} small />
                        <button onClick={() => openEditTipo(t)} className={btnEdit}>Editar</button>
                        <button onClick={() => deleteTipo(t)} className={btnDanger}>🗑</button>
                      </div>
                    ))
                  }
                  <div className="px-4 py-2.5">
                    <button onClick={() => openNewTipo(s.id)} className="text-[12px] font-semibold text-indigo-500 dark:text-indigo-400 cursor-pointer bg-transparent border-none p-0 hover:underline">
                      + Adicionar tipo de problema
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
        {tiposSemSetor.length > 0 && (
          <div className="border border-dashed border-slate-300 dark:border-slate-600 rounded-xl overflow-hidden mt-2">
            <div className="px-3.5 py-3 bg-slate-50 dark:bg-slate-900/40">
              <div className="text-sm font-semibold text-slate-500 dark:text-slate-400">Tipos sem setor (aparece em todos)</div>
            </div>
            {tiposSemSetor.map(t => (
              <div key={t.id} className="flex items-center gap-2.5 px-4 py-2.5 border-t border-slate-100 dark:border-slate-700">
                <div style={{ background: t.cor || "#6366f1" }} className="w-3 h-3 rounded-full flex-shrink-0" />
                <span className="flex-1 text-[13px] font-semibold text-slate-700 dark:text-slate-300">{t.nome}</span>
                <Toggle checked={!!t.ativo} onChange={() => toggleAtivoTipo(t)} small />
                <button onClick={() => openEditTipo(t)} className={btnEdit}>Editar</button>
                <button onClick={() => deleteTipo(t)} className={btnDanger}>🗑</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {editTipo && (
        <Modal title={editTipo._new ? "Novo tipo de problema" : `Editar: ${editTipo.nome}`} onClose={() => setEditTipo(null)} width={420}>
          <FormField label="Nome *">
            <input value={tipoForm.nome} onChange={e => setTipoForm(p => ({ ...p, nome: e.target.value }))} placeholder="Ex: Nota Fiscal Retida" className={input} autoFocus />
          </FormField>
          <div className="mt-3">
            <FormField label="Cor"><ColorPicker value={tipoForm.cor} onChange={c => setTipoForm(p => ({ ...p, cor: c }))} /></FormField>
          </div>
          {editTipo.setor_id && (
            <div className="mt-3 text-[12px] text-slate-400">
              Setor: <strong className="text-slate-600 dark:text-slate-300">{setores.find(s => s.id === editTipo.setor_id)?.nome || "—"}</strong>
            </div>
          )}
          <div className="flex gap-2 mt-5">
            <button onClick={saveTipo} disabled={!tipoForm.nome.trim()} className={btnPrimary}>{editTipo._new ? "+ Criar" : "Salvar"}</button>
            <button onClick={() => setEditTipo(null)} className={btnEdit}>Cancelar</button>
          </div>
        </Modal>
      )}
    </>
  )
}

function TabTags({ showToast, locationTags, setLocationTags }) {
  const [newTag, setNewTag] = useState("")
  const addTag = async () => {
    if (!newTag.trim()) return
    const { data, error } = await supabase.from("location_tags").insert({ name: newTag.trim() }).select().single()
    if (error) return showToast(error.message, "error")
    setLocationTags(prev => [...prev, data]); setNewTag(""); showToast("Tag criada!")
  }
  const delTag = async id => { await supabase.from("location_tags").delete().eq("id", id); setLocationTags(prev => prev.filter(t => t.id !== id)); showToast("Tag removida", "warning") }
  return (
    <div className={card}>
      <div className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-1">🏷️ Tags de localização</div>
      <div className="text-xs text-slate-400 mb-4">Tags globais usadas para marcar clientes em qualquer pipeline.</div>
      <div className="flex gap-2 mb-4">
        <input value={newTag} onChange={e => setNewTag(e.target.value)} onKeyDown={e => e.key === "Enter" && addTag()} placeholder="Ex: VIP, Inadimplente..." className={input + " flex-1"} />
        <button onClick={addTag} className={btnPrimary + " whitespace-nowrap"}>+ Criar</button>
      </div>
      {locationTags.length === 0 ? <EmptyState icon="🏷️" text="Nenhuma tag criada ainda" /> : (
        <div className="flex flex-wrap gap-2">
          {locationTags.map(lt => (
            <div key={lt.id} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/25">
              <span className="text-xs font-semibold text-indigo-500 dark:text-indigo-300">🏷️ {lt.name}</span>
              <button onClick={() => delTag(lt.id)} className="bg-transparent border-none text-slate-400 cursor-pointer text-sm leading-none p-0 hover:text-red-400 transition-colors">×</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function TabTiposVisita({ showToast }) {
  const [tipos,   setTipos]   = useState([])
  const [editing, setEditing] = useState(null)
  const [form,    setForm]    = useState({ nome: "", cor: "#0ea5e9" })
  useEffect(() => { supabase.from("tipos_visita").select("*").order("nome").then(({ data }) => setTipos(data || [])) }, [])
  const save = async () => {
    if (!form.nome.trim()) return
    const payload = { nome: form.nome.trim(), cor: form.cor }
    if (editing) {
      const { error } = await supabase.from("tipos_visita").update(payload).eq("id", editing.id)
      if (!error) { setTipos(prev => prev.map(t => t.id === editing.id ? { ...t, ...payload } : t)); showToast("Tipo atualizado!") }
    } else {
      const { data, error } = await supabase.from("tipos_visita").insert(payload).select().single()
      if (!error) { setTipos(prev => [...prev, data]); showToast("Tipo criado!") } else showToast(error.message, "error")
    }
    setEditing(null); setForm({ nome: "", cor: "#0ea5e9" })
  }
  const toggleAtivo = async t => { await supabase.from("tipos_visita").update({ ativo: !t.ativo }).eq("id", t.id); setTipos(prev => prev.map(x => x.id === t.id ? { ...x, ativo: !x.ativo } : x)) }
  const deleteTipo  = async t => {
    const { count } = await supabase.from("visits").select("id", { count: "exact", head: true }).eq("tipo_visita_id", t.id)
    if (count > 0) return showToast(`Não é possível excluir: ${count} visita(s) vinculada(s).`, "error")
    const { error } = await supabase.from("tipos_visita").delete().eq("id", t.id)
    if (!error) { setTipos(prev => prev.filter(x => x.id !== t.id)); showToast("Tipo excluído", "warning") }
    else showToast(error.message, "error")
  }
  const startEdit = t => { setEditing(t); setForm({ nome: t.nome, cor: t.cor || "#0ea5e9" }) }
  return (
    <>
      <div className={card}>
        <div className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-4">{editing ? `Editar: ${editing.nome}` : "Novo tipo de visita"}</div>
        <FormField label="Nome *"><input value={form.nome} onChange={e => setForm(p => ({ ...p, nome: e.target.value }))} placeholder="Ex: Visita Comercial" className={input} /></FormField>
        <div className="mt-3"><FormField label="Cor"><ColorPicker value={form.cor} onChange={c => setForm(p => ({ ...p, cor: c }))} /></FormField></div>
        <div className="flex gap-2 mt-4">
          <button onClick={save} disabled={!form.nome.trim()} className={btnPrimary}>{editing ? "Salvar" : "+ Criar"}</button>
          {editing && <button onClick={() => { setEditing(null); setForm({ nome: "", cor: "#0ea5e9" }) }} className={btnEdit}>Cancelar</button>}
        </div>
      </div>
      <div className={card}>
        <Label>Tipos cadastrados ({tipos.length})</Label>
        {tipos.length === 0 ? <EmptyState icon="🔧" text="Nenhum tipo cadastrado" /> : tipos.map(t => (
          <div key={t.id} className="flex items-center gap-3 py-2.5 border-b border-slate-100 dark:border-slate-900 last:border-0">
            <div style={{ background: t.cor || "#0ea5e9" }} className="w-3 h-3 rounded-full flex-shrink-0" />
            <div className={`flex-1 text-[13px] font-semibold ${t.ativo ? 'text-slate-900 dark:text-slate-200' : 'text-slate-400'}`}>{t.nome}</div>
            <Toggle checked={!!t.ativo} onChange={() => toggleAtivo(t)} small />
            <button onClick={() => startEdit(t)} className={btnEdit}>Editar</button>
            <button onClick={() => deleteTipo(t)} className={btnDanger}>🗑</button>
          </div>
        ))}
      </div>
    </>
  )
}

function TabConfiguracoes({ showToast }) {
  const [cfg,      setCfg]      = useState(null)
  const [eventCfg, setEventCfg] = useState([])
  const [saving,   setSaving]   = useState(false)
  useEffect(() => {
    supabase.from("app_settings").select("*").eq("id", "global").single().then(({ data }) =>
      setCfg(data || { id: "global", app_name: "PSR Embalagens", support_email: "", days_without_purchase_alert: 30, days_with_sale_threshold: 60 })
    )
    supabase.from("notification_event_config").select("*").order("id").then(({ data }) => setEventCfg(data || []))
  }, [])
  const save = async () => {
    setSaving(true)
    const { error } = await supabase.from("app_settings").upsert(cfg)
    showToast(error ? error.message : "Configurações salvas!", error ? "error" : undefined)
    setSaving(false)
  }
  const toggleEvent = async (id, field, value) => {
    const { error } = await supabase.from("notification_event_config").update({ [field]: value }).eq("id", id)
    if (!error) { setEventCfg(prev => prev.map(e => e.id === id ? { ...e, [field]: value } : e)); showToast("Salvo!") }
  }
  if (!cfg) return <div className="text-slate-400 p-8 text-center text-sm">Carregando...</div>
  const upd    = k => e => setCfg(p => ({ ...p, [k]: e.target.value }))
  const updNum = k => e => setCfg(p => ({ ...p, [k]: Number(e.target.value) }))
  const EVENT_LABELS = {
    occ_created: { icon: "⚠️", label: "Nova ocorrência criada" },
    occ_urgent:  { icon: "🚨", label: "Ocorrência urgente" },
    vis_created: { icon: "🔧", label: "Nova visita registrada" },
  }
  return (
    <div className={card}>
      <div className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-5">⚙️ Configurações gerais</div>
      <div className="flex flex-col gap-4">
        <FormField label="Nome do sistema"><input value={cfg.app_name || ""} onChange={upd("app_name")} placeholder="PSR Embalagens" className={input} /></FormField>
        <FormField label="Email de suporte"><input value={cfg.support_email || ""} onChange={upd("support_email")} type="email" placeholder="suporte@empresa.com" className={input} /></FormField>
        <div className="border-t border-slate-100 dark:border-slate-700 pt-4">
          <Label>📊 Configurações do Pipeline</Label>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="● Dias sem compra (alerta)"><input type="number" value={cfg.days_without_purchase_alert || 30} onChange={updNum("days_without_purchase_alert")} min={1} max={365} className={input} /></FormField>
            <FormField label="✓ Dias com venda (destaque)"><input type="number" value={cfg.days_with_sale_threshold || 60} onChange={updNum("days_with_sale_threshold")} min={1} max={365} className={input} /></FormField>
          </div>
          <div className="text-[11px] text-slate-400 mt-2 leading-relaxed">
            Sem compra por mais de <strong className="text-amber-500">{cfg.days_without_purchase_alert} dias</strong> → alerta nos cards.
            Ao importar, compra nos últimos <strong className="text-blue-400">{cfg.days_with_sale_threshold} dias</strong> → "Com Venda".
          </div>
        </div>
        <div className="border-t border-slate-100 dark:border-slate-700 pt-4">
          <Label>🔔 Eventos de Notificação</Label>
          <div className="text-[11px] text-slate-400 mb-3.5">Controle quais eventos geram notificações.</div>
          <div className="flex flex-col gap-2.5">
            {eventCfg.length === 0 && <div className="text-slate-400 text-xs py-4">Nenhum evento configurado.</div>}
            {eventCfg.map(e => {
              const meta = EVENT_LABELS[e.id] || { icon: "🔔", label: e.label }
              return (
                <div key={e.id} className={`rounded-xl p-3.5 bg-slate-50 dark:bg-slate-950 border ${e.enabled ? 'border-indigo-500/20' : 'border-slate-200 dark:border-slate-800'}`}>
                  <div className={`flex items-center justify-between ${e.enabled ? 'mb-3' : ''}`}>
                    <div className="flex items-center gap-2.5">
                      <span className="text-lg">{meta.icon}</span>
                      <div>
                        <div className={`text-[13px] font-semibold ${e.enabled ? 'text-slate-900 dark:text-slate-200' : 'text-slate-400'}`}>{meta.label}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">{e.id}</div>
                      </div>
                    </div>
                    <Toggle checked={!!e.enabled} onChange={() => toggleEvent(e.id, "enabled", !e.enabled)} small />
                  </div>
                  {e.enabled && (
                    <div>
                      <div className="text-[11px] text-slate-400 mb-1.5">Quem recebe:</div>
                      <select value={e.target || "all"} onChange={ev => toggleEvent(e.id, "target", ev.target.value)} className={input + " text-xs cursor-pointer appearance-none"}>
                        <option value="all">Todos (admin, gerente, criador)</option>
                        <option value="admin_only">Somente admin</option>
                        <option value="sector">Admin + Gerentes do setor</option>
                      </select>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
        <button onClick={save} disabled={saving} className={btnPrimary + " self-start mt-2"}>{saving ? "Salvando..." : "💾 Salvar configurações"}</button>
      </div>
    </div>
  )
}

export function AdminPage() {
  const { showToast, profile: me, locationTags, setLocationTags } = useApp()
  const [tab, setTab] = useState("users")

  useEffect(() => {
    const handler = (e) => setTab(e.detail)
    window.addEventListener('psr:admin-tab', handler)
    return () => window.removeEventListener('psr:admin-tab', handler)
  }, [])

  const currentTab = TABS.find(t => t.id === tab)

  return (
    <div className="p-6 max-w-[860px]">
      <h1 className="flex items-center gap-2.5 m-0 mb-6 text-xl font-bold text-slate-900 dark:text-slate-100">
        <span className="text-2xl">{currentTab?.icon}</span>
        {currentTab?.label}
      </h1>
      {tab === "users"   && <TabUsuarios     showToast={showToast} me={me} />}
      {tab === "perfis"  && <TabPerfis       showToast={showToast} />}
      {tab === "setores" && <TabSetores      showToast={showToast} />}
      {tab === "visitas" && <TabTiposVisita  showToast={showToast} />}
      {tab === "tags"    && <TabTags         showToast={showToast} locationTags={locationTags} setLocationTags={setLocationTags} />}
      {tab === "config"  && <TabConfiguracoes showToast={showToast} />}
    </div>
  )
}
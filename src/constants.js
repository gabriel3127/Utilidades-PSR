// ─── Pipelines ────────────────────────────────────────────────────────────────
export const PIPELINES = [
  { id: 'df-com-venda',        label: 'DF — Com Venda',            color: '#6366f1' },
  { id: 'df-sem-venda',        label: 'DF — Sem Venda',            color: '#8b5cf6' },
  { id: 'interestadual-venda', label: 'Interestadual — Com Venda', color: '#f59e0b' },
  { id: 'interestadual-sem',   label: 'Interestadual — Sem Venda', color: '#ef4444' },
  { id: 'prospeccao',          label: 'Prospecção',                color: '#10b981' },
]

// ─── Permissões disponíveis por módulo ───────────────────────────────────────
export const PERMISSIONS = {
  pipeline: [
    { key: 'view_pipeline',  label: 'Visualizar pipeline' },
    { key: 'pip_create',     label: 'Criar deal' },
    { key: 'pip_edit',       label: 'Editar deal' },
    { key: 'pip_delete',     label: 'Excluir deal' },
    { key: 'import_excel',   label: 'Importar Excel' },
    { key: 'view_alerts',    label: 'Ver alertas' },
    { key: 'pip_config',     label: 'Configurar estágios' },
  ],
  occurrences: [
    { key: 'occ_create',    label: 'Criar ocorrência' },
    { key: 'occ_view_own',  label: 'Ver próprias' },
    { key: 'occ_view_all',  label: 'Ver todas' },
    { key: 'occ_resolve',   label: 'Resolver ocorrência' },
    { key: 'occ_edit',      label: 'Editar qualquer ocorrência' },
    { key: 'occ_delete',    label: 'Excluir ocorrência' },
    { key: 'occ_export',    label: 'Exportar relatório' },
  ],
  visits: [
    { key: 'vis_create',    label: 'Criar visita' },
    { key: 'vis_view_own',  label: 'Ver próprias' },
    { key: 'vis_view_all',  label: 'Ver todas' },
    { key: 'vis_edit',      label: 'Editar qualquer visita' },
    { key: 'vis_delete',    label: 'Excluir visita' },
    { key: 'vis_export',    label: 'Exportar relatório' },
  ],
}

// ─── Perfis pré-definidos ─────────────────────────────────────────────────────
export const PRESET_ROLES = {
  admin: {
    label: 'Administrador',
    color: '#ef4444',
    permissions: Object.values(PERMISSIONS).flat().map(p => p.key),
  },
  gerente: {
    label: 'Gerente Comercial',
    color: '#8b5cf6',
    permissions: [
      'view_pipeline', 'pip_create', 'pip_edit', 'view_alerts', 'import_excel',
      'occ_view_all', 'occ_resolve', 'occ_export',
      'vis_view_all', 'vis_export',
    ],
  },
  vendedor: {
    label: 'Vendedor',
    color: '#6366f1',
    permissions: [
      'view_pipeline', 'pip_create', 'pip_edit', 'view_alerts',
      'occ_create', 'occ_view_own',
      'vis_create', 'vis_view_own',
    ],
  },
  operacional: {
    label: 'Operacional',
    color: '#f97316',
    permissions: [
      'occ_create', 'occ_view_own',
    ],
  },
}

// ─── Status de ocorrências ────────────────────────────────────────────────────
export const OCCURRENCE_STATUS = [
  { value: 'aberta',       label: 'Aberta',        color: '#6b7280', bg: '#f3f4f6' },
  { value: 'em_andamento', label: 'Em andamento',  color: '#f59e0b', bg: '#fffbeb' },
  { value: 'resolvida',    label: 'Resolvida',     color: '#10b981', bg: '#ecfdf5' },
  { value: 'cancelada',    label: 'Cancelada',     color: '#ef4444', bg: '#fef2f2' },
]

// ─── Prioridades ──────────────────────────────────────────────────────────────
export const PRIORITIES = [
  { value: 'baixa',   label: 'Baixa',   color: '#6b7280', bg: '#f3f4f6' },
  { value: 'media',   label: 'Média',   color: '#3b82f6', bg: '#eff6ff' },
  { value: 'alta',    label: 'Alta',    color: '#f59e0b', bg: '#fffbeb' },
  { value: 'urgente', label: 'Urgente', color: '#ef4444', bg: '#fef2f2' },
]

// ─── COLORS — paleta usada nos componentes do pipeline ───────────────────────
export const COLORS = {
  bg:        '#0f172a',
  surface:   '#1e293b',
  border:    '#334155',
  text:      '#e2e8f0',
  textMuted: '#94a3b8',
  textDim:   '#475569',
  primary:   '#6366f1',
  primaryBg: 'rgba(99,102,241,0.15)',
  success:   '#10b981',
  warning:   '#f59e0b',
  danger:    '#ef4444',
}

// ─── fieldStyle — estilo padrão de input (suporta tema dark/light) ───────────
// Uso nos componentes do pipeline: style={fieldStyle(t.dark)}
// onde t = usePipelineTheme()
export const fieldStyle = (dark = true) => ({
  background:   dark ? '#0f172a' : '#ffffff',
  border:       `1px solid ${dark ? '#334155' : '#e2e8f0'}`,
  borderRadius: 8,
  color:        dark ? '#e2e8f0' : '#0f172a',
  padding:      '8px 12px',
  fontSize:     13,
  width:        '100%',
  outline:      'none',
  fontFamily:   'inherit',
})

// ─── ALL_PERMISSIONS — lista plana de todas as permissões ────────────────────
export const ALL_PERMISSIONS = Object.values(PERMISSIONS).flat()

// ─── PIPELINE_PAIRS — pares de pipelines com/sem venda (usado no AdminPage) ──
export const PIPELINE_PAIRS = [
  {
    withSale:    'df-com-venda',
    withoutSale: 'df-sem-venda',
    label:       'DF',
  },
  {
    withSale:    'interestadual-venda',
    withoutSale: 'interestadual-sem',
    label:       'Interestadual',
  },
]

// ─── IMPORT_GROUPS — agrupamentos para a ImportPage ──────────────────────────
// Cada grupo tem comVenda/semVenda. O sistema distribui automaticamente
// conforme a regra de dias configurada. Prospecção não tem regra (comVenda === semVenda).
export const IMPORT_GROUPS = [
  {
    id:       'df',
    label:    'DF',
    comVenda: 'df-com-venda',
    semVenda: 'df-sem-venda',
    color:    '#6366f1',
  },
  {
    id:       'interestadual',
    label:    'Interestadual',
    comVenda: 'interestadual-venda',
    semVenda: 'interestadual-sem',
    color:    '#f59e0b',
  },
  {
    id:       'prospeccao',
    label:    'Prospecção',
    comVenda: 'prospeccao',
    semVenda: 'prospeccao',
    color:    '#10b981',
  },
]

// ─── COLUMN_COLORS — paleta de cores para o color picker de colunas ──────────
export const COLUMN_COLORS = [
  '#6366f1','#8b5cf6','#a855f7','#ec4899',
  '#ef4444','#f97316','#f59e0b','#eab308',
  '#22c55e','#10b981','#14b8a6','#06b6d4',
  '#3b82f6','#0ea5e9','#64748b','#94a3b8',
]

// ─── CSS global para o pipeline (inline styles — mantido do projeto original) ─
export const GLOBAL_STYLES = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  }
  button { font-family: inherit; }
  input, textarea, select { font-family: inherit; }
`
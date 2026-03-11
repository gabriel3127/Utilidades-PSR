import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useApp } from '@/context/AppContext'
import { useTheme } from '@/context/ThemeContext'
import { saveVisitOffline } from '@/lib/indexeddb'

const PRIORIDADES = [
  { value: 'Baixa', color: '#10b981', bg: 'rgba(16,185,129,0.15)' },
  { value: 'Média', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
  { value: 'Alta',  color: '#ef4444', bg: 'rgba(239,68,68,0.15)'  },
]

const EMPTY_FORM = {
  dataVisita: new Date().toISOString().split('T')[0],
  nomeConsultor: '', nomeCliente: '', clienteId: '', pipelineCardId: null,
  pessoaContato: '', segmentoCliente: '', porteCliente: '',
  avaliacaoAtendimento: '', avaliacaoVariedade: '', avaliacaoEntrega: '',
  comentariosFeedback: '', produtosUtilizados: [], volumePercentual: '',
  motivoNaoCompra: '', produtosNaoOferecemos: '', interesseExpandir: '',
  temReclamacao: '', tiposReclamacao: [], detalheReclamacao: '',
  gravidadeReclamacao: '', acaoProposta: '', satisfacaoSolucao: '',
  observacoesGerais: '', proximosPassos: '', prioridadeAcompanhamento: '',
}

const ETAPAS = [
  { id: 0, titulo: 'Dados Básicos', icon: '📋', color: '#3b82f6' },
  { id: 1, titulo: 'Avaliações',    icon: '⭐', color: '#f59e0b' },
  { id: 2, titulo: 'Produtos',      icon: '📦', color: '#8b5cf6' },
  { id: 3, titulo: 'Oportunidades', icon: '📈', color: '#f97316' },
  { id: 4, titulo: 'Reclamações',   icon: '⚠️', color: '#ef4444' },
  { id: 5, titulo: 'Finalizar',     icon: '✅', color: '#10b981' },
]

const isMobile = () => window.innerWidth < 768

const cx = {
  pageBg:    'bg-slate-50 dark:bg-slate-950',
  border:    'border-slate-200 dark:border-slate-700',
  borderSub: 'border-slate-100 dark:border-slate-800',
  textPrimary:   'text-slate-900 dark:text-slate-100',
  textSecondary: 'text-slate-500 dark:text-slate-400',
  inputCls: [
    'w-full px-3.5 py-3 rounded-xl text-sm font-medium outline-none transition-colors',
    'bg-slate-100 dark:bg-slate-900',
    'border border-slate-200 dark:border-slate-700',
    'text-slate-900 dark:text-slate-100',
    'placeholder:text-slate-400 dark:placeholder:text-slate-600',
    'focus:border-indigo-500 dark:focus:border-indigo-400',
  ].join(' '),
  labelCls: 'block text-[11px] font-semibold uppercase tracking-widest mb-1.5 text-slate-500 dark:text-slate-400',
}

// ── ThemeToggle ───────────────────────────────────────────────────────────────
function ThemeToggle() {
  const { dark, toggle } = useTheme()
  return (
    <button onClick={toggle}
      className="w-9 h-9 rounded-full flex items-center justify-center transition-colors
        bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400
        hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700"
      title={dark ? 'Mudar para modo claro' : 'Mudar para modo escuro'}>
      {dark ? '☀️' : '🌙'}
    </button>
  )
}

async function dispararNotificacoes(tipo, record) {
  try {
    const { data: cfg } = await supabase.from('notification_event_config').select('*').eq('id', tipo).single()
    if (!cfg?.enabled) return
    const { data: profiles } = await supabase.from('profiles').select('id, role, setor_ids, notification_prefs, active').eq('active', true)
    if (!profiles?.length) return
    const destinatarios = profiles.filter(p => {
      const prefs = p.notification_prefs || {}
      if (prefs[tipo] === false) return false
      if (p.role === 'admin') return true
      if (cfg.target === 'admin_only') return false
      if (p.role === 'gerente') return (p.setor_ids || []).length === 0
      return record.created_by === p.id
    })
    if (!destinatarios.length) return
    await supabase.from('notificacoes').insert(
      destinatarios.map(d => ({
        tipo, titulo: `Nova visita: ${record.client_name}`,
        descricao: `Consultor: ${record.nome_consultor || '—'} — ${record.data_visita}`,
        visita_id: record.id, destinatario_id: d.id, remetente_id: record.created_by || null, lida: false,
      }))
    )
  } catch (err) { console.warn('[notificacoes] falha silenciosa:', err?.message) }
}

function OptionBtn({ label, selected, onClick, color = '#6366f1' }) {
  return (
    <button onClick={onClick}
      style={selected ? { borderColor: color, background: color + '22', color } : {}}
      className={`py-2.5 px-2 rounded-xl cursor-pointer text-sm font-semibold flex items-center justify-center gap-1.5 transition-all text-center leading-snug
        ${selected ? 'border-2' : 'border-2 border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800'}`}>
      {selected && <span className="text-xs">✓</span>}{label}
    </button>
  )
}

function CheckItem({ label, checked, onChange, color = '#6366f1' }) {
  return (
    <div onClick={onChange}
      style={checked ? { borderColor: color, background: color + '11' } : {}}
      className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl cursor-pointer transition-all
        ${checked ? 'border-2' : 'border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800'}`}>
      <div style={checked ? { borderColor: color, background: color } : {}}
        className={`w-5 h-5 rounded-md flex-shrink-0 flex items-center justify-center border-2 transition-all
          ${checked ? '' : 'border-slate-300 dark:border-slate-600 bg-transparent'}`}>
        {checked && <span className="text-white text-xs leading-none">✓</span>}
      </div>
      <span className={`text-sm ${checked ? `font-semibold ${cx.textPrimary}` : cx.textSecondary}`}>{label}</span>
    </div>
  )
}

function RatingStars({ value, onChange }) {
  const opts   = ['Péssimo', 'Ruim', 'Regular', 'Bom', 'Excelente']
  const colors = ['#ef4444', '#f97316', '#f59e0b', '#3b82f6', '#10b981']
  return (
    <div className="grid grid-cols-5 gap-1.5">
      {opts.map((opt, i) => (
        <button key={opt} onClick={() => onChange(opt)}
          style={value === opt ? { borderColor: colors[i], background: colors[i] + '22', color: colors[i] } : {}}
          className={`py-2.5 px-1 rounded-xl cursor-pointer text-[11px] font-semibold flex flex-col items-center gap-1 transition-all text-center leading-snug min-h-[60px] justify-center
            ${value === opt ? 'border-2' : 'border-2 border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800'}`}>
          <span className="text-base">{'★'.repeat(i + 1)}</span>{opt}
        </button>
      ))}
    </div>
  )
}

function Textarea({ value, onChange, placeholder, maxLen = 400 }) {
  return (
    <div>
      <textarea className={`${cx.inputCls} min-h-[90px] resize-y`}
        placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)} maxLength={maxLen} />
      <p className={`text-right text-[11px] mt-1 ${value.length > maxLen * 0.85 ? 'text-amber-500' : 'text-slate-400'}`}>
        {value.length}/{maxLen}
      </p>
    </div>
  )
}

function useClientSearch(online) {
  return async (q, field = 'name') => {
    if (!q || q.length < 2 || !online) return []
    const filter = field === 'id' ? `external_id.ilike.%${q}%` : `client_name.ilike.%${q}%,external_id.ilike.%${q}%`
    const { data } = await supabase.from('pipeline_cards').select('id, client_name, external_id, city, state').or(filter).limit(6)
    return data || []
  }
}

function ClientField({ label, placeholder, value, field, online, onSearch, onSelect, linked, autoFocus, onManualChange }) {
  const [query, setQuery]     = useState(value || '')
  const [results, setResults] = useState([])
  const [open, setOpen]       = useState(false)
  const debounce = useRef(null)
  useEffect(() => { setQuery(value || '') }, [value])
  const handleChange = async (val) => {
    setQuery(val); onManualChange?.(val)
    clearTimeout(debounce.current)
    debounce.current = setTimeout(async () => {
      const res = await onSearch(val, field); setResults(res); if (res.length) setOpen(true)
    }, 280)
  }
  return (
    <div>
      <label className={cx.labelCls}>{label}</label>
      <div className="relative">
        <input className={`${cx.inputCls} ${linked ? '!border-emerald-500' : ''}`}
          placeholder={placeholder} value={query} autoFocus={autoFocus}
          onChange={e => handleChange(e.target.value)}
          onBlur={() => setTimeout(() => setOpen(false), 180)}
          onFocus={() => results.length && setOpen(true)} />
        {linked
          ? <span className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500 text-sm">✓</span>
          : online && query.length >= 2 ? <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">🔍</span> : null}
        {open && results.length > 0 && (
          <div className={`absolute top-full left-0 right-0 z-[300] mt-1 rounded-xl overflow-hidden shadow-2xl border ${cx.border} bg-white dark:bg-slate-800`}>
            {results.map(card => (
              <button key={card.id} onMouseDown={() => { onSelect(card); setOpen(false); setResults([]) }}
                className={`w-full px-3.5 py-2.5 text-left flex flex-col gap-0.5 transition-colors border-b last:border-b-0 ${cx.borderSub} hover:bg-slate-50 dark:hover:bg-slate-700`}>
                <span className={`text-sm font-semibold ${cx.textPrimary}`}>{card.client_name}</span>
                <span className="text-[11px] text-slate-400">{[card.external_id && `ID: ${card.external_id}`, card.city, card.state].filter(Boolean).join(' · ')}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function ClientFields({ form, online, setField }) {
  const searchFn = useClientSearch(online)
  const handleSelect = (card) => { setField('nomeCliente', card.client_name); setField('clienteId', card.external_id || ''); setField('pipelineCardId', card.id) }
  return (
    <>
      <ClientField label={online ? 'Nome do cliente * — busca na base' : 'Nome do cliente *'}
        placeholder="Nome do cliente..." value={form.nomeCliente} field="name" online={online}
        onSearch={searchFn} onSelect={handleSelect} linked={!!form.pipelineCardId} autoFocus
        onManualChange={v => { setField('nomeCliente', v); setField('pipelineCardId', null) }} />
      <ClientField label="ID do cliente (opcional)" placeholder="Código numérico do CRM..." value={form.clienteId} field="id"
        online={online} onSearch={searchFn} onSelect={handleSelect} linked={!!form.pipelineCardId} autoFocus={false}
        onManualChange={v => { setField('clienteId', v); setField('pipelineCardId', null) }} />
      {form.pipelineCardId && <p className="text-[11px] text-emerald-500 -mt-2">✓ Vinculado ao cadastro do cliente</p>}
    </>
  )
}

function Etapa0({ form, setField, online, allUsers }) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <label className={cx.labelCls}>Data da visita *</label>
        <input type="date" className={cx.inputCls} value={form.dataVisita} onChange={e => setField('dataVisita', e.target.value)} />
      </div>
      <div>
        <label className={cx.labelCls}>Consultor *</label>
        <select className={`${cx.inputCls} cursor-pointer appearance-none`} value={form.nomeConsultor} onChange={e => setField('nomeConsultor', e.target.value)}>
          <option value="">Selecionar...</option>
          {allUsers?.filter(u => u.role !== 'pendente').map(u => <option key={u.id} value={u.name || u.email}>{u.name || u.email}</option>)}
        </select>
      </div>
      <ClientFields form={form} online={online} setField={setField} />
      <div>
        <label className={cx.labelCls}>Pessoa de contato</label>
        <input className={cx.inputCls} placeholder="Nome e cargo" value={form.pessoaContato} onChange={e => setField('pessoaContato', e.target.value)} />
      </div>
      <div>
        <label className={cx.labelCls}>Segmento *</label>
        <div className="grid grid-cols-2 gap-2">
          {['Alimentício', 'Farmacêutico', 'Cosméticos', 'Industrial', 'Outros'].map(s => (
            <OptionBtn key={s} label={s} selected={form.segmentoCliente === s} onClick={() => setField('segmentoCliente', s)} color="#3b82f6" />
          ))}
        </div>
      </div>
      <div>
        <label className={cx.labelCls}>Porte *</label>
        <div className="grid grid-cols-3 gap-2">
          {['Pequeno', 'Médio', 'Grande'].map(p => (
            <OptionBtn key={p} label={p} selected={form.porteCliente === p} onClick={() => setField('porteCliente', p)} color="#3b82f6" />
          ))}
        </div>
      </div>
    </div>
  )
}

function Etapa1({ form, setField }) {
  return (
    <div className="flex flex-col gap-5">
      {[{ field: 'avaliacaoAtendimento', label: 'Atendimento' }, { field: 'avaliacaoVariedade', label: 'Variedade de produtos' }, { field: 'avaliacaoEntrega', label: 'Entrega' }].map(({ field, label }) => (
        <div key={field}>
          <label className={cx.labelCls}>{label}</label>
          <RatingStars value={form[field]} onChange={v => setField(field, v)} />
        </div>
      ))}
      <div>
        <label className={cx.labelCls}>Comentários</label>
        <Textarea value={form.comentariosFeedback} onChange={v => setField('comentariosFeedback', v)} placeholder="Observações..." maxLen={300} />
      </div>
    </div>
  )
}

function Etapa2({ form, setField, setMulti }) {
  const produtos = ['Marmitas e embalagens', 'Copos e descartáveis', 'Sacolas e bobinas', 'Produtos para eventos', 'Higiene e limpeza', 'Produtos sustentáveis', 'Outros']
  return (
    <div className="flex flex-col gap-5">
      <div>
        <label className={cx.labelCls}>Produtos utilizados</label>
        <div className="flex flex-col gap-1.5">
          {produtos.map(p => <CheckItem key={p} label={p} color="#8b5cf6" checked={form.produtosUtilizados.includes(p)} onChange={() => setMulti('produtosUtilizados', p)} />)}
        </div>
      </div>
      <div>
        <label className={cx.labelCls}>Volume PSR (%)</label>
        <div className="grid grid-cols-2 gap-2">
          {['0-25', '26-50', '51-75', '76-100'].map(v => <OptionBtn key={v} label={`${v}%`} selected={form.volumePercentual === v} onClick={() => setField('volumePercentual', v)} color="#8b5cf6" />)}
        </div>
      </div>
      <div>
        <label className={cx.labelCls}>Interesse em expandir?</label>
        <div className="grid grid-cols-2 gap-2">
          <OptionBtn label="Sim" selected={form.interesseExpandir === 'Sim'} onClick={() => setField('interesseExpandir', 'Sim')} color="#10b981" />
          <OptionBtn label="Não" selected={form.interesseExpandir === 'Não'} onClick={() => setField('interesseExpandir', 'Não')} color="#6b7280" />
        </div>
      </div>
    </div>
  )
}

function Etapa3({ form, setField }) {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <label className={cx.labelCls}>Por que NÃO compra outros produtos?</label>
        <Textarea value={form.motivoNaoCompra} onChange={v => setField('motivoNaoCompra', v)} placeholder="Preço, qualidade, desconhecimento..." maxLen={400} />
      </div>
      <div>
        <label className={cx.labelCls}>Produtos que NÃO oferecemos</label>
        <Textarea value={form.produtosNaoOferecemos} onChange={v => setField('produtosNaoOferecemos', v)} placeholder="Produtos, volumes, fornecedores..." maxLen={400} />
      </div>
    </div>
  )
}

function Etapa4({ form, setField, setMulti }) {
  const tipos      = ['Qualidade', 'Preço', 'Atraso', 'Atendimento', 'Produto errado', 'Embalagem', 'Falta estoque', 'Cobrança', 'Comunicação', 'Outros']
  const gravidades = ['Comentário pontual', 'Incômodo moderado', 'Problema significativo']
  return (
    <div className="flex flex-col gap-4">
      <div>
        <label className={cx.labelCls}>Houve reclamação?</label>
        <div className="grid grid-cols-2 gap-2">
          <OptionBtn label="Sim" selected={form.temReclamacao === 'Sim'} onClick={() => setField('temReclamacao', 'Sim')} color="#ef4444" />
          <OptionBtn label="Não" selected={form.temReclamacao === 'Não'} onClick={() => setField('temReclamacao', 'Não')} color="#10b981" />
        </div>
      </div>
      {form.temReclamacao === 'Sim' && (
        <>
          <div>
            <label className={cx.labelCls}>Tipos de reclamação</label>
            <div className="flex flex-col gap-1.5">
              {tipos.map(t => <CheckItem key={t} label={t} color="#ef4444" checked={form.tiposReclamacao.includes(t)} onChange={() => setMulti('tiposReclamacao', t)} />)}
            </div>
          </div>
          <div>
            <label className={cx.labelCls}>Detalhes da reclamação</label>
            <Textarea value={form.detalheReclamacao} onChange={v => setField('detalheReclamacao', v)} placeholder="Descreva a reclamação..." maxLen={400} />
          </div>
          <div>
            <label className={cx.labelCls}>Gravidade</label>
            <div className="flex flex-col gap-2">
              {gravidades.map(g => <OptionBtn key={g} label={g} selected={form.gravidadeReclamacao === g} onClick={() => setField('gravidadeReclamacao', g)} color="#f97316" />)}
            </div>
          </div>
          <div>
            <label className={cx.labelCls}>Ação proposta</label>
            <Textarea value={form.acaoProposta} onChange={v => setField('acaoProposta', v)} placeholder="Solução proposta..." maxLen={300} />
          </div>
          <div>
            <label className={cx.labelCls}>Cliente ficou satisfeito com a solução?</label>
            <div className="grid grid-cols-2 gap-2">
              <OptionBtn label="Sim" selected={form.satisfacaoSolucao === 'Sim'} onClick={() => setField('satisfacaoSolucao', 'Sim')} color="#10b981" />
              <OptionBtn label="Não" selected={form.satisfacaoSolucao === 'Não'} onClick={() => setField('satisfacaoSolucao', 'Não')} color="#ef4444" />
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function Etapa5({ form, setField }) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <label className={cx.labelCls}>Observações gerais</label>
        <Textarea value={form.observacoesGerais} onChange={v => setField('observacoesGerais', v)} placeholder="Impressões, condições, relacionamento..." maxLen={500} />
      </div>
      <div>
        <label className={cx.labelCls}>Próximos passos</label>
        <Textarea value={form.proximosPassos} onChange={v => setField('proximosPassos', v)} placeholder="Enviar orçamento, agendar visita..." maxLen={400} />
      </div>
      <div>
        <label className={cx.labelCls}>Prioridade de acompanhamento</label>
        <div className="grid grid-cols-3 gap-2">
          {PRIORIDADES.map(p => <OptionBtn key={p.value} label={p.value} selected={form.prioridadeAcompanhamento === p.value} onClick={() => setField('prioridadeAcompanhamento', p.value)} color={p.color} />)}
        </div>
      </div>
    </div>
  )
}

function VisitForm({ onClose, onSaved }) {
  const { user, online, showToast, allUsers } = useApp()
  const [form, setForm]     = useState({ ...EMPTY_FORM })
  const [etapa, setEtapa]   = useState(0)
  const [saving, setSaving] = useState(false)
  const mobile = isMobile()

  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const setMulti = (k, v) => setForm(f => ({ ...f, [k]: f[k].includes(v) ? f[k].filter(x => x !== v) : [...f[k], v] }))

  const canNext = [
    form.nomeCliente.trim().length >= 2 && form.nomeConsultor !== '' && form.segmentoCliente !== '' && form.porteCliente !== '',
    true, true, true, true,
    form.prioridadeAcompanhamento !== '',
  ]

  const handleSave = async () => {
    setSaving(true)
    try {
      const payload = {
        pipeline_card_id: form.pipelineCardId || null, client_name: form.nomeCliente,
        data_visita: form.dataVisita, nome_consultor: form.nomeConsultor,
        pessoa_contato: form.pessoaContato || null, segmento_cliente: form.segmentoCliente || null,
        porte_cliente: form.porteCliente || null, avaliacao_atendimento: form.avaliacaoAtendimento || null,
        avaliacao_variedade: form.avaliacaoVariedade || null, avaliacao_entrega: form.avaliacaoEntrega || null,
        comentarios_feedback: form.comentariosFeedback || null, produtos_utilizados: form.produtosUtilizados,
        volume_percentual: form.volumePercentual || null, motivo_nao_compra: form.motivoNaoCompra || null,
        produtos_nao_oferecemos: form.produtosNaoOferecemos || null, interesse_expandir: form.interesseExpandir || null,
        tem_reclamacao: form.temReclamacao || null, tipos_reclamacao: form.tiposReclamacao,
        detalhe_reclamacao: form.detalheReclamacao || null, gravidade_reclamacao: form.gravidadeReclamacao || null,
        acao_proposta: form.acaoProposta || null, satisfacao_solucao: form.satisfacaoSolucao || null,
        observacoes_gerais: form.observacoesGerais || null, proximos_passos: form.proximosPassos || null,
        prioridade_acompanhamento: form.prioridadeAcompanhamento || null, created_by: user.id, updated_by: user.id,
      }
      if (!online) { await saveVisitOffline(payload, user.id); showToast('Salvo offline — será enviado quando voltar a internet'); onSaved?.(); return }
      const { data: inserted, error } = await supabase.from('visitas_tecnicas').insert(payload).select().single()
      if (error) throw error
      await dispararNotificacoes('vis_created', inserted)
      showToast('Visita registrada!'); onSaved?.()
    } catch (err) { showToast(err.message || 'Erro ao salvar', 'error') }
    finally { setSaving(false) }
  }

  const etapaAtual = ETAPAS[etapa]
  const isLast     = etapa === ETAPAS.length - 1

  return (
    <div className={`fixed inset-0 z-[1000] bg-black/40 dark:bg-black/65 flex justify-center
      ${mobile ? 'items-start overflow-y-auto' : 'items-center overflow-hidden'}`}>
      <div className={`flex flex-col bg-white dark:bg-slate-950 w-full overflow-hidden
        ${mobile ? 'min-h-full' : 'max-w-[520px] max-h-[92vh] rounded-2xl shadow-2xl'}`}>
        <div className={`flex border-b ${cx.border} bg-white dark:bg-slate-900 flex-shrink-0 overflow-x-auto`}>
          {ETAPAS.map((e, i) => (
            <button key={e.id} onClick={() => setEtapa(i)}
              style={{ borderBottomColor: i === etapa ? e.color : i < etapa ? '#10b981' : 'transparent' }}
              className="flex-1 min-w-[72px] py-2.5 px-1 bg-transparent border-b-[3px] cursor-pointer flex flex-col items-center gap-0.5 transition-colors">
              <span className="text-base">{i < etapa ? '✅' : e.icon}</span>
              <span style={{ color: i === etapa ? e.color : i < etapa ? '#10b981' : '' }}
                className={`text-[9px] font-bold uppercase tracking-wider text-center leading-snug
                  ${i === etapa || i < etapa ? '' : 'text-slate-400 dark:text-slate-600'}`}>
                {e.titulo}
              </span>
            </button>
          ))}
        </div>
        <div className={`px-5 py-3 border-b ${cx.borderSub} flex items-center justify-between flex-shrink-0`}>
          <div className="flex items-center gap-2.5">
            <div style={{ background: etapaAtual.color + '22' }} className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0">
              {etapaAtual.icon}
            </div>
            <div>
              <p className={`text-base font-bold ${cx.textPrimary}`}>{etapaAtual.titulo}</p>
              <p className="text-[11px] text-slate-400">Etapa {etapa + 1} de {ETAPAS.length}</p>
            </div>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-sm transition-colors bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">✕</button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          {etapa === 0 && <Etapa0 form={form} setField={setField} online={online} allUsers={allUsers} />}
          {etapa === 1 && <Etapa1 form={form} setField={setField} />}
          {etapa === 2 && <Etapa2 form={form} setField={setField} setMulti={setMulti} />}
          {etapa === 3 && <Etapa3 form={form} setField={setField} />}
          {etapa === 4 && <Etapa4 form={form} setField={setField} setMulti={setMulti} />}
          {etapa === 5 && <Etapa5 form={form} setField={setField} />}
        </div>
        <div className={`px-5 py-3.5 border-t ${cx.borderSub} flex-shrink-0 flex gap-2.5
          ${mobile ? 'pb-[max(14px,env(safe-area-inset-bottom))]' : ''}`}>
          {etapa > 0 && (
            <button onClick={() => setEtapa(e => e - 1)}
              className="flex-1 py-3 rounded-xl text-sm font-semibold transition-colors
                bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700
                text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700">
              ← Voltar
            </button>
          )}
          {!isLast ? (
            <button onClick={() => setEtapa(e => e + 1)} disabled={!canNext[etapa]}
              style={canNext[etapa] ? { background: `linear-gradient(135deg, ${etapaAtual.color}, ${etapaAtual.color}cc)` } : {}}
              className={`flex-[2] py-3 rounded-xl text-sm font-bold transition-all
                ${!canNext[etapa] ? 'bg-slate-100 dark:bg-slate-800 text-slate-300 dark:text-slate-600 cursor-not-allowed' : 'text-white hover:opacity-90 cursor-pointer'}`}>
              Próximo →
            </button>
          ) : (
            <button onClick={handleSave} disabled={saving || !canNext[5]}
              className={`flex-[2] py-3 rounded-xl text-sm font-bold transition-all
                ${(saving || !canNext[5]) ? 'bg-slate-100 dark:bg-slate-800 text-slate-300 dark:text-slate-600 cursor-not-allowed' : 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white hover:opacity-90 cursor-pointer'}`}>
              {saving ? '⏳ Salvando...' : online ? '✓ Finalizar' : '💾 Salvar offline'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function VisitCard({ visit, onClick }) {
  const p = PRIORIDADES.find(x => x.value === visit.prioridade_acompanhamento)
  return (
    <div onClick={onClick}
      style={{ borderLeftColor: p?.color || '#94a3b8' }}
      className="border-l-4 rounded-xl px-4 py-3.5 cursor-pointer transition-all
        bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700
        hover:shadow-md dark:hover:shadow-slate-900/50">
      <div className="flex justify-between items-start mb-1.5 gap-2.5">
        <p className="font-semibold text-sm text-orange-500">{visit.client_name}</p>
        {p && <span style={{ color: p.color, background: p.bg }} className="text-[11px] font-semibold rounded-full px-2 py-0.5 whitespace-nowrap">{p.value}</span>}
      </div>
      <p className="text-xs text-slate-400 mb-2">
        {visit.nome_consultor && <span>{visit.nome_consultor} · </span>}
        {visit.segmento_cliente && <span>{visit.segmento_cliente} · </span>}
        {visit.porte_cliente && <span>{visit.porte_cliente}</span>}
      </p>
      {visit.proximos_passos && (
        <p className="text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900 rounded-lg px-2.5 py-2 leading-relaxed">
          📌 {visit.proximos_passos.slice(0, 100)}{visit.proximos_passos.length > 100 ? '...' : ''}
        </p>
      )}
      <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-2">
        {new Date(visit.data_visita + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
      </p>
    </div>
  )
}

function VisitDetail({ visit, onClose }) {
  const p = PRIORIDADES.find(x => x.value === visit.prioridade_acompanhamento)
  const Row = ({ label, value }) => value ? (
    <div className={`border-b pb-3 mb-3 ${cx.borderSub}`}>
      <p className="text-[11px] text-slate-400 font-bold uppercase mb-1">{label}</p>
      <p className={`text-sm leading-relaxed ${cx.textSecondary}`}>{Array.isArray(value) ? value.join(', ') : String(value)}</p>
    </div>
  ) : null
  const Stars = ({ value }) => {
    const map = { 'Péssimo': 1, 'Ruim': 2, 'Regular': 3, 'Bom': 4, 'Excelente': 5 }
    const n = map[value] || 0
    return <span>{'★'.repeat(n)}{'☆'.repeat(5 - n)} <span className="text-slate-400">{value}</span></span>
  }
  return (
    <div className="fixed inset-0 z-[1000] bg-black/70 flex items-center justify-center p-4">
      <div className={`rounded-2xl w-full max-w-[580px] max-h-[90vh] overflow-y-auto border shadow-2xl ${cx.border} bg-white dark:bg-slate-800`}>
        <div className={`p-5 border-b sticky top-0 z-10 ${cx.border} bg-white dark:bg-slate-800`}>
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[11px] text-orange-500 font-bold uppercase tracking-widest mb-1">{visit.client_name}</p>
              <p className={`text-base font-bold ${cx.textPrimary}`}>Visita — {new Date(visit.data_visita + 'T12:00:00').toLocaleDateString('pt-BR', { dateStyle: 'long' })}</p>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center bg-slate-100 dark:bg-slate-900 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">✕</button>
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            {p && <span style={{ color: p.color, background: p.bg }} className="text-[11px] font-bold rounded-full px-2 py-0.5">{p.value}</span>}
            {visit.segmento_cliente && <span className="text-[11px] text-slate-500 bg-slate-100 dark:bg-slate-900 rounded-full px-2 py-0.5">{visit.segmento_cliente}</span>}
            {visit.porte_cliente    && <span className="text-[11px] text-slate-500 bg-slate-100 dark:bg-slate-900 rounded-full px-2 py-0.5">{visit.porte_cliente}</span>}
            {visit.tem_reclamacao === 'Sim' && <span className="text-[11px] text-red-400 bg-red-500/10 rounded-full px-2 py-0.5">⚠️ Reclamação</span>}
          </div>
        </div>
        <div className="p-5">
          <Row label="Consultor"             value={visit.nome_consultor} />
          <Row label="Pessoa de contato"     value={visit.pessoa_contato} />
          {(visit.avaliacao_atendimento || visit.avaliacao_variedade || visit.avaliacao_entrega) && (
            <div className={`border-b pb-3 mb-3 ${cx.borderSub}`}>
              <p className="text-[11px] text-slate-400 font-bold uppercase mb-2">Avaliações</p>
              {visit.avaliacao_atendimento && <p className={`text-sm mb-1 ${cx.textSecondary}`}>Atendimento: <Stars value={visit.avaliacao_atendimento} /></p>}
              {visit.avaliacao_variedade   && <p className={`text-sm mb-1 ${cx.textSecondary}`}>Variedade: <Stars value={visit.avaliacao_variedade} /></p>}
              {visit.avaliacao_entrega     && <p className={`text-sm mb-1 ${cx.textSecondary}`}>Entrega: <Stars value={visit.avaliacao_entrega} /></p>}
            </div>
          )}
          <Row label="Comentários"           value={visit.comentarios_feedback} />
          <Row label="Produtos utilizados"   value={visit.produtos_utilizados} />
          <Row label="Volume PSR"            value={visit.volume_percentual ? `${visit.volume_percentual}%` : null} />
          <Row label="Interesse em expandir" value={visit.interesse_expandir} />
          <Row label="Por que não compra mais" value={visit.motivo_nao_compra} />
          <Row label="Produtos que não temos" value={visit.produtos_nao_oferecemos} />
          {visit.tem_reclamacao === 'Sim' && <>
            <Row label="Tipos de reclamação"  value={visit.tipos_reclamacao} />
            <Row label="Detalhes"             value={visit.detalhe_reclamacao} />
            <Row label="Gravidade"            value={visit.gravidade_reclamacao} />
            <Row label="Ação proposta"        value={visit.acao_proposta} />
            <Row label="Cliente satisfeito?"  value={visit.satisfacao_solucao} />
          </>}
          <Row label="Observações gerais"    value={visit.observacoes_gerais} />
          <Row label="Próximos passos"       value={visit.proximos_passos} />
        </div>
      </div>
    </div>
  )
}

// ── VisitsPage ─────────────────────────────────────────────────────────────────
export function VisitsPage({ onBack }) {
  const { can, pendingCount } = useApp()
  const [visits, setVisits]       = useState([])
  const [loading, setLoading]     = useState(true)
  const [showForm, setShowForm]   = useState(false)
  const [selected, setSelected]   = useState(null)
  const [search, setSearch]       = useState('')
  const [filterPri, setFilterPri] = useState('todas')
  const mobile = isMobile()

  useEffect(() => { if (mobile && can('vis_create')) setShowForm(true) }, [])

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('visitas_tecnicas').select('*').order('data_visita', { ascending: false })
    setVisits(data || []); setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])

  const filtered = visits.filter(v => {
    if (filterPri !== 'todas' && v.prioridade_acompanhamento !== filterPri) return false
    if (search) { const q = search.toLowerCase(); return v.client_name?.toLowerCase().includes(q) || v.nome_consultor?.toLowerCase().includes(q) }
    return true
  })

  const selCls = `px-3 py-2 rounded-lg text-xs font-medium cursor-pointer outline-none transition-colors
    bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400`

  return (
    <div className={`min-h-screen ${cx.pageBg} ${cx.textPrimary}`}>
      <div className={`px-6 border-b ${cx.border} bg-white dark:bg-slate-900 relative flex items-center justify-between`}
        style={{ minHeight: 56 }}>
        {/* Esquerda */}
        <div className="flex-shrink-0 z-10">
          {onBack && (
            <button onClick={onBack}
              className="bg-transparent border-none text-slate-400 cursor-pointer text-[13px] font-semibold
                flex items-center gap-1 hover:text-slate-600 dark:hover:text-slate-300 transition-colors p-0">
              ← Início
            </button>
          )}
        </div>
        {/* Centro */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <p className={`font-bold text-lg ${cx.textPrimary}`}>Visitas Técnicas</p>
          <p className="text-xs text-slate-400 mt-0.5">{visits.length} registros</p>
        </div>
        {/* Direita */}
        <div className="flex items-center gap-2 flex-shrink-0 z-10">
          <ThemeToggle />
          {can('vis_create') && (
            <button onClick={() => setShowForm(true)}
              className="bg-gradient-to-br from-sky-500 to-sky-600 text-white border-none rounded-xl px-4 py-2.5 cursor-pointer text-sm font-bold hover:opacity-90 transition-opacity">
              + Nova
            </button>
          )}
        </div>
      </div>

      <div className={`px-6 py-3 border-b ${cx.borderSub} flex flex-wrap gap-2.5`}>
        <input placeholder="Buscar por cliente ou consultor..." value={search} onChange={e => setSearch(e.target.value)}
          className={`flex-1 min-w-[220px] px-3.5 py-2 rounded-lg text-xs outline-none transition-colors
            bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700
            text-slate-700 dark:text-slate-200 placeholder:text-slate-400`} />
        <select value={filterPri} onChange={e => setFilterPri(e.target.value)} className={selCls}>
          <option value="todas">Todas as prioridades</option>
          {PRIORIDADES.map(p => <option key={p.value} value={p.value}>{p.value}</option>)}
        </select>
      </div>

      {pendingCount?.visits > 0 && (
        <div className="mx-6 mt-3 px-3.5 py-2.5 bg-amber-500/10 border border-amber-500/30 rounded-lg text-xs text-amber-500 dark:text-amber-300">
          📶 {pendingCount.visits} visita(s) aguardando sincronização
        </div>
      )}

      <div className="px-6 py-4 flex flex-col gap-2.5">
        {loading ? (
          <div className="text-center py-16 text-slate-400"><p className="text-2xl mb-3">⏳</p>Carregando...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <p className="text-4xl mb-3">🔧</p>
            <p className="font-semibold text-slate-500 mb-1.5">{search || filterPri !== 'todas' ? 'Nenhuma visita encontrada' : 'Nenhuma visita registrada'}</p>
            {can('vis_create') && !search && filterPri === 'todas' && <p className="text-xs">Clique em "+ Nova" para registrar</p>}
          </div>
        ) : filtered.map(v => <VisitCard key={v.id} visit={v} onClick={() => setSelected(v)} />)}
      </div>

      {mobile && can('vis_create') && !showForm && (
        <button onClick={() => setShowForm(true)}
          className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-gradient-to-br from-sky-500 to-sky-600 border-none text-white text-3xl cursor-pointer z-[500] shadow-lg shadow-sky-500/40 flex items-center justify-center">+</button>
      )}

      {showForm && <VisitForm onClose={() => { setShowForm(false); if (mobile) onBack?.() }} onSaved={() => { setShowForm(false); if (mobile) onBack?.(); else load() }} />}
      {selected && <VisitDetail visit={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}
import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useApp } from '@/context/AppContext'
import { useTheme } from '@/context/ThemeContext'
import { saveOccurrenceOffline } from '@/lib/indexeddb'

const PRIORITIES = [
  { value: 'baixa',   label: 'Baixa',   color: '#6b7280', bg: 'rgba(107,114,128,0.15)' },
  { value: 'media',   label: 'Média',   color: '#3b82f6', bg: 'rgba(59,130,246,0.15)'  },
  { value: 'alta',    label: 'Alta',    color: '#f59e0b', bg: 'rgba(245,158,11,0.15)'  },
  { value: 'urgente', label: 'Urgente', color: '#ef4444', bg: 'rgba(239,68,68,0.15)'   },
]

// ── Status: sem "aberta" — toda ocorrência começa em andamento ────────────────
const STATUS = [
  { value: 'em_andamento', label: 'Em andamento', color: '#f59e0b' },
  { value: 'resolvida',    label: 'Resolvida',    color: '#10b981' },
  { value: 'cancelada',    label: 'Cancelada',    color: '#ef4444' },
]

// Status que travam edição para não-admins
const STATUS_LOCKED = ['resolvida', 'cancelada']

const EMPTY_FORM = {
  client_name: '', client_id: '', pipeline_card_id: null,
  setor_id: '', tipo_problema_id: '', priority: 'media',
  description: '',
  numero_documento: '', nota_retida: false, image_url: '',
}

const isMobile = () => window.innerWidth < 768

const cx = {
  pageBg:   'bg-slate-50 dark:bg-slate-950',
  surface:  'bg-white dark:bg-slate-900',
  card:     'bg-white dark:bg-slate-800',
  border:   'border-slate-200 dark:border-slate-700',
  borderSub:'border-slate-100 dark:border-slate-800',
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

// ── Notificações ───────────────────────────────────────────────────────────────
async function dispararNotificacoes(tipo, record) {
  try {
    const { data: cfg } = await supabase
      .from('notification_event_config').select('*').eq('id', tipo).single()
    if (!cfg?.enabled) return
    const { data: profiles } = await supabase
      .from('profiles').select('id, role, setor_ids, notification_prefs, active').eq('active', true)
    if (!profiles?.length) return
    const destinatarios = profiles.filter(p => {
      const prefs = p.notification_prefs || {}
      if (prefs[tipo] === false) return false
      if (p.role === 'admin') return true
      if (cfg.target === 'admin_only') return false
      if (p.role === 'gerente') {
        const setorId = record.setor_id || null
        if (!setorId) return true
        const setores = p.setor_ids || []
        return setores.length === 0 || setores.includes(setorId)
      }
      return record.created_by === p.id
    })
    if (!destinatarios.length) return
    const titulo = {
      occ_created: `Nova ocorrência: ${record.client_name}`,
      occ_urgent:  `🚨 Urgente: ${record.client_name}`,
    }[tipo] || 'Nova notificação'
    const descricao = {
      occ_created: `Prioridade: ${record.priority}`,
      occ_urgent:  `Requer atenção imediata`,
    }[tipo] || ''
    await supabase.from('notificacoes').insert(
      destinatarios.map(d => ({
        tipo, titulo, descricao,
        occurrence_id: record.id,
        destinatario_id: d.id,
        remetente_id: record.created_by || null,
        lida: false,
      }))
    )
  } catch (err) { console.warn('[notificacoes] falha silenciosa:', err?.message) }
}

// ── Badges ────────────────────────────────────────────────────────────────────
function Badge({ color, bg, label }) {
  return (
    <span style={{ color, background: bg || color + '22' }}
      className="inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold">
      {label}
    </span>
  )
}

function StatusDot({ value }) {
  const s = STATUS.find(x => x.value === value) || STATUS[0]
  return (
    <span style={{ color: s.color }} className="inline-flex items-center gap-1.5 text-[11px] font-semibold whitespace-nowrap">
      <span style={{ background: s.color }} className="w-1.5 h-1.5 rounded-full inline-block flex-shrink-0" />
      {s.label}
    </span>
  )
}

// ── Client search ─────────────────────────────────────────────────────────────
function useClientSearch(online) {
  return async (q, field = 'name') => {
    if (!q || q.length < 2 || !online) return []
    const filter = field === 'id'
      ? `external_id.ilike.%${q}%`
      : `client_name.ilike.%${q}%,external_id.ilike.%${q}%`
    const { data } = await supabase.from('pipeline_cards')
      .select('id, client_name, external_id, city, state').or(filter).limit(6)
    return data || []
  }
}

function ClienteField({ label, placeholder, value, field, online, onSearch, onSelect, linked, autoFocus, onManualChange }) {
  const [query,   setQuery]   = useState(value || '')
  const [results, setResults] = useState([])
  const [open,    setOpen]    = useState(false)
  const debounce = useRef(null)
  useEffect(() => { setQuery(value || '') }, [value])

  const handleChange = async (val) => {
    setQuery(val); onManualChange?.(val)
    clearTimeout(debounce.current)
    debounce.current = setTimeout(async () => {
      const res = await onSearch(val, field)
      setResults(res); if (res.length) setOpen(true)
    }, 280)
  }

  return (
    <div>
      <label className={cx.labelCls}>{label}</label>
      <div className="relative">
        <input
          className={`${cx.inputCls} ${linked ? '!border-emerald-500' : ''}`}
          placeholder={placeholder} value={query} autoFocus={autoFocus}
          onChange={e => handleChange(e.target.value)}
          onBlur={() => setTimeout(() => setOpen(false), 180)}
          onFocus={() => results.length && setOpen(true)}
        />
        {linked
          ? <span className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500 text-sm">✓</span>
          : online && query.length >= 2
            ? <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">🔍</span>
            : null
        }
        {open && results.length > 0 && (
          <div className={`absolute top-full left-0 right-0 z-[300] mt-1 rounded-xl overflow-hidden shadow-2xl
            border ${cx.border} bg-white dark:bg-slate-800`}>
            {results.map(card => (
              <button key={card.id}
                onMouseDown={() => { onSelect(card); setOpen(false); setResults([]) }}
                className={`w-full px-3.5 py-2.5 text-left flex flex-col gap-0.5 transition-colors
                  border-b last:border-b-0 ${cx.borderSub}
                  hover:bg-slate-50 dark:hover:bg-slate-700`}>
                <span className={`text-sm font-semibold ${cx.textPrimary}`}>{card.client_name}</span>
                <span className="text-[11px] text-slate-400 dark:text-slate-500">
                  {[card.external_id && `ID: ${card.external_id}`, card.city, card.state].filter(Boolean).join(' · ')}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function ClienteFields({ clientName, clientId, pipelineCardId, online, onSelect, onChangeName, onChangeId }) {
  const searchFn = useClientSearch(online)
  return (
    <>
      <ClienteField label="Nome do cliente *"
        placeholder="Nome do cliente..." value={clientName} field="name" online={online}
        onSearch={searchFn} onSelect={onSelect} linked={!!pipelineCardId} autoFocus onManualChange={onChangeName} />
      <ClienteField label="ID do cliente"
        placeholder="Código numérico do CRM..." value={clientId} field="id" online={online}
        onSearch={searchFn} onSelect={onSelect} linked={!!pipelineCardId} autoFocus={false} onManualChange={onChangeId} />
      {pipelineCardId && <p className="text-[11px] text-emerald-500 -mt-2">✓ Vinculado ao cadastro do cliente</p>}
    </>
  )
}

// ── OccurrenceForm ────────────────────────────────────────────────────────────
function OccurrenceForm({ onClose, onSaved, editData = null }) {
  const { user, online, showToast } = useApp()
  const [form, setForm]     = useState(editData ? { ...editData } : { ...EMPTY_FORM })
  const [step, setStep]     = useState(1)
  const [saving, setSaving] = useState(false)
  const [setores, setSetores] = useState([])
  const [tipos,   setTipos]   = useState([])
  const [uploadingImg, setUpload] = useState(false)
  const fileRef = useRef()
  const mobile  = isMobile()

  useEffect(() => {
    supabase.from('setores').select('*').eq('ativo', true).order('nome').then(({ data }) => setSetores(data || []))
    supabase.from('tipos_problema').select('*').eq('ativo', true).order('nome').then(({ data }) => setTipos(data || []))
  }, [])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const setorAtual      = setores.find(s => s.id === form.setor_id)
  const requerDocumento = !!setorAtual?.requer_documento
  const tiposFiltrados  = form.setor_id ? tipos.filter(t => t.setor_id === form.setor_id || !t.setor_id) : tipos
  const canNext1 = form.client_name.trim().length >= 2 && form.setor_id !== ''
  const canNext2 = form.tipo_problema_id !== ''
  const canSave  = true

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0]; if (!file) return
    setUpload(true)
    try {
      // ── Comprimir via canvas antes de enviar ──────────────────────────
      const compressed = await new Promise((resolve, reject) => {
        const img = new Image()
        const url = URL.createObjectURL(file)
        img.onload = () => {
          URL.revokeObjectURL(url)
          const MAX = 1280
          let { width, height } = img
          if (width > MAX || height > MAX) {
            if (width > height) { height = Math.round(height * MAX / width); width = MAX }
            else                { width  = Math.round(width  * MAX / height); height = MAX }
          }
          const canvas = document.createElement('canvas')
          canvas.width = width; canvas.height = height
          canvas.getContext('2d').drawImage(img, 0, 0, width, height)
          canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Compressão falhou')), 'image/jpeg', 0.78)
        }
        img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Imagem inválida')) }
        img.src = url
      })
      const path = `occurrences/${Date.now()}.jpg`
      const { error } = await supabase.storage.from('ocorrencias-imagens').upload(path, compressed, {
        upsert: true, contentType: 'image/jpeg',
      })
      if (error) throw error
      const { data: { publicUrl } } = supabase.storage.from('ocorrencias-imagens').getPublicUrl(path)
      set('image_url', publicUrl)
      const kb = Math.round(compressed.size / 1024)
      showToast(`Imagem enviada (${kb} KB)`)
    } catch (err) { showToast(`Erro ao enviar imagem: ${err?.message || ''}`, 'error') }
    finally { setUpload(false) }
  }

  const handleSave = async () => {
    if (!canSave) return
    setSaving(true)
    try {
      const payload = {
        client_name: form.client_name, pipeline_card_id: form.pipeline_card_id || null,
        setor_id: form.setor_id || null, tipo_problema_id: form.tipo_problema_id || null,
        priority: form.priority, description: form.description || null,
        nfe: requerDocumento ? (form.numero_documento || null) : null,
        nota_retida: requerDocumento ? form.nota_retida : false,
        image_url: form.image_url || null,
        updated_by: user.id,
        // Toda nova ocorrência começa em andamento
        ...(!editData && { status: 'em_andamento', created_by: user.id }),
      }
      if (!online) {
        await saveOccurrenceOffline(payload, user.id)
        showToast('Salvo offline — será enviado quando voltar a internet')
        onSaved?.(); return
      }
      const op = editData?.id
        ? supabase.from('occurrences').update(payload).eq('id', editData.id)
        : supabase.from('occurrences').insert(payload).select().single()
      const { data: inserted, error } = await op
      if (error) throw error
      if (!editData && inserted) {
        await dispararNotificacoes('occ_created', inserted)
        if (inserted.priority === 'urgente') await dispararNotificacoes('occ_urgent', inserted)
      }
      showToast(editData ? 'Ocorrência atualizada!' : 'Ocorrência criada!')
      onSaved?.()
    } catch (err) { showToast(err.message || 'Erro ao salvar', 'error') }
    finally { setSaving(false) }
  }

  const stepLabels  = ['Cliente', 'Problema', 'Detalhes']
  const btnDisabled = (step === 1 && !canNext1) || (step === 2 && !canNext2)

  return (
    <div className={`fixed inset-0 z-[1000] bg-black/40 dark:bg-black/65 flex justify-center
      ${mobile ? 'items-start overflow-y-auto' : 'items-center overflow-hidden'}`}>
      <div className={`flex flex-col overflow-hidden w-full shadow-2xl bg-white dark:bg-slate-950
        ${mobile ? 'min-h-full' : 'max-w-[480px] max-h-[88vh] rounded-2xl'}`}>
        <div className={`px-5 pt-5 pb-0 border-b ${cx.borderSub} flex-shrink-0`}>
          <div className="flex items-center justify-between mb-3.5">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                {editData ? 'Editar' : 'Nova'} Ocorrência — {stepLabels[step - 1]}
              </p>
              <p className={`text-lg font-bold mt-0.5 ${cx.textPrimary}`}>Passo {step} de 3</p>
            </div>
            <button onClick={onClose}
              className="w-9 h-9 rounded-full flex items-center justify-center text-base transition-colors
                bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-400">
              ✕
            </button>
          </div>
          <div className="flex gap-1.5 justify-center mb-4">
            {[1,2,3].map(s => (
              <div key={s} style={{ width: s === step ? 28 : 8 }}
                className={`h-1 rounded-full transition-all duration-200
                  ${s === step ? 'bg-indigo-500' : s < step ? 'bg-emerald-400' : 'bg-slate-200 dark:bg-slate-700'}`} />
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {step === 1 && (
            <div className="flex flex-col gap-4">
              <ClienteFields
                clientName={form.client_name} clientId={form.client_id}
                pipelineCardId={form.pipeline_card_id} online={online}
                onSelect={(card) => { set('client_name', card.client_name); set('client_id', card.external_id || ''); set('pipeline_card_id', card.id) }}
                onChangeName={(v) => { set('client_name', v); set('pipeline_card_id', null) }}
                onChangeId={(v) => { set('client_id', v); set('pipeline_card_id', null) }}
              />
              <div>
                <label className={cx.labelCls}>Setor *</label>
                <select className={`${cx.inputCls} cursor-pointer appearance-none`}
                  value={form.setor_id}
                  onChange={e => { set('setor_id', e.target.value); set('tipo_problema_id', '') }}>
                  <option value="">Selecionar setor...</option>
                  {setores.map(s => <option key={s.id} value={s.id}>{s.nome}{s.requer_documento ? ' 📄' : ''}</option>)}
                </select>
                {setorAtual?.requer_documento && (
                  <p className="text-[11px] text-amber-500 mt-1.5">📄 Este setor requer número do documento</p>
                )}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="flex flex-col gap-5">
              <div>
                <label className={cx.labelCls}>
                  Tipo de problema *
                  {form.setor_id && setorAtual && (
                    <span className="normal-case tracking-normal font-normal text-slate-400 ml-1.5">— {setorAtual.nome}</span>
                  )}
                </label>
                {tiposFiltrados.length === 0 ? (
                  <div className="p-5 text-center text-sm rounded-xl text-slate-400 bg-slate-100 dark:bg-slate-900">
                    {form.setor_id ? 'Nenhum tipo cadastrado para este setor' : 'Nenhum tipo de problema cadastrado'}
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {tiposFiltrados.map(t => (
                      <button key={t.id} onClick={() => set('tipo_problema_id', t.id)}
                        style={form.tipo_problema_id === t.id ? {
                          borderColor: t.cor || '#6366f1',
                          background: (t.cor || '#6366f1') + '22',
                          color: t.cor || '#c7d2fe',
                        } : {}}
                        className={`px-3.5 py-3 rounded-xl cursor-pointer text-sm text-left flex items-center gap-2.5 transition-all
                          ${form.tipo_problema_id === t.id
                            ? 'font-bold border-2'
                            : 'border-2 border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800 font-medium'}`}>
                        <span style={{ background: t.cor || '#6366f1' }} className="w-2.5 h-2.5 rounded-full flex-shrink-0" />
                        {t.nome}
                        {form.tipo_problema_id === t.id && <span className="ml-auto">✓</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label className={cx.labelCls}>Prioridade *</label>
                <div className="grid grid-cols-2 gap-2">
                  {PRIORITIES.map(p => (
                    <button key={p.value} onClick={() => set('priority', p.value)}
                      style={form.priority === p.value ? { borderColor: p.color, background: p.bg, color: p.color } : {}}
                      className={`py-3 rounded-xl cursor-pointer text-sm font-semibold transition-all
                        ${form.priority === p.value
                          ? 'border-2'
                          : 'border-2 border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800'}`}>
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="flex flex-col gap-4">
              <div>
                <label className={cx.labelCls}>
                  Descrição <span className="normal-case tracking-normal font-normal text-slate-400 ml-1">(opcional)</span>
                </label>
                <textarea className={`${cx.inputCls} min-h-[100px] resize-y`}
                  placeholder="Descreva o problema com mais detalhes..." value={form.description}
                  onChange={e => set('description', e.target.value)} autoFocus />
              </div>
              {requerDocumento && (
                <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 flex flex-col gap-3.5">
                  <p className="text-[11px] text-amber-500 font-bold uppercase tracking-widest">📄 Dados do documento</p>
                  <div>
                    <label className={cx.labelCls}>Número do documento</label>
                    <input className={cx.inputCls} placeholder="Número da NF-e ou documento"
                      value={form.numero_documento} onChange={e => set('numero_documento', e.target.value)} inputMode="numeric" />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`text-sm font-semibold ${cx.textPrimary}`}>Nota retida</p>
                      <p className="text-xs text-slate-400 mt-0.5">A nota fiscal está retida?</p>
                    </div>
                    <button onClick={() => set('nota_retida', !form.nota_retida)}
                      style={{ width: 52, height: 28 }}
                      className={`relative rounded-full border-2 transition-all duration-200 flex-shrink-0
                        ${form.nota_retida ? 'bg-indigo-500 border-indigo-500' : 'bg-slate-200 dark:bg-slate-700 border-slate-200 dark:border-slate-700'}`}>
                      <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all duration-200
                        ${form.nota_retida ? 'translate-x-6' : 'translate-x-0.5'}`} />
                    </button>
                  </div>
                </div>
              )}
              <div>
                <label className={cx.labelCls}>
                  Foto <span className="normal-case tracking-normal font-normal text-slate-400 ml-1">(opcional)</span>
                </label>
                <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImageUpload} />
                {form.image_url ? (
                  <div className="relative rounded-xl overflow-hidden">
                    <img src={form.image_url} alt="preview" className="w-full max-h-[200px] object-cover block" />
                    <button onClick={() => set('image_url', '')}
                      className="absolute top-2 right-2 bg-black/60 border-none rounded-full text-white w-7 h-7 text-sm flex items-center justify-center">✕</button>
                  </div>
                ) : (
                  <button onClick={() => fileRef.current?.click()} disabled={uploadingImg}
                    className="w-full py-4 rounded-xl cursor-pointer border-2 border-dashed text-sm flex items-center justify-center gap-2 transition-colors
                      border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-400
                      hover:border-indigo-400 dark:hover:border-indigo-500">
                    {uploadingImg ? '⏳ Enviando...' : '📷 Tirar foto ou escolher imagem'}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        <div className={`px-5 py-3.5 border-t ${cx.borderSub} flex-shrink-0 flex gap-2.5
          ${mobile ? 'pb-[max(14px,env(safe-area-inset-bottom))]' : ''}`}>
          {step > 1 && (
            <button onClick={() => setStep(s => s - 1)}
              className="flex-1 py-3.5 rounded-xl text-sm font-semibold transition-colors
                bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700
                text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700">
              ← Voltar
            </button>
          )}
          {step < 3 ? (
            <button onClick={() => setStep(s => s + 1)} disabled={btnDisabled}
              className={`flex-[2] py-3.5 rounded-xl text-sm font-bold transition-all
                ${btnDisabled
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-300 dark:text-slate-600 cursor-not-allowed'
                  : 'bg-gradient-to-br from-indigo-500 to-violet-500 text-white hover:opacity-90 cursor-pointer'}`}>
              Continuar →
            </button>
          ) : (
            <button onClick={handleSave} disabled={saving || !canSave}
              className={`flex-[2] py-3.5 rounded-xl text-sm font-bold transition-all
                ${(saving || !canSave)
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-300 dark:text-slate-600 cursor-not-allowed'
                  : 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white hover:opacity-90 cursor-pointer'}`}>
              {saving ? '⏳ Salvando...' : online ? '✓ Salvar' : '💾 Salvar offline'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── OccurrenceCard ────────────────────────────────────────────────────────────
function OccurrenceCard({ occ, setores, tipos, allUsers, onClick }) {
  const p     = PRIORITIES.find(x => x.value === occ.priority) || PRIORITIES[1]
  const tipo  = tipos.find(t => t.id === occ.tipo_problema_id)
  const setor = setores.find(s => s.id === occ.setor_id)
  const creator = allUsers?.find(u => u.id === occ.created_by)
  const isLocked = STATUS_LOCKED.includes(occ.status)

  return (
    <div onClick={onClick}
      style={{ borderLeftColor: p.color }}
      className="border-l-4 rounded-xl px-4 py-3.5 cursor-pointer transition-all
        bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700
        hover:shadow-md dark:hover:shadow-slate-900/50">

      {/* Linha 1: cliente + status */}
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <p className="font-bold text-[15px] text-orange-500 leading-snug flex-1 truncate">{occ.client_name}</p>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {isLocked && <span className="text-[10px] text-slate-400">🔒</span>}
          <StatusDot value={occ.status} />
        </div>
      </div>

      {/* Linha 2: prioridade + tipo + setor — destaque visual */}
      <div className="flex flex-wrap gap-1.5 mb-2.5">
        {/* Prioridade com fundo colorido */}
        <span style={{ background: p.bg, color: p.color, borderColor: p.color + '66' }}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold border">
          <span style={{ background: p.color }} className="w-1.5 h-1.5 rounded-full" />
          {p.label}
        </span>
        {/* Tipo de problema */}
        {tipo && (
          <span style={{ background: (tipo.cor || '#6366f1') + '18', color: tipo.cor || '#6366f1', borderColor: (tipo.cor || '#6366f1') + '55' }}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold border">
            {tipo.nome}
          </span>
        )}
        {/* Setor */}
        {setor && (
          <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-semibold
            bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-600">
            {setor.nome}
          </span>
        )}
        {occ.nota_retida && <Badge color='#ef4444' label='Nota retida' />}
        {occ.nfe && <span className="text-[11px] text-slate-400 self-center">Doc. {occ.nfe}</span>}
      </div>

      {/* Descrição se houver */}
      {occ.description && (
        <p className="text-[12px] text-slate-400 dark:text-slate-500 leading-snug line-clamp-2 mb-2">
          {occ.description}
        </p>
      )}

      {/* Linha 3: data + quem abriu */}
      <div className="flex items-center justify-between">
        <p className="text-[11px] text-slate-400 dark:text-slate-500">
          {new Date(occ.created_at).toLocaleDateString('pt-BR', { day:'2-digit', month:'short', year:'numeric' })}
        </p>
        {creator && (
          <p className="text-[11px] text-slate-400">
            por <span className="font-semibold text-slate-500 dark:text-slate-400">{creator.name?.split('.')[0] || creator.name}</span>
          </p>
        )}
      </div>
    </div>
  )
}

// ── OccurrenceDetail ──────────────────────────────────────────────────────────
function OccurrenceDetail({ occ, setores, tipos, allUsers, onClose, onUpdate, onEdit }) {
  const { user, isAdmin, can, showToast } = useApp()
  const [status,  setStatusState] = useState(occ.status)
  const [saving,  setSaving]      = useState(false)

  const p       = PRIORITIES.find(x => x.value === occ.priority) || PRIORITIES[1]
  const tipo    = tipos.find(t => t.id === occ.tipo_problema_id)
  const setor   = setores.find(s => s.id === occ.setor_id)
  const creator = allUsers?.find(u => u.id === occ.created_by)
  const editor  = allUsers?.find(u => u.id === occ.updated_by)
  const resolver= allUsers?.find(u => u.id === occ.resolved_by)
  const canceler= allUsers?.find(u => u.id === occ.cancelled_by)

  // Lock: só admin pode alterar status após resolvida/cancelada
  const isLocked    = STATUS_LOCKED.includes(status)
  const canAct      = isAdmin || can('occ_edit') || can('occ_resolve')
  const canActNow   = canAct && (!isLocked || isAdmin)
  // Pode editar dados: admin sempre, outros apenas se não estiver travado
  const canEdit     = (isAdmin || can('occ_edit')) && (!isLocked || isAdmin)

  const handleStatus = async (s) => {
    if (!canActNow) return
    setSaving(true)
    const now = new Date().toISOString()
    const extra = {}
    if (s === 'resolvida') { extra.resolved_by = user.id; extra.resolved_at = now }
    if (s === 'cancelada') { extra.cancelled_by = user.id; extra.cancelled_at = now }
    const { error } = await supabase.from('occurrences').update({
      status: s, updated_by: user.id, ...extra,
    }).eq('id', occ.id)
    if (!error) { setStatusState(s); showToast('Status atualizado!'); onUpdate?.() }
    else showToast('Erro ao atualizar', 'error')
    setSaving(false)
  }

  const fmt = (dateStr) => dateStr
    ? new Date(dateStr).toLocaleDateString('pt-BR', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })
    : null

  return (
    <div className="fixed inset-0 z-[1000] bg-black/70 flex items-center justify-center p-4">
      <div className={`rounded-2xl w-full max-w-[560px] max-h-[90vh] overflow-y-auto border shadow-2xl ${cx.border}
        bg-white dark:bg-slate-800`}>

        {/* Header */}
        <div className={`p-5 border-b ${cx.border}`}>
          <div className="flex justify-between items-start gap-3">
            <div className="flex-1">
              <p className={`text-[22px] font-extrabold leading-tight text-orange-500`}>{occ.client_name}</p>
              <div className="mt-1.5">
                <StatusDot value={status} />
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {canEdit && (
                <button onClick={() => { onClose(); onEdit?.(occ) }}
                  className="h-8 px-3 rounded-full flex items-center gap-1.5 text-xs font-semibold transition-colors
                    bg-indigo-50 dark:bg-indigo-500/15 text-indigo-500 dark:text-indigo-400
                    hover:bg-indigo-100 dark:hover:bg-indigo-500/25 border border-indigo-200 dark:border-indigo-500/30">
                  ✏️ Editar
                </button>
              )}
              <button onClick={onClose}
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm transition-colors
                  bg-slate-100 dark:bg-slate-900 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">✕</button>
            </div>
          </div>
        </div>

        <div className="p-5 flex flex-col gap-4">
          {/* Bloco de classificação — prioridade, tipo, setor em destaque */}
          <div className="grid grid-cols-3 gap-2">
            {/* Prioridade */}
            <div style={{ background: p.bg, borderColor: p.color + '55' }}
              className="rounded-xl border p-3 flex flex-col gap-1">
              <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: p.color }}>Prioridade</p>
              <div className="flex items-center gap-1.5">
                <span style={{ background: p.color }} className="w-2 h-2 rounded-full flex-shrink-0" />
                <p className="text-sm font-bold" style={{ color: p.color }}>{p.label}</p>
              </div>
            </div>
            {/* Tipo */}
            <div style={{ background: (tipo?.cor || '#6366f1') + '18', borderColor: (tipo?.cor || '#6366f1') + '44' }}
              className="rounded-xl border p-3 flex flex-col gap-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Tipo</p>
              <p className="text-sm font-bold text-slate-700 dark:text-slate-200 leading-tight"
                style={{ color: tipo?.cor || '#6366f1' }}>
                {tipo?.nome || '—'}
              </p>
            </div>
            {/* Setor */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/40 p-3 flex flex-col gap-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Setor</p>
              <p className="text-sm font-bold text-slate-600 dark:text-slate-300 leading-tight">{setor?.nome || '—'}</p>
            </div>
          </div>

          {/* Nota retida */}
          {occ.nota_retida && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-3.5 py-2.5 flex items-center gap-2">
              <span className="text-red-400 font-bold text-sm">⚠️</span>
              <span className="text-sm font-semibold text-red-400">Nota fiscal retida</span>
              {occ.nfe && <span className="text-xs text-red-300 ml-auto">Doc. {occ.nfe}</span>}
            </div>
          )}
          {!occ.nota_retida && occ.nfe && (
            <p className="text-xs text-slate-400">📄 Documento: <span className="font-semibold">{occ.nfe}</span></p>
          )}

          {/* Descrição */}
          {occ.description && (
            <div>
              <p className="text-[11px] text-slate-400 font-bold uppercase mb-1.5">Descrição</p>
              <p className={`text-sm leading-relaxed ${cx.textSecondary}`}>{occ.description}</p>
            </div>
          )}

          {/* Documento */}
          {occ.nfe && (
            <div>
              <p className="text-[11px] text-slate-400 font-bold mb-1">Número do documento</p>
              <p className="text-sm text-slate-500 font-semibold">{occ.nfe}</p>
            </div>
          )}

          {/* Imagem */}
          {occ.image_url && (
            <div className="rounded-xl overflow-hidden">
              <img src={occ.image_url} alt="ocorrência" className="w-full max-h-[260px] object-cover block" />
            </div>
          )}

          {/* ── Trilha de auditoria ─────────────────────────────────────── */}
          <div className={`rounded-xl border ${cx.border} overflow-hidden`}>
            <div className="px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-100 dark:border-slate-700">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Histórico</p>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-700">
              {/* Criação */}
              <div className="px-3.5 py-2.5 flex items-start gap-2.5">
                <span className="text-base mt-0.5">📝</span>
                <div>
                  <p className="text-[12px] font-semibold text-slate-700 dark:text-slate-300">
                    Aberta por <span className="text-indigo-400">{creator?.name || '—'}</span>
                  </p>
                  <p className="text-[11px] text-slate-400">{fmt(occ.created_at)}</p>
                </div>
              </div>

              {/* Edição (se foi editada por alguém diferente do criador) */}
              {occ.updated_by && occ.updated_by !== occ.created_by && occ.updated_at !== occ.created_at && (
                <div className="px-3.5 py-2.5 flex items-start gap-2.5">
                  <span className="text-base mt-0.5">✏️</span>
                  <div>
                    <p className="text-[12px] font-semibold text-slate-700 dark:text-slate-300">
                      Editada por <span className="text-amber-400">{editor?.name || '—'}</span>
                    </p>
                    <p className="text-[11px] text-slate-400">{fmt(occ.updated_at)}</p>
                  </div>
                </div>
              )}

              {/* Resolução */}
              {occ.resolved_by && (
                <div className="px-3.5 py-2.5 flex items-start gap-2.5">
                  <span className="text-base mt-0.5">✅</span>
                  <div>
                    <p className="text-[12px] font-semibold text-slate-700 dark:text-slate-300">
                      Resolvida por <span className="text-emerald-400">{resolver?.name || '—'}</span>
                    </p>
                    <p className="text-[11px] text-slate-400">{fmt(occ.resolved_at)}</p>
                  </div>
                </div>
              )}

              {/* Cancelamento */}
              {occ.cancelled_by && (
                <div className="px-3.5 py-2.5 flex items-start gap-2.5">
                  <span className="text-base mt-0.5">🚫</span>
                  <div>
                    <p className="text-[12px] font-semibold text-slate-700 dark:text-slate-300">
                      Cancelada por <span className="text-red-400">{canceler?.name || '—'}</span>
                    </p>
                    <p className="text-[11px] text-slate-400">{fmt(occ.cancelled_at)}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Alterar status ──────────────────────────────────────────── */}
          {canAct && (
            <div className={`border-t pt-4 ${cx.border}`}>
              <div className="flex items-center justify-between mb-2.5">
                <p className="text-[11px] text-slate-400 font-bold uppercase">Alterar status</p>
                {isLocked && !isAdmin && (
                  <span className="text-[11px] text-slate-400 bg-slate-100 dark:bg-slate-900 px-2.5 py-1 rounded-lg">
                    🔒 Bloqueado
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {STATUS.map(s => {
                  const isCurrent  = status === s.value
                  const isDisabled = saving || isCurrent || (!isAdmin && isLocked)
                  return (
                    <button key={s.value} onClick={() => handleStatus(s.value)} disabled={isDisabled}
                      style={isCurrent ? { borderColor: s.color, background: s.color + '22', color: s.color } : {}}
                      className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all
                        ${isCurrent
                          ? 'border-2 cursor-default'
                          : isDisabled
                            ? 'border-2 border-slate-100 dark:border-slate-800 text-slate-300 dark:text-slate-700 bg-transparent cursor-not-allowed'
                            : 'border-2 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900 cursor-pointer hover:border-slate-300'}`}>
                      {s.label}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── OccurrencesPage ───────────────────────────────────────────────────────────
export function OccurrencesPage({ onBack }) {
  const { can, isAdmin, allUsers, pendingCount } = useApp()
  const [occurrences, setOccurrences]   = useState([])
  const [setores, setSetores]           = useState([])
  const [tipos, setTipos]               = useState([])
  const [loading, setLoading]           = useState(true)
  const [showForm, setShowForm]         = useState(false)
  const [editTarget, setEditTarget]     = useState(null)
  const [selected, setSelected]         = useState(null)
  const [filterStatus, setFilterStatus] = useState('todas')
  const [filterPriority, setFilterPriority] = useState('todas')
  const [search, setSearch]             = useState('')
  const mobile = isMobile()

  useEffect(() => { if (mobile && can('occ_create')) setShowForm(true) }, [])

  useEffect(() => {
    Promise.all([
      supabase.from('setores').select('*').eq('ativo', true).order('nome'),
      supabase.from('tipos_problema').select('*').eq('ativo', true).order('nome'),
    ]).then(([s, t]) => { if (s.data) setSetores(s.data); if (t.data) setTipos(t.data) })
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('occurrences').select('*').order('created_at', { ascending: false })
    setOccurrences(data || []); setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])

  const filtered = occurrences.filter(o => {
    if (filterStatus !== 'todas' && o.status !== filterStatus) return false
    if (filterPriority !== 'todas' && o.priority !== filterPriority) return false
    if (search) {
      const q = search.toLowerCase()
      return o.client_name?.toLowerCase().includes(q) || o.description?.toLowerCase().includes(q) || o.nfe?.includes(q)
    }
    return true
  })

  const counts = {
    em_andamento: occurrences.filter(o => o.status === 'em_andamento').length,
    resolvida:    occurrences.filter(o => o.status === 'resolvida').length,
    cancelada:    occurrences.filter(o => o.status === 'cancelada').length,
  }

  const selCls = `px-3 py-2 rounded-lg text-xs font-medium cursor-pointer outline-none transition-colors
    bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400`

  return (
    <div className={`min-h-screen ${cx.pageBg} ${cx.textPrimary}`}>
      {/* Header */}
      <div className={`px-6 border-b ${cx.border} bg-white dark:bg-slate-900 relative flex items-center justify-between`}
        style={{ minHeight: 56 }}>
        <div className="flex-shrink-0 z-10">
          {onBack && (
            <button onClick={onBack}
              className="bg-transparent border-none text-slate-400 cursor-pointer text-[13px] font-semibold
                flex items-center gap-1 hover:text-slate-600 dark:hover:text-slate-300 transition-colors p-0">
              ← Início
            </button>
          )}
        </div>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <p className={`font-bold text-lg ${cx.textPrimary}`}>Ocorrências</p>
          <p className="text-xs text-slate-400 mt-0.5">
            {counts.em_andamento} em andamento · {counts.resolvida} resolvidas · {counts.cancelada} canceladas
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 z-10">
          <ThemeToggle />
          {can('occ_create') && (
            <button onClick={() => { setEditTarget(null); setShowForm(true) }}
              className="bg-gradient-to-br from-orange-500 to-orange-600 text-white border-none rounded-xl px-4 py-2.5 cursor-pointer text-sm font-bold hover:opacity-90 transition-opacity">
              + Nova
            </button>
          )}
        </div>
      </div>

      {/* Filtros */}
      <div className={`px-6 py-3 border-b ${cx.borderSub} flex flex-wrap gap-2.5`}>
        <input placeholder="Buscar por cliente, título, documento..." value={search}
          onChange={e => setSearch(e.target.value)}
          className={`flex-1 min-w-[220px] px-3.5 py-2 rounded-lg text-xs outline-none transition-colors
            bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700
            text-slate-700 dark:text-slate-200 placeholder:text-slate-400`} />
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className={selCls}>
          <option value="todas">Todos os status</option>
          {STATUS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)} className={selCls}>
          <option value="todas">Todas as prioridades</option>
          {PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>
      </div>

      {pendingCount?.occurrences > 0 && (
        <div className="mx-6 mt-3 px-3.5 py-2.5 bg-amber-500/10 border border-amber-500/30 rounded-lg text-xs text-amber-500 dark:text-amber-300 flex items-center gap-2">
          📶 {pendingCount.occurrences} ocorrência(s) aguardando sincronização
        </div>
      )}

      {/* Lista */}
      <div className="px-6 py-4 flex flex-col gap-2.5">
        {loading ? (
          <div className="text-center py-16 text-slate-400"><p className="text-2xl mb-3">⏳</p>Carregando...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <p className="text-4xl mb-3">📋</p>
            <p className="font-semibold text-slate-500 mb-1.5">
              {search || filterStatus !== 'todas' || filterPriority !== 'todas' ? 'Nenhuma ocorrência encontrada' : 'Nenhuma ocorrência ainda'}
            </p>
            {can('occ_create') && !search && filterStatus === 'todas' && <p className="text-xs">Clique em "+ Nova" para registrar</p>}
          </div>
        ) : filtered.map(occ => (
          <OccurrenceCard key={occ.id} occ={occ} setores={setores} tipos={tipos} allUsers={allUsers} onClick={() => setSelected(occ)} />
        ))}
      </div>

      {mobile && can('occ_create') && !showForm && (
        <button onClick={() => { setEditTarget(null); setShowForm(true) }}
          className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 border-none text-white text-3xl cursor-pointer z-[500] shadow-lg shadow-orange-500/40 flex items-center justify-center">
          +
        </button>
      )}

      {showForm && (
        <OccurrenceForm editData={editTarget}
          onClose={() => { setShowForm(false); setEditTarget(null); if (mobile) onBack?.() }}
          onSaved={() => { setShowForm(false); setEditTarget(null); if (mobile) onBack?.(); else load() }} />
      )}
      {selected && (
        <OccurrenceDetail occ={selected} setores={setores} tipos={tipos} allUsers={allUsers}
          onClose={() => setSelected(null)}
          onUpdate={() => { setSelected(null); load() }}
          onEdit={(occ) => { setEditTarget(occ); setShowForm(true) }} />
      )}
    </div>
  )
}
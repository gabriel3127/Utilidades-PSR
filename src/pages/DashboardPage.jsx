import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useApp } from '@/context/AppContext'

// ─── Helpers visuais ──────────────────────────────────────────────────────────
function BarChart({ data, colorKey = 'color', valueKey = 'value', labelKey = 'label', height = 120 }) {
  const max = Math.max(...data.map(d => d[valueKey]), 1)
  return (
    <div className="flex items-end gap-2" style={{ height }}>
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
          <div className="text-xs font-bold text-slate-400">{d[valueKey]}</div>
          <div style={{ background: d[colorKey] || '#6366f1', height: `${Math.max((d[valueKey] / max) * (height - 36), 4)}px`, transition: 'height 0.4s ease', minHeight: 4 }} className="w-full rounded-t" />
          <div className="text-[10px] text-slate-500 text-center leading-snug">{d[labelKey]}</div>
        </div>
      ))}
    </div>
  )
}

function StatCard({ label, value, icon, color, sub }) {
  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 flex flex-col gap-2.5">
      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</div>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg" style={{ background: color + '22' }}>{icon}</div>
      </div>
      <div className="text-[32px] font-extrabold leading-none text-slate-900 dark:text-slate-50">{value}</div>
      {sub && <div className="text-xs text-slate-400">{sub}</div>}
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div>
      <div className="text-[13px] font-bold text-slate-400 uppercase tracking-[0.08em] mb-3.5">{title}</div>
      {children}
    </div>
  )
}

function Card({ children, className = '' }) {
  return (
    <div className={`bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 ${className}`}>
      {children}
    </div>
  )
}

// period pode ser número (dias) ou { from: Date, to: Date }
function PeriodPicker({ period, setPeriod }) {
  const presets = [7, 30, 90]
  const isPreset = typeof period === 'number' && presets.includes(period)
  const [showRange, setShowRange] = useState(false)
  const today = new Date().toISOString().split('T')[0]
  const [fromDate, setFromDate] = useState('')
  const [toDate,   setToDate]   = useState(today)

  const applyRange = () => {
    if (!fromDate || !toDate) return
    setPeriod({ from: new Date(fromDate), to: new Date(toDate + 'T23:59:59') })
    setShowRange(false)
  }

  const rangeLabel = typeof period === 'object'
    ? `${new Date(period.from).toLocaleDateString('pt-BR', {day:'2-digit',month:'2-digit'})} → ${new Date(period.to).toLocaleDateString('pt-BR', {day:'2-digit',month:'2-digit'})}`
    : null

  return (
    <div className="flex items-center gap-1.5 flex-wrap justify-end">
      {presets.map(d => (
        <button key={d} onClick={() => { setPeriod(d); setShowRange(false) }}
          className={`px-3 py-1.5 rounded-lg cursor-pointer text-xs font-semibold transition-all border
            ${isPreset && period === d
              ? 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 border-indigo-400 dark:border-indigo-500'
              : 'bg-transparent text-slate-400 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'}`}>
          {d}d
        </button>
      ))}
      <button onClick={() => setShowRange(s => !s)}
        className={`px-3 py-1.5 rounded-lg cursor-pointer text-xs font-semibold transition-all border
          ${showRange || rangeLabel
            ? 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 border-indigo-400 dark:border-indigo-500'
            : 'bg-transparent text-slate-400 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'}`}>
        {rangeLabel || '📅 período'}
      </button>
      {showRange && (
        <div className="flex items-center gap-1.5 mt-1 w-full justify-end">
          <input type="date" value={fromDate} max={toDate || today}
            onChange={e => setFromDate(e.target.value)}
            className="px-2 py-1.5 rounded-lg text-xs border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 outline-none focus:border-indigo-400" />
          <span className="text-xs text-slate-400">até</span>
          <input type="date" value={toDate} min={fromDate} max={today}
            onChange={e => setToDate(e.target.value)}
            className="px-2 py-1.5 rounded-lg text-xs border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 outline-none focus:border-indigo-400" />
          <button onClick={applyRange} disabled={!fromDate}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-500 text-white border border-indigo-500 cursor-pointer disabled:opacity-40">
            OK
          </button>
        </div>
      )}
    </div>
  )
}

// Helper: resolve período para { sinceISO, untilISO }
function resolvePeriod(period) {
  if (typeof period === 'object' && period.from) {
    return { sinceISO: period.from.toISOString(), untilISO: period.to.toISOString() }
  }
  const since = new Date()
  since.setDate(since.getDate() - (period || 30))
  return { sinceISO: since.toISOString(), untilISO: new Date().toISOString() }
}

// Helper: busca todos os cards paginando de 1000 em 1000
async function fetchAllCards(select) {
  const pageSize = 1000
  let page = 0, all = []
  for (let i = 0; i < 20; i++) { // max 20 páginas = 20k cards
    const { data, error } = await supabase
      .from('pipeline_cards')
      .select(select)
      .order('created_at', { ascending: true })
      .range(page * pageSize, (page + 1) * pageSize - 1)
    if (error || !data || data.length === 0) break
    all = all.concat(data)
    if (data.length < pageSize) break
    page++
  }
  return all
}

function Empty({ icon, text }) {
  return <div className="text-center text-slate-400 py-8"><div className="text-3xl mb-2">{icon}</div><div className="text-[13px]">{text}</div></div>
}

const fmt = (n) => n?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }) || 'R$ 0'

const daysDiff = (dateStr) => {
  if (!dateStr) return null
  return Math.floor((new Date() - new Date(dateStr)) / (1000 * 60 * 60 * 24))
}

// ─── Aba Visão Geral ──────────────────────────────────────────────────────────
function TabGeral({ period, setPeriod }) {
  const [loading, setLoading] = useState(true)
  const [data, setData]       = useState(null)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const { sinceISO, untilISO } = resolvePeriod(period)
      const [occRes, visRes, allCards, usersRes] = await Promise.all([
        supabase.from('occurrences').select('status,priority,created_at').gte('created_at', sinceISO).lte('created_at', untilISO),
        supabase.from('visitas_tecnicas').select('id,created_at').gte('created_at', sinceISO).lte('created_at', untilISO),
        fetchAllCards('id,value,sales_history'),
        supabase.from('profiles').select('id,active,role'),
      ])
      const occs  = occRes.data   || []
      const vis   = visRes.data   || []
      const cards = allCards      || []
      const users = usersRes.data || []

      // Valor real de vendas (soma de sales_history)
      const totalSalesValue = cards.reduce((sum, c) => {
        const hist = Array.isArray(c.sales_history) ? c.sales_history : []
        return sum + hist.reduce((s, h) => s + (parseFloat(h.value) || 0), 0)
      }, 0)

      setData({
        occs, vis, cards,
        abertas:       occs.filter(o => o.status === 'aberta').length,
        urgentes:      occs.filter(o => o.priority === 'urgente').length,
        activeUsers:   users.filter(u => u.active !== false).length,
        pendingUsers:  users.filter(u => u.role === 'pendente').length,
        totalSalesValue,
        totalCards: cards.length,
      })
      setLoading(false)
    }
    load()
  }, [period])

  if (loading || !data) return <Empty icon="📊" text="Carregando..." />

  return (
    <div className="flex flex-col gap-8 max-w-[1100px]">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-bold text-xl text-slate-900 dark:text-slate-100">Visão Geral</div>
          <div className="text-xs text-slate-400 mt-0.5">Resumo de todos os módulos</div>
        </div>
        <PeriodPicker period={period} setPeriod={setPeriod} />
      </div>

      <Section title="Resumo">
        <div className="grid gap-3.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
          <StatCard label="Ocorrências" value={data.occs.length}  icon="⚠️" color="#f97316" sub={`${data.abertas} abertas · ${data.urgentes} urgentes`} />
          <StatCard label="Visitas"     value={data.vis.length}   icon="🔧" color="#0ea5e9" sub={typeof period === 'object' ? `de ${new Date(period.from).toLocaleDateString('pt-BR')} a ${new Date(period.to).toLocaleDateString('pt-BR')}` : `nos últimos ${period} dias`} />
          <StatCard label="Pipeline"    value={data.totalCards}   icon="💼" color="#6366f1" sub={`${fmt(data.totalSalesValue)} em vendas`} />
          <StatCard label="Usuários"    value={data.activeUsers}  icon="👥" color="#10b981" sub={data.pendingUsers > 0 ? `${data.pendingUsers} pendentes` : 'todos ativos'} />
        </div>
      </Section>

      <div className="grid gap-5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
        <Section title="Ocorrências por status">
          <Card>
            {data.occs.length === 0 ? <Empty icon="✅" text="Nenhuma no período" /> :
              <BarChart data={[
                { label: 'Aberta',    value: data.occs.filter(o => o.status === 'aberta').length,       color: '#6b7280' },
                { label: 'Andamento', value: data.occs.filter(o => o.status === 'em_andamento').length, color: '#f59e0b' },
                { label: 'Resolvida', value: data.occs.filter(o => o.status === 'resolvida').length,    color: '#10b981' },
                { label: 'Cancelada', value: data.occs.filter(o => o.status === 'cancelada').length,    color: '#ef4444' },
              ]} />
            }
          </Card>
        </Section>
        <Section title="Visitas por dia da semana">
          <Card>
            {data.vis.length === 0 ? <Empty icon="🗓️" text="Nenhuma no período" /> : (() => {
              const dias = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']
              const byDay = new Array(7).fill(0)
              data.vis.forEach(v => { byDay[new Date(v.created_at).getDay()]++ })
              return <BarChart data={dias.map((d, i) => ({ label: d, value: byDay[i], color: '#0ea5e9' }))} height={100} />
            })()}
          </Card>
        </Section>
      </div>

      <div className="text-[11px] text-slate-300 dark:text-slate-700 text-center pb-4">
        {typeof period === 'object' ? `Período: ${new Date(period.from).toLocaleDateString('pt-BR')} a ${new Date(period.to).toLocaleDateString('pt-BR')}` : `Dados dos últimos ${period} dias`} · Atualizado agora
      </div>
    </div>
  )
}

// ─── Aba Ocorrências ──────────────────────────────────────────────────────────
function TabOcorrencias({ period, setPeriod }) {
  const [loading, setLoading] = useState(true)
  const [data,    setData]    = useState(null)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const { sinceISO, untilISO } = resolvePeriod(period)
      const [occRes, setoresRes, tiposRes, usersRes] = await Promise.all([
        supabase.from('occurrences').select('id,status,priority,created_at,resolved_at,setor_id,tipo_problema_id,created_by').gte('created_at', sinceISO).lte('created_at', untilISO),
        supabase.from('setores').select('id,nome'),
        supabase.from('tipos_problema').select('id,nome,cor'),
        supabase.from('profiles').select('id,name'),
      ])
      const occs    = occRes.data     || []
      const setores = setoresRes.data || []
      const tipos   = tiposRes.data   || []
      const users   = usersRes.data   || []

      // Por setor
      const bySetor = setores.map(s => ({
        id:    s.id,
        label: s.nome,
        value: occs.filter(o => o.setor_id === s.id).length,
        color: '#f97316',
      })).filter(s => s.value > 0).sort((a,b) => b.value - a.value)

      // Por tipo por setor — um array de { setor, tipos[] }
      const tiposPorSetor = bySetor.map(s => {
        const occsDoSetor = occs.filter(o => o.setor_id === s.id)
        const tiposDoSetor = tipos.map(t => ({
          label: t.nome,
          value: occsDoSetor.filter(o => o.tipo_problema_id === t.id).length,
          color: t.cor || '#ef4444',
        })).filter(t => t.value > 0).sort((a,b) => b.value - a.value).slice(0, 8)
        return { setor: s.label, tipos: tiposDoSetor }
      }).filter(s => s.tipos.length > 0)

      // Por responsável
      const byUser = users.map(u => ({
        id:    u.id,
        label: u.name || u.id,
        value: occs.filter(o => o.created_by === u.id).length,
        color: '#8b5cf6',
      })).filter(u => u.value > 0).sort((a,b) => b.value - a.value)

      // Tempo médio de resolução
      const resolvidas = occs.filter(o => o.status === 'resolvida' && o.resolved_at)
      const avgDays = resolvidas.length > 0
        ? (resolvidas.reduce((s, o) => s + (new Date(o.resolved_at) - new Date(o.created_at)) / (1000 * 60 * 60 * 24), 0) / resolvidas.length).toFixed(1)
        : null

      // Tendência adaptativa
      const dias = typeof period === 'number' ? period : Math.round((new Date(period?.to) - new Date(period?.from)) / (1000 * 60 * 60 * 24))
      let tendencia = []
      if (dias <= 7) {
        // Por dia
        const buckets = {}
        occs.forEach(o => {
          const key = new Date(o.created_at).toLocaleDateString('pt-BR', { day:'2-digit', month:'2-digit' })
          buckets[key] = (buckets[key] || 0) + 1
        })
        tendencia = Object.entries(buckets).map(([label, value]) => ({ label, value, color: '#f97316' }))
      } else if (dias <= 60) {
        // Por semana
        const buckets = {}
        occs.forEach(o => {
          const d = new Date(o.created_at)
          const ws = new Date(d); ws.setDate(d.getDate() - d.getDay())
          const key = ws.toLocaleDateString('pt-BR', { day:'2-digit', month:'2-digit' })
          buckets[key] = (buckets[key] || 0) + 1
        })
        tendencia = Object.entries(buckets).map(([label, value]) => ({ label, value, color: '#f97316' }))
      } else {
        // Por mês
        const buckets = {}
        occs.forEach(o => {
          const key = new Date(o.created_at).toLocaleDateString('pt-BR', { month:'short', year:'2-digit' })
          buckets[key] = (buckets[key] || 0) + 1
        })
        tendencia = Object.entries(buckets).map(([label, value]) => ({ label, value, color: '#f97316' }))
      }
      const tendenciaLabel = dias <= 7 ? 'Tendência diária' : dias <= 60 ? 'Tendência semanal' : 'Tendência mensal'

      setData({
        occs, bySetor, tiposPorSetor, byUser, avgDays, tendencia, tendenciaLabel,
        total:      occs.length,
        andamento:  occs.filter(o => o.status === 'em_andamento').length,
        resolvidas: resolvidas.length,
        canceladas: occs.filter(o => o.status === 'cancelada').length,
        urgentes:   occs.filter(o => o.priority === 'urgente').length,
      })
      setLoading(false)
    }
    load()
  }, [period])

  if (loading || !data) return <Empty icon="⚠️" text="Carregando..." />

  return (
    <div className="flex flex-col gap-8 max-w-[1100px]">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-bold text-xl text-slate-900 dark:text-slate-100">⚠️ Ocorrências</div>
          <div className="text-xs text-slate-400 mt-0.5">Análise detalhada de ocorrências</div>
        </div>
        <PeriodPicker period={period} setPeriod={setPeriod} />
      </div>

      {/* Resumo */}
      <Section title="Resumo do período">
        <div className="grid gap-3.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))' }}>
          <StatCard label="Total"       value={data.total}      icon="⚠️"  color="#f97316" />
          <StatCard label="Em andamento" value={data.andamento}  icon="🟡"  color="#f59e0b" sub="em atendimento" />
          <StatCard label="Resolvidas"  value={data.resolvidas} icon="✅"  color="#10b981" />
          <StatCard label="Canceladas"  value={data.canceladas} icon="❌"  color="#6b7280" />
          <StatCard label="Urgentes"    value={data.urgentes}   icon="🚨"  color="#ef4444" />
          {data.avgDays && <StatCard label="Tempo médio" value={`${data.avgDays}d`} icon="⏱️" color="#8b5cf6" sub="para resolução" />}
        </div>
      </Section>

      {/* Status + Prioridade */}
      <div className="grid gap-5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
        <Section title="Por status">
          <Card>
            <BarChart data={[
              { label: 'Andamento', value: data.occs.filter(o => o.status === 'em_andamento').length, color: '#f59e0b' },
              { label: 'Resolvida', value: data.occs.filter(o => o.status === 'resolvida').length,    color: '#10b981' },
              { label: 'Cancelada', value: data.occs.filter(o => o.status === 'cancelada').length,    color: '#ef4444' },
            ]} />
          </Card>
        </Section>
        <Section title="Por prioridade">
          <Card>
            <BarChart data={[
              { label: 'Baixa',   value: data.occs.filter(o => o.priority === 'baixa').length,   color: '#6b7280' },
              { label: 'Média',   value: data.occs.filter(o => o.priority === 'media').length,   color: '#3b82f6' },
              { label: 'Alta',    value: data.occs.filter(o => o.priority === 'alta').length,    color: '#f59e0b' },
              { label: 'Urgente', value: data.occs.filter(o => o.priority === 'urgente').length, color: '#ef4444' },
            ]} />
          </Card>
        </Section>
      </div>

      {/* Tendência adaptativa */}
      {data.tendencia.length > 1 && (
        <Section title={data.tendenciaLabel}>
          <Card><BarChart data={data.tendencia} height={130} /></Card>
        </Section>
      )}

      {/* Por setor */}
      {data.bySetor.length > 0 && (
        <Section title="Por setor">
          <Card><BarChart data={data.bySetor} height={130} /></Card>
        </Section>
      )}

      {/* Tipos de problema por setor */}
      {data.tiposPorSetor.length > 0 && (
        <Section title="Tipos de problema por setor">
          <div className="flex flex-col gap-4">
            {data.tiposPorSetor.map((s, i) => (
              <Card key={i}>
                <div className="text-[12px] font-bold text-slate-500 dark:text-slate-400 mb-3 uppercase tracking-wide">{s.setor}</div>
                <BarChart data={s.tipos} height={110} />
              </Card>
            ))}
          </div>
        </Section>
      )}

      {/* Por responsável — largura total */}
      {data.byUser.length > 0 && (
        <Section title="Por responsável">
          <Card>
            <div className="flex flex-col gap-0">
              {data.byUser.map((u, i) => (
                <div key={u.id} className="flex items-center gap-3 py-2.5 border-b border-slate-100 dark:border-slate-700 last:border-0">
                  <div className="w-7 h-7 rounded-full bg-violet-500/20 flex items-center justify-center text-[11px] font-bold text-violet-400 flex-shrink-0">
                    {u.label[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-semibold text-slate-700 dark:text-slate-300">{u.label}</div>
                  </div>
                  <div className="text-right flex-shrink-0 mr-3">
                    <div className="text-[15px] font-extrabold text-violet-400">{u.value}</div>
                    <div className="text-[10px] text-slate-400">ocorrências</div>
                  </div>
                  <div className="w-40 bg-slate-100 dark:bg-slate-700 rounded-full h-2 flex-shrink-0">
                    <div style={{ width: `${(u.value / data.byUser[0].value) * 100}%`, background: '#8b5cf6' }} className="h-2 rounded-full transition-all" />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </Section>
      )}

      <div className="text-[11px] text-slate-300 dark:text-slate-700 text-center pb-4">
        {typeof period === 'object' ? `Período: ${new Date(period.from).toLocaleDateString('pt-BR')} a ${new Date(period.to).toLocaleDateString('pt-BR')}` : `Dados dos últimos ${period} dias`} · Atualizado agora
      </div>
    </div>
  )
}

// ─── Aba Visitas ──────────────────────────────────────────────────────────────
function TabVisitas({ period, setPeriod }) {
  const [loading, setLoading] = useState(true)
  const [data,    setData]    = useState(null)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const { sinceISO, untilISO } = resolvePeriod(period)

      const [visRes, tiposRes, usersRes] = await Promise.all([
        supabase.from('visitas_tecnicas')
          .select('id,created_at,created_by,tipo_visita_id,client_name,nome_consultor,segmento_cliente,porte_cliente,avaliacao_atendimento,avaliacao_variedade,avaliacao_entrega,interesse_expandir,tem_reclamacao,tipos_reclamacao,produtos_utilizados,volume_percentual,prioridade_acompanhamento')
          .gte('created_at', sinceISO).lte('created_at', untilISO),
        supabase.from('tipos_visita').select('id,nome,cor'),
        supabase.from('profiles').select('id,name'),
      ])
      const vis   = visRes.data   || []
      const tipos = tiposRes.data || []
      const users = usersRes.data || []

      // ── Métricas de avaliação (sistema antigo) ──
      const avalMap = { Péssimo: 1, Ruim: 2, Regular: 3, Bom: 4, Excelente: 5 }
      const calcMedia = campo => {
        const vals = vis.map(v => avalMap[v[campo]]).filter(Boolean)
        return vals.length ? (vals.reduce((a,b) => a+b, 0) / vals.length).toFixed(1) : null
      }
      const mediaAtendimento = calcMedia('avaliacao_atendimento')
      const mediaProdutos    = calcMedia('avaliacao_variedade')
      const mediaEntrega     = calcMedia('avaliacao_entrega')
      const oportunidades    = vis.filter(v => v.interesse_expandir === 'Sim').length
      const comReclamacao    = vis.filter(v => v.tem_reclamacao === 'Sim').length

      // ── Contagem de campo (scalar ou array) ──
      const contarCampo = (campo) => {
        const count = {}
        vis.forEach(v => {
          const val = v[campo]
          if (Array.isArray(val)) val.forEach(i => { count[i] = (count[i] || 0) + 1 })
          else if (val) count[val] = (count[val] || 0) + 1
        })
        return count
      }
      const produtosCount   = contarCampo('produtos_utilizados')
      const segmentosCount  = contarCampo('segmento_cliente')
      const porteCount      = contarCampo('porte_cliente')
      const volumeCount     = contarCampo('volume_percentual')
      const reclamCount     = contarCampo('tipos_reclamacao')

      // ── Por tipo / setor / técnico ──
      const byTipo  = tipos.map(t => ({ label: t.nome, value: vis.filter(v => v.tipo_visita_id === t.id).length, color: t.cor || '#0ea5e9' })).filter(t => t.value > 0).sort((a,b) => b.value - a.value)
      // Técnico por created_by (UUID) mapeado para nome via profiles
      const byUser  = users.map(u => ({
        id: u.id, label: u.name || u.id,
        value: vis.filter(v => v.created_by === u.id).length,
      })).filter(u => u.value > 0).sort((a,b) => b.value - a.value)

      // ── Por prioridade de acompanhamento ──
      const byPrioridade = ['Alta','Média','Baixa'].map(p => ({
        label: p,
        value: vis.filter(v => v.prioridade_acompanhamento === p).length,
        color: p === 'Alta' ? '#ef4444' : p === 'Média' ? '#f59e0b' : '#3b82f6',
      })).filter(p => p.value > 0)

      // ── Tendência adaptativa ──
      const dias = typeof period === 'number' ? period : Math.round((new Date(period?.to) - new Date(period?.from)) / (1000*60*60*24))
      let tendencia = []
      if (dias <= 7) {
        const b = {}; vis.forEach(v => { const k = new Date(v.created_at).toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'}); b[k]=(b[k]||0)+1 }); tendencia = Object.entries(b).map(([label,value])=>({label,value,color:'#0ea5e9'}))
      } else if (dias <= 60) {
        const b = {}; vis.forEach(v => { const d=new Date(v.created_at); const ws=new Date(d); ws.setDate(d.getDate()-d.getDay()); const k=ws.toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'}); b[k]=(b[k]||0)+1 }); tendencia = Object.entries(b).map(([label,value])=>({label,value,color:'#0ea5e9'}))
      } else {
        const b = {}; vis.forEach(v => { const k=new Date(v.created_at).toLocaleDateString('pt-BR',{month:'short',year:'2-digit'}); b[k]=(b[k]||0)+1 }); tendencia = Object.entries(b).map(([label,value])=>({label,value,color:'#0ea5e9'}))
      }
      const tendenciaLabel = dias <= 7 ? 'Tendência diária' : dias <= 60 ? 'Tendência semanal' : 'Tendência mensal'

      const uniqueClients = new Set(vis.map(v => v.client_name).filter(Boolean)).size

      setData({
        vis, byTipo, byUser, byPrioridade, tendencia, tendenciaLabel, uniqueClients,
        mediaAtendimento, mediaProdutos, mediaEntrega,
        oportunidades, comReclamacao,
        produtosCount, segmentosCount, porteCount, volumeCount, reclamCount,
      })
      setLoading(false)
    }
    load()
  }, [period])

  if (loading || !data) return <Empty icon="🔧" text="Carregando..." />

  // Helper: converte objeto count em barras ordenadas
  const countToBars = (obj, color) =>
    Object.entries(obj).sort((a,b) => b[1]-a[1]).map(([label,value]) => ({ label, value, color }))

  // Estrelinhas de avaliação
  const StarRating = ({ value }) => {
    const n = parseFloat(value)
    return (
      <div className="flex items-center gap-0.5">
        {[1,2,3,4,5].map(i => (
          <div key={i} className="w-3 h-3 rounded-sm" style={{ background: i <= Math.round(n) ? '#f59e0b' : '#e2e8f0' }} />
        ))}
        <span className="ml-1.5 text-[13px] font-bold text-slate-700 dark:text-slate-300">{value}/5</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8 max-w-[1100px]">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-bold text-xl text-slate-900 dark:text-slate-100">🔧 Visitas Técnicas</div>
          <div className="text-xs text-slate-400 mt-0.5">Análise detalhada de visitas</div>
        </div>
        <PeriodPicker period={period} setPeriod={setPeriod} />
      </div>

      {/* Resumo numérico */}
      <Section title="Resumo do período">
        <div className="grid gap-3.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))' }}>
          <StatCard label="Total de visitas"   value={data.vis.length}     icon="🔧" color="#0ea5e9" />
          <StatCard label="Clientes únicos"    value={data.uniqueClients}  icon="🏢" color="#6366f1" sub="clientes visitados" />
          <StatCard label="Oportunidades"      value={data.oportunidades}  icon="💼" color="#f59e0b" sub="interesse em expandir" />
          <StatCard label="Com reclamação"     value={data.comReclamacao}  icon="⚠️" color="#ef4444" sub={data.comReclamacao > 0 ? 'requerem atenção' : 'tudo em ordem'} />
        </div>
      </Section>

      {/* Avaliações — só mostra se houver dados */}
      {(data.mediaAtendimento || data.mediaProdutos || data.mediaEntrega) && (
        <Section title="Avaliações médias">
          <Card>
            <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
              {data.mediaAtendimento && (
                <div>
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Atendimento</div>
                  <StarRating value={data.mediaAtendimento} />
                </div>
              )}
              {data.mediaProdutos && (
                <div>
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Produtos</div>
                  <StarRating value={data.mediaProdutos} />
                </div>
              )}
              {data.mediaEntrega && (
                <div>
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Entrega</div>
                  <StarRating value={data.mediaEntrega} />
                </div>
              )}
            </div>
          </Card>
        </Section>
      )}

      {/* Tendência */}
      {data.tendencia.length > 1 && (
        <Section title={data.tendenciaLabel}>
          <Card><BarChart data={data.tendencia} height={130} /></Card>
        </Section>
      )}

      {/* Tipo + Setor */}
      <div className="grid gap-5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
        {data.byTipo.length  > 0 && <Section title="Por tipo de visita"><Card><BarChart data={data.byTipo}  height={120} /></Card></Section>}
      </div>

      {/* Produtos utilizados */}
      {Object.keys(data.produtosCount).length > 0 && (
        <Section title="Produtos utilizados">
          <Card><BarChart data={countToBars(data.produtosCount, '#6366f1')} height={120} /></Card>
        </Section>
      )}

      {/* Prioridade de acompanhamento */}
      {data.byPrioridade?.length > 0 && (
        <Section title="Prioridade de acompanhamento">
          <Card><BarChart data={data.byPrioridade} height={100} /></Card>
        </Section>
      )}

      {/* Segmento + Porte */}
      <div className="grid gap-5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
        {Object.keys(data.segmentosCount).length > 0 && (
          <Section title="Por segmento">
            <Card><BarChart data={countToBars(data.segmentosCount, '#10b981')} height={120} /></Card>
          </Section>
        )}
        {Object.keys(data.porteCount).length > 0 && (
          <Section title="Por porte do cliente">
            <Card><BarChart data={countToBars(data.porteCount, '#0ea5e9')} height={120} /></Card>
          </Section>
        )}
      </div>

      {/* Volume PSR */}
      {Object.keys(data.volumeCount).length > 0 && (
        <Section title="Volume PSR (% utilização)">
          <Card><BarChart data={countToBars(data.volumeCount, '#f59e0b')} height={110} /></Card>
        </Section>
      )}

      {/* Tipos de reclamação */}
      {Object.keys(data.reclamCount).length > 0 && (
        <Section title="Tipos de reclamação">
          <Card><BarChart data={countToBars(data.reclamCount, '#ef4444')} height={110} /></Card>
        </Section>
      )}

      {/* Por técnico — largura total */}
      {data.byUser.length > 0 && (
        <Section title="Por técnico responsável">
          <Card>
            <div className="flex flex-col">
              {data.byUser.map((u, i) => (
                <div key={u.id} className="flex items-center gap-3 py-2.5 border-b border-slate-100 dark:border-slate-700 last:border-0">
                  <div className="w-7 h-7 rounded-full bg-sky-500/20 flex items-center justify-center text-[11px] font-bold text-sky-400 flex-shrink-0">
                    {u.label[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-semibold text-slate-700 dark:text-slate-300">{u.label}</div>
                  </div>
                  <div className="text-right flex-shrink-0 mr-3">
                    <div className="text-[15px] font-extrabold text-sky-400">{u.value}</div>
                    <div className="text-[10px] text-slate-400">visitas</div>
                  </div>
                  <div className="w-40 bg-slate-100 dark:bg-slate-700 rounded-full h-2 flex-shrink-0">
                    <div style={{ width: `${(u.value / data.byUser[0].value) * 100}%`, background: '#0ea5e9' }} className="h-2 rounded-full transition-all" />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </Section>
      )}

      <div className="text-[11px] text-slate-300 dark:text-slate-700 text-center pb-4">
        {typeof period === 'object' ? `Período: ${new Date(period.from).toLocaleDateString('pt-BR')} a ${new Date(period.to).toLocaleDateString('pt-BR')}` : `Dados dos últimos ${period} dias`} · Atualizado agora
      </div>
    </div>
  )
}

// ─── Aba Pipeline ─────────────────────────────────────────────────────────────
function TabPipeline({ period, setPeriod }) {
  const [loading, setLoading] = useState(true)
  const [data,    setData]    = useState(null)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const now = new Date()

      const [allCards, colRes, usersRes] = await Promise.all([
        fetchAllCards('id,value,column_id,pipeline_id,assignees,created_at,updated_at,next_contact,sales_history,client_name'),
        supabase.from('pipeline_columns').select('id,name,pipeline_id,color,position,max_days').order('position'),
        supabase.from('profiles').select('id,name,role,module_permissions,pipelines'),
      ])
      const cards = allCards || []
      const cols  = colRes.data   || []
      const users = usersRes.data || []

      // ── Colmap ──
      const colMap = {}
      cols.forEach(c => { colMap[c.id] = c })

      // ── Valor real de vendas por pipeline (soma sales_history) ──
      const salesByPipeline = {}
      cards.forEach(card => {
        const pid = card.pipeline_id
        const hist = Array.isArray(card.sales_history) ? card.sales_history : []
        const cardSales = hist.reduce((s, h) => s + (parseFloat(h.value) || 0), 0)
        salesByPipeline[pid] = (salesByPipeline[pid] || 0) + cardSales
      })

      // ── Alertas de máx. dias na coluna excedido ──
      const overdueMaxDays = cards.filter(card => {
        const col = colMap[card.column_id]
        if (!col?.max_days) return false
        const dias = daysDiff(card.updated_at)
        return dias !== null && dias >= col.max_days
      })

      // ── Próximo contato atrasado ──
      const overdueContact = cards.filter(card => {
        if (!card.next_contact) return false
        return new Date(card.next_contact) < now
      })

      // ── Clientes por atendente ──
      const assigneeMap = {}
      cards.forEach(card => {
        const assignees = Array.isArray(card.assignees) ? card.assignees : []
        assignees.forEach(uid => {
          if (!assigneeMap[uid]) assigneeMap[uid] = { cards: 0, salesValue: 0 }
          assigneeMap[uid].cards++
          const hist = Array.isArray(card.sales_history) ? card.sales_history : []
          assigneeMap[uid].salesValue += hist.reduce((s, h) => s + (parseFloat(h.value) || 0), 0)
        })
      })
      const byAssignee = users
        .filter(u => assigneeMap[u.id])
        .map(u => ({
          name:       u.name?.split(' ')[0] || u.name,
          fullName:   u.name,
          id:         u.id,
          cards:      assigneeMap[u.id]?.cards || 0,
          salesValue: assigneeMap[u.id]?.salesValue || 0,
        }))
        .sort((a, b) => b.cards - a.cards)

      // ── Por coluna (todos os pipelines) ──
      const byCol = cols.map(c => ({
        label:      c.name,
        value:      cards.filter(x => x.column_id === c.id).length,
        salesValue: cards.filter(x => x.column_id === c.id).reduce((s, x) => {
          const hist = Array.isArray(x.sales_history) ? x.sales_history : []
          return s + hist.reduce((acc, h) => acc + (parseFloat(h.value) || 0), 0)
        }, 0),
        color: c.color || '#6366f1',
      })).filter(c => c.value > 0)

      // ── Por pipeline ──
      const pipelines = [...new Set(cols.map(c => c.pipeline_id))]
      const byPipeline = pipelines.map(pid => {
        const pCols  = cols.filter(c => c.pipeline_id === pid).sort((a,b) => a.position - b.position)
        const pCards = cards.filter(c => c.pipeline_id === pid)
        const totalSales = pCards.reduce((sum, c) => {
          const hist = Array.isArray(c.sales_history) ? c.sales_history : []
          return sum + hist.reduce((s, h) => s + (parseFloat(h.value) || 0), 0)
        }, 0)
        const pOverdueMax = pCards.filter(card => {
          const col = colMap[card.column_id]
          if (!col?.max_days) return false
          return daysDiff(card.updated_at) >= col.max_days
        }).length
        const pOverdueContact = pCards.filter(c => c.next_contact && new Date(c.next_contact) < now).length
        return { pid, cols: pCols, cards: pCards, totalSales, pOverdueMax, pOverdueContact }
      })

      const totalSalesAll = cards.reduce((sum, c) => {
        const hist = Array.isArray(c.sales_history) ? c.sales_history : []
        return sum + hist.reduce((s, h) => s + (parseFloat(h.value) || 0), 0)
      }, 0)

      setData({
        cards, cols, byCol, byPipeline, byAssignee,
        overdueMaxDays, overdueContact,
        totalCards: cards.length,
        totalSalesAll,
      })
      setLoading(false)
    }
    load()
  }, [period])

  if (loading || !data) return <Empty icon="💼" text="Carregando..." />

  return (
    <div className="flex flex-col gap-8 max-w-[1100px]">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-bold text-xl text-slate-900 dark:text-slate-100">💼 Pipeline</div>
          <div className="text-xs text-slate-400 mt-0.5">Análise detalhada do pipeline de vendas</div>
        </div>
        <PeriodPicker period={period} setPeriod={setPeriod} />
      </div>

      {/* Resumo */}
      <Section title="Resumo geral">
        <div className="grid gap-3.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}>
          <StatCard label="Total de clientes"    value={data.totalCards}                  icon="📊" color="#6366f1" />
          <StatCard label="Vendas cadastradas"   value={fmt(data.totalSalesAll)}           icon="💰" color="#10b981" sub="soma de sales_history" />
          <StatCard label="Contato atrasado"     value={data.overdueContact.length}        icon="📅" color="#f59e0b" sub="próximo contato vencido" />
          <StatCard label="Prazo excedido"       value={data.overdueMaxDays.length}        icon="⏰" color="#ef4444" sub="máx. dias na etapa excedido" />
        </div>
      </Section>

      {/* Alertas detalhados */}
      {(data.overdueContact.length > 0 || data.overdueMaxDays.length > 0) && (
        <div className="grid gap-5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
          {data.overdueContact.length > 0 && (
            <Section title={`📅 Contato atrasado (${data.overdueContact.length})`}>
              <Card>
                <div className="flex flex-col gap-2 max-h-52 overflow-y-auto">
                  {data.overdueContact.slice(0, 15).map(card => {
                    const diasAtrasado = daysDiff(card.next_contact)
                    return (
                      <div key={card.id} className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-700 last:border-0">
                        <div>
                          <div className="text-[13px] font-semibold text-slate-700 dark:text-slate-300">{card.client_name || 'Cliente'}</div>
                          <div className="text-[11px] text-slate-400">{card.next_contact ? new Date(card.next_contact).toLocaleDateString('pt-BR') : '—'}</div>
                        </div>
                        <div className="text-[11px] font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-lg">
                          +{diasAtrasado}d
                        </div>
                      </div>
                    )
                  })}
                  {data.overdueContact.length > 15 && (
                    <div className="text-[11px] text-slate-400 text-center pt-1">+{data.overdueContact.length - 15} mais</div>
                  )}
                </div>
              </Card>
            </Section>
          )}

          {data.overdueMaxDays.length > 0 && (
            <Section title={`⏰ Prazo excedido na etapa (${data.overdueMaxDays.length})`}>
              <Card>
                <div className="flex flex-col gap-2 max-h-52 overflow-y-auto">
                  {data.overdueMaxDays.slice(0, 15).map(card => {
                    const col = data.cols.find(c => c.id === card.column_id)
                    const diasNaEtapa = daysDiff(card.updated_at)
                    return (
                      <div key={card.id} className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-700 last:border-0">
                        <div>
                          <div className="text-[13px] font-semibold text-slate-700 dark:text-slate-300">{card.client_name || 'Cliente'}</div>
                          <div className="text-[11px] text-slate-400">{col?.name || '—'} · máx. {col?.max_days}d</div>
                        </div>
                        <div className="text-[11px] font-bold text-red-500 bg-red-500/10 px-2 py-0.5 rounded-lg">
                          {diasNaEtapa}d
                        </div>
                      </div>
                    )
                  })}
                  {data.overdueMaxDays.length > 15 && (
                    <div className="text-[11px] text-slate-400 text-center pt-1">+{data.overdueMaxDays.length - 15} mais</div>
                  )}
                </div>
              </Card>
            </Section>
          )}
        </div>
      )}

      {/* Clientes por atendente */}
      {data.byAssignee.length > 0 && (
        <Section title="Clientes por atendente">
          <Card>
            <div className="flex flex-col gap-0">
              {data.byAssignee.map((a, i) => (
                <div key={a.id} className="flex items-center gap-3 py-2.5 border-b border-slate-100 dark:border-slate-700 last:border-0">
                  <div className="w-7 h-7 rounded-full bg-indigo-500/20 flex items-center justify-center text-[11px] font-bold text-indigo-400 flex-shrink-0">
                    {a.name[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-semibold text-slate-700 dark:text-slate-300">{a.fullName}</div>
                    {a.salesValue > 0 && <div className="text-[11px] text-slate-400">{fmt(a.salesValue)} em vendas</div>}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-[15px] font-extrabold text-indigo-400">{a.cards}</div>
                    <div className="text-[10px] text-slate-400">clientes</div>
                  </div>
                  {/* Barra proporcional */}
                  <div className="w-24 bg-slate-100 dark:bg-slate-700 rounded-full h-1.5 flex-shrink-0">
                    <div style={{ width: `${(a.cards / data.byAssignee[0].cards) * 100}%`, background: '#6366f1' }} className="h-1.5 rounded-full transition-all" />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </Section>
      )}

      {/* Por estágio */}
      {data.byCol.length > 0 && (
        <Section title="Clientes por etapa">
          <Card>
            <BarChart data={data.byCol} height={140} />
            <div className="mt-4 pt-3.5 border-t border-slate-100 dark:border-slate-700 flex flex-wrap gap-4">
              {data.byCol.map((c, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div style={{ background: c.color }} className="w-2 h-2 rounded-full" />
                  <span className="text-xs text-slate-400">{c.label}</span>
                  {c.salesValue > 0 && <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{fmt(c.salesValue)}</span>}
                </div>
              ))}
            </div>
          </Card>
        </Section>
      )}

      {/* Por pipeline */}
      {data.byPipeline.length > 0 && (
        <Section title="Por pipeline">
          <div className="flex flex-col gap-3">
            {data.byPipeline.map((p, i) => (
              <Card key={i}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{p.pid}</span>
                  <div className="flex gap-3 items-center flex-wrap justify-end">
                    <span className="text-xs text-slate-400">{p.cards.length} clientes</span>
                    {p.totalSales > 0 && <span className="text-xs font-semibold text-emerald-400">{fmt(p.totalSales)} em vendas</span>}
                    {p.pOverdueContact > 0 && <span className="text-xs font-semibold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-lg">📅 {p.pOverdueContact} atrasados</span>}
                    {p.pOverdueMax     > 0 && <span className="text-xs font-semibold text-red-400 bg-red-500/10 px-2 py-0.5 rounded-lg">⏰ {p.pOverdueMax} prazo excedido</span>}
                  </div>
                </div>
                {p.cols.length > 0 && (
                  <div className="flex gap-1.5 flex-wrap">
                    {p.cols.map(c => {
                      const colCards = p.cards.filter(x => x.column_id === c.id)
                      const count = colCards.length
                      const colSales = colCards.reduce((sum, x) => {
                        const hist = Array.isArray(x.sales_history) ? x.sales_history : []
                        return sum + hist.reduce((s, h) => s + (parseFloat(h.value) || 0), 0)
                      }, 0)
                      return count >= 0 ? (
                        <div key={c.id} className="flex flex-col px-2.5 py-1.5 rounded-lg text-[11px] font-semibold"
                          style={{ background: (c.color || '#6366f1') + '22', color: c.color || '#6366f1' }}>
                          <div className="flex items-center gap-1.5">
                            <span>{c.name}</span>
                            <span className="opacity-70">· {count}</span>
                          </div>
                          {colSales > 0 && <div className="text-[10px] opacity-60 mt-0.5">{fmt(colSales)}</div>}
                        </div>
                      ) : null
                    })}
                  </div>
                )}
              </Card>
            ))}
          </div>
        </Section>
      )}

      <div className="text-[11px] text-slate-300 dark:text-slate-700 text-center pb-4">
        Atualizado agora
      </div>
    </div>
  )
}

// ─── DashboardPage ────────────────────────────────────────────────────────────
export function DashboardPage() {
  const [tab,    setTab]    = useState('geral')
  const [period, setPeriod] = useState(30)

  useEffect(() => {
    const handler = (e) => setTab(e.detail)
    window.addEventListener('psr:dash-tab', handler)
    return () => window.removeEventListener('psr:dash-tab', handler)
  }, [])

  return (
    <div className="p-6 text-slate-900 dark:text-slate-200">
      {tab === 'geral'       && <TabGeral       period={period} setPeriod={setPeriod} />}
      {tab === 'ocorrencias' && <TabOcorrencias period={period} setPeriod={setPeriod} />}
      {tab === 'visitas'     && <TabVisitas     period={period} setPeriod={setPeriod} />}
      {tab === 'pipeline'    && <TabPipeline    period={period} setPeriod={setPeriod} />}
    </div>
  )
}
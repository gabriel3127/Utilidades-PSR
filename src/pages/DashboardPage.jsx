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

function PeriodPicker({ period, setPeriod }) {
  return (
    <div className="flex gap-1.5">
      {[7, 30, 90].map(d => (
        <button key={d} onClick={() => setPeriod(d)}
          className={`px-3.5 py-1.5 rounded-lg cursor-pointer text-xs font-semibold transition-all border
            ${period === d
              ? 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 border-indigo-400 dark:border-indigo-500'
              : 'bg-transparent text-slate-400 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'}`}>
          {d}d
        </button>
      ))}
    </div>
  )
}

function Empty({ icon, text }) {
  return <div className="text-center text-slate-400 py-8"><div className="text-3xl mb-2">{icon}</div><div className="text-[13px]">{text}</div></div>
}

const fmt = (n) => n?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }) || 'R$ 0'

// ─── Aba Visão Geral ──────────────────────────────────────────────────────────
function TabGeral({ period, setPeriod }) {
  const [loading, setLoading] = useState(true)
  const [data, setData]       = useState(null)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const since = new Date(); since.setDate(since.getDate() - period)
      const sinceISO = since.toISOString()
      const [occRes, visRes, cardRes, usersRes] = await Promise.all([
        supabase.from('occurrences').select('status,priority,created_at').gte('created_at', sinceISO),
        supabase.from('visitas_tecnicas').select('id,created_at').gte('created_at', sinceISO),
        supabase.from('pipeline_cards').select('id,value'),
        supabase.from('profiles').select('id,active,role'),
      ])
      const occs  = occRes.data  || []
      const vis   = visRes.data  || []
      const cards = cardRes.data || []
      const users = usersRes.data|| []
      setData({
        occs, vis, cards,
        abertas:       occs.filter(o => o.status === 'aberta').length,
        urgentes:      occs.filter(o => o.priority === 'urgente').length,
        activeUsers:   users.filter(u => u.active !== false).length,
        pendingUsers:  users.filter(u => u.role === 'pendente').length,
        totalValue:    cards.reduce((s, c) => s + (c.value || 0), 0),
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
          <StatCard label="Visitas"     value={data.vis.length}   icon="🔧" color="#0ea5e9" sub={`nos últimos ${period} dias`} />
          <StatCard label="Pipeline"    value={data.cards.length} icon="💼" color="#6366f1" sub={fmt(data.totalValue)} />
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
        Dados dos últimos {period} dias · Atualizado agora
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
      const since = new Date(); since.setDate(since.getDate() - period)
      const sinceISO = since.toISOString()
      const [occRes, setoresRes, tiposRes, usersRes] = await Promise.all([
        supabase.from('occurrences').select('id,status,priority,created_at,resolved_at,setor_id,tipo_problema_id,created_by').gte('created_at', sinceISO),
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
        label: s.nome,
        value: occs.filter(o => o.setor_id === s.id).length,
        color: '#f97316',
      })).filter(s => s.value > 0).sort((a,b) => b.value - a.value).slice(0, 8)

      // Por tipo
      const byTipo = tipos.map(t => ({
        label: t.nome,
        value: occs.filter(o => o.tipo_problema_id === t.id).length,
        color: t.cor || '#ef4444',
      })).filter(t => t.value > 0).sort((a,b) => b.value - a.value).slice(0, 8)

      // Por usuário (quem mais registrou)
      const byUser = users.map(u => ({
        label: u.name?.split('.')[0] || u.name,
        value: occs.filter(o => o.created_by === u.id).length,
        color: '#8b5cf6',
      })).filter(u => u.value > 0).sort((a,b) => b.value - a.value).slice(0, 6)

      // Tempo médio de resolução (dias)
      const resolvidas = occs.filter(o => o.status === 'resolvida' && o.resolved_at)
      const avgDays = resolvidas.length > 0
        ? (resolvidas.reduce((s, o) => {
            const diff = new Date(o.resolved_at) - new Date(o.created_at)
            return s + diff / (1000 * 60 * 60 * 24)
          }, 0) / resolvidas.length).toFixed(1)
        : null

      // Tendência por semana
      const weekBuckets = {}
      occs.forEach(o => {
        const d = new Date(o.created_at)
        const weekStart = new Date(d); weekStart.setDate(d.getDate() - d.getDay())
        const key = weekStart.toLocaleDateString('pt-BR', { day:'2-digit', month:'2-digit' })
        weekBuckets[key] = (weekBuckets[key] || 0) + 1
      })
      const byWeek = Object.entries(weekBuckets)
        .slice(-6)
        .map(([label, value]) => ({ label, value, color: '#f97316' }))

      setData({ occs, bySetor, byTipo, byUser, avgDays, byWeek,
        total: occs.length,
        abertas: occs.filter(o => o.status === 'aberta').length,
        resolvidas: resolvidas.length,
        urgentes: occs.filter(o => o.priority === 'urgente').length,
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

      <Section title="Resumo do período">
        <div className="grid gap-3.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}>
          <StatCard label="Total"      value={data.total}      icon="⚠️" color="#f97316" />
          <StatCard label="Abertas"    value={data.abertas}    icon="🔴" color="#6b7280" sub="aguardando ação" />
          <StatCard label="Resolvidas" value={data.resolvidas} icon="✅" color="#10b981" />
          <StatCard label="Urgentes"   value={data.urgentes}   icon="🚨" color="#ef4444" />
          {data.avgDays && <StatCard label="Tempo médio" value={`${data.avgDays}d`} icon="⏱️" color="#8b5cf6" sub="para resolução" />}
        </div>
      </Section>

      <div className="grid gap-5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
        <Section title="Por status">
          <Card>
            <BarChart data={[
              { label: 'Aberta',    value: data.occs.filter(o => o.status === 'aberta').length,       color: '#6b7280' },
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

      {data.byWeek.length > 1 && (
        <Section title="Tendência semanal">
          <Card><BarChart data={data.byWeek} height={130} /></Card>
        </Section>
      )}

      <div className="grid gap-5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
        {data.bySetor.length > 0 && (
          <Section title="Por setor">
            <Card><BarChart data={data.bySetor} height={130} /></Card>
          </Section>
        )}
        {data.byTipo.length > 0 && (
          <Section title="Por tipo de problema">
            <Card><BarChart data={data.byTipo} height={130} /></Card>
          </Section>
        )}
        {data.byUser.length > 0 && (
          <Section title="Por responsável">
            <Card><BarChart data={data.byUser} height={130} /></Card>
          </Section>
        )}
      </div>

      <div className="text-[11px] text-slate-300 dark:text-slate-700 text-center pb-4">
        Dados dos últimos {period} dias · Atualizado agora
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
      const since = new Date(); since.setDate(since.getDate() - period)
      const sinceISO = since.toISOString()
      const [visRes, tiposRes, setoresRes, usersRes] = await Promise.all([
        supabase.from('visitas_tecnicas').select('id,created_at,tipo_visita_id,setor_id,user_id,client_id').gte('created_at', sinceISO),
        supabase.from('tipos_visita').select('id,nome,cor'),
        supabase.from('setores').select('id,nome'),
        supabase.from('profiles').select('id,name'),
      ])
      const vis     = visRes.data     || []
      const tipos   = tiposRes.data   || []
      const setores = setoresRes.data || []
      const users   = usersRes.data   || []

      const byTipo = tipos.map(t => ({
        label: t.nome,
        value: vis.filter(v => v.tipo_visita_id === t.id).length,
        color: t.cor || '#0ea5e9',
      })).filter(t => t.value > 0).sort((a,b) => b.value - a.value)

      const bySetor = setores.map(s => ({
        label: s.nome,
        value: vis.filter(v => v.setor_id === s.id).length,
        color: '#0ea5e9',
      })).filter(s => s.value > 0).sort((a,b) => b.value - a.value)

      const byUser = users.map(u => ({
        label: u.name?.split('.')[0] || u.name,
        value: vis.filter(v => v.user_id === u.id).length,
        color: '#6366f1',
      })).filter(u => u.value > 0).sort((a,b) => b.value - a.value).slice(0, 6)

      const dias = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']
      const byDay = new Array(7).fill(0)
      vis.forEach(v => { byDay[new Date(v.created_at).getDay()]++ })

      // Por semana
      const weekBuckets = {}
      vis.forEach(v => {
        const d = new Date(v.created_at)
        const ws = new Date(d); ws.setDate(d.getDate() - d.getDay())
        const key = ws.toLocaleDateString('pt-BR', { day:'2-digit', month:'2-digit' })
        weekBuckets[key] = (weekBuckets[key] || 0) + 1
      })
      const byWeek = Object.entries(weekBuckets).slice(-6).map(([label, value]) => ({ label, value, color: '#0ea5e9' }))

      // Clientes únicos visitados
      const uniqueClients = new Set(vis.map(v => v.client_id).filter(Boolean)).size

      setData({ vis, byTipo, bySetor, byUser, byDay, dias, byWeek, uniqueClients })
      setLoading(false)
    }
    load()
  }, [period])

  if (loading || !data) return <Empty icon="🔧" text="Carregando..." />

  return (
    <div className="flex flex-col gap-8 max-w-[1100px]">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-bold text-xl text-slate-900 dark:text-slate-100">🔧 Visitas Técnicas</div>
          <div className="text-xs text-slate-400 mt-0.5">Análise detalhada de visitas</div>
        </div>
        <PeriodPicker period={period} setPeriod={setPeriod} />
      </div>

      <Section title="Resumo do período">
        <div className="grid gap-3.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}>
          <StatCard label="Total de visitas"       value={data.vis.length}    icon="🔧" color="#0ea5e9" sub={`nos últimos ${period} dias`} />
          <StatCard label="Clientes visitados"     value={data.uniqueClients} icon="🏢" color="#6366f1" sub="clientes únicos" />
          <StatCard label="Média por semana"       value={data.byWeek.length > 0 ? Math.round(data.vis.length / Math.max(data.byWeek.length, 1)) : 0} icon="📅" color="#10b981" sub="visitas/semana" />
        </div>
      </Section>

      <div className="grid gap-5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
        <Section title="Por dia da semana">
          <Card>
            {data.vis.length === 0 ? <Empty icon="🗓️" text="Nenhuma visita no período" /> :
              <BarChart data={data.dias.map((d, i) => ({ label: d, value: data.byDay[i], color: '#0ea5e9' }))} height={110} />
            }
          </Card>
        </Section>
        {data.byTipo.length > 0 && (
          <Section title="Por tipo de visita">
            <Card><BarChart data={data.byTipo} height={110} /></Card>
          </Section>
        )}
      </div>

      {data.byWeek.length > 1 && (
        <Section title="Tendência semanal">
          <Card><BarChart data={data.byWeek} height={130} /></Card>
        </Section>
      )}

      <div className="grid gap-5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
        {data.bySetor.length > 0 && (
          <Section title="Por setor">
            <Card><BarChart data={data.bySetor} height={120} /></Card>
          </Section>
        )}
        {data.byUser.length > 0 && (
          <Section title="Por técnico">
            <Card><BarChart data={data.byUser} height={120} /></Card>
          </Section>
        )}
      </div>

      <div className="text-[11px] text-slate-300 dark:text-slate-700 text-center pb-4">
        Dados dos últimos {period} dias · Atualizado agora
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
      const since = new Date(); since.setDate(since.getDate() - period)
      const sinceISO = since.toISOString()
      const [cardRes, colRes, alertsRes] = await Promise.all([
        supabase.from('pipeline_cards').select('id,value,column_id,pipeline_id,assignees,created_at,last_purchase_date').gte('created_at', sinceISO),
        supabase.from('pipeline_columns').select('id,name,pipeline_id,color,position').order('position'),
        supabase.from('pipeline_cards').select('id,value,column_id,pipeline_id'),
      ])
      const cards  = cardRes.data  || []
      const cols   = colRes.data   || []
      const alerts = alertsRes.data|| []

      const colMap = {}
      cols.forEach(c => { colMap[c.id] = c })

      // Por coluna
      const byCol = cols.map(c => ({
        label:      c.name,
        value:      cards.filter(x => x.column_id === c.id).length,
        totalValue: cards.filter(x => x.column_id === c.id).reduce((s, x) => s + (x.value || 0), 0),
        color:      c.color || '#6366f1',
      })).filter(c => c.value > 0)

      // Por pipeline
      const pipelines = [...new Set(cols.map(c => c.pipeline_id))]
      const byPipeline = pipelines.map(pid => ({
        pipeline_id: pid,
        cols: cols.filter(c => c.pipeline_id === pid),
        cards: cards.filter(c => c.pipeline_id === pid),
        value: cards.filter(c => c.pipeline_id === pid).reduce((s, c) => s + (c.value || 0), 0),
      }))

      // Alertas (sem compra há muito tempo)
      const alertCount = 0 // colunas days_without_purchase/alert_days ainda não existem

      // Distribuição de valor (quartis)
      const values = cards.map(c => c.value || 0).filter(v => v > 0).sort((a,b) => a-b)
      const totalValue = values.reduce((s, v) => s + v, 0)

      setData({ cards, cols, byCol, byPipeline, alertCount, totalValue,
        newThisPeriod: cards.length,
        withValue: values.length,
        avgValue: values.length > 0 ? Math.round(totalValue / values.length) : 0,
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

      <Section title="Resumo do período">
        <div className="grid gap-3.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}>
          <StatCard label="Novos clientes"  value={data.newThisPeriod} icon="📊" color="#6366f1" sub={`adicionados nos últimos ${period}d`} />
          <StatCard label="Valor total"     value={fmt(data.totalValue)} icon="💰" color="#10b981" sub="em negociação" />
          <StatCard label="Ticket médio"    value={fmt(data.avgValue)}   icon="📈" color="#8b5cf6" sub={`${data.withValue} com valor`} />
          {data.alertCount > 0 && <StatCard label="Alertas"   value={data.alertCount} icon="🔔" color="#f97316" sub="sem compra recente" />}
        </div>
      </Section>

      {data.byCol.length > 0 && (
        <Section title="Clientes por estágio">
          <Card>
            <BarChart data={data.byCol} height={140} />
            <div className="mt-4 pt-3.5 border-t border-slate-100 dark:border-slate-700 flex flex-wrap gap-4">
              {data.byCol.map((c, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div style={{ background: c.color }} className="w-2 h-2 rounded-full" />
                  <span className="text-xs text-slate-400">{c.label}</span>
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{fmt(c.totalValue)}</span>
                </div>
              ))}
            </div>
          </Card>
        </Section>
      )}

      {/* Tabela por pipeline */}
      {data.byPipeline.length > 1 && (
        <Section title="Por pipeline">
          <div className="flex flex-col gap-3">
            {data.byPipeline.map((p, i) => (
              <Card key={i}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{p.pipeline_id}</span>
                  <div className="flex gap-3">
                    <span className="text-xs text-slate-400">{p.cards.length} clientes</span>
                    <span className="text-xs font-semibold text-indigo-400">{fmt(p.value)}</span>
                  </div>
                </div>
                {p.cols.length > 0 && (
                  <div className="flex gap-1.5 flex-wrap">
                    {p.cols.map(c => {
                      const count = p.cards.filter(x => x.column_id === c.id).length
                      return count > 0 ? (
                        <div key={c.id} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold"
                          style={{ background: (c.color || '#6366f1') + '22', color: c.color || '#6366f1' }}>
                          <span>{c.name}</span>
                          <span className="opacity-70">· {count}</span>
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
        Dados dos últimos {period} dias · Atualizado agora
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
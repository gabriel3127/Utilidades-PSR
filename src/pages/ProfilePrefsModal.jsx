// src/pages/ProfilePrefsModal.jsx
// Modal leve para o usuário configurar suas preferências de notificação.
// Adicione um botão "Preferências" no header ou sidebar que abre este modal.

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useApp } from '@/context/AppContext'

const fieldStyle = {
  width: '100%', padding: '11px 14px',
  background: '#0f172a', border: '1px solid #334155',
  borderRadius: 10, color: '#e2e8f0', fontSize: 14,
  fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
}

function Toggle({ checked, onChange }) {
  return (
    <button onClick={onChange} style={{
      width: 44, height: 24, borderRadius: 12,
      background: checked ? '#6366f1' : '#1e293b',
      border: `2px solid ${checked ? '#6366f1' : '#334155'}`,
      cursor: 'pointer', padding: 0, position: 'relative', transition: 'all 0.2s',
    }}>
      <div style={{
        width: 16, height: 16, borderRadius: '50%', background: '#fff',
        position: 'absolute', top: 2, left: checked ? 22 : 2, transition: 'left 0.2s',
      }} />
    </button>
  )
}

const EVENTS = [
  { id: 'occ_created', icon: '⚠️', label: 'Nova ocorrência criada'  },
  { id: 'occ_urgent',  icon: '🚨', label: 'Ocorrência urgente'       },
  { id: 'vis_created', icon: '🔧', label: 'Nova visita registrada'   },
]

export function ProfilePrefsModal({ onClose }) {
  const { user, profile, showToast } = useApp()
  const [prefs, setPrefs]     = useState({})
  const [setores, setSetores] = useState([])
  const [mySetores, setMySetores] = useState([])
  const [saving, setSaving]   = useState(false)

  useEffect(() => {
    setPrefs(profile?.notification_prefs || {})
    setMySetores(profile?.setor_ids || [])
    supabase.from('setores').select('id,nome').eq('ativo', true).order('nome')
      .then(({ data }) => setSetores(data || []))
  }, [profile])

  const togglePref = (id) => setPrefs(p => ({ ...p, [id]: p[id] === false ? true : false }))
  const toggleSetor = (id) => setMySetores(prev =>
    prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
  )

  const save = async () => {
    setSaving(true)
    const { error } = await supabase.from('profiles').update({
      notification_prefs: prefs,
      setor_ids: mySetores,
    }).eq('id', user.id)
    if (!error) { showToast('Preferências salvas!'); onClose() }
    else showToast(error.message, 'error')
    setSaving(false)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }}>
      <div style={{
        background: '#1e293b', borderRadius: 16, width: '100%', maxWidth: 460,
        maxHeight: '88vh', overflowY: 'auto',
        border: '1px solid #334155', boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
      }}>
        {/* Header */}
        <div style={{ padding: '18px 20px', borderBottom: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#f1f5f9' }}>🔔 Preferências de notificação</div>
          <button onClick={onClose} style={{
            background: '#0f172a', border: 'none', borderRadius: '50%',
            width: 30, height: 30, color: '#64748b', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>✕</button>
        </div>

        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Tipos de eventos */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
              Receber notificações de
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {EVENTS.map(e => (
                <div key={e.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  background: '#0f172a', borderRadius: 10, padding: '12px 14px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 18 }}>{e.icon}</span>
                    <span style={{ fontSize: 13, color: prefs[e.id] === false ? '#475569' : '#e2e8f0', fontWeight: 500 }}>
                      {e.label}
                    </span>
                  </div>
                  <Toggle
                    checked={prefs[e.id] !== false}
                    onChange={() => togglePref(e.id)}
                  />
                </div>
              ))}
            </div>
            <div style={{ fontSize: 11, color: '#475569', marginTop: 8 }}>
              Desativar um tipo faz com que você não receba aquele evento mesmo sendo elegível.
            </div>
          </div>

          {/* Setores que acompanha (gerente) */}
          {(profile?.role === 'gerente' || profile?.role === 'admin') && setores.length > 0 && (
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
                Setores que acompanho
              </div>
              <div style={{ fontSize: 11, color: '#475569', marginBottom: 10 }}>
                Deixe vazio para receber notificações de todos os setores.
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {setores.map(s => (
                  <div key={s.id} onClick={() => toggleSetor(s.id)} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 14px', borderRadius: 10, cursor: 'pointer',
                    border: `2px solid ${mySetores.includes(s.id) ? '#6366f1' : '#1e293b'}`,
                    background: mySetores.includes(s.id) ? 'rgba(99,102,241,0.1)' : '#0f172a',
                  }}>
                    <div style={{
                      width: 18, height: 18, borderRadius: 5, flexShrink: 0,
                      border: `2px solid ${mySetores.includes(s.id) ? '#6366f1' : '#334155'}`,
                      background: mySetores.includes(s.id) ? '#6366f1' : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {mySetores.includes(s.id) && <span style={{ color: '#fff', fontSize: 11 }}>✓</span>}
                    </div>
                    <span style={{ fontSize: 13, color: mySetores.includes(s.id) ? '#c7d2fe' : '#64748b' }}>
                      {s.nome}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button onClick={save} disabled={saving} style={{
            width: '100%', padding: '13px', borderRadius: 12, border: 'none',
            background: saving ? '#1e293b' : 'linear-gradient(135deg,#6366f1,#8b5cf6)',
            color: saving ? '#475569' : '#fff',
            cursor: saving ? 'not-allowed' : 'pointer',
            fontFamily: 'inherit', fontSize: 14, fontWeight: 700,
          }}>
            {saving ? 'Salvando...' : '💾 Salvar preferências'}
          </button>
        </div>
      </div>
    </div>
  )
}
// src/hooks/useNotifications.js
import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'

const ICON_MAP = {
  occ_created: '⚠️',
  occ_urgent:  '🚨',
  vis_created: '🔧',
}

// Gera um beep via Web Audio API (sem arquivo externo)
function playNotificationSound(urgent = false) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const count = urgent ? 3 : 1

    for (let i = 0; i < count; i++) {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.type = 'sine'
      osc.frequency.value = urgent ? 880 : 660

      const start = ctx.currentTime + i * 0.25
      gain.gain.setValueAtTime(0, start)
      gain.gain.linearRampToValueAtTime(0.3, start + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.2)

      osc.start(start)
      osc.stop(start + 0.2)
    }
  } catch (e) {
    // Navegador bloqueou AudioContext antes de interação — ignora silenciosamente
  }
}

// Solicita permissão de notificação do browser (chame após login)
export async function requestNotificationPermission() {
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  const result = await Notification.requestPermission()
  return result === 'granted'
}

// Dispara notificação nativa do Windows/browser
function showNativeNotification(titulo, descricao, tipo) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return
  const icon = ICON_MAP[tipo] || '🔔'
  try {
    const n = new Notification(`${icon} ${titulo}`, {
      body: descricao || '',
      icon: '/icons/psr-192.png',   // ícone do seu PWA
      badge: '/icons/psr-192.png',
      tag: tipo,                    // agrupa notificações do mesmo tipo
      renotify: true,
    })
    // Focar a janela ao clicar na notificação
    n.onclick = () => { window.focus(); n.close() }
  } catch (e) {
    // Safari e alguns browsers têm restrições adicionais
  }
}

export function useNotifications(userId) {
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading]             = useState(true)
  const isFirstLoad = useRef(true)

  const load = useCallback(async () => {
    if (!userId) return
    const { data } = await supabase
      .from('notificacoes')
      .select('*')
      .eq('destinatario_id', userId)
      .order('created_at', { ascending: false })
      .limit(50)
    setNotifications(data || [])
    setLoading(false)
    isFirstLoad.current = false
  }, [userId])

  // Carga inicial
  useEffect(() => { load() }, [load])

  // Realtime
  useEffect(() => {
    if (!userId) return

    const channel = supabase
      .channel(`notif-${userId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notificacoes',
        filter: `destinatario_id=eq.${userId}`,
      }, (payload) => {
        const n = payload.new

        // Não disparar som/notificação na carga inicial
        if (!isFirstLoad.current) {
          const urgent = n.tipo === 'occ_urgent'
          playNotificationSound(urgent)
          showNativeNotification(n.titulo, n.descricao, n.tipo)
        }

        setNotifications(prev => [n, ...prev])
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'notificacoes',
        filter: `destinatario_id=eq.${userId}`,
      }, (payload) => {
        setNotifications(prev =>
          prev.map(n => n.id === payload.new.id ? payload.new : n)
        )
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [userId])

  const markRead = useCallback(async (id) => {
    await supabase.from('notificacoes').update({ lida: true }).eq('id', id)
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, lida: true } : n))
  }, [])

  const markAllRead = useCallback(async () => {
    if (!userId) return
    await supabase.from('notificacoes')
      .update({ lida: true })
      .eq('destinatario_id', userId)
      .eq('lida', false)
    setNotifications(prev => prev.map(n => ({ ...n, lida: true })))
  }, [userId])

  const unreadCount = notifications.filter(n => !n.lida).length

  return { notifications, loading, unreadCount, markRead, markAllRead, reload: load }
}
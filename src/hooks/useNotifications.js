// src/hooks/useNotifications.js
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

export function useNotifications(userId) {
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading]             = useState(true)

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
  }, [userId])

  // Carga inicial
  useEffect(() => { load() }, [load])

  // Realtime — ouve INSERT na tabela notificacoes filtrando pelo usuário
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
        setNotifications(prev => [payload.new, ...prev])
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'notificacoes',
        filter: `destinatario_id=eq.${userId}`,
      }, (payload) => {
        setNotifications(prev => prev.map(n => n.id === payload.new.id ? payload.new : n))
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
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../services/supabase';

export const useNotificacoes = (onNovaNotificacao) => {
  const [notificacoes, setNotificacoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);
  const ultimaNotificacaoRef = useRef(null);
  const pollingIntervalRef = useRef(null);

  useEffect(() => {
    carregarUsuario();
  }, []);

  useEffect(() => {
    if (userId) {
      carregarNotificacoes();
      
      const cleanup = setupRealtimeSubscription(onNovaNotificacao);
      
      pollingIntervalRef.current = setInterval(() => {
        verificarNovasNotificacoes();
      }, 5000);
      
      return () => {
        if (cleanup) cleanup();
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
        }
      };
    }
  }, [userId, onNovaNotificacao]);

  const carregarUsuario = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      }
    } catch (error) {
      console.error('Erro ao carregar usuário:', error);
    }
  };

  const carregarNotificacoes = async () => {
    if (!userId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('notificacoes')
        .select(`
          *,
          remetente:users!notificacoes_remetente_id_fkey(nome)
        `)
        .eq('destinatario_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      setNotificacoes(data || []);
      
      if (data && data.length > 0) {
        ultimaNotificacaoRef.current = data[0].id;
      }
    } catch (error) {
      console.error('Erro ao carregar notificações:', error);
      setNotificacoes([]);
    } finally {
      setLoading(false);
    }
  };

  const verificarNovasNotificacoes = async () => {
    if (!userId || !ultimaNotificacaoRef.current) return;

    try {
      const { data, error } = await supabase
        .from('notificacoes')
        .select(`
          *,
          remetente:users!notificacoes_remetente_id_fkey(nome)
        `)
        .eq('destinatario_id', userId)
        .gt('id', ultimaNotificacaoRef.current)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        data.reverse().forEach(notificacao => {
          setNotificacoes(prev => [notificacao, ...prev]);
          
          ultimaNotificacaoRef.current = Math.max(ultimaNotificacaoRef.current, notificacao.id);
          
          if (notificacao.tipo === 'ocorrencia') {
            tocarSomNotificacao();
            
            if (onNovaNotificacao) {
              onNovaNotificacao(notificacao);
            }
          }
          
          mostrarNotificacaoNativa(notificacao);
        });
      }
    } catch (error) {
      console.error('Erro ao verificar novas notificações:', error);
    }
  };

  const setupRealtimeSubscription = (onNovaNotificacao) => {
    if (!userId) return;

    try {
      const channel = supabase
        .channel('notificacoes-' + userId)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notificacoes',
            filter: `destinatario_id=eq.${userId}`
          },
          async (payload) => {
            const { data, error } = await supabase
              .from('notificacoes')
              .select(`
                *,
                remetente:users!notificacoes_remetente_id_fkey(nome)
              `)
              .eq('id', payload.new.id)
              .single();

            if (error) return;

            if (data) {
              setNotificacoes(prev => [data, ...prev]);
              
              ultimaNotificacaoRef.current = Math.max(ultimaNotificacaoRef.current || 0, data.id);
              
              if (data.tipo === 'ocorrencia') {
                tocarSomNotificacao();
                
                if (onNovaNotificacao) {
                  onNovaNotificacao(data);
                }
              }
              
              mostrarNotificacaoNativa(data);
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } catch (error) {
      console.error('Erro ao configurar Realtime:', error);
      return null;
    }
  };

  const tocarSomNotificacao = () => {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.type = 'sine';
      
      const now = audioContext.currentTime;
      
      oscillator.frequency.setValueAtTime(800, now);
      gainNode.gain.setValueAtTime(0.4, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
      
      oscillator.frequency.setValueAtTime(600, now + 0.15);
      gainNode.gain.setValueAtTime(0.4, now + 0.15);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.35);

      oscillator.start(now);
      oscillator.stop(now + 0.35);
      
    } catch (error) {
      console.error('Erro ao tocar som:', error);
    }
  };

  const mostrarNotificacaoNativa = (notificacao) => {
    if (!('Notification' in window)) return;

    if (Notification.permission === 'granted') {
      const notification = new Notification(notificacao.titulo, {
        body: notificacao.descricao,
        icon: '/favicon.ico',
        tag: `notificacao-${notificacao.id}`,
      });

      setTimeout(() => notification.close(), 5000);
      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    }
  };

  const solicitarPermissaoNotificacao = useCallback(async () => {
    if (!('Notification' in window)) return false;

    if (Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }

    return Notification.permission === 'granted';
  }, []);

  const marcarComoLida = useCallback(async (notificacaoId) => {
    try {
      const { error } = await supabase
        .from('notificacoes')
        .update({ lida: true })
        .eq('id', notificacaoId);

      if (error) throw error;

      setNotificacoes(prev =>
        prev.map(n => n.id === notificacaoId ? { ...n, lida: true } : n)
      );
    } catch (error) {
      console.error('Erro ao marcar como lida:', error);
    }
  }, []);

  const marcarTodasComoLidas = useCallback(async () => {
    if (!userId) return;

    try {
      const naoLidasIds = notificacoes
        .filter(n => !n.lida)
        .map(n => n.id);

      if (naoLidasIds.length === 0) return;

      const { error } = await supabase
        .from('notificacoes')
        .update({ lida: true })
        .in('id', naoLidasIds);

      if (error) throw error;

      setNotificacoes(prev =>
        prev.map(n => ({ ...n, lida: true }))
      );
    } catch (error) {
      console.error('Erro ao marcar todas como lidas:', error);
    }
  }, [userId, notificacoes]);

  const excluirNotificacao = useCallback(async (notificacaoId) => {
    try {
      const { error } = await supabase
        .from('notificacoes')
        .delete()
        .eq('id', notificacaoId);

      if (error) throw error;

      setNotificacoes(prev => prev.filter(n => n.id !== notificacaoId));
    } catch (error) {
      console.error('Erro ao excluir notificação:', error);
    }
  }, []);

  const naoLidas = notificacoes.filter(n => !n.lida).length;

  return {
    notificacoes,
    naoLidas,
    loading,
    marcarComoLida,
    marcarTodasComoLidas,
    excluirNotificacao,
    solicitarPermissaoNotificacao,
    recarregar: carregarNotificacoes
  };
};
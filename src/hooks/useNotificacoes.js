import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';

export const useNotificacoes = (onNovaNotificacao) => {
  const [notificacoes, setNotificacoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);

  // Carregar usuário atual
  useEffect(() => {
    carregarUsuario();
  }, []);

  // Carregar notificações quando userId estiver disponível
  useEffect(() => {
    if (userId) {
      carregarNotificacoes();
      return setupRealtimeSubscription(onNovaNotificacao);
    }
  }, [userId, onNovaNotificacao]);

  const carregarUsuario = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        console.log('✅ Usuário carregado:', user.id);
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

      console.log('✅ Notificações carregadas:', data?.length || 0);
      setNotificacoes(data || []);
    } catch (error) {
      console.error('Erro ao carregar notificações:', error);
      setNotificacoes([]);
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscription = (onNovaNotificacao) => {
    if (!userId) return;

    console.log('🔌 Conectando ao Realtime...');

    const channel = supabase
      .channel('notificacoes-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notificacoes',
          filter: `destinatario_id=eq.${userId}`
        },
        async (payload) => {
          console.log('📩 Notificação recebida via Realtime:', payload);
          
          if (payload.eventType === 'INSERT') {
            // Nova notificação - buscar dados completos
            const { data } = await supabase
              .from('notificacoes')
              .select(`
                *,
                remetente:users!notificacoes_remetente_id_fkey(nome)
              `)
              .eq('id', payload.new.id)
              .single();

            if (data) {
              console.log('📩 Nova notificação completa:', data);
              console.log('📩 Tipo da notificação:', data.tipo);
              
              // 🔊 TOCAR SOM APENAS PARA OCORRÊNCIAS
              if (data.tipo === 'ocorrencia') {
                console.log('🔊 É ocorrência! Tocando som...');
                tocarSomNotificacao();
              } else {
                console.log('ℹ️ Não é ocorrência, sem som');
              }
              
              // Adicionar à lista
              setNotificacoes(prev => [data, ...prev]);
              
              // Chamar callback para mostrar toast APENAS PARA OCORRÊNCIAS
              if (onNovaNotificacao && data.tipo === 'ocorrencia') {
                console.log('🎯 Chamando callback para toast!');
                onNovaNotificacao(data);
              } else {
                console.log('ℹ️ Não chamando callback (não é ocorrência ou sem callback)');
              }
              
              // Mostrar notificação nativa do browser
              mostrarNotificacaoNativa(data);
            }
          } else if (payload.eventType === 'UPDATE') {
            // Notificação atualizada
            setNotificacoes(prev => 
              prev.map(n => n.id === payload.new.id ? { ...n, ...payload.new } : n)
            );
          } else if (payload.eventType === 'DELETE') {
            // Notificação excluída
            setNotificacoes(prev => 
              prev.filter(n => n.id !== payload.old.id)
            );
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Status da conexão Realtime:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  };

  // Função para tocar som de notificação - MELHORADA
  const tocarSomNotificacao = () => {
    console.log('🔊 Tentando tocar som...');
    
    try {
      // Método 1: Web Audio API (preferido)
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.type = 'sine';
      
      const now = audioContext.currentTime;
      
      // Primeira nota (mais alta) - Ding
      oscillator.frequency.setValueAtTime(800, now);
      gainNode.gain.setValueAtTime(0.4, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
      
      // Segunda nota (mais baixa) - Dong
      oscillator.frequency.setValueAtTime(600, now + 0.15);
      gainNode.gain.setValueAtTime(0.4, now + 0.15);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.35);

      oscillator.start(now);
      oscillator.stop(now + 0.35);

      console.log('✅ Som tocado com sucesso!');
      
    } catch (error) {
      console.error('❌ Erro ao tocar som com Web Audio API:', error);
      
      // Método 2: Fallback com beep do sistema
      try {
        console.log('🔊 Tentando fallback com beep...');
        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBCh+zfDTijcIHmS77+eXTwwOUrDj8LVeHQY5j9fyz3InBCh+zfDUijcIHWS87+eXTwwOUrDj8LVeHQY5j9fyz3InBCh+zfDUijcIHWS87+eXTwwOUrDj8LVeHQY5j9fyz3InBCh+zfDUijcIHWS87+eXTwwNU==');
        audio.play();
        console.log('✅ Beep tocado!');
      } catch (beepError) {
        console.error('❌ Falha no fallback:', beepError);
      }
    }
  };

  const mostrarNotificacaoNativa = (notificacao) => {
    // Verificar se o browser suporta notificações
    if (!('Notification' in window)) {
      console.log('Este navegador não suporta notificações');
      return;
    }

    // Verificar permissão
    if (Notification.permission === 'granted') {
      // Criar notificação
      const notification = new Notification(notificacao.titulo, {
        body: notificacao.descricao,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: `notificacao-${notificacao.id}`,
        requireInteraction: false,
        silent: false
      });

      // Fechar automaticamente após 5 segundos
      setTimeout(() => notification.close(), 5000);

      // Opcional: Click na notificação
      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    }
  };

  const solicitarPermissaoNotificacao = useCallback(async () => {
    if (!('Notification' in window)) {
      console.log('Este navegador não suporta notificações');
      return false;
    }

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

      // Atualizar localmente
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

      // Atualizar localmente
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

      // Remover localmente
      setNotificacoes(prev => prev.filter(n => n.id !== notificacaoId));
    } catch (error) {
      console.error('Erro ao excluir notificação:', error);
    }
  }, []);

  const excluirTodasLidas = useCallback(async () => {
    if (!userId) return;

    try {
      const lidasIds = notificacoes
        .filter(n => n.lida)
        .map(n => n.id);

      if (lidasIds.length === 0) return;

      const { error } = await supabase
        .from('notificacoes')
        .delete()
        .in('id', lidasIds);

      if (error) throw error;

      // Remover localmente
      setNotificacoes(prev => prev.filter(n => !n.lida));
    } catch (error) {
      console.error('Erro ao excluir notificações lidas:', error);
    }
  }, [userId, notificacoes]);

  // Calcular número de notificações não lidas
  const naoLidas = notificacoes.filter(n => !n.lida).length;

  return {
    notificacoes,
    naoLidas,
    loading,
    marcarComoLida,
    marcarTodasComoLidas,
    excluirNotificacao,
    excluirTodasLidas,
    solicitarPermissaoNotificacao,
    recarregar: carregarNotificacoes
  };
};
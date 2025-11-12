import React, { useState, useEffect } from 'react';
import { Bell, X, Check, CheckCheck, Trash2, Clock, AlertTriangle, User } from 'lucide-react';
import { useNotificacoes } from '../hooks/useNotificacoes';

const NotificationBell = ({ onNovaNotificacao }) => {
  const [mostrarModal, setMostrarModal] = useState(false);
  const {
    notificacoes,
    naoLidas,
    loading,
    marcarComoLida,
    marcarTodasComoLidas,
    excluirNotificacao,
    solicitarPermissaoNotificacao
  } = useNotificacoes(onNovaNotificacao);

  useEffect(() => {
    // Solicitar permissão para notificações ao carregar
    solicitarPermissaoNotificacao();
  }, []);

  const getIconeNotificacao = (tipo) => {
    if (tipo === 'ocorrencia') {
      return <AlertTriangle className="w-5 h-5 text-orange-600" />;
    } else if (tipo === 'visita') {
      return <User className="w-5 h-5 text-blue-600" />;
    }
    return <Bell className="w-5 h-5 text-gray-600" />;
  };

  const getCorNotificacao = (tipo) => {
    if (tipo === 'ocorrencia') {
      return 'border-l-orange-500 bg-orange-50';
    } else if (tipo === 'visita') {
      return 'border-l-blue-500 bg-blue-50';
    }
    return 'border-l-gray-500 bg-gray-50';
  };

  const formatarTempo = (data) => {
    const agora = new Date();
    const dataNotif = new Date(data);
    const diffMs = agora - dataNotif;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHoras = Math.floor(diffMins / 60);
    const diffDias = Math.floor(diffHoras / 24);

    if (diffMins < 1) return 'Agora';
    if (diffMins < 60) return `${diffMins}min`;
    if (diffHoras < 24) return `${diffHoras}h`;
    return `${diffDias}d`;
  };

  return (
    <div className="relative">
      {/* Botão do Sino */}
      <button
        onClick={() => setMostrarModal(true)}
        className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
      >
        <Bell size={24} />
        
        {/* Badge de notificações não lidas */}
        {naoLidas > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center animate-pulse">
            {naoLidas > 99 ? '99+' : naoLidas}
          </span>
        )}
      </button>

      {/* Modal de Notificações - POSICIONAMENTO CORRIGIDO */}
      {mostrarModal && (
        <>
          {/* Overlay */}
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-[9998]"
            onClick={() => setMostrarModal(false)}
          />
          
          {/* Modal */}
          <div className="fixed top-20 right-4 z-[9999] w-full max-w-md">
            <div className="bg-white rounded-lg shadow-2xl border border-gray-200 max-h-[calc(100vh-6rem)] overflow-hidden flex flex-col">
              {/* Header */}
              <div className="bg-orange-600 text-white p-4 flex justify-between items-center flex-shrink-0">
                <div className="flex items-center gap-2">
                  <Bell size={20} />
                  <h3 className="text-lg font-bold">Notificações</h3>
                  {naoLidas > 0 && (
                    <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                      {naoLidas}
                    </span>
                  )}
                </div>
                
                <div className="flex items-center gap-2">
                  {naoLidas > 0 && (
                    <button
                      onClick={marcarTodasComoLidas}
                      className="p-1 hover:bg-orange-700 rounded transition-colors"
                      title="Marcar todas como lidas"
                    >
                      <CheckCheck size={18} />
                    </button>
                  )}
                  <button
                    onClick={() => setMostrarModal(false)}
                    className="p-1 hover:bg-orange-700 rounded transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Lista de Notificações */}
              <div className="flex-1 overflow-y-auto">
                {loading ? (
                  <div className="flex items-center justify-center p-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
                  </div>
                ) : notificacoes.length === 0 ? (
                  <div className="text-center p-8 text-gray-500">
                    <Bell size={48} className="mx-auto text-gray-300 mb-3" />
                    <p className="font-semibold mb-1">Nenhuma notificação</p>
                    <p className="text-sm">Você está em dia! 🎉</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {notificacoes.map((notificacao) => (
                      <div
                        key={notificacao.id}
                        className={`p-4 border-l-4 transition-all hover:bg-gray-50 ${
                          !notificacao.lida ? getCorNotificacao(notificacao.tipo) : 'border-l-gray-200 bg-white'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            {/* Ícone - VISUAL DIFERENTE */}
                            <div className={`flex-shrink-0 mt-1 p-2 rounded-lg ${
                              notificacao.tipo === 'ocorrencia' 
                                ? 'bg-orange-100' 
                                : 'bg-blue-100'
                            }`}>
                              {getIconeNotificacao(notificacao.tipo)}
                            </div>
                            
                            {/* Conteúdo */}
                            <div className="flex-1 min-w-0">
                              <h4 className={`text-sm font-semibold break-words ${
                                !notificacao.lida ? 'text-gray-900' : 'text-gray-700'
                              }`}>
                                {notificacao.titulo}
                              </h4>
                              
                              {notificacao.descricao && (
                                <p className={`text-xs mt-1 break-words ${
                                  !notificacao.lida ? 'text-gray-700' : 'text-gray-500'
                                }`}>
                                  {notificacao.descricao}
                                </p>
                              )}
                              
                              <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                                <Clock size={12} />
                                <span>{formatarTempo(notificacao.created_at)}</span>
                                {notificacao.remetente && (
                                  <>
                                    <span>•</span>
                                    <span>por {notificacao.remetente.nome}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Ações */}
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {!notificacao.lida && (
                              <button
                                onClick={() => marcarComoLida(notificacao.id)}
                                className="p-1 text-green-600 hover:bg-green-100 rounded transition-colors"
                                title="Marcar como lida"
                              >
                                <Check size={14} />
                              </button>
                            )}
                            <button
                              onClick={() => excluirNotificacao(notificacao.id)}
                              className="p-1 text-red-600 hover:bg-red-100 rounded transition-colors"
                              title="Excluir"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              {notificacoes.length > 0 && (
                <div className="p-3 bg-gray-50 border-t text-center flex-shrink-0">
                  <p className="text-xs text-gray-500">
                    {notificacoes.length} notificação{notificacoes.length !== 1 ? 'ões' : ''} 
                    {naoLidas > 0 && ` • ${naoLidas} não lida${naoLidas !== 1 ? 's' : ''}`}
                  </p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default NotificationBell;
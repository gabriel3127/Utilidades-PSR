import React, { useState, useEffect } from 'react';
import { X, Bell, FileText, User, Check } from 'lucide-react';

const ToastNotification = ({ notificacao, onClose }) => {
  const [mostrar, setMostrar] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      fecharToast();
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  const fecharToast = () => {
    setMostrar(false);
    setTimeout(onClose, 300);
  };

  const getIconeConfig = (tipo) => {
    const configs = {
      'nova_ocorrencia': {
        icone: FileText,
        cor: 'text-orange-600',
        bg: 'bg-orange-50',
        border: 'border-orange-200'
      },
      'nova_visita': {
        icone: User,
        cor: 'text-blue-600',
        bg: 'bg-blue-50',
        border: 'border-blue-200'
      },
      'ocorrencia_resolvida': {
        icone: Check,
        cor: 'text-green-600',
        bg: 'bg-green-50',
        border: 'border-green-200'
      }
    };
    return configs[tipo] || {
      icone: Bell,
      cor: 'text-gray-600',
      bg: 'bg-gray-50',
      border: 'border-gray-200'
    };
  };

  const config = getIconeConfig(notificacao.tipo);
  const IconeComponente = config.icone;

  return (
    <div
      className={`transform transition-all duration-300 ${
        mostrar 
          ? 'translate-x-0 opacity-100' 
          : 'translate-x-full opacity-0'
      }`}
    >
      <div className={`bg-white rounded-lg shadow-xl border-2 ${config.border} p-4 max-w-sm w-full`}>
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg ${config.bg} flex-shrink-0`}>
            <IconeComponente className={`w-5 h-5 ${config.cor}`} />
          </div>
          
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-gray-900 break-words">
              {notificacao.titulo}
            </h4>
            {notificacao.descricao && (
              <p className="text-xs text-gray-600 mt-1 break-words">
                {notificacao.descricao}
              </p>
            )}
            <p className="text-xs text-gray-500 mt-2">
              Agora mesmo
            </p>
          </div>
          
          <button
            onClick={fecharToast}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

const ToastContainer = () => {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const handleNovaNotificacao = (event) => {
      console.log('🎉 ToastContainer recebeu evento!', event.detail);
      
      const novaNotificacao = {
        id: Date.now() + Math.random(),
        ...event.detail
      };
      
      setToasts(prev => [...prev, novaNotificacao]);
    };

    window.addEventListener('nova-notificacao', handleNovaNotificacao);
    
    return () => {
      window.removeEventListener('nova-notificacao', handleNovaNotificacao);
    };
  }, []);

  const removerToast = (toastId) => {
    setToasts(prev => prev.filter(t => t.id !== toastId));
  };

  return (
    // STICKY: Rola junto com a página, mas sempre 20px abaixo do topo
    <div className="sticky top-20 right-4 float-right z-[100] space-y-2 pointer-events-none mr-4 mt-4">
      {toasts.map(toast => (
        <div key={toast.id} className="pointer-events-auto">
          <ToastNotification
            notificacao={toast}
            onClose={() => removerToast(toast.id)}
          />
        </div>
      ))}
    </div>
  );
};

export { ToastContainer };
export default ToastNotification;
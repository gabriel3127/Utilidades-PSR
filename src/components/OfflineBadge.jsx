// =====================================================
// BADGE PARA ITENS NÃO SINCRONIZADOS
// =====================================================

import React from 'react';
import { CloudOff, Clock } from 'lucide-react';

/**
 * Badge para indicar que um item ainda não foi sincronizado
 * 
 * @param {Object} props
 * @param {boolean} props.offline - Se o item foi criado offline
 * @param {string} props.size - Tamanho: 'sm', 'md', 'lg'
 * @param {string} props.variant - Estilo: 'badge', 'inline', 'full'
 */
const OfflineBadge = ({ offline = false, size = 'md', variant = 'badge' }) => {
  if (!offline) return null;

  const sizes = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-xs px-2 py-1',
    lg: 'text-sm px-3 py-1.5'
  };

  const iconSizes = {
    sm: 12,
    md: 14,
    lg: 16
  };

  // Badge compacto (padrão)
  if (variant === 'badge') {
    return (
      <span className={`inline-flex items-center gap-1 bg-orange-100 text-orange-700 rounded-full font-medium border border-orange-300 ${sizes[size]}`}>
        <CloudOff size={iconSizes[size]} />
        <span>Não sincronizado</span>
      </span>
    );
  }

  // Inline com ícone (para listas)
  if (variant === 'inline') {
    return (
      <span className="inline-flex items-center gap-1 text-orange-600 text-xs">
        <Clock size={12} />
        <span className="font-medium">Pendente</span>
      </span>
    );
  }

  // Alerta completo (para cards)
  if (variant === 'full') {
    return (
      <div className="bg-orange-50 border border-orange-200 rounded-lg p-2 flex items-start gap-2">
        <CloudOff size={16} className="text-orange-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-xs font-semibold text-orange-800">
            Aguardando sincronização
          </p>
          <p className="text-xs text-orange-600 mt-0.5">
            Este item será enviado automaticamente quando a conexão voltar
          </p>
        </div>
      </div>
    );
  }

  return null;
};

export default OfflineBadge;
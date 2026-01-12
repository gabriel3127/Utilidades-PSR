// =====================================================
// COMPONENTE MINIMALISTA - Apenas ícone no canto
// Arquivo: src/components/OfflineStatus.jsx
// =====================================================

import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, CloudUpload, Cloud, AlertCircle } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { getPendingCount } from '../services/offlineSync';
import { syncAll } from '../services/syncService';

const OfflineStatus = () => {
  const { isOnline, justWentOnline } = useOnlineStatus();
  const [pendingCount, setPendingCount] = useState({ total: 0, occurrences: 0, visits: 0 });
  const [isSyncing, setIsSyncing] = useState(false);
  const [mostrarDetalhes, setMostrarDetalhes] = useState(false);

  // Atualizar contador
  useEffect(() => {
    const updateCount = async () => {
      const count = await getPendingCount();
      setPendingCount(count);
    };

    updateCount();
    const interval = setInterval(updateCount, 5000);
    return () => clearInterval(interval);
  }, [isOnline]);

  // Sincronizar automaticamente
  useEffect(() => {
    if (justWentOnline && pendingCount.total > 0 && !isSyncing) {
      handleSync();
    }
  }, [justWentOnline, pendingCount.total]);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await syncAll();
      const count = await getPendingCount();
      setPendingCount(count);
    } catch (error) {
      console.error('Erro na sincronização:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  // Se online e sem pendentes, mostrar apenas ícone pequenininho
  if (isOnline && pendingCount.total === 0) {
    return (
      <div 
        className="fixed bottom-4 right-4 z-50 cursor-pointer"
        onClick={() => setMostrarDetalhes(!mostrarDetalhes)}
      >
        <div className="bg-green-500 text-white p-2 rounded-full shadow-lg hover:scale-110 transition-transform">
          <Wifi size={16} />
        </div>
        
        {mostrarDetalhes && (
          <div className="absolute bottom-12 right-0 bg-white rounded-lg shadow-xl p-3 w-48 border border-gray-200">
            <div className="flex items-center gap-2 text-sm">
              <Cloud size={16} className="text-green-600" />
              <span className="font-medium text-gray-800">Online</span>
            </div>
            <p className="text-xs text-gray-600 mt-1">Tudo sincronizado</p>
          </div>
        )}
      </div>
    );
  }

  // Se offline OU tem pendentes, mostrar banner
  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className={`rounded-lg shadow-xl p-3 max-w-sm ${
        isOnline 
          ? 'bg-blue-600 text-white' 
          : 'bg-orange-600 text-white'
      }`}>
        <div className="flex items-center justify-between gap-3">
          {/* Ícone e Status */}
          <div className="flex items-center gap-2">
            {isOnline ? (
              <Wifi size={20} />
            ) : (
              <WifiOff size={20} className="animate-pulse" />
            )}
            
            <div className="text-sm">
              {isOnline ? (
                <div>
                  <p className="font-semibold">
                    {pendingCount.total} pendente{pendingCount.total !== 1 ? 's' : ''}
                  </p>
                  <p className="text-xs opacity-90">
                    {pendingCount.occurrences} ocorrência{pendingCount.occurrences !== 1 ? 's' : ''}, {pendingCount.visits} visita{pendingCount.visits !== 1 ? 's' : ''}
                  </p>
                </div>
              ) : (
                <div>
                  <p className="font-semibold">Modo Offline</p>
                  <p className="text-xs opacity-90">
                    {pendingCount.total > 0 && `${pendingCount.total} salvos localmente`}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Botão de Sincronizar */}
          {isOnline && pendingCount.total > 0 && (
            <button
              onClick={handleSync}
              disabled={isSyncing}
              className="bg-white text-blue-600 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-blue-50 disabled:opacity-50 flex items-center gap-1"
            >
              <CloudUpload size={14} className={isSyncing ? 'animate-pulse' : ''} />
              {isSyncing ? 'Sync...' : 'Sync'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default OfflineStatus;
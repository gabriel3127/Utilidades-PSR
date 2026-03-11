import { useEffect, useState, useCallback } from 'react'
import { getPendingCount } from '@/lib/indexeddb'

export function useOnlineStatus() {
  const [online, setOnline]           = useState(navigator.onLine)
  const [pendingCount, setPendingCount] = useState({ occurrences: 0, visits: 0, total: 0 })

  // Atualiza contagem de pendentes
  const refreshPending = useCallback(async () => {
    const count = await getPendingCount()
    setPendingCount(count)
  }, [])

  useEffect(() => {
    refreshPending()
  }, [refreshPending])

  useEffect(() => {
    const goOnline = () => {
      setOnline(true)

      // Ao reconectar: tenta registrar Background Sync
      if ('serviceWorker' in navigator && 'SyncManager' in window) {
        navigator.serviceWorker.ready.then(reg => {
          // O SW vai processar em background mesmo se o app for minimizado
          reg.sync.register('sync-occurrences').catch(() => {})
          reg.sync.register('sync-visits').catch(() => {})
        })
      } else {
        // Fallback para browsers sem Background Sync (iOS Safari)
        // Dispara evento para os hooks fazerem sync em foreground
        window.dispatchEvent(new CustomEvent('psr:force-sync'))
      }
    }

    const goOffline = () => setOnline(false)

    window.addEventListener('online',  goOnline)
    window.addEventListener('offline', goOffline)

    // Escuta quando o SW confirma sync concluído
    const onOccSynced = (e) => {
      refreshPending()
      // O toast é mostrado por quem escuta este evento na UI
    }
    const onVisSynced = (e) => {
      refreshPending()
    }

    window.addEventListener('psr:occurrences-synced', onOccSynced)
    window.addEventListener('psr:visits-synced',      onVisSynced)

    return () => {
      window.removeEventListener('online',                 goOnline)
      window.removeEventListener('offline',                goOffline)
      window.removeEventListener('psr:occurrences-synced', onOccSynced)
      window.removeEventListener('psr:visits-synced',      onVisSynced)
    }
  }, [refreshPending])

  return { online, pendingCount, refreshPending }
}
/// <reference lib="webworker" />
// @ts-check

// ─── PSR Service Worker ───────────────────────────────────────────────────────
// Responsável por:
//   1. Cache do shell do app (offline navigation)
//   2. Background Sync de ocorrências e visitas pendentes
//   3. Atualização silenciosa do SW
// ─────────────────────────────────────────────────────────────────────────────

import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching'
import { clientsClaim } from 'workbox-core'

// Tags de sincronização — devem ser iguais às usadas no cliente
const SYNC_OCCURRENCES = 'sync-occurrences'
const SYNC_VISITS      = 'sync-visits'

// Assume controle imediato de todas as abas abertas
self.skipWaiting()
clientsClaim()

// Pré-cacheia os assets gerados pelo Vite (injetado pelo vite-plugin-pwa)
precacheAndRoute(self.__WB_MANIFEST || [])
cleanupOutdatedCaches()

// ─── Background Sync ─────────────────────────────────────────────────────────
self.addEventListener('sync', (event) => {
  if (event.tag === SYNC_OCCURRENCES) {
    event.waitUntil(syncPendingOccurrences())
  }
  if (event.tag === SYNC_VISITS) {
    event.waitUntil(syncPendingVisits())
  }
})

// ─── Sync de Ocorrências ──────────────────────────────────────────────────────
async function syncPendingOccurrences() {
  const db = await openDB()
  const tx = db.transaction('occurrences', 'readwrite')
  const store = tx.objectStore('occurrences')
  const all = await getAllFromStore(store)
  const pending = all.filter(item => !item.synced)

  console.log(`[SW] Sincronizando ${pending.length} ocorrência(s) pendente(s)`)

  for (const item of pending) {
    try {
      const res = await fetch('/api/sync-occurrence', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${item.token}`,
        },
        body: JSON.stringify(item.data),
      })

      if (res.ok) {
        // Marca como sincronizado
        const writeTx = db.transaction('occurrences', 'readwrite')
        writeTx.objectStore('occurrences').put({ ...item, synced: true, syncedAt: new Date().toISOString() })
        await writeTx.done
        console.log(`[SW] Ocorrência ${item.localId} sincronizada`)
      } else {
        console.warn(`[SW] Erro HTTP ${res.status} ao sincronizar ocorrência ${item.localId}`)
      }
    } catch (err) {
      // Falha de rede — o SW vai tentar de novo na próxima reconexão
      console.warn(`[SW] Falha ao sincronizar ocorrência ${item.localId}:`, err.message)
      throw err // Re-throw para o Background Sync reagendar
    }
  }

  // Notifica as abas abertas sobre o sync concluído
  notifyClients({ type: 'OCCURRENCES_SYNCED', count: pending.length })
}

// ─── Sync de Visitas ──────────────────────────────────────────────────────────
async function syncPendingVisits() {
  const db = await openDB()
  const tx = db.transaction('visits', 'readwrite')
  const store = tx.objectStore('visits')
  const all = await getAllFromStore(store)
  const pending = all.filter(item => !item.synced)

  console.log(`[SW] Sincronizando ${pending.length} visita(s) pendente(s)`)

  for (const item of pending) {
    try {
      const res = await fetch('/api/sync-visit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${item.token}`,
        },
        body: JSON.stringify(item.data),
      })

      if (res.ok) {
        const writeTx = db.transaction('visits', 'readwrite')
        writeTx.objectStore('visits').put({ ...item, synced: true, syncedAt: new Date().toISOString() })
        await writeTx.done
        console.log(`[SW] Visita ${item.localId} sincronizada`)
      } else {
        console.warn(`[SW] Erro HTTP ${res.status} ao sincronizar visita ${item.localId}`)
      }
    } catch (err) {
      console.warn(`[SW] Falha ao sincronizar visita ${item.localId}:`, err.message)
      throw err
    }
  }

  notifyClients({ type: 'VISITS_SYNCED', count: pending.length })
}

// ─── Helpers IndexedDB (sem idb lib — SW não tem módulos externos) ────────────
function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('psr-offline', 1)
    req.onupgradeneeded = (e) => {
      const db = e.target.result
      if (!db.objectStoreNames.contains('occurrences')) {
        const s = db.createObjectStore('occurrences', { keyPath: 'localId' })
        s.createIndex('synced', 'synced')
      }
      if (!db.objectStoreNames.contains('visits')) {
        const s = db.createObjectStore('visits', { keyPath: 'localId' })
        s.createIndex('synced', 'synced')
      }
      if (!db.objectStoreNames.contains('clients_cache')) {
        db.createObjectStore('clients_cache', { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains('config_cache')) {
        db.createObjectStore('config_cache', { keyPath: 'key' })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror   = () => reject(req.error)
  })
}

function getAllFromStore(store) {
  return new Promise((resolve, reject) => {
    const req = store.getAll()
    req.onsuccess = () => resolve(req.result || [])
    req.onerror   = () => reject(req.error)
  })
}

// ─── Notifica todas as abas abertas ──────────────────────────────────────────
async function notifyClients(message) {
  const clients = await self.clients.matchAll({ type: 'window' })
  clients.forEach(client => client.postMessage(message))
}

// ─── Mensagens do cliente para o SW ──────────────────────────────────────────
// Permite forçar sync manualmente pela UI (ex: botão "Sincronizar agora")
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
  if (event.data?.type === 'FORCE_SYNC') {
    Promise.all([
      syncPendingOccurrences(),
      syncPendingVisits(),
    ]).catch(console.error)
  }
})
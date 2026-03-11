import { openDB } from 'idb'

const DB_NAME    = 'psr-offline'
const DB_VERSION = 1

// Abre (ou cria) o banco local
export const getDB = () =>
  openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Ocorrências pendentes de sync
      if (!db.objectStoreNames.contains('occurrences')) {
        const s = db.createObjectStore('occurrences', { keyPath: 'localId' })
        s.createIndex('synced', 'synced')
      }
      // Visitas pendentes de sync
      if (!db.objectStoreNames.contains('visits')) {
        const s = db.createObjectStore('visits', { keyPath: 'localId' })
        s.createIndex('synced', 'synced')
      }
      // Cache de clientes do pipeline para autocomplete offline
      if (!db.objectStoreNames.contains('clients_cache')) {
        const s = db.createObjectStore('clients_cache', { keyPath: 'id' })
        s.createIndex('name', 'client_name')
      }
      // Cache de configurações: setores, tipos_problema, tipos_visita
      if (!db.objectStoreNames.contains('config_cache')) {
        db.createObjectStore('config_cache', { keyPath: 'key' })
      }
    },
  })

// ─── Ocorrências offline ──────────────────────────────────────────────────────

export async function saveOccurrenceOffline(data, token) {
  const db = await getDB()
  const localId = `occ_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
  await db.put('occurrences', {
    localId,
    data,
    token,
    synced:    false,
    createdAt: new Date().toISOString(),
  })
  return localId
}

export async function getPendingOccurrences() {
  const db = await getDB()
  const all = await db.getAll('occurrences')
  return all.filter(item => !item.synced)
}

export async function markOccurrenceSynced(localId) {
  const db   = await getDB()
  const item = await db.get('occurrences', localId)
  if (item) {
    await db.put('occurrences', { ...item, synced: true, syncedAt: new Date().toISOString() })
  }
}

// ─── Visitas offline ──────────────────────────────────────────────────────────

export async function saveVisitOffline(data, token) {
  const db = await getDB()
  const localId = `vis_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
  await db.put('visits', {
    localId,
    data,
    token,
    synced:    false,
    createdAt: new Date().toISOString(),
  })
  return localId
}

export async function getPendingVisits() {
  const db = await getDB()
  const all = await db.getAll('visits')
  return all.filter(item => !item.synced)
}

export async function markVisitSynced(localId) {
  const db   = await getDB()
  const item = await db.get('visits', localId)
  if (item) {
    await db.put('visits', { ...item, synced: true, syncedAt: new Date().toISOString() })
  }
}

// ─── Cache de clientes ────────────────────────────────────────────────────────

export async function cacheClients(clients) {
  const db = await getDB()
  const tx = db.transaction('clients_cache', 'readwrite')
  await Promise.all(clients.map(c => tx.store.put(c)))
  await tx.done
}

export async function searchClientsOffline(query) {
  const db  = await getDB()
  const all = await db.getAll('clients_cache')
  if (!query) return all.slice(0, 30)
  const q = query.toLowerCase()
  return all.filter(c =>
    c.client_name?.toLowerCase().includes(q) ||
    c.external_id?.includes(q)  // CNPJ
  ).slice(0, 20)
}

// ─── Cache de configurações ───────────────────────────────────────────────────

export async function cacheConfig(key, value) {
  const db = await getDB()
  await db.put('config_cache', { key, value, cachedAt: new Date().toISOString() })
}

export async function getConfig(key) {
  const db   = await getDB()
  const item = await db.get('config_cache', key)
  return item?.value ?? null
}

// ─── Contagem de pendentes ────────────────────────────────────────────────────

export async function getPendingCount() {
  const [occs, vis] = await Promise.all([
    getPendingOccurrences(),
    getPendingVisits(),
  ])
  return {
    occurrences: occs.length,
    visits:      vis.length,
    total:       occs.length + vis.length,
  }
}
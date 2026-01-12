import { openDB } from 'idb';

// Nome do banco de dados
const DB_NAME = 'psr-offline-db';
const DB_VERSION = 1;

// Inicializar banco de dados
export const initDB = async () => {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Store para ocorrências pendentes
      if (!db.objectStoreNames.contains('occurrences')) {
        const occurrenceStore = db.createObjectStore('occurrences', {
          keyPath: 'id',
          autoIncrement: true
        });
        occurrenceStore.createIndex('timestamp', 'timestamp');
        occurrenceStore.createIndex('synced', 'synced');
      }

      // Store para visitas técnicas pendentes
      if (!db.objectStoreNames.contains('visits')) {
        const visitStore = db.createObjectStore('visits', {
          keyPath: 'id',
          autoIncrement: true
        });
        visitStore.createIndex('timestamp', 'timestamp');
        visitStore.createIndex('synced', 'synced');
      }
    },
  });
};

// Salvar ocorrência offline
export const saveOccurrenceOffline = async (occurrenceData) => {
  const db = await initDB();
  const tx = db.transaction('occurrences', 'readwrite');
  const store = tx.objectStore('occurrences');

  const offlineOccurrence = {
    ...occurrenceData,
    timestamp: Date.now(),
    synced: false,
    type: 'occurrence'
  };

  const id = await store.add(offlineOccurrence);
  await tx.done;
  
  return id;
};

// Salvar visita offline
export const saveVisitOffline = async (visitData) => {
  const db = await initDB();
  const tx = db.transaction('visits', 'readwrite');
  const store = tx.objectStore('visits');

  const offlineVisit = {
    ...visitData,
    timestamp: Date.now(),
    synced: false,
    type: 'visit'
  };

  const id = await store.add(offlineVisit);
  await tx.done;
  
  return id;
};

// Buscar ocorrências pendentes
export const getPendingOccurrences = async () => {
  try {
    const db = await initDB();
    const tx = db.transaction('occurrences', 'readonly');
    const store = tx.objectStore('occurrences');
    const all = await store.getAll();
    await tx.done;
    
    // Filtrar apenas não sincronizados
    return all.filter(item => !item.synced);
  } catch (error) {
    console.error('❌ Erro ao buscar ocorrências pendentes:', error);
    return [];
  }
};

// Buscar visitas pendentes
export const getPendingVisits = async () => {
  try {
    const db = await initDB();
    const tx = db.transaction('visits', 'readonly');
    const store = tx.objectStore('visits');
    const all = await store.getAll();
    await tx.done;
    
    // Filtrar apenas não sincronizados
    return all.filter(item => !item.synced);
  } catch (error) {
    console.error('❌ Erro ao buscar visitas pendentes:', error);
    return [];
  }
};

// Marcar ocorrência como sincronizada
export const markOccurrenceSynced = async (id) => {
  const db = await initDB();
  const tx = db.transaction('occurrences', 'readwrite');
  const store = tx.objectStore('occurrences');
  
  const occurrence = await store.get(id);
  if (occurrence) {
    occurrence.synced = true;
    occurrence.syncedAt = Date.now();
    await store.put(occurrence);
  }
  
  await tx.done;
};

// Marcar visita como sincronizada
export const markVisitSynced = async (id) => {
  const db = await initDB();
  const tx = db.transaction('visits', 'readwrite');
  const store = tx.objectStore('visits');
  
  const visit = await store.get(id);
  if (visit) {
    visit.synced = true;
    visit.syncedAt = Date.now();
    await store.put(visit);
  }
  
  await tx.done;
};

// Deletar ocorrência sincronizada
export const deleteOccurrence = async (id) => {
  const db = await initDB();
  const tx = db.transaction('occurrences', 'readwrite');
  await tx.objectStore('occurrences').delete(id);
  await tx.done;
};

// Deletar visita sincronizada
export const deleteVisit = async (id) => {
  const db = await initDB();
  const tx = db.transaction('visits', 'readwrite');
  await tx.objectStore('visits').delete(id);
  await tx.done;
};

// Contar itens pendentes
export const getPendingCount = async () => {
  const occurrences = await getPendingOccurrences();
  const visits = await getPendingVisits();
  
  return {
    occurrences: occurrences.length,
    visits: visits.length,
    total: occurrences.length + visits.length
  };
};

// Limpar dados antigos (7 dias)
export const cleanOldData = async () => {
  try {
    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    const db = await initDB();

    // Limpar ocorrências
    const occTx = db.transaction('occurrences', 'readwrite');
    const occStore = occTx.objectStore('occurrences');
    const allOccs = await occStore.getAll();
    
    for (const occ of allOccs) {
      if (occ.synced && occ.syncedAt && occ.syncedAt < sevenDaysAgo) {
        await occStore.delete(occ.id);
      }
    }
    await occTx.done;

    // Limpar visitas
    const visitTx = db.transaction('visits', 'readwrite');
    const visitStore = visitTx.objectStore('visits');
    const allVisits = await visitStore.getAll();
    
    for (const visit of allVisits) {
      if (visit.synced && visit.syncedAt && visit.syncedAt < sevenDaysAgo) {
        await visitStore.delete(visit.id);
      }
    }
    await visitTx.done;

    console.log('🧹 Dados antigos limpos');
  } catch (error) {
    console.error('❌ Erro ao limpar dados antigos:', error);
  }
};

// Helper: Converter Base64 para File
export const base64ToFile = (base64, filename = 'image.jpg') => {
  const arr = base64.split(',');
  const mime = arr[0].match(/:(.*?);/)[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  
  return new File([u8arr], filename, { type: mime });
};

// Salvar empresas no cache
export const cacheEmpresas = async (empresas) => {
  try {
    localStorage.setItem('cache_empresas', JSON.stringify(empresas));
    console.log('✅ Empresas em cache:', empresas.length);
  } catch (error) {
    console.error('❌ Erro ao cachear empresas:', error);
  }
};

// Salvar setores no cache
export const cacheSetores = async (setores) => {
  try {
    localStorage.setItem('cache_setores', JSON.stringify(setores));
    console.log('✅ Setores em cache:', setores.length);
  } catch (error) {
    console.error('❌ Erro ao cachear setores:', error);
  }
};

// Salvar tipos de problema no cache
export const cacheTiposProblema = async (tipos) => {
  try {
    localStorage.setItem('cache_tipos_problema', JSON.stringify(tipos));
    console.log('✅ Tipos de problema em cache:', tipos.length);
  } catch (error) {
    console.error('❌ Erro ao cachear tipos:', error);
  }
};

// Buscar empresas do cache
export const getCachedEmpresas = () => {
  try {
    const cached = localStorage.getItem('cache_empresas');
    return cached ? JSON.parse(cached) : [];
  } catch (error) {
    console.error('❌ Erro ao ler cache de empresas:', error);
    return [];
  }
};

// Buscar setores do cache
export const getCachedSetores = () => {
  try {
    const cached = localStorage.getItem('cache_setores');
    return cached ? JSON.parse(cached) : [];
  } catch (error) {
    console.error('❌ Erro ao ler cache de setores:', error);
    return [];
  }
};

// Buscar tipos de problema do cache
export const getCachedTiposProblema = () => {
  try {
    const cached = localStorage.getItem('cache_tipos_problema');
    return cached ? JSON.parse(cached) : [];
  } catch (error) {
    console.error('❌ Erro ao ler cache de tipos:', error);
    return [];
  }
};

// Salvar info do usuário no cache
export const cacheUsuario = (usuario) => {
  try {
    localStorage.setItem('cache_usuario', JSON.stringify(usuario));
  } catch (error) {
    console.error('❌ Erro ao cachear usuário:', error);
  }
};

// Buscar usuário do cache
export const getCachedUsuario = () => {
  try {
    const cached = localStorage.getItem('cache_usuario');
    return cached ? JSON.parse(cached) : null;
  } catch (error) {
    console.error('❌ Erro ao ler cache de usuário:', error);
    return null;
  }
};
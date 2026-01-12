import { supabase } from './supabase';
import {
  getPendingOccurrences,
  getPendingVisits,
  markOccurrenceSynced,
  markVisitSynced,
  deleteOccurrence,
  deleteVisit,
  base64ToFile
} from './offlineSync';

// Sincronizar ocorrências
export const syncOccurrences = async () => {
  console.log('🔄 Sincronizando ocorrências...');
  
  const pending = await getPendingOccurrences();
  
  if (pending.length === 0) {
    console.log('✅ Nenhuma ocorrência pendente');
    return { success: true, synced: 0, total: 0, errors: [] };
  }

  let syncedCount = 0;
  const errors = [];

  for (const occurrence of pending) {
    try {
      // ========== REMOVER CAMPOS QUE NÃO EXISTEM NO BANCO ==========
      const { 
        id, 
        timestamp, 
        synced, 
        syncedAt, 
        type, 
        createdOffline,
        imagemBase64,          // ← NÃO EXISTE NO BANCO
        imagemPreview,         // ← NÃO EXISTE NO BANCO
        imagemFile,            // ← NÃO EXISTE NO BANCO
        empresa_nome,          // ← NÃO EXISTE NO BANCO
        setor_nome,            // ← NÃO EXISTE NO BANCO
        tipo_problema_nome,    // ← NÃO EXISTE NO BANCO
        ...occurrenceData      // ← SÓ O QUE SOBRAR
      } = occurrence;

      // Upload da imagem se existir
      if (imagemBase64) {
        try {
          // Converter base64 de volta para File
          const imagemFile = base64ToFile(imagemBase64, `occurrence-${Date.now()}.jpg`);
          
          // Upload
          const fileExt = imagemFile.name.split('.').pop();
          const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
          
          const { error: uploadError } = await supabase.storage
            .from('ocorrencias-imagens')
            .upload(fileName, imagemFile);

          if (uploadError) throw uploadError;

          const { data } = supabase.storage
            .from('ocorrencias-imagens')
            .getPublicUrl(fileName);

          occurrenceData.imagem_url = data.publicUrl;
        } catch (imgError) {
          console.error('⚠️ Erro ao fazer upload da imagem:', imgError);
        }
      }

      // Inserir no Supabase (SÓ COM OS CAMPOS CORRETOS)
      const { error } = await supabase
        .from('occurrences')
        .insert([occurrenceData]);

      if (error) throw error;

      await markOccurrenceSynced(id);
      setTimeout(() => deleteOccurrence(id), 24 * 60 * 60 * 1000);
      
      syncedCount++;
      console.log(`✅ Ocorrência ${id} sincronizada`);
      
    } catch (error) {
      console.error(`❌ Erro ao sincronizar ocorrência ${occurrence.id}:`, error);
      errors.push({ occurrence: occurrence.id, error: error.message });
    }
  }

  return {
    success: errors.length === 0,
    synced: syncedCount,
    total: pending.length,
    errors
  };
};

// Sincronizar visitas
export const syncVisits = async () => {
  console.log('🔄 Sincronizando visitas...');
  
  const pending = await getPendingVisits();
  
  if (pending.length === 0) {
    console.log('✅ Nenhuma visita pendente');
    return { success: true, synced: 0, total: 0, errors: [] };
  }

  let syncedCount = 0;
  const errors = [];

  for (const visit of pending) {
    try {
      // Remover campos de controle + IDs offline
      const { 
        id, 
        timestamp, 
        synced, 
        syncedAt, 
        type,
        user_id,      // Remover ID offline
        created_by,   // Remover ID offline
        ...visitData 
      } = visit;

      // Pegar usuário autenticado atual
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      // Adicionar IDs corretos
      visitData.user_id = user.id;
      visitData.created_by = user.id;

      const { error } = await supabase
        .from('visitas_tecnicas')
        .insert([visitData]);

      if (error) throw error;

      await markVisitSynced(id);
      setTimeout(() => deleteVisit(id), 24 * 60 * 60 * 1000);
      
      syncedCount++;
      console.log(`✅ Visita ${id} sincronizada`);
      
    } catch (error) {
      console.error(`❌ Erro ao sincronizar visita ${visit.id}:`, error);
      errors.push({ visit: visit.id, error: error.message });
    }
  }

  return {
    success: errors.length === 0,
    synced: syncedCount,
    total: pending.length,
    errors
  };
};

// Sincronizar tudo
export const syncAll = async () => {
  console.log('🔄 Iniciando sincronização...');
  
  const occurrencesResult = await syncOccurrences();
  const visitsResult = await syncVisits();

  const totalSynced = occurrencesResult.synced + visitsResult.synced;
  const totalPending = occurrencesResult.total + visitsResult.total;

  console.log(`✅ Sincronizados: ${totalSynced}/${totalPending}`);

  return {
    success: occurrencesResult.success && visitsResult.success,
    occurrences: occurrencesResult,
    visits: visitsResult,
    totalSynced,
    totalPending
  };
};

// Helper para upload de imagem
const uploadImageToSupabase = async (imagemFile) => {
  const fileExt = imagemFile.name.split('.').pop();
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
  
  const { error } = await supabase.storage
    .from('ocorrencias-imagens')
    .upload(fileName, imagemFile);

  if (error) throw error;

  const { data } = supabase.storage
    .from('ocorrencias-imagens')
    .getPublicUrl(fileName);

  return data.publicUrl;
};

// Sincronização automática em background
export const startAutoSync = () => {
  // Tentar sincronizar a cada 5 minutos
  const interval = setInterval(async () => {
    if (navigator.onLine) {
      const { getPendingCount } = await import('./offlineSync');
      const pending = await getPendingCount();
      if (pending.total > 0) {
        console.log('⏰ Auto-sync: iniciando sincronização...');
        await syncAll();
      }
    }
  }, 5 * 60 * 1000); // 5 minutos

  return () => clearInterval(interval);
};
import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !key) {
  throw new Error(
    'Variáveis VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY não encontradas.\n' +
    'Crie um arquivo .env na raiz do projeto com essas variáveis.'
  )
}

export const supabase = createClient(url, key, {
  auth: {
    // Persiste a sessão no localStorage (padrão)
    persistSession: true,
    // Detecta sessão na URL (para magic links e OAuth)
    detectSessionInUrl: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
})
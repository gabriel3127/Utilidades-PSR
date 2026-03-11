import { supabase } from '@/lib/supabase'

export async function notifyEvent(tipo, record) {
  try {
    await supabase.functions.invoke('notify-event', {
      body: { tipo, record },
    })
  } catch (err) {
    // Notificação nunca deve bloquear o fluxo principal
    console.warn('[notifyEvent] falha silenciosa:', err?.message)
  }
}
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './app.jsx'
import './index.css'

// ─── Registro do Service Worker ───────────────────────────────────────────────
// O vite-plugin-pwa injeta o virtualModule 'virtual:pwa-register'
// que cuida do ciclo de vida do SW automaticamente.
// O SW customizado (public/sw.js) é referenciado no vite.config.js.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((reg) => {
        console.log('[PSR] Service Worker registrado:', reg.scope)

        // Escuta mensagens do SW (sync concluído, atualizações, etc.)
        navigator.serviceWorker.addEventListener('message', (event) => {
          const { type, count } = event.data || {}

          if (type === 'OCCURRENCES_SYNCED' && count > 0) {
            // Dispara evento customizado para a UI mostrar toast de sucesso
            window.dispatchEvent(new CustomEvent('psr:occurrences-synced', { detail: { count } }))
          }
          if (type === 'VISITS_SYNCED' && count > 0) {
            window.dispatchEvent(new CustomEvent('psr:visits-synced', { detail: { count } }))
          }
        })
      })
      .catch((err) => {
        console.warn('[PSR] Falha ao registrar Service Worker:', err)
      })
  })
}

// ─── Render ───────────────────────────────────────────────────────────────────
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
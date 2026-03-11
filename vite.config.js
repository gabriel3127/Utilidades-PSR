import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // 'autoUpdate' atualiza o SW silenciosamente em background
      registerType: 'autoUpdate',

      // Inclui o SW no build
      injectRegister: 'auto',

      // Arquivo SW customizado (Background Sync está lá)
      strategies: 'injectManifest',
      srcDir: 'public',
      filename: 'sw.js',

      manifest: false, // usamos o public/manifest.json diretamente

      // Assets que o SW vai pré-cachear (shell do app)
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        globIgnores: ['**/node_modules/**'],
      },

      devOptions: {
        // Ativa o SW também em desenvolvimento para testar offline
        enabled: true,
        type: 'module',
      },
    }),
  ],

  // Resolve para importações mais limpas: '@/components/...'
  resolve: {
    alias: {
      '@': '/src',
    },
  },

  server: {
    port: 3000,
    open: true,
  },

  build: {
    outDir: 'dist',
    sourcemap: false,
    // Chunks separados: vendor, pipeline, ocorrencias, visitas
    rollupOptions: {
      output: {
        manualChunks: {
          vendor:      ['react', 'react-dom'],
          supabase:    ['@supabase/supabase-js'],
          utils:       ['date-fns', 'idb', 'xlsx'],
          icons:       ['lucide-react'],
        },
      },
    },
  },
})
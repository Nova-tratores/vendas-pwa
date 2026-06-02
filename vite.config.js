import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  server: {
    host: true,
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        // Pré-cache: inclui as fotos .webp do catálogo (~1,9 MB) além do
        // padrão. Assim o catálogo curado abre offline com imagens.
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff,woff2}'],
        runtimeCaching: [
          {
            // Folhetos técnicos (PDF) e mídias do bucket público do Supabase.
            // CacheFirst: depois de aberto 1x, fica disponível offline.
            urlPattern: ({ url }) => url.pathname.includes('/storage/v1/object/public/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'catalogo-midia',
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Imagens externas (fotos do ERP no estoque atual, novatratores.com).
            urlPattern: ({ request }) => request.destination === 'image',
            handler: 'CacheFirst',
            options: {
              cacheName: 'imagens-externas',
              expiration: { maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Dados do Supabase (REST). NetworkFirst: online pega o atual,
            // offline cai pro último estoque/preço que carregou.
            urlPattern: ({ url }) => url.pathname.startsWith('/rest/v1/'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-dados',
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      manifest: {
        name: 'Vendas App',
        short_name: 'Vendas',
        theme_color: '#1e40af',
        background_color: '#f8fafc',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
  ],
})

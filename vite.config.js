import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// Versão do app = data/hora do build (horário de Brasília). Aparece no Menu para
// saber se o celular já está com a versão nova.
const VERSAO_APP = new Date(Date.now() - 3 * 3600_000).toISOString().slice(0, 16).replace('T', ' ')

export default defineConfig({
  define: { __VERSAO_APP__: JSON.stringify(VERSAO_APP) },
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
            // Vídeos do bucket: streaming puro, NUNCA cacheia — senão muitos vídeos
            // pesariam o app do vendedor. (Precisa estar ANTES da regra de mídia abaixo.)
            urlPattern: ({ url }) =>
              url.pathname.includes('/storage/v1/object/public/') &&
              /\.(mp4|webm|mov|m4v)$/i.test(url.pathname),
            handler: 'NetworkOnly',
          },
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
        name: 'NT Vendas',
        short_name: 'NT Vendas',
        theme_color: '#991b1b',
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

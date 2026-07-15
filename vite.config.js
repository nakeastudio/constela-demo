import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// Config de Vite + PWA. La PWA cachea todo para que la app funcione offline
// y se pueda instalar en la pantalla de inicio del celular.
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Constela',
        short_name: 'Constela',
        description: 'Tracker personal de hábitos: gimnasio, nutrición y más',
        theme_color: '#0F0F12',
        background_color: '#0F0F12',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
        ]
      },
      workbox: {
        // Cachea todos los assets generados para uso offline total.
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}']
      }
    })
  ]
})

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'robots.txt', 'apple-touch-icon.png'],
      manifest: {
        name: 'App',
        short_name: 'App',
        description: 'Modern digital business card platform',
        theme_color: '#000000',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      },
      workbox: {
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            // Cache public card data: NetworkFirst with 3s timeout fallback to cache
            urlPattern: /\/api\/public\/card\//,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'card-api-cache',
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 300,
              },
              networkTimeoutSeconds: 3,
            }
          }
        ]
      }
    })
  ],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3301',
        changeOrigin: true
      }
    }
  },
  preview: {
    host: '0.0.0.0',
    allowedHosts: ['frontend-production-cf7e.up.railway.app', '.up.railway.app']
  }
})

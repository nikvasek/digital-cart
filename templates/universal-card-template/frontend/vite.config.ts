import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'robots.txt', 'apple-touch-icon.png'],
      manifest: false,
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

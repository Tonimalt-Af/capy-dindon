import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: '/capy-dindon/',
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/icon-192.png', 'icons/icon-512.png'],
      manifest: {
        name: 'CapyDindon',
        short_name: 'CapyDindon',
        description: 'Aide Capy à devenir le légendaire CapyDindon.',
        lang: 'fr',
        dir: 'ltr',
        start_url: '/capy-dindon/',
        scope: '/capy-dindon/',
        display: 'standalone',
        orientation: 'landscape',
        background_color: '#2f86d8',
        theme_color: '#c47c3c',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff,woff2}', 'assets/art/characters/*.webp'],
        globIgnores: ['**/assets/art/scenes/**', '**/assets/art/props/**'],
        navigateFallback: '/capy-dindon/index.html',
        navigateFallbackDenylist: [/^\/capy-dindon\/assets\//],
        runtimeCaching: [
          {
            urlPattern: /\/assets\/art\/scenes\/.+\.webp$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'capy-scenes',
              expiration: { maxEntries: 32, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /\/assets\/art\/props\/.+\.webp$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'capy-props',
              expiration: { maxEntries: 24, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  build: {
    target: 'es2022',
    sourcemap: false,
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('node_modules/three')) return 'three';
          return undefined;
        },
      },
    },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
  preview: {
    port: 4173,
    strictPort: true,
  },
});

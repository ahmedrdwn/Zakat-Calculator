import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    preact(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['logo.svg', 'icons/apple-touch-icon.png'],
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // Cache Google Fonts CSS + WOFF2 files so the app renders offline.
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'google-fonts-css' },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
        // Don't try to precache the huge sourcemap
        globIgnores: ['**/*.map'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      },
      manifest: {
        name: 'البنك الشخصي — Personal Bank',
        short_name: 'البنك الشخصي',
        description: 'سجل ثروتك عبر جميع حساباتك واحتسب الزكاة بدقة تراعي الحول لكل بند.',
        lang: 'ar',
        dir: 'rtl',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'any',
        background_color: '#0D1B12',
        theme_color: '#0D1B12',
        categories: ['finance', 'productivity', 'lifestyle'],
        icons: [
          {
            src: 'logo.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any',
          },
          {
            src: 'icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: 'icons/apple-touch-icon.png',
            sizes: '180x180',
            type: 'image/png',
            purpose: 'any',
          },
        ],
      },
    }),
  ],
  base: './',
  build: { target: 'es2020', sourcemap: true },
});

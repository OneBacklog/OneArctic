import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: process.env.NODE_ENV !== 'production' },

  app: {
    head: {
      title: 'OneArctic',
      link: [{ rel: 'manifest', href: '/manifest.json' }],
    },
  },

  modules: ['@vite-pwa/nuxt', '@nuxtjs/color-mode'],

  colorMode: {
    classSuffix: '',
    preference: 'dark',
    fallback: 'dark',
  },

  vite: {
    optimizeDeps: {
      include: [
        '@vue/devtools-core',
        '@vue/devtools-kit',
        'workbox-window',
        'nanoid',
      ]
    },
    plugins: tailwindcss() as any,
  },

  css: ['~/assets/css/main.css'],

  nitro: {
    experimental: {
      tasks: true,
    },
    scheduledTasks: {},
  },

  runtimeConfig: {
    jwtSecret: process.env.JWT_SECRET,
    meilisearchHost: process.env.MEILISEARCH_HOST,
    meilisearchApiKey: process.env.MEILI_MASTER_KEY,
    databasePath: process.env.DATABASE_PATH,
    filesPath: process.env.FILES_PATH,
    public: {
      appName: 'OneArctic',
    },
  },

  pwa: {
    registerType: 'autoUpdate',
    manifestFilename: 'manifest.json',
    manifest: {
      name: 'OneArctic Note',
      short_name: 'OneArctic',
      description: 'Personal Note-Taking App',
      theme_color: '#3B4252',
      background_color: '#3B4252',
      display: 'standalone',
      start_url: '/',
      orientation: 'portrait',
      icons: [
        { src: '/icon.png', sizes: '512x512', type: 'image/png' },
        { src: '/icon.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    },
    workbox: {
      navigateFallback: null,
      globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
      disableDevLogs: true,
      navigationPreload: false,
      runtimeCaching: [
        {
          urlPattern: ({ request }) => request.mode === 'navigate',
          handler: 'NetworkFirst',
          options: {
            cacheName: 'pages',
            networkTimeoutSeconds: 10,
            cacheableResponse: { statuses: [0, 200] },
          },
        },
        {
          urlPattern: /^\/api\/notes/,
          handler: 'NetworkFirst',
          options: {
            cacheName: 'api-notes',
            networkTimeoutSeconds: 10,
            cacheableResponse: { statuses: [0, 200] },
          },
        },
        {
          urlPattern: /^\/api\/labels/,
          handler: 'NetworkFirst',
          options: {
            cacheName: 'api-labels',
            networkTimeoutSeconds: 10,
            cacheableResponse: { statuses: [0, 200] },
          },
        },
        {
          urlPattern: /^\/api\/files\//,
          handler: 'NetworkOnly',
        },
      ],
      cleanupOutdatedCaches: true,
    },
    client: {
      installPrompt: true,
    },
    devOptions: {
      enabled: process.env.NODE_ENV !== 'production',
    },
  },
})

export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',
  ssr: false,
  devtools: { enabled: false },
  css: ['~/assets/css/main.css'],
  app: {
    head: {
      title: 'Moment — Lo bueno está por venir',
      htmlAttrs: { lang: 'es' },
      meta: [
        { name: 'application-name', content: 'Moment' },
        { name: 'theme-color', content: '#fafbf7' },
        { name: 'mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-title', content: 'Moment' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'default' },
        {
          name: 'description',
          content:
            'Un lugar para guardar las fechas que te hacen ilusión. Crea cuentas atrás privadas en tu navegador.',
        },
      ],
      link: [
        { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' },
        { rel: 'manifest', href: '/manifest.webmanifest' },
        {
          rel: 'apple-touch-icon',
          href: '/apple-touch-icon.png',
          sizes: '180x180',
        },
      ],
    },
  },
})

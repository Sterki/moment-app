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
        {
          name: 'description',
          content:
            'Un lugar para guardar las fechas que te hacen ilusión. Crea cuentas atrás privadas en tu navegador.',
        },
      ],
      link: [{ rel: 'icon', href: '/favicon.svg' }],
    },
  },
})

import type { CountdownEvent } from '~/types/event'
const STORAGE_KEY = 'moment.events.v1'
export function useEvents() {
  const events = ref<CountdownEvent[]>([])
  const storageError = ref('')
  const now = ref(Date.now())
  let timer: ReturnType<typeof setInterval>
  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(events.value))
      storageError.value = ''
    } catch {
      storageError.value =
        'No se pudo guardar en este navegador. Tus cambios solo estarán disponibles durante esta sesión.'
    }
  }
  onMounted(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved !== null) {
        const parsed: unknown = JSON.parse(saved)
        if (
          !Array.isArray(parsed) ||
          !parsed.every(
            (e) =>
              e &&
              typeof e.id === 'string' &&
              typeof e.title === 'string' &&
              typeof e.date === 'string' &&
              Number.isFinite(Date.parse(e.date)) &&
              typeof e.category === 'string' &&
              typeof e.note === 'string' &&
              typeof e.favorite === 'boolean' &&
              typeof e.createdAt === 'number',
          )
        )
          throw new Error('Invalid events')
        events.value = parsed
      } else {
        const future = (days: number) => {
          const d = new Date()
          d.setDate(d.getDate() + days)
          d.setHours(12, 0, 0, 0)
          return d.toISOString()
        }
        events.value = [
          {
            id: crypto.randomUUID(),
            title: 'Mi próximo cumpleaños',
            date: future(24),
            category: 'birthday',
            note: 'Una vuelta más al sol. Y muchos motivos para celebrar.',
            favorite: true,
            createdAt: Date.now(),
          },
          {
            id: crypto.randomUUID(),
            title: 'Escapada a la playa',
            date: future(48),
            category: 'travel',
            note: 'Sol, mar y desconectar un poquito.',
            favorite: false,
            createdAt: Date.now(),
          },
          {
            id: crypto.randomUUID(),
            title: 'Año Nuevo',
            date: new Date(new Date().getFullYear() + 1, 0, 1).toISOString(),
            category: 'celebration',
            note: 'Nuevos comienzos, nuevas historias.',
            favorite: false,
            createdAt: Date.now(),
          },
        ]
        persist()
      }
    } catch {
      storageError.value =
        'No pudimos leer los eventos guardados. No sobrescribiremos tus datos hasta que hagas un cambio.'
    }
    timer = setInterval(() => {
      now.value = Date.now()
    }, 1000)
  })
  onUnmounted(() => clearInterval(timer))
  function save(event: CountdownEvent) {
    const index = events.value.findIndex((e) => e.id === event.id)
    if (index < 0) events.value.push(event)
    else events.value[index] = event
    persist()
  }
  function remove(id: string) {
    events.value = events.value.filter((e) => e.id !== id)
    persist()
  }
  function toggleFavorite(id: string) {
    const event = events.value.find((e) => e.id === id)
    if (event) {
      event.favorite = !event.favorite
      persist()
    }
  }
  return { events, now, storageError, save, remove, toggleFavorite }
}

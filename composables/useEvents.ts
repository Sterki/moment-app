import type { CountdownEvent } from '~/types/event'
import { validEvents } from '~/utils/momentDatabase'
export function useEvents() {
  const {
    items: events,
    error: storageError,
    loading,
    saving,
    mutate,
  } = useMomentCollection('events', [])
  const now = ref(Date.now())
  let timer: ReturnType<typeof setInterval>
  onMounted(() => {
    timer = setInterval(() => {
      now.value = Date.now()
    }, 1000)
  })
  onUnmounted(() => clearInterval(timer))
  const save = (event: CountdownEvent) =>
    mutate((store) => {
      if (!validEvents([event])) throw new Error('Invalid event')
      // Store one event; never replace the whole list from a stale view.
      store.put({ ...event })
    })
  const remove = (id: string) =>
    mutate((store) => {
      store.delete(id)
    })
  const toggleFavorite = (id: string) =>
    mutate((store) => {
      const request = store.get(id)
      request.onsuccess = () => {
        if (request.result)
          store.put({ ...request.result, favorite: !request.result.favorite })
      }
    })
  return {
    events,
    now,
    storageError,
    loading,
    saving,
    save,
    remove,
    toggleFavorite,
  }
}

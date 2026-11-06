import {
  readMomentData,
  changeMomentData,
  type Collection,
  type MomentData,
} from '~/utils/momentDatabase'

export function useMomentCollection<K extends Collection>(
  collection: K,
  initial: MomentData[K],
) {
  const items = shallowRef<MomentData[K]>(initial)
  const error = ref('')
  const loading = ref(true)
  const saving = ref(false)
  let channel: BroadcastChannel | undefined
  let sequence = 0
  let disposed = false
  async function refresh() {
    const revision = ++sequence
    try {
      const data = await readMomentData()
      if (disposed || revision !== sequence) return
      items.value = data[collection]
      error.value = ''
    } catch {
      if (!disposed && revision === sequence)
        error.value =
          'No pudimos abrir tus datos guardados. No se han reemplazado. Cierra otras pestañas de Moment y vuelve a intentarlo.'
    } finally {
      if (!disposed && revision === sequence) loading.value = false
    }
  }
  function onVisible() {
    if (document.visibilityState === 'visible') void refresh()
  }
  onMounted(() => {
    try {
      channel = new BroadcastChannel('moment-data')
      channel.onmessage = () => {
        void refresh()
      }
    } catch {
      /* pageshow and visibilitychange also refresh on older browsers. */
    }
    window.addEventListener('moment-data-change', refresh)
    window.addEventListener('pageshow', refresh)
    document.addEventListener('visibilitychange', onVisible)
    void refresh()
  })
  onUnmounted(() => {
    disposed = true
    channel?.close()
    window.removeEventListener('moment-data-change', refresh)
    window.removeEventListener('pageshow', refresh)
    document.removeEventListener('visibilitychange', onVisible)
  })
  async function mutate(change: (store: IDBObjectStore) => void) {
    if (saving.value || loading.value) return false
    saving.value = true
    try {
      await changeMomentData(collection, change)
      // Inform other views only after the commit, including nested category forms.
      window.dispatchEvent(new Event('moment-data-change'))
      try {
        channel?.postMessage('changed')
      } catch {
        /* A closed channel must not turn a committed write into a failure. */
      }
      await refresh()
      try {
        void navigator.storage?.persist?.().catch(() => {})
      } catch {
        /* Optional. */
      }
      return true
    } catch {
      error.value =
        'No se pudo guardar el cambio. Conserva el formulario abierto y vuelve a intentarlo. No se ha confirmado el guardado.'
      return false
    } finally {
      saving.value = false
    }
  }
  return { items, error, loading, saving, mutate }
}

import { defaultAppearance, type Appearance } from '~/types/appearance'
import {
  readAppearancePreferences,
  writeAppearancePreferences,
} from '~/utils/momentDatabase'
export function useAppearance() {
  const saved = ref<Appearance>({ ...defaultAppearance })
  const draft = ref<Appearance>()
  const appearance = computed(() => draft.value || saved.value)
  const loading = ref(true)
  const saving = ref(false)
  const error = ref('')
  let channel: BroadcastChannel | undefined
  let disposed = false
  let revision = 0
  async function load() {
    const current = ++revision
    try {
      const value = await readAppearancePreferences()
      if (!disposed && revision === current) {
        saved.value = value || { ...defaultAppearance }
        error.value = ''
      }
    } catch {
      if (!disposed && revision === current)
        error.value =
          'No se pudo leer tu apariencia. Puedes volver a guardar tus preferencias.'
    } finally {
      if (!disposed) loading.value = false
    }
  }
  function preview(value: Appearance) {
    draft.value = { ...value }
  }
  function cancel() {
    draft.value = undefined
  }
  async function save(value: Appearance) {
    if (saving.value) return false
    saving.value = true
    try {
      await writeAppearancePreferences(value)
      ++revision
      saved.value = { ...value }
      draft.value = undefined
      error.value = ''
      try {
        channel?.postMessage('changed')
      } catch {
        /* Already committed. */
      }
      return true
    } catch {
      error.value =
        'No se pudo guardar la apariencia. Conserva este menú abierto y vuelve a intentarlo.'
      return false
    } finally {
      saving.value = false
    }
  }
  function onVisible() {
    if (document.visibilityState === 'visible') void load()
  }
  onMounted(() => {
    void load()
    try {
      channel = new BroadcastChannel('moment-appearance')
      channel.onmessage = () => {
        void load()
      }
    } catch {
      /* Optional. */
    }
    document.addEventListener('visibilitychange', onVisible)
  })
  onUnmounted(() => {
    disposed = true
    channel?.close()
    document.removeEventListener('visibilitychange', onVisible)
  })
  return { appearance, saved, loading, saving, error, preview, cancel, save }
}

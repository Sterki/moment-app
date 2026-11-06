<script setup lang="ts">
import { createId } from '~/utils/createId'
import { X, ArrowRight, Palette } from 'lucide-vue-next'
import type { CountdownEvent } from '~/types/event'
import type { EventCategory } from '~/types/category'
const props = defineProps<{
  storageError?: string
  saving?: boolean
  saveCategory: (category: EventCategory) => Promise<boolean>
  event?: CountdownEvent
  categories: EventCategory[]
}>()
const emit = defineEmits<{
  close: []
  save: [event: CountdownEvent]
}>()
const dialog = ref<HTMLDialogElement>()
const localDate = (value: string) => {
  const d = new Date(value)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
const title = ref(props.event?.title || '')
const date = ref(props.event ? localDate(props.event.date) : '')
const category = ref(props.event?.category || props.categories[0]!.id)
const managingCategories = ref(false)
const note = ref(props.event?.note || '')
const { onBackdropPointerDown, onBackdropClick } = useModalDialog(
  dialog,
  () => !props.saving && emit('close'),
)
function submit() {
  if (props.saving) return
  if (!title.value.trim() || !date.value) return
  emit('save', {
    id: props.event?.id || createId(),
    title: title.value.trim(),
    date: new Date(date.value).toISOString(),
    category: category.value,
    note: note.value.trim(),
    favorite: props.event?.favorite || false,
    createdAt: props.event?.createdAt || Date.now(),
  })
}
</script>
<template>
  <dialog
    ref="dialog"
    class="modal"
    aria-labelledby="event-modal-title"
    tabindex="-1"
    @close="emit('close')"
    @cancel="saving && $event.preventDefault()"
    @pointerdown="onBackdropPointerDown"
    @click="onBackdropClick"
  >
    <form @submit.prevent="submit">
      <div class="modal-heading">
        <span class="eyebrow">UN NUEVO MOTIVO PARA SONREÍR</span
        ><button
          type="button"
          class="icon-button"
          aria-label="Cerrar"
          :disabled="saving"
          @click="emit('close')"
        >
          <X :size="21" />
        </button>
      </div>
      <h2 id="event-modal-title">
        {{ event ? 'Edita tu momento' : 'Algo bonito se acerca.' }}
      </h2>
      <p>Dale un lugar a esa fecha especial.</p>
      <label
        >Nombre del evento<input
          v-model="title"
          required
          maxlength="70"
          placeholder="Ej. Mi próximo gran viaje"
      /></label>
      <label
        >Fecha y hora<input v-model="date" type="datetime-local" required
      /></label>
      <fieldset>
        <legend>Categoría</legend>
        <div class="category-picker">
          <button
            v-for="c in categories"
            :key="c.id"
            type="button"
            :class="{ active: category === c.id }"
            @click="category = c.id"
          >
            <CategorySymbol :symbol="c.emoji" :size="17" /> {{ c.label }}
          </button>
        </div>
        <button
          type="button"
          class="text-button manage-from-event"
          @click="managingCategories = true"
        >
          <Palette :size="14" />Personalizar categorías
        </button>
      </fieldset>
      <label
        >Una pequeña nota <span class="optional">(opcional)</span
        ><textarea
          v-model="note"
          maxlength="160"
          placeholder="¿Qué hace especial este momento?"
          rows="2"
        />
      </label>
      <p v-if="storageError" class="storage-warning" role="alert">
        {{ storageError }}
      </p>
      <button
        class="primary modal-submit"
        type="submit"
        :disabled="saving"
        :aria-busy="saving"
      >
        {{
          saving
            ? 'Guardando…'
            : event
              ? 'Guardar cambios'
              : 'Crear mi cuenta atrás'
        }}<ArrowRight :size="18" />
      </button>
    </form>
    <CategoryManager
      v-if="managingCategories"
      :categories="categories"
      @close="managingCategories = false"
      :save-category="saveCategory"
    />
  </dialog>
</template>

<script setup lang="ts">
import { X, Plus, Pencil, Check, ArrowLeft, Palette } from 'lucide-vue-next'
import {
  categoryColors,
  type EventCategory,
  type CategoryColor,
} from '~/types/category'
import { symbols, emojiSymbols } from '~/types/symbols'
const props = defineProps<{ categories: EventCategory[] }>()
const emit = defineEmits<{ close: []; save: [category: EventCategory] }>()
const dialog = ref<HTMLDialogElement>()
const editing = ref(false)
const selectedId = ref('')
const name = ref('')
const symbol = ref('sparkles')
const color = ref<CategoryColor>('lavender')
const error = ref('')
const savedMessage = ref('')
const symbolTab = ref('icons')
const preview = computed(() => ({
  label: name.value.trim() || 'Tu nueva categoría',
  emoji: symbol.value,
  color: color.value,
}))
onMounted(() => dialog.value?.showModal())
function edit(category?: EventCategory) {
  selectedId.value = category?.id || ''
  name.value = category?.label || ''
  symbol.value = category?.emoji || 'sparkles'
  color.value = category?.color || 'lavender'
  symbolTab.value = symbols.some((s) => s.id === symbol.value)
    ? 'icons'
    : 'emoji'
  error.value = ''
  savedMessage.value = ''
  editing.value = true
}
function submit() {
  const label = name.value.trim()
  if (!label) {
    error.value = 'Dale un nombre a tu categoría.'
    return
  }
  if (
    props.categories.some(
      (c) =>
        c.id !== selectedId.value &&
        c.label.toLocaleLowerCase('es') === label.toLocaleLowerCase('es'),
    )
  ) {
    error.value = 'Ya tienes una categoría con ese nombre.'
    return
  }
  emit('save', {
    id: selectedId.value || crypto.randomUUID(),
    label,
    emoji: symbol.value,
    color: color.value,
  })
  savedMessage.value = selectedId.value
    ? 'Categoría actualizada. Sus eventos también lucen el nuevo estilo.'
    : 'Categoría creada. Ya puedes usarla en tus eventos.'
  editing.value = false
}
</script>
<template>
  <dialog
    ref="dialog"
    class="modal category-manager"
    aria-labelledby="categories-title"
    @close="emit('close')"
    @click="
      (e) => {
        if (e.target === dialog) emit('close')
      }
    "
  >
    <div class="modal-heading">
      <span class="eyebrow"><Palette :size="13" /> UN TOQUE MUY TUYO</span
      ><button
        type="button"
        class="icon-button"
        aria-label="Cerrar categorías"
        @click="emit('close')"
      >
        <X :size="21" />
      </button>
    </div>
    <h2 id="categories-title">
      {{
        editing
          ? selectedId
            ? 'Rediseña tu categoría.'
            : 'Una categoría, tu estilo.'
          : 'Organiza tus ilusiones.'
      }}
    </h2>
    <p class="manager-description">
      {{
        editing
          ? 'Elige un símbolo y un color que cuenten su historia.'
          : 'Pequeños detalles que hacen cada momento más tuyo.'
      }}
    </p>
    <template v-if="!editing">
      <p v-if="savedMessage" class="category-success" role="status">
        <Check :size="16" />{{ savedMessage }}
      </p>
      <div class="managed-categories">
        <button
          v-for="category in categories"
          :key="category.id"
          type="button"
          class="managed-category"
          :aria-label="`Editar categoría ${category.label}`"
          @click="edit(category)"
        >
          <span class="category-swatch" :class="category.color"
            ><CategorySymbol :symbol="category.emoji" :size="23" /></span
          ><span>{{ category.label }}</span
          ><Pencil :size="15" />
        </button>
      </div>
      <button class="primary modal-submit" type="button" @click="edit()">
        <Plus :size="17" />Nueva categoría
      </button>
    </template>
    <form v-else @submit.prevent="submit">
      <div class="category-preview" :class="preview.color">
        <span class="preview-orbit orbit-a" /><span
          class="preview-orbit orbit-b"
        /><span class="category-swatch"
          ><CategorySymbol :symbol="preview.emoji" :size="29" /></span
        ><strong>{{ preview.label }}</strong
        ><span class="eyebrow">ASÍ SE VERÁ TU CATEGORÍA</span>
      </div>
      <label
        >Nombre<input
          v-model="name"
          required
          maxlength="32"
          placeholder="Ej. Conciertos, aniversarios, metas…"
          @input="error = ''"
      /></label>
      <fieldset>
        <legend>Elige su color</legend>
        <div class="color-options">
          <button
            v-for="c in categoryColors"
            :key="c.id"
            type="button"
            class="color-option"
            :class="[c.id, { active: color === c.id }]"
            :aria-label="c.label"
            :aria-pressed="color === c.id"
            :title="c.label"
            @click="color = c.id"
          >
            <Check v-if="color === c.id" :size="17" />
          </button>
        </div>
      </fieldset>
      <fieldset>
        <legend class="symbol-legend">
          <span>Un símbolo con personalidad</span
          ><span class="symbol-tabs"
            ><button
              type="button"
              :class="{ active: symbolTab === 'icons' }"
              :aria-pressed="symbolTab === 'icons'"
              @click="symbolTab = 'icons'"
            >
              Iconos</button
            ><button
              type="button"
              :class="{ active: symbolTab === 'emoji' }"
              :aria-pressed="symbolTab === 'emoji'"
              @click="symbolTab = 'emoji'"
            >
              Emojis
            </button></span
          >
        </legend>
        <div v-if="symbolTab === 'icons'" class="symbol-grid" :class="color">
          <button
            v-for="s in symbols"
            :key="s.id"
            type="button"
            :class="{ active: symbol === s.id }"
            :aria-label="s.label"
            :aria-pressed="symbol === s.id"
            :title="s.label"
            @click="symbol = s.id"
          >
            <CategorySymbol :symbol="s.id" :size="23" />
          </button>
        </div>
        <div v-else class="symbol-grid" :class="color">
          <button
            v-for="emoji in emojiSymbols"
            :key="emoji"
            type="button"
            :class="{ active: symbol === emoji }"
            :aria-label="emoji"
            :aria-pressed="symbol === emoji"
            @click="symbol = emoji"
          >
            <CategorySymbol :symbol="emoji" />
          </button>
        </div>
      </fieldset>
      <p v-if="error" class="category-form-error" role="alert">{{ error }}</p>
      <div class="category-form-actions">
        <button type="button" class="text-button" @click="editing = false">
          <ArrowLeft :size="15" />Volver</button
        ><button type="submit" class="primary">
          <Check :size="17" />{{
            selectedId ? 'Guardar cambios' : 'Crear categoría'
          }}
        </button>
      </div>
    </form>
  </dialog>
</template>

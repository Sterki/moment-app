<script setup lang="ts">
import { Search, Check } from 'lucide-vue-next'
import {
  emojiGroups,
  normalizeEmojiSearch,
  isEmojiSymbol,
} from '~/types/emojis'
const props = defineProps<{ modelValue: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
const search = ref('')
const group = ref('all')
const custom = ref(isEmojiSymbol(props.modelValue) ? props.modelValue : '')
const customError = ref('')
const filtered = computed(() => {
  const query = normalizeEmojiSearch(search.value)
  return emojiGroups
    .filter((g) => group.value === 'all' || group.value === g.id)
    .map((g) => ({
      ...g,
      items: g.items.filter(
        (item) =>
          !query ||
          normalizeEmojiSearch(
            `${g.label} ${item.label} ${item.emoji}`,
          ).includes(query),
      ),
    }))
    .filter((g) => g.items.length)
})
function applyCustom() {
  const value = custom.value.trim()
  if (!isEmojiSymbol(value)) {
    customError.value = 'Introduce un solo emoji, por ejemplo 🎂 o 👩🏽‍💻.'
    return
  }
  customError.value = ''
  emit('update:modelValue', value)
}
</script>
<template>
  <div class="emoji-picker">
    <label class="emoji-search"
      ><Search :size="16" /><input
        v-model="search"
        type="search"
        placeholder="Busca: viaje, trabajo, amor…"
        aria-label="Buscar emojis"
        @keydown.enter.prevent
    /></label>
    <label class="emoji-group-label"
      >Grupo<select v-model="group" aria-label="Grupo de emojis">
        <option value="all">Todos los grupos</option>
        <option v-for="g in emojiGroups" :key="g.id" :value="g.id">
          {{ g.label }}
        </option>
      </select></label
    >
    <div class="emoji-results" tabindex="0" aria-label="Resultados de emojis">
      <section v-for="g in filtered" :key="g.id" class="emoji-group">
        <h3>{{ g.label }}</h3>
        <div class="symbol-grid">
          <button
            v-for="item in g.items"
            :key="item.emoji"
            type="button"
            :class="{ active: modelValue === item.emoji }"
            :aria-label="item.label"
            :aria-pressed="modelValue === item.emoji"
            :title="item.label"
            @click="emit('update:modelValue', item.emoji)"
          >
            <CategorySymbol :symbol="item.emoji" :size="23" />
          </button>
        </div>
      </section>
      <p v-if="!filtered.length" class="appearance-hint" role="status">
        No encontramos emojis. Prueba otra palabra o usa uno de tu teclado.
      </p>
    </div>
    <div class="custom-emoji">
      <label
        >O pega un emoji de tu teclado<input
          v-model="custom"
          maxlength="64"
          placeholder="Ej. 🧑🏽‍🚀"
          aria-label="Emoji personalizado"
          @input="customError = ''"
          @keydown.enter.prevent="applyCustom" /></label
      ><button type="button" class="secondary" @click="applyCustom">
        <Check :size="15" />Usar emoji
      </button>
    </div>
    <p v-if="customError" class="category-form-error" role="alert">
      {{ customError }}
    </p>
    <p class="emoji-selected" aria-live="polite">
      Símbolo elegido: <CategorySymbol :symbol="modelValue" :size="23" />
    </p>
  </div>
</template>

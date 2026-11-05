<script setup lang="ts">
import {
  Star,
  ArrowUpRight,
  CalendarDays,
  Pencil,
  Trash2,
} from 'lucide-vue-next'
import { remaining, formatDate, type CountdownEvent } from '~/types/event'
import type { EventCategory } from '~/types/category'
const props = defineProps<{
  event: CountdownEvent
  now: number
  category: EventCategory
}>()
defineEmits<{
  favorite: [id: string]
  edit: [event: CountdownEvent]
  delete: [event: CountdownEvent]
}>()
const countdown = computed(() => remaining(props.event.date, props.now))
const finished = computed(
  () => new Date(props.event.date).getTime() <= props.now,
)
</script>
<template>
  <article class="event-card" :class="category.color">
    <div class="card-top">
      <span class="event-emoji"
        ><CategorySymbol :symbol="category.emoji" :size="25" /></span
      ><button
        class="icon-button favorite"
        :class="{ selected: event.favorite }"
        :aria-label="
          event.favorite ? 'Quitar de favoritos' : 'Añadir a favoritos'
        "
        :aria-pressed="event.favorite"
        @click="$emit('favorite', event.id)"
      >
        <Star :size="19" />
      </button>
    </div>
    <span class="eyebrow category-label">{{ category.label }}</span>
    <h3>{{ event.title }}</h3>
    <p class="event-date">
      <CalendarDays :size="14" />{{ formatDate(event.date) }}
    </p>
    <div class="card-countdown">
      <template v-if="!finished"
        ><strong>{{ countdown[0] }}</strong
        ><span>días para<br />crear recuerdos</span></template
      ><template v-else
        ><strong class="celebrate">¡Llegó el día!</strong
        ><span>Un momento para recordar ✨</span></template
      ><ArrowUpRight v-if="!finished" :size="27" class="card-arrow" />
    </div>
    <div class="card-bottom">
      <span>{{ event.note || 'Algo bonito está por venir.' }}</span>
      <div class="card-actions">
        <button
          class="icon-button"
          aria-label="Editar evento"
          @click="$emit('edit', event)"
        >
          <Pencil :size="15" /></button
        ><button
          class="icon-button"
          aria-label="Eliminar evento"
          @click="$emit('delete', event)"
        >
          <Trash2 :size="15" />
        </button>
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
import {
  Hourglass,
  Plus,
  ArrowUpRight,
  Sparkles,
  Search,
  ChevronDown,
  Heart,
  ShieldCheck,
  X,
  CalendarDays,
  Star,
  LayoutGrid,
  Check,
  Palette,
} from 'lucide-vue-next'
import { remaining, formatDate, type CountdownEvent } from '~/types/event'
const { events, now, storageError, save, remove, toggleFavorite } = useEvents()
const { categories, categoryError, saveCategory, categoryFor } = useCategories()
const categoriesOpen = ref(false)
const tab = ref('upcoming')
const search = ref('')
const category = ref('all')
const sort = ref('date')
const modalOpen = ref(false)
const editing = ref<CountdownEvent>()
const deleting = ref<CountdownEvent>()
const deleteDialog = ref<HTMLDialogElement>()
watch(deleting, async (event) => {
  if (event) {
    await nextTick()
    deleteDialog.value?.showModal()
  }
})
const toast = ref('')
let toastTimer: ReturnType<typeof setTimeout>
const upcoming = computed(() =>
  events.value
    .filter((e) => new Date(e.date).getTime() > now.value)
    .sort((a, b) => Date.parse(a.date) - Date.parse(b.date)),
)
const featured = computed(
  () => upcoming.value.find((e) => e.favorite) || upcoming.value[0],
)
const countdown = computed(() =>
  featured.value ? remaining(featured.value.date, now.value) : [0, 0, 0, 0],
)
const pastCount = computed(() => events.value.length - upcoming.value.length)
const visible = computed(() =>
  events.value
    .filter((e) => {
      const past = Date.parse(e.date) <= now.value
      return (
        (tab.value === 'past'
          ? past
          : tab.value === 'favorites'
            ? e.favorite
            : !past) &&
        (category.value === 'all' || e.category === category.value) &&
        e.title
          .toLocaleLowerCase('es')
          .includes(search.value.toLocaleLowerCase('es'))
      )
    })
    .sort((a, b) =>
      sort.value === 'name'
        ? a.title.localeCompare(b.title, 'es')
        : sort.value === 'newest'
          ? b.createdAt - a.createdAt
          : Date.parse(a.date) - Date.parse(b.date),
    ),
)
function open(event?: CountdownEvent) {
  editing.value = event
  modalOpen.value = true
}
function notify(message: string) {
  toast.value = message
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => {
    toast.value = ''
  }, 3000)
}
function onSave(event: CountdownEvent) {
  save(event)
  modalOpen.value = false
  notify(
    editing.value ? 'Momento actualizado' : 'Tu nuevo momento está guardado',
  )
}
function resetFilters() {
  search.value = ''
  category.value = 'all'
  tab.value = 'upcoming'
}
function onDelete() {
  if (deleting.value) remove(deleting.value.id)
  deleting.value = undefined
  notify('Evento eliminado')
}
onUnmounted(() => clearTimeout(toastTimer))
</script>
<template>
  <div class="site-shell">
    <AmbientBackground />
    <header class="site-header">
      <a class="brand" href="#" aria-label="Moment, inicio"
        ><span class="brand-icon"
          ><Hourglass :size="23" stroke-width="1.7" /></span
        >moment<span class="brand-dot">.</span></a
      ><span class="header-tagline"
        >Las mejores cosas merecen una cuenta atrás.</span
      >
      <div class="local-badge"><span />Tu pequeño espacio personal</div>
    </header>
    <main>
      <section class="intro">
        <div>
          <div class="eyebrow intro-eyebrow">
            <span /> COLECCIONA ILUSIONES, NO SOLO FECHAS
          </div>
          <h1>
            Lo bueno está <span>por venir.</span
            ><svg class="title-spark" viewBox="0 0 44 44" fill="none">
              <path
                d="M22 2v12M22 30v12M2 22h12M30 22h12M7 7l9 9M28 28l9 9M7 37l9-9M28 16l9-9"
                stroke="currentColor"
                stroke-width="2.5"
                stroke-linecap="round"
              />
            </svg>
          </h1>
          <p>
            Un cumpleaños, ese viaje soñado o un nuevo comienzo.<br />Haz
            espacio para los momentos que importan.
          </p>
        </div>
        <button class="primary" @click="open()">
          <Plus :size="19" />Crear evento
        </button>
      </section>
      <section class="hero" :class="{ 'hero-empty': !featured }">
        <div class="hero-copy">
          <span class="hero-pill"
            ><Sparkles :size="13" />{{
              featured ? 'EN EL HORIZONTE' : 'TU PRÓXIMO GRAN MOMENTO'
            }}</span
          >
          <h2>{{ featured?.title || 'Todo empieza con una ilusión.' }}</h2>
          <p v-if="featured">
            <CalendarDays :size="15" />{{ formatDate(featured.date)
            }}<span class="hero-date-dot">·</span
            >{{ featured.note || 'Cada segundo, un poquito más cerca.' }}
          </p>
          <p v-else>Crea un evento y empieza a contar los buenos momentos.</p>
          <button class="hero-link" @click="open(featured)">
            {{ featured ? 'Ver mi evento' : 'Crear un evento'
            }}<ArrowUpRight :size="16" />
          </button>
        </div>
        <div v-if="featured" class="hero-timer" aria-label="Tiempo restante">
          <div
            v-for="(label, i) in ['DÍAS', 'HORAS', 'MINUTOS', 'SEGUNDOS']"
            :key="label"
            class="timer-unit"
          >
            <div class="timer-number">
              <Transition name="tick" mode="out-in"
                ><span :key="countdown[i]">{{
                  String(countdown[i]).padStart(2, '0')
                }}</span></Transition
              >
            </div>
            <span class="timer-label">{{ label }}</span>
          </div>
        </div>
        <div class="hero-decoration orb-one" />
        <div class="hero-decoration orb-two" />
        <span class="hero-star star-one">✳</span
        ><span class="hero-star star-two">✦</span>
      </section>
      <section class="events-section">
        <div class="section-heading">
          <h2>
            Tus momentos<span>{{ events.length }}</span>
          </h2>
          <span class="section-note">Pequeñas esperas. Grandes emociones.</span>
        </div>
        <div class="event-toolbar">
          <div class="tabs" role="tablist" aria-label="Filtrar eventos">
            <button
              v-for="t in [
                {
                  id: 'upcoming',
                  label: 'Próximos',
                  icon: LayoutGrid,
                  count: upcoming.length,
                },
                {
                  id: 'favorites',
                  label: 'Favoritos',
                  icon: Star,
                  count: events.filter((e) => e.favorite).length,
                },
                {
                  id: 'past',
                  label: 'Pasados',
                  icon: CalendarDays,
                  count: pastCount,
                },
              ]"
              :key="t.id"
              role="tab"
              :aria-selected="tab === t.id"
              :class="{ active: tab === t.id }"
              @click="tab = t.id"
            >
              <component :is="t.icon" :size="15" />{{ t.label
              }}<span>{{ t.count }}</span>
            </button>
          </div>
          <label class="sort-control"
            ><span>Ordenar por:</span
            ><select v-model="sort" aria-label="Ordenar eventos">
              <option value="date">Más cercanos</option>
              <option value="name">Nombre</option>
              <option value="newest">Más recientes</option></select
            ><ChevronDown :size="14"
          /></label>
        </div>
        <div class="category-tools">
          <button
            type="button"
            class="manage-categories-button"
            @click="categoriesOpen = true"
          >
            <Palette :size="15" />Personalizar categorías
          </button>
        </div>
        <div class="filters">
          <div class="category-filters">
            <button
              :class="{ active: category === 'all' }"
              @click="category = 'all'"
            >
              Todos</button
            ><button
              v-for="c in categories"
              :key="c.id"
              :class="{ active: category === c.id }"
              @click="category = c.id"
            >
              <span>{{ c.emoji }}</span
              >{{ c.label }}
            </button>
          </div>
          <label class="search"
            ><Search :size="16" /><input
              v-model="search"
              placeholder="Buscar un momento…"
              aria-label="Buscar eventos" /><button
              v-if="search"
              class="icon-button"
              aria-label="Borrar búsqueda"
              @click="search = ''"
            >
              <X :size="14" /></button
          ></label>
        </div>
        <p
          v-if="storageError || categoryError"
          class="storage-warning"
          role="alert"
        >
          {{ storageError || categoryError }}
        </p>
        <TransitionGroup name="cards" tag="div" class="event-grid"
          ><EventCard
            v-for="event in visible"
            :key="event.id"
            :event="event"
            :category="categoryFor(event.category)"
            :now="now"
            @favorite="toggleFavorite"
            @edit="open"
            @delete="deleting = $event" /><button
            v-if="!search && category === 'all' && tab === 'upcoming'"
            key="new"
            class="add-card"
            @click="open()"
          >
            <span class="add-circle"
              ><Plus :size="25" stroke-width="1.4" /></span
            ><strong>¿Qué te hace ilusión?</strong
            ><span>Añade un momento para esperar con ganas.</span
            ><span class="add-link"
              >Crear un evento<ArrowUpRight :size="15"
            /></span></button
        ></TransitionGroup>
        <div
          v-if="
            !visible.length &&
            (search || category !== 'all' || tab !== 'upcoming')
          "
          class="empty-state"
        >
          <span>☁️</span>
          <h3>Aún no hay momentos por aquí.</h3>
          <p>
            {{
              search
                ? 'Prueba con otro nombre o cambia los filtros.'
                : 'Cada fecha especial tiene su lugar. Añade la tuya.'
            }}
          </p>
          <button class="text-button" @click="resetFilters">
            Ver próximos eventos <ArrowUpRight :size="15" />
          </button>
        </div>
      </section>
      <aside class="quote">
        <span class="quote-star">✳</span>
        <p>La felicidad también está en <em>la espera.</em></p>
        <span class="quote-line" />
      </aside>
    </main>
    <footer>
      <span
        ><ShieldCheck :size="15" />Tus momentos se guardan solo en este
        navegador.</span
      ><span
        >Hecho para vivir con un poquito más de ilusión <Heart :size="13"
      /></span>
    </footer>
    <CategoryManager
      v-if="categoriesOpen"
      :categories="categories"
      @close="categoriesOpen = false"
      @save="saveCategory"
    />
    <EventModal
      v-if="modalOpen"
      :event="editing"
      :categories="categories"
      @save-category="saveCategory"
      @close="modalOpen = false"
      @save="onSave"
    />
    <dialog
      ref="deleteDialog"
      v-if="deleting"
      class="delete-modal"
      @close="deleting = undefined"
    >
      <h2>¿Eliminar este momento?</h2>
      <p>“{{ deleting.title }}” se eliminará de este navegador.</p>
      <div>
        <button class="secondary" @click="deleting = undefined">Cancelar</button
        ><button class="primary" @click="onDelete">Eliminar evento</button>
      </div>
    </dialog>
    <Transition name="toast"
      ><div v-if="toast" class="toast" role="status">
        <Check :size="17" />{{ toast }}
      </div></Transition
    >
  </div>
</template>

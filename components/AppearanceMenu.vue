<script setup lang="ts">
import {
  Palette,
  X,
  Check,
  RotateCcw,
  Sparkles,
  Droplets,
  Minus,
} from 'lucide-vue-next'
import {
  backgrounds,
  defaultAppearance,
  appearanceBackground,
  appearancePalette,
  isDarkAppearance,
  type Appearance,
} from '~/types/appearance'
const props = defineProps<{
  value: Appearance
  saving: boolean
  error: string
  saveAppearance: (value: Appearance) => Promise<boolean>
}>()
const emit = defineEmits<{ close: []; preview: [value: Appearance] }>()
const draft = reactive({ ...props.value })
const dialog = ref<HTMLDialogElement>()
const close = () => {
  if (!props.saving) emit('close')
}
const { onBackdropPointerDown, onBackdropClick } = useModalDialog(dialog, close)
watch(draft, () => emit('preview', { ...draft }))
const motions = [
  {
    id: 'none',
    label: 'Sin movimiento',
    description: 'Calma total',
    icon: Minus,
  },
  {
    id: 'light',
    label: 'Luz suave',
    description: 'Luces amplias que recorren el fondo',
    icon: Droplets,
  },
  {
    id: 'sparkles',
    label: 'Destellos',
    description: 'Puntos y estrellas de luz en movimiento',
    icon: Sparkles,
  },
] as const
async function submit() {
  if (await props.saveAppearance({ ...draft })) emit('close')
}
</script>
<template>
  <dialog
    ref="dialog"
    class="modal appearance-menu"
    tabindex="-1"
    aria-labelledby="appearance-title"
    @close="close"
    @cancel="saving && $event.preventDefault()"
    @pointerdown="onBackdropPointerDown"
    @click="onBackdropClick"
  >
    <div class="modal-heading">
      <span class="eyebrow"><Palette :size="14" /> HAZLO TUYO</span
      ><button
        type="button"
        class="icon-button"
        aria-label="Cerrar apariencia"
        :disabled="saving"
        @click="close"
      >
        <X :size="21" />
      </button>
    </div>
    <h2 id="appearance-title">Tu espacio, tu estilo.</h2>
    <p class="appearance-description">
      Elige el ambiente que acompaña tus próximos momentos.
    </p>
    <div
      class="appearance-preview"
      :style="{
        background: appearanceBackground(draft),
        ...appearancePalette(draft),
        color: isDarkAppearance(draft) ? '#f1f3f7' : '#30362e',
      }"
      aria-label="Vista previa de la apariencia"
    >
      <AmbientBackground :motion="draft.motion" />
      <span class="eyebrow">ALGO BONITO SE ACERCA</span
      ><strong>Tu próximo buen momento</strong
      ><span class="appearance-preview-card"
        ><Sparkles :size="18" /><b>12</b> días para sonreír</span
      >
    </div>
    <form @submit.prevent="submit">
      <fieldset :disabled="saving">
        <legend>Elige un fondo</legend>
        <div class="background-options">
          <button
            v-for="background in backgrounds"
            :key="background.id"
            type="button"
            :aria-pressed="draft.background === background.id"
            :class="{ active: draft.background === background.id }"
            @click="draft.background = background.id"
          >
            <span
              class="background-sample"
              :style="{ background: background.background }"
              ><Check
                v-if="draft.background === background.id"
                :size="17" /></span
            ><strong>{{ background.label }}</strong
            ><small>{{ background.description }}</small>
          </button>
        </div>
        <div class="custom-background">
          <button
            type="button"
            class="secondary"
            :aria-pressed="draft.background === 'custom'"
            @click="draft.background = 'custom'"
          >
            Color liso</button
          ><label for="appearance-color"
            >Tu color<input
              id="appearance-color"
              v-model="draft.color"
              type="color"
              @input="draft.background = 'custom'" /></label
          ><span>{{ draft.color }}</span>
        </div>
      </fieldset>
      <fieldset :disabled="saving">
        <legend>Un poco de movimiento</legend>
        <div class="motion-options">
          <button
            v-for="motion in motions"
            :key="motion.id"
            type="button"
            :class="{ active: draft.motion === motion.id }"
            :aria-pressed="draft.motion === motion.id"
            @click="draft.motion = motion.id"
          >
            <component :is="motion.icon" :size="18" /><span
              ><strong>{{ motion.label }}</strong
              ><small>{{ motion.description }}</small></span
            ><Check v-if="draft.motion === motion.id" :size="16" />
          </button>
        </div>
        <p class="appearance-hint">
          Los fondos, tarjetas y controles cambian juntos. Las animaciones se
          desactivan si tu dispositivo tiene activado Reducir movimiento.
        </p>
      </fieldset>
      <p v-if="error" class="storage-warning" role="alert">{{ error }}</p>
      <button
        type="button"
        class="text-button"
        :disabled="saving"
        @click="Object.assign(draft, defaultAppearance)"
      >
        <RotateCcw :size="14" />Restablecer apariencia
      </button>
      <div class="appearance-actions">
        <button
          type="button"
          class="secondary"
          :disabled="saving"
          @click="close"
        >
          Cancelar</button
        ><button
          type="submit"
          class="primary"
          :disabled="saving"
          :aria-busy="saving"
        >
          <Check :size="17" />{{ saving ? 'Guardando…' : 'Guardar apariencia' }}
        </button>
      </div>
    </form>
  </dialog>
</template>

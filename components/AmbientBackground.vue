<script setup lang="ts">
import type { Motion } from '~/types/appearance'
defineProps<{ motion: Motion }>()
const reduced = ref(true)
const visible = ref(true)
let query: MediaQueryList | undefined
function updateMotion() {
  reduced.value = query?.matches ?? true
}
function updateVisibility() {
  visible.value = document.visibilityState === 'visible'
}
onMounted(() => {
  query = window.matchMedia('(prefers-reduced-motion: reduce)')
  updateMotion()
  updateVisibility()
  query.addEventListener('change', updateMotion)
  document.addEventListener('visibilitychange', updateVisibility)
})
onUnmounted(() => {
  query?.removeEventListener('change', updateMotion)
  document.removeEventListener('visibilitychange', updateVisibility)
})
</script>
<template>
  <div
    v-if="visible && !reduced && motion !== 'none'"
    class="appearance-background"
    aria-hidden="true"
  >
    <template v-if="motion === 'light'">
      <span class="appearance-light light-one" />
      <span class="appearance-light light-two" />
      <span class="appearance-light light-three" />
    </template>
    <template v-else>
      <span class="appearance-light appearance-halo" />
      <span
        v-for="i in 12"
        :key="i"
        class="appearance-spark"
        :class="['spark-dot', 'spark-ring', 'spark-cross'][i % 3]"
        :style="{
          left: `${(i * 37) % 100}%`,
          top: `${(i * 23) % 100}%`,
          '--spark-size': `${8 + (i % 3) * 4}px`,
          animationDelay: `${-i * 1.3}s`,
        }"
      />
    </template>
  </div>
</template>

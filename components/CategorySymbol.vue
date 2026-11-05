<script setup lang="ts">
import { symbols } from '~/types/symbols'
const props = withDefaults(defineProps<{ symbol: string; size?: number }>(), {
  size: 20,
})
const icon = computed(() => symbols.find((s) => s.id === props.symbol)?.icon)
</script>
<template>
  <component
    :is="icon"
    v-if="icon"
    :size="size"
    :stroke-width="1.65"
    aria-hidden="true"
  /><span v-else class="category-emoji" aria-hidden="true">{{ symbol }}</span>
</template>

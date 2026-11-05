<script setup lang="ts">
import { Sparkles } from 'lucide-vue-next'
</script>
<template>
  <div class="ambient-background" aria-hidden="true">
    <span class="ambient-glow ambient-peach" />
    <span class="ambient-glow ambient-sage" />
    <span class="ambient-glow ambient-lavender" />
    <span class="ambient-ring ambient-ring-one" />
    <span class="ambient-ring ambient-ring-two" />
    <span class="ambient-ring ambient-ring-three" />
    <svg class="ambient-ribbon ribbon-one" viewBox="0 0 160 300" fill="none">
      <path d="M80 0C-65 75 225 100 80 175S-40 260 80 300" />
      <path d="M100 0C-45 75 245 100 100 175S-20 260 100 300" />
    </svg>
    <svg class="ambient-ribbon ribbon-two" viewBox="0 0 160 300" fill="none">
      <path d="M80 0C-65 75 225 100 80 175S-40 260 80 300" />
    </svg>
    <Sparkles class="ambient-spark ambient-spark-one" :size="28" />
    <Sparkles class="ambient-spark ambient-spark-two" :size="28" />
    <Sparkles class="ambient-spark ambient-spark-three" :size="28" />
    <span
      v-for="i in 18"
      :key="i"
      class="ambient-particle"
      :class="['particle-' + (i % 3), { 'particle-diamond': i % 4 === 0 }]"
      :style="{
        left: `${(i * 37) % 100}%`,
        '--duration': `${12 + (i % 6) * 2}s`,
        '--delay': `${-i * 2.7}s`,
        '--drift': `${i % 2 ? 75 : -75}px`,
        '--size': `${4 + (i % 4) * 2}px`,
      }"
    />
  </div>
</template>

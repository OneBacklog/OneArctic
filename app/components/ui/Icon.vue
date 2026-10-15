<template>
  <svg
    viewBox="0 0 24 24"
    :fill="icon.fill ? 'currentColor' : 'none'"
    :stroke="icon.fill ? undefined : 'currentColor'"
    :stroke-width="icon.fill ? undefined : (icon.strokeWidth ?? 1.5)"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <path v-for="(d, i) in icon.paths" :key="i" :d="d" />
  </svg>
</template>

<script setup lang="ts">
import { ICONS, type IconName } from '~/utils/icons'

const props = defineProps<{ name: IconName }>()

const icon = computed<{ paths: string[]; fill?: boolean; strokeWidth?: number }>(() => ICONS[props.name])
</script>

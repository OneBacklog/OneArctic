<template>
  <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-nord-aurora/20 dark:bg-nord-blue/30 text-nord-blue dark:text-nord-aurora">
    {{ label.name }}
  </span>
</template>

<script setup lang="ts">
import type { Label } from '#shared/types/notes'
defineProps<{ label: Label }>()
</script>

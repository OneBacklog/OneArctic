<template>
  <div
    :role="variant === 'info' ? 'status' : 'alert'"
    class="w-full mx-auto mb-6 max-w-[600px] flex items-center gap-3 rounded-xl px-4 py-3"
    :class="variantClasses"
  >
    <slot name="icon">
      <UiIcon name="warning" class="w-5 h-5 flex-shrink-0" />
    </slot>
    <span class="text-sm font-medium"><slot /></span>
  </div>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{
  variant?: 'error' | 'warning' | 'info'
}>(), { variant: 'warning' })

const variantClasses = computed(() => ({
  'bg-nord-ember/10 border border-nord-ember/30 text-nord-ember': props.variant === 'error' || props.variant === 'warning',
  'bg-nord-frost/10 border border-nord-frost/30 text-nord-frost': props.variant === 'info',
}))
</script>

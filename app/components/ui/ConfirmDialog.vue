<template>
  <UiModal
    role="alertdialog"
    layer="top"
    :labelledby="titleId"
    backdrop-class="bg-black/50"
    panel-class="bg-nord-mist dark:bg-nord-obsidian rounded-2xl p-6 w-full max-w-sm shadow-2xl"
    @close="emit('cancel')"
  >
    <h2 :id="titleId" class="text-base font-semibold text-nord-storm dark:text-nord-snow mb-2">{{ title }}</h2>
    <p class="text-sm text-nord-slate dark:text-nord-frost mb-6">
      <slot />
    </p>
    <div class="flex gap-3 justify-end">
      <button
        type="button"
        data-autofocus
        class="px-4 py-2 text-sm text-nord-slate dark:text-nord-ice hover:bg-nord-ice dark:hover:bg-nord-graphite rounded-lg transition-colors"
        @click="emit('cancel')"
      >
        Cancel
      </button>
      <button
        type="button"
        class="px-4 py-2 text-sm font-medium bg-nord-ember text-white rounded-lg hover:bg-nord-ember/80 transition-colors disabled:opacity-60"
        :disabled="busy"
        @click="emit('confirm')"
      >
        {{ busy ? 'Deleting…' : confirmLabel }}
      </button>
    </div>
  </UiModal>
</template>

<script setup lang="ts">
// Destructive-action confirmation. Focus starts on Cancel so Enter never deletes by accident.
defineProps<{
  title: string
  confirmLabel: string
  busy?: boolean
}>()

const emit = defineEmits<{ confirm: []; cancel: [] }>()

const titleId = useId()
</script>

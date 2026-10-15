<template>
  <div
    role="alertdialog"
    :aria-label="message"
    class="absolute inset-0 bg-black/70 flex flex-col items-center justify-center gap-2 rounded"
    @click.stop
  >
    <p class="text-white text-xs font-medium">{{ message }}</p>
    <div class="flex gap-2">
      <button
        ref="cancelButton"
        type="button"
        class="px-3 py-1 text-xs bg-nord-slate text-nord-snow rounded-full hover:bg-nord-graphite transition-colors"
        @click.stop="emit('cancel')"
      >
        Cancel
      </button>
      <button
        type="button"
        class="px-3 py-1 text-xs bg-nord-ember text-white rounded-full hover:bg-nord-ember/80 transition-colors"
        @click.stop="emit('confirm')"
      >
        {{ confirmLabel }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
// Small confirmation overlay shown on top of an image tile.
defineProps<{ message: string; confirmLabel: string }>()
const emit = defineEmits<{ confirm: []; cancel: [] }>()

const cancelButton = ref<HTMLButtonElement>()
onMounted(() => cancelButton.value?.focus())
useEscapeKey(() => emit('cancel'))
</script>

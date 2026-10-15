<template>
  <Teleport to="body">
    <!-- Always-present live region so screen readers announce each message -->
    <div class="sr-only" role="status" aria-live="polite">{{ queue[0]?.type === 'error' ? '' : queue[0]?.message }}</div>
    <div class="sr-only" role="alert">{{ queue[0]?.type === 'error' ? queue[0]?.message : '' }}</div>
    <Transition name="snackbar">
      <div
        v-if="queue.length > 0"
        class="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl text-sm font-medium min-w-[200px] max-w-[90vw]"
        :class="queue[0]?.type === 'error'
          ? 'bg-nord-ember text-white'
          : 'bg-nord-blue text-white'"
      >
        <span class="flex-1" aria-hidden="true">{{ queue[0]?.message }}</span>
        <button
          type="button"
          class="hover:opacity-80 transition-opacity ml-2 text-white/70"
          aria-label="Dismiss"
          @click="dismiss"
        >
          <UiIcon name="x-mark" class="w-4 h-4" />
        </button>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
const { queue, dismiss } = useSnackbar()
</script>

<style scoped>
.snackbar-enter-active,
.snackbar-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.snackbar-enter-from,
.snackbar-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(12px);
}
</style>

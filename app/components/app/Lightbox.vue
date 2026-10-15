<template>
  <Teleport to="body">
    <Transition name="lightbox">
      <div
        v-if="isOpen && current"
        ref="root"
        role="dialog"
        aria-modal="true"
        :aria-label="`Image ${index + 1} of ${items.length}: ${current.name}`"
        class="fixed left-0 top-0 modal-viewport z-[200] bg-black/90 flex items-center justify-center"
        @click.self="close"
      >
        <!-- Top bar: filename left, actions right -->
        <div class="absolute top-0 left-0 right-0 flex items-center justify-between px-4 py-3 z-10 bg-gradient-to-b from-black/60 to-transparent">
          <span class="text-sm font-medium text-nord-snow truncate max-w-[50vw] select-none block" dir="rtl">
            {{ current.name }}
          </span>
          <div class="flex items-center gap-2">
            <a
              :href="current.url"
              download
              class="lightbox-btn hover:bg-nord-graphite"
              title="Download"
              aria-label="Download"
              @click.stop="showSnackbar('Download Starting...')"
            >
              <UiIcon name="download" class="w-5 h-5" />
            </a>
            <button
              v-if="canDelete"
              type="button"
              class="lightbox-btn hover:bg-nord-ember/80"
              title="Delete"
              aria-label="Delete Image"
              @click.stop="confirmingDelete = true"
            >
              <UiIcon name="trash" class="w-5 h-5" />
            </button>
            <button ref="closeButton" type="button" class="lightbox-btn hover:bg-nord-graphite" title="Close" aria-label="Close" @click="close">
              <UiIcon name="x-mark" class="w-5 h-5" />
            </button>
          </div>
        </div>

        <button
          v-if="index > 0"
          type="button"
          class="lightbox-btn hover:bg-nord-graphite absolute left-4 top-1/2 -translate-y-1/2 z-10"
          aria-label="Previous Image"
          @click="prev"
        >
          <UiIcon name="chevron-left" class="w-5 h-5" />
        </button>

        <img
          :src="current.url"
          :alt="current.name"
          class="max-w-[90vw] max-h-[90vh] object-contain select-none rounded-lg shadow-2xl"
          @click.stop
        >

        <button
          v-if="index < items.length - 1"
          type="button"
          class="lightbox-btn hover:bg-nord-graphite absolute right-4 top-1/2 -translate-y-1/2 z-10"
          aria-label="Next Image"
          @click="next"
        >
          <UiIcon name="chevron-right" class="w-5 h-5" />
        </button>

        <div
          v-if="items.length > 1"
          class="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs text-nord-frost bg-nord-obsidian/70 px-3 py-1 rounded-full"
          aria-hidden="true"
        >
          {{ index + 1 }} / {{ items.length }}
        </div>
      </div>
    </Transition>

    <UiConfirmDialog
      v-if="confirmingDelete"
      title="Delete Image?"
      confirm-label="Delete"
      :busy="deleting"
      @cancel="confirmingDelete = false"
      @confirm="onDeleteConfirmed"
    >
      The image will be permanently deleted from this note and disk.
    </UiConfirmDialog>
  </Teleport>
</template>

<script setup lang="ts">
const { isOpen, items, index, current, canDelete, close, prev, next, deleteCurrent } = useLightbox()
const { show: showSnackbar } = useSnackbar()

const root = ref<HTMLElement>()
const closeButton = ref<HTMLButtonElement>()
const confirmingDelete = ref(false)
const deleting = ref(false)
let returnFocusTo: HTMLElement | null = null

useBodyScrollLock(isOpen)
useEscapeKey(close, isOpen)
useLightboxNavigation(() => isOpen.value && !confirmingDelete.value, prev, next)

// Move focus into the lightbox while it's open and give it back afterwards
watch(isOpen, (open) => {
  if (open) {
    returnFocusTo = document.activeElement as HTMLElement | null
    nextTick(() => closeButton.value?.focus())
  } else {
    restoreFocus(returnFocusTo, root.value)
  }
})

const onDeleteConfirmed = async () => {
  deleting.value = true
  try {
    await deleteCurrent()
    confirmingDelete.value = false
  } finally {
    deleting.value = false
  }
}
</script>

<style scoped>
@reference "../../assets/css/main.css";

.lightbox-btn {
  @apply w-10 h-10 flex items-center justify-center rounded-full bg-nord-obsidian/80 text-nord-snow transition-colors;
}
.lightbox-enter-active, .lightbox-leave-active { transition: opacity 0.2s; }
.lightbox-enter-from, .lightbox-leave-to { opacity: 0; }
</style>

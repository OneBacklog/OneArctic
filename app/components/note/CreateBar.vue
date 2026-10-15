<template>
  <div class="w-full mx-auto mb-6 max-w-[600px]">
    <!-- "Take a note..." collapsed bar (always visible) -->
    <div class="flex items-center gap-3 bg-white dark:bg-nord-obsidian border border-nord-ice dark:border-nord-graphite rounded-xl shadow-sm focus-within:ring-2 focus-within:ring-nord-aurora">
      <button
        type="button"
        class="flex-1 text-left px-4 py-3 text-nord-slate dark:text-nord-frost text-sm cursor-text outline-none"
        @click="openModal('text')"
      >
        Take a note...
      </button>
      <button
        type="button"
        class="w-9 h-9 mr-2 flex items-center justify-center rounded-full hover:bg-nord-ice dark:hover:bg-nord-graphite text-nord-slate dark:text-nord-frost transition-colors"
        title="New Checklist"
        aria-label="New Checklist"
        @click="openModal('checklist')"
      >
        <UiIcon name="checklist" class="w-5 h-5" />
      </button>
    </div>

    <NoteModal
      v-if="showModal"
      :initial-type="initType"
      :default-label-ids="defaultLabelIds"
      @close="showModal = false"
    />
  </div>
</template>

<script setup lang="ts">
import type { NoteType } from '#shared/types/notes'

defineProps<{ defaultLabelIds?: string[] }>()

const showModal = ref(false)
const initType = ref<NoteType>('text')

const openModal = (type: NoteType) => {
  initType.value = type
  showModal.value = true
}
</script>

<template>
  <div class="flex items-center gap-1">
    <button
      type="button"
      class="toolbar-btn"
      title="Restore"
      aria-label="Restore"
      @click.stop="emit('restore')"
    >
      <UiIcon name="restore" class="w-5 h-5" />
    </button>
    <button
      v-if="status === 'archived'"
      type="button"
      class="toolbar-btn"
      title="Trash"
      aria-label="Move to Trash"
      @click.stop="emit('trash')"
    >
      <UiIcon name="trash" class="w-5 h-5" />
    </button>
    <button
      v-else
      type="button"
      class="toolbar-btn text-nord-ember"
      title="Delete Permanently"
      aria-label="Delete Permanently"
      @click.stop="confirmingDelete = true"
    >
      <UiIcon name="trash" class="w-5 h-5" />
    </button>

    <UiConfirmDialog
      v-if="confirmingDelete"
      title="Delete Note Forever?"
      confirm-label="Delete Forever"
      @cancel="confirmingDelete = false"
      @confirm="confirmingDelete = false; emit('delete')"
    >
      This note, including its images and attachments, will be permanently deleted and cannot be recovered.
    </UiConfirmDialog>
  </div>
</template>

<script setup lang="ts">
// Restore/trash/delete buttons for archived and trashed notes (on cards and in the read-only view).
defineProps<{ status: 'archived' | 'trashed' }>()
const emit = defineEmits<{ restore: []; trash: []; delete: [] }>()

const confirmingDelete = ref(false)
</script>

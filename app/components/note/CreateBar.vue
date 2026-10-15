<template>
  <div class="w-full mx-auto mb-6 max-w-[600px]">
    <!-- "Take a note..." collapsed bar (always visible) -->
    <div
      class="flex items-center gap-3 bg-white dark:bg-nord-obsidian border border-nord-ice dark:border-nord-graphite rounded-xl px-4 py-3 shadow-sm cursor-text"
      @click="openModal('text')"
    >
      <span class="flex-1 text-nord-slate dark:text-nord-frost text-sm">Take a note...</span>
      <button class="w-9 h-9 flex items-center justify-center rounded-full hover:bg-nord-ice dark:hover:bg-nord-graphite text-nord-slate dark:text-nord-frost transition-colors" title="New Checklist" @click.stop="openModal('checklist')">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M11.35 3.836c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m8.9-4.414c.376.023.75.05 1.124.08 1.131.094 1.976 1.057 1.976 2.192V16.5A2.25 2.25 0 0118 18.75h-2.25m-7.5-10.5H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V18.75m-7.5-10.5h6.375c.621 0 1.125.504 1.125 1.125v9.375m-8.25-3l1.5 1.5 3-3.75"/>
        </svg>
      </button>
    </div>

    <!-- Create modal -->
    <NoteModal
      v-if="showModal"
      :initial-type="initType"
      :default-label-ids="props.defaultLabelIds"
      @save="onSave"
      @close="onClose"
    />
  </div>
</template>

<script setup lang="ts">
import type { NewNotePayload } from '~/types/editor'
import type { Note } from '#shared/types/notes'

const emit = defineEmits<{ created: [note: Note] }>()
const props = defineProps<{ defaultLabelIds?: string[] }>()

const showModal = ref(false)
const initType = ref<'text' | 'checklist'>('text')
const { createNote, uploadAttachment } = useNotes()
const { startUpload, endUpload } = useNoteUploadState()
const { show: showSnackbar } = useSnackbar()

const openModal = (type: 'text' | 'checklist' = 'text') => {
  initType.value = type
  showModal.value = true
}

const onSave = async (payload: NewNotePayload) => {
  showModal.value = false
  const labelIds = [...new Set([...(props.defaultLabelIds ?? []), ...payload.labelIds])]
  let note: Note
  try {
    note = await createNote({
      type: payload.type,
      title: payload.title,
      content: payload.content,
      labelIds,
      checklistItems: payload.checklistItems,
    })
  } catch (e) {
    showSnackbar(getErrorMessage(e, 'Failed to Create Note'), 'error')
    return
  }
  emit('created', note)
  if (payload.pendingFiles.length) {
    startUpload(note.id)
    try {
      await uploadAttachment(note.id, payload.pendingFiles)
    } finally {
      endUpload(note.id)
    }
  }
}

const onClose = () => {
  showModal.value = false
}
</script>

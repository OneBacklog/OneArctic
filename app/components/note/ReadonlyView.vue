<template>
  <div>
    <AttachmentImageGrid
      v-if="imageAttachments.length > 0"
      :attachments="imageAttachments"
      class="-mx-px -mt-px rounded-t-xl overflow-hidden"
    />

    <div class="p-4">
      <h2 :id="titleId" class="text-lg font-medium text-nord-snow mb-2 tracking-wide">
        {{ note.title }}
      </h2>

      <div v-if="note.type === 'text' && note.content" class="text-sm text-nord-ice whitespace-pre-wrap">
        {{ note.content }}
      </div>

      <NoteChecklistPreview v-if="note.type === 'checklist'" :items="note.checklistItems" size="md" />

      <AttachmentFileList v-if="fileAttachments.length > 0" :attachments="fileAttachments" class="mt-2" />

      <div v-if="note.labels.length > 0" class="flex flex-wrap gap-1 mt-3">
        <LabelChip v-for="label in note.labels" :key="label.id" :label="label" />
      </div>
    </div>

    <div class="flex items-center justify-between px-3 pb-3">
      <div class="flex items-center gap-1">
        <button
          v-if="canCopyNote(note)"
          type="button"
          class="toolbar-btn"
          title="Copy to Clipboard"
          aria-label="Copy to Clipboard"
          @click.stop="copyNoteContent(note)"
        >
          <UiIcon name="clipboard" class="w-5 h-5" />
        </button>
        <NoteStatusActions
          :status="status"
          @restore="status === 'archived' ? emit('unarchive') : emit('restore')"
          @trash="emit('trash')"
          @delete="emit('delete-forever')"
        />
      </div>
      <button
        type="button"
        class="px-4 py-1.5 text-sm font-medium text-nord-ice hover:bg-nord-graphite rounded-lg transition-colors"
        @click="emit('close')"
      >
        Close
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Note } from '#shared/types/notes'

// Read-only view of an archived or trashed note inside NoteModal.
const props = defineProps<{
  note: Note
  status: 'archived' | 'trashed'
  titleId: string
}>()

const emit = defineEmits<{
  close: []
  unarchive: []
  restore: []
  trash: []
  'delete-forever': []
}>()

const { images: imageAttachments, files: fileAttachments } = splitAttachments(() => props.note.attachments)
const { canCopyNote, copyNoteContent } = useClipboard()
</script>

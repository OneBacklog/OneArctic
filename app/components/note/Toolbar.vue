<template>
  <div class="flex items-center gap-1 flex-wrap" role="toolbar" aria-label="Note actions">
    <button
      v-if="canCopyNote(copySource ?? note)"
      type="button"
      class="toolbar-btn"
      title="Copy to Clipboard"
      aria-label="Copy to Clipboard"
      @click.stop="copyNoteContent(copySource ?? note)"
    >
      <UiIcon name="clipboard" class="w-5 h-5" />
    </button>

    <button
      type="button"
      class="toolbar-btn"
      title="Add Images/Files"
      aria-label="Add Images/Files"
      @click.stop="$emit('add-file')"
    >
      <UiIcon name="paperclip" class="w-5 h-5" />
    </button>

    <div class="relative">
      <button
        type="button"
        class="toolbar-btn"
        title="Set Labels"
        aria-label="Set Labels"
        aria-haspopup="dialog"
        :aria-expanded="showLabelPicker"
        @click.stop="showLabelPicker = !showLabelPicker"
      >
        <UiIcon name="tag" class="w-5 h-5" />
      </button>
      <LabelPicker
        v-if="showLabelPicker"
        :selected-ids="selectedLabelIds ?? note?.labels.map((l) => l.id) ?? []"
        @update="(ids) => $emit('label', ids)"
        @close="showLabelPicker = false"
      />
    </div>

    <button
      v-if="showArchive"
      type="button"
      class="toolbar-btn"
      :title="note?.isArchived ? 'Unarchive' : 'Archive'"
      :aria-label="note?.isArchived ? 'Unarchive' : 'Archive'"
      @click.stop="$emit('archive')"
    >
      <UiIcon name="archive" class="w-5 h-5" />
    </button>

    <button
      v-if="showTrash"
      type="button"
      class="toolbar-btn"
      title="Trash"
      aria-label="Move to Trash"
      @click.stop="$emit('trash')"
    >
      <UiIcon name="trash" class="w-5 h-5" />
    </button>
  </div>
</template>

<script setup lang="ts">
import type { ChecklistItem, Note, NoteType } from '#shared/types/notes'

defineProps<{
  note?: Note
  selectedLabelIds?: string[]
  showArchive?: boolean
  showTrash?: boolean
  /** Unsaved editor content to copy instead of the saved note */
  copySource?: { type: NoteType; content: string; checklistItems: ChecklistItem[] }
}>()

defineEmits<{
  'add-file': []
  'label': [ids: string[]]
  'archive': []
  'trash': []
}>()

const showLabelPicker = ref(false)
const { canCopyNote, copyNoteContent } = useClipboard()
</script>

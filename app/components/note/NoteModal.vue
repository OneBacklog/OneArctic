<template>
  <Teleport to="body">
    <div
      class="fixed left-0 top-0 modal-viewport bg-black/60 z-50 flex items-center justify-center px-4 py-8 overflow-y-auto"
      @mousedown.self="handleClose"
    >
      <div
        class="w-full max-w-xl rounded-xl shadow-2xl border border-nord-graphite bg-nord-obsidian my-auto"
        @click.stop
      >
        <!-- READ-ONLY mode (archived / trashed notes) -->
        <template v-if="readonly && note">
          <AttachmentImageGrid
            v-if="imageAttachments.length > 0"
            :attachments="imageAttachments"
            class="-mx-px -mt-px rounded-t-xl overflow-hidden"
          />

          <div class="p-4">
            <div v-if="note.title" class="text-lg font-medium text-nord-snow mb-2 tracking-wide">
              {{ note.title }}
            </div>

            <div
              v-if="note.type === 'text' && note.content"
              class="text-sm text-nord-ice whitespace-pre-wrap"
            >
              {{ note.content }}
            </div>

            <div v-if="note.type === 'checklist'" class="space-y-1">
              <div
                v-for="item in note.checklistItems"
                :key="item.id"
                class="flex items-center gap-2 text-sm"
              >
                <div
                  class="w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center"
                  :class="item.isChecked ? 'bg-nord-frost border-nord-frost' : 'border-nord-slate'"
                >
                  <svg v-if="item.isChecked" class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4.5 12.75l6 6 9-13.5"/>
                  </svg>
                </div>
                <span :class="item.isChecked ? 'line-through text-nord-frost' : 'text-nord-ice'">{{ item.text }}</span>
              </div>
            </div>

            <AttachmentFileList
              v-if="fileAttachments.length > 0"
              :attachments="fileAttachments"
              class="mt-2"
            />

            <div v-if="note.labels.length > 0" class="flex flex-wrap gap-1 mt-3">
              <LabelChip v-for="label in note.labels" :key="label.id" :label="label" />
            </div>
          </div>

          <div class="flex items-center justify-between px-3 pb-3">
            <div class="flex items-center gap-1">
              <template v-if="isArchived">
                <button class="toolbar-btn" title="Unarchive" @click="$emit('unarchive', note); $emit('close')">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"/>
                  </svg>
                </button>
                <button class="toolbar-btn" title="Trash" @click="$emit('trash', note); $emit('close')">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"/>
                  </svg>
                </button>
              </template>
              <template v-else-if="isTrashed">
                <button class="toolbar-btn" title="Restore" @click="$emit('restore', note); $emit('close')">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.85l3.181 3.182m0-4.991v4.99"/>
                  </svg>
                </button>
                <button class="toolbar-btn text-nord-ember" title="Delete Permanently" @click="$emit('delete-forever', note); $emit('close')">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"/>
                  </svg>
                </button>
              </template>
            </div>
            <button
              class="px-4 py-1.5 text-sm font-medium text-nord-ice hover:bg-nord-graphite rounded-lg transition-colors"
              @click="$emit('close')"
            >Close</button>
          </div>
        </template>

        <!-- EDIT mode (create / edit notes) -->
        <template v-else>
          <NoteEditorContent
            v-bind="editorProps"
            :title-error="titleError"
            @update="onUpdate"
            @close="handleClose"
            @archive="onArchive"
            @trash="onTrash"
          />
        </template>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import type { Note, ChecklistItem } from '~/composables/types'

useBodyScrollLock(true)

const props = defineProps<{
  note?: Note
  readonly?: boolean
  isArchived?: boolean
  isTrashed?: boolean
  initialType?: 'text' | 'checklist'
  initialFiles?: File[]
  defaultLabelIds?: string[]
}>()

const emit = defineEmits<{
  save: [payload: any]
  close: []
  unarchive: [note: Note]
  trash: [note: Note]
  restore: [note: Note]
  'delete-forever': [note: Note]
}>()

// READ-ONLY attachment split
const { images: imageAttachments, files: fileAttachments } = splitAttachments(
  () => props.note?.attachments ?? []
)

// EDIT mode state
const { updateNote, archiveNote, unarchiveNote, trashNote } = useNotes()
const { show: showSnackbar } = useSnackbar()
const { isUploading } = useNoteUploadState()
const isCurrentlyUploading = computed(() => props.note?.id ? isUploading(props.note.id) : false)

const type = ref<'text' | 'checklist'>(props.note?.type ?? props.initialType ?? 'text')
const title = ref(props.note?.title ?? '')
const content = ref(props.note?.content ?? '')
const selectedLabelIds = ref<string[]>(
  props.note?.labels.map((l) => l.id) ?? props.defaultLabelIds ?? []
)
const checklistItems = ref<ChecklistItem[]>(
  props.note?.checklistItems?.map((i) => ({ ...i })) ?? []
)
const pendingFiles = ref<File[]>(props.initialFiles ?? [])
const titleError = ref(false)

const editorProps = computed(() => ({
  type: type.value,
  title: title.value,
  content: content.value,
  selectedLabelIds: selectedLabelIds.value,
  checklistItems: checklistItems.value,
  note: props.note,
  initialFiles: props.initialFiles,
}))

const hasContent = computed(() =>
  title.value.trim() !== '' ||
  content.value.trim() !== '' ||
  checklistItems.value.some((i) => i.text.trim() !== '') ||
  pendingFiles.value.length > 0
)

const onUpdate = (payload: any) => {
  type.value = payload.type
  title.value = payload.title
  content.value = payload.content
  selectedLabelIds.value = payload.selectedLabelIds
  checklistItems.value = payload.checklistItems
  if (payload.pendingFiles !== undefined) pendingFiles.value = payload.pendingFiles
  if (title.value.trim()) titleError.value = false
}

const handleClose = async () => {
  if (isCurrentlyUploading.value) return
  if (props.readonly) {
    emit('close')
    return
  }
  if (!props.note) {
    if (hasContent.value && !title.value.trim()) {
      titleError.value = true
      showSnackbar('Title is Required', 'error')
      return
    }
    if (hasContent.value) {
      emit('save', {
        type: type.value,
        title: title.value,
        content: content.value,
        labelIds: selectedLabelIds.value,
        checklistItems: checklistItems.value.filter((i) => i.text.trim() !== ''),
        pendingFiles: pendingFiles.value,
      })
    }
  } else {
    if (!title.value.trim()) {
      titleError.value = true
      showSnackbar('Title is Required', 'error')
      return
    }
    await updateNote(props.note.id, {
      type: type.value,
      title: title.value,
      content: content.value,
      labelIds: selectedLabelIds.value,
      checklistItems: checklistItems.value.filter((i) => i.text.trim() !== ''),
    }).catch(() => {})
  }
  emit('close')
}

const onArchive = async () => {
  if (!props.note) return
  if (props.note.isArchived) {
    await unarchiveNote(props.note.id)
  } else {
    await archiveNote(props.note.id)
  }
  emit('close')
}

const onTrash = async () => {
  if (!props.note) return
  await trashNote(props.note.id)
  emit('close')
}

useEscapeKey(handleClose)
</script>

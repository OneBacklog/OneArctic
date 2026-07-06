<template>
  <div
    class="note-card group relative rounded-xl border border-nord-ice dark:border-nord-graphite bg-white dark:bg-nord-obsidian cursor-pointer select-none transition-all duration-150 hover:shadow-lg hover:brightness-95 dark:hover:brightness-110"
    @click="$emit('open', note)"
    @contextmenu.prevent="onContextMenu"
  >
    <!-- Image attachments preview — bleeds past card border for immersive look -->
    <AttachmentImageGrid
      v-if="imageAttachments.length > 0"
      :attachments="imageAttachments"
      :on-delete="deleteAtt"
      :max-visible="4"
      class="-mx-px -mt-px rounded-t-xl overflow-hidden"
      @click.stop
    />

    <div class="flex-1 p-3 min-w-0 flex flex-col gap-2" :class="(isArchived || isTrashed) ? 'pb-12' : ''">
      <!-- Title -->
      <div v-if="note.title" class="font-medium text-lg text-nord-storm dark:text-nord-snow tracking-wide">
        {{ note.title }}
      </div>

      <!-- Content preview -->
      <div v-if="note.type === 'text' && note.content" class="text-sm text-nord-obsidian dark:text-nord-ice line-clamp-10 whitespace-pre-wrap">
        {{ note.content }}
      </div>

      <!-- Checklist preview -->
      <div v-if="note.type === 'checklist'" class="space-y-1">
        <div
          v-for="item in visibleChecklistItems"
          :key="item.id"
          class="flex items-center gap-2 text-sm"
        >
          <div
            class="w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center"
            :class="item.isChecked ? 'bg-nord-frost border-nord-frost' : 'border-nord-ice dark:border-nord-slate'"
          >
            <svg v-if="item.isChecked" class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4.5 12.75l6 6 9-13.5"/>
            </svg>
          </div>
          <span :class="item.isChecked ? 'line-through text-nord-slate dark:text-nord-frost' : 'text-nord-obsidian dark:text-nord-ice'">
            {{ item.text }}
          </span>
        </div>
        <div v-if="note.checklistItems.length > 5" class="text-xs text-nord-slate dark:text-nord-frost mt-1">
          +{{ note.checklistItems.length - 5 }} more
        </div>
      </div>

      <!-- File attachments + Labels group -->
      <div v-if="fileAttachments.length > 0 || note.labels.length > 0 || uploading" class="flex flex-col gap-3 mt-1">
        <!-- File attachments -->
        <div v-if="fileAttachments.length > 0" class="flex flex-col gap-1.5">
          <div
            v-for="att in visibleFileAttachments"
            :key="att.id"
            class="flex items-center gap-1.5 text-xs text-nord-slate dark:text-nord-ice min-w-0"
          >
            <svg class="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 002.112 2.13"/>
            </svg>
            <span class="truncate">{{ att.filename }}</span>
          </div>
          <div v-if="hiddenFileCount > 0" class="text-xs text-nord-slate dark:text-nord-frost mt-0.5 pl-0.5">
            +{{ hiddenFileCount }} more
          </div>
        </div>

        <!-- Upload indicator -->
        <div v-if="uploading" class="flex items-center gap-2 text-xs text-nord-frost">
          <div class="w-3 h-3 border border-nord-frost border-t-transparent rounded-full animate-spin flex-shrink-0" />
          Uploading...
        </div>

        <!-- Labels -->
        <div v-if="note.labels.length > 0" class="flex flex-wrap gap-1">
          <LabelChip v-for="label in note.labels" :key="label.id" :label="label" />
        </div>
      </div>

      <!-- Toolbar (hover) — absolutely positioned so it never changes card height -->
      <div
        v-if="!isTrashed && !isArchived"
        class="absolute bottom-0 left-0 right-0 px-2 pb-1.5 pt-6 rounded-b-xl opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto group-focus-within:pointer-events-auto"
      >
        <NoteToolbar
          :note="note"
          compact
          @click.stop
          @archive="$emit('archive', note)"
          @trash="$emit('trash', note)"
          @label="$emit('label', note)"
        />
      </div>
    </div>

    <!-- Archive actions (bottom-right) -->
    <div v-if="isArchived" class="absolute bottom-2 right-2 flex items-center gap-1">
      <button
        class="toolbar-btn"
        title="Unarchive"
        @click.stop="$emit('unarchive', note)"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"/>
        </svg>
      </button>
      <button
        class="toolbar-btn"
        title="Trash"
        @click.stop="$emit('trash', note)"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"/>
        </svg>
      </button>
    </div>

    <!-- Trash actions (bottom-right) -->
    <div v-if="isTrashed" class="absolute bottom-2 right-2 flex items-center gap-1">
      <button
        class="toolbar-btn"
        title="Restore"
        @click.stop="$emit('restore', note)"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.85l3.181 3.182m0-4.991v4.99"/>
        </svg>
      </button>
      <button
        class="toolbar-btn text-nord-ember"
        title="Delete Permanently"
        @click.stop="$emit('delete', note)"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"/>
        </svg>
      </button>
    </div>

    <!-- Context menu -->
    <NoteContextMenu
      v-if="!isTrashed && !isArchived"
      ref="contextMenu"
      @add-file="fileInputRef?.click()"
      @label="showLabelPicker = true"
      @archive="$emit('archive', note)"
      @trash="$emit('trash', note)"
    />

    <!-- Hidden file input for context menu uploads -->
    <input ref="fileInputRef" type="file" multiple class="hidden" @change="onFilesSelected" @click.stop >

    <!-- Label picker (triggered from context menu) -->
    <LabelPicker
      v-if="showLabelPicker"
      :selected-ids="note.labels.map(l => l.id)"
      @update="onLabelUpdate"
      @close="showLabelPicker = false"
    />
  </div>
</template>

<script setup lang="ts">
import type { Note } from '~/composables/types'

const props = defineProps<{
  note: Note
  isTrashed?: boolean
  isArchived?: boolean
}>()

defineEmits<{
  open: [note: Note]
  archive: [note: Note]
  unarchive: [note: Note]
  trash: [note: Note]
  restore: [note: Note]
  delete: [note: Note]
  label: [note: Note]
}>()

const { deleteAttachment, uploadAttachment, updateNote } = useNotes()
const { validate: validateFiles } = useFileValidation()
const deleteAtt = (attId: string) => deleteAttachment(props.note.id, attId)

const { images: imageAttachments, files: fileAttachments } = splitAttachments(() => props.note.attachments)
const visibleChecklistItems = computed(() => props.note.checklistItems.slice(0, 5))

const FILE_LIMIT = 5
const visibleFileAttachments = computed(() => fileAttachments.value.slice(0, FILE_LIMIT))
const hiddenFileCount = computed(() => Math.max(0, fileAttachments.value.length - FILE_LIMIT))

const contextMenu = ref()
const fileInputRef = ref<HTMLInputElement>()
const showLabelPicker = ref(false)

const { startUpload, endUpload, isUploading } = useNoteUploadState()
const uploading = computed(() => isUploading(props.note.id))

const onContextMenu = (e: MouseEvent) => {
  if (props.isTrashed || props.isArchived) return
  contextMenu.value?.open(e)
}

const onFilesSelected = async (e: Event) => {
  const input = e.target as HTMLInputElement
  const files = validateFiles(Array.from(input.files || []))
  input.value = ''
  if (!files.length) return
  startUpload(props.note.id)
  try {
    await uploadAttachment(props.note.id, files)
  } finally {
    endUpload(props.note.id)
  }
}

const onLabelUpdate = async (ids: string[]) => {
  await updateNote(props.note.id, { labelIds: ids })
}
</script>

<style scoped>
:deep(mark) {
  background-color: #EBCB8B;
  color: #2E3440;
  border-radius: 2px;
  padding: 0 1px;
}
</style>

<template>
  <div
    class="note-card group relative rounded-xl border border-nord-ice dark:border-nord-graphite bg-white dark:bg-nord-obsidian cursor-pointer select-none transition-all duration-150 hover:shadow-lg hover:brightness-95 dark:hover:brightness-110 focus-visible:outline-2 focus-visible:outline-nord-aurora"
    tabindex="0"
    :aria-label="`Open note: ${note.title}`"
    @click="$emit('open', note)"
    @keydown.enter.self="$emit('open', note)"
    @keydown.space.self.prevent="$emit('open', note)"
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

    <div class="flex-1 p-3 min-w-0 flex flex-col gap-2" :class="status ? 'pb-12' : ''">
      <h3 v-if="note.title" class="font-medium text-lg text-nord-storm dark:text-nord-snow tracking-wide">
        {{ note.title }}
      </h3>

      <div v-if="note.type === 'text' && note.content" class="text-sm text-nord-obsidian dark:text-nord-ice line-clamp-10 whitespace-pre-wrap">
        {{ note.content }}
      </div>

      <NoteChecklistPreview v-if="note.type === 'checklist'" :items="note.checklistItems" :limit="CHECKLIST_PREVIEW_LIMIT" />

      <!-- File attachments + Labels group -->
      <div v-if="fileAttachments.length > 0 || note.labels.length > 0 || uploading" class="flex flex-col gap-3 mt-1">
        <div v-if="fileAttachments.length > 0" class="flex flex-col gap-1.5">
          <div
            v-for="att in visibleFileAttachments"
            :key="att.id"
            class="flex items-center gap-1.5 text-xs text-nord-slate dark:text-nord-ice min-w-0"
          >
            <UiIcon name="paperclip" class="w-3 h-3 flex-shrink-0" />
            <span class="truncate">{{ att.filename }}</span>
          </div>
          <div v-if="hiddenFileCount > 0" class="text-xs text-nord-slate dark:text-nord-frost mt-0.5 pl-0.5">
            +{{ hiddenFileCount }} more
          </div>
        </div>

        <div v-if="uploading" class="flex items-center gap-2 text-xs text-nord-frost" role="status">
          <div class="w-3 h-3 border border-nord-frost border-t-transparent rounded-full animate-spin flex-shrink-0" />
          Uploading...
        </div>

        <div v-if="note.labels.length > 0" class="flex flex-wrap gap-1">
          <LabelChip v-for="label in note.labels" :key="label.id" :label="label" />
        </div>
      </div>

      <!-- Toolbar (hover/focus) — absolutely positioned so it never changes card height -->
      <div
        v-if="!status"
        class="absolute bottom-0 left-0 right-0 px-2 pb-1.5 pt-6 rounded-b-xl opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto group-focus-within:pointer-events-auto"
      >
        <NoteToolbar
          :note="note"
          compact
          @click.stop
          @archive="$emit('archive', note)"
          @trash="$emit('trash', note)"
        />
      </div>
    </div>

    <NoteStatusActions
      v-if="status"
      :status="status"
      class="absolute bottom-2 left-2"
      @restore="status === 'archived' ? $emit('unarchive', note) : $emit('restore', note)"
      @trash="$emit('trash', note)"
      @delete="$emit('delete', note)"
    />

    <template v-if="!status">
      <NoteContextMenu
        ref="contextMenu"
        :note="note"
        @add-file="fileInputRef?.click()"
        @label="showLabelPicker = true"
        @archive="$emit('archive', note)"
        @trash="$emit('trash', note)"
      />

      <!-- Hidden file input for context menu uploads -->
      <input ref="fileInputRef" type="file" multiple class="hidden" tabindex="-1" aria-hidden="true" @change="onFilesSelected" @click.stop>

      <LabelPicker
        v-if="showLabelPicker"
        :selected-ids="note.labels.map(l => l.id)"
        @update="onLabelUpdate"
        @close="showLabelPicker = false"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import type { Note } from '#shared/types/notes'

const props = defineProps<{
  note: Note
  /** Archived and trashed notes show restore/delete actions instead of the toolbar */
  status?: 'archived' | 'trashed'
}>()

defineEmits<{
  open: [note: Note]
  archive: [note: Note]
  unarchive: [note: Note]
  trash: [note: Note]
  restore: [note: Note]
  delete: [note: Note]
}>()

const CHECKLIST_PREVIEW_LIMIT = 5
const FILE_PREVIEW_LIMIT = 5

const { deleteAttachment, uploadAttachment } = useNoteAttachments()
const { updateNote } = useNoteMutations()
const { validate: validateFiles } = useFileValidation()
const { isUploading } = useNoteUploadState()
const deleteAtt = (attId: string) => deleteAttachment(props.note.id, attId)

const { images: imageAttachments, files: fileAttachments } = splitAttachments(() => props.note.attachments)
const visibleFileAttachments = computed(() => fileAttachments.value.slice(0, FILE_PREVIEW_LIMIT))
const hiddenFileCount = computed(() => Math.max(0, fileAttachments.value.length - FILE_PREVIEW_LIMIT))
const uploading = computed(() => isUploading(props.note.id))

const contextMenu = ref<{ open: (event: MouseEvent) => void }>()
const fileInputRef = ref<HTMLInputElement>()
const showLabelPicker = ref(false)

const onContextMenu = (e: MouseEvent) => {
  if (!props.status) contextMenu.value?.open(e)
}

const onFilesSelected = async (e: Event) => {
  const input = e.target as HTMLInputElement
  const files = validateFiles(Array.from(input.files || []))
  input.value = ''
  if (files.length) await uploadAttachment(props.note.id, files)
}

const onLabelUpdate = async (ids: string[]) => {
  await updateNote(props.note.id, { labelIds: ids }).catch((e) => {
    useSnackbar().show(getErrorMessage(e, 'Failed to Update Labels'), 'error')
  })
}
</script>

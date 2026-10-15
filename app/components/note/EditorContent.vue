<template>
  <div>
    <!-- Existing note image attachments (edit mode) -->
    <AttachmentImageGrid
      v-if="imageAttachments.length > 0"
      :attachments="imageAttachments"
      class="-mx-px -mt-px rounded-t-xl overflow-hidden"
      deletable
      :on-delete="deleteAtt"
      @delete="deleteAtt"
    />

    <!-- Pending image previews -->
    <NoteEditorPendingImages
      :files="pendingImageFiles"
      :class="imageAttachments.length === 0 ? '-mx-px -mt-px' : ''"
      @remove="removePendingFile"
    />

    <div class="p-4">
      <label :for="titleInputId" class="sr-only">Title</label>
      <input
        :id="titleInputId"
        ref="titleInputRef"
        v-model="draft.title"
        type="text"
        placeholder="Title"
        :maxlength="CONSTRAINTS.TITLE_MAX_LENGTH"
        :aria-invalid="draft.titleError || undefined"
        class="w-full bg-transparent text-lg font-medium placeholder-nord-frost outline-none mb-2 transition-colors"
        :class="draft.titleError
          ? 'text-nord-ember placeholder-nord-ember/60 border-b border-nord-ember'
          : 'text-nord-snow'"
        @input="onTitleInput"
      >

      <template v-if="draft.type === 'text'">
        <label :for="contentInputId" class="sr-only">Note</label>
        <textarea
          :id="contentInputId"
          ref="contentRef"
          v-model="draft.content"
          placeholder="Take a note..."
          rows="3"
          :maxlength="CONSTRAINTS.CONTENT_MAX_LENGTH"
          class="w-full bg-transparent text-sm text-nord-ice placeholder-nord-frost outline-none resize-none min-h-[80px] max-h-[60vh] overflow-y-auto"
          @input="autoResize"
        />
      </template>

      <NoteChecklist v-else v-model="draft.checklistItems" />

      <!-- File attachments list (existing note, non-image) -->
      <AttachmentFileList
        v-if="fileAttachments.length > 0 || uploadingOtherFiles.length > 0"
        :attachments="fileAttachments"
        :uploading-files="uploadingOtherFiles"
        :deletable="true"
        :note-id="note?.id"
        @delete="deleteAtt"
      />

      <div
        v-if="showUploading && fileAttachments.length === 0 && uploadingOtherFiles.length === 0"
        class="flex items-center gap-2 px-2 py-1.5 text-sm text-nord-frost"
        role="status"
      >
        <div class="w-3 h-3 border border-nord-frost border-t-transparent rounded-full animate-spin flex-shrink-0" />
        Uploading...
      </div>

      <!-- Pending non-image file chips -->
      <ul v-if="pendingOtherFiles.length > 0" class="mt-2 flex flex-wrap gap-2">
        <li
          v-for="file in pendingOtherFiles"
          :key="`${file.name}-${file.lastModified}`"
          class="flex items-center gap-1 px-2 py-1 bg-nord-graphite/50 rounded text-xs text-nord-ice"
        >
          <span>{{ file.name }}</span>
          <button
            type="button"
            class="ml-1 text-nord-frost hover:text-nord-ember transition-colors"
            :aria-label="`Remove ${file.name}`"
            @click.stop="removePendingFile(file)"
          >
            <UiIcon name="x-mark" class="w-3 h-3" />
          </button>
        </li>
      </ul>

      <div v-if="activeLabels.length > 0" class="flex flex-wrap gap-1 mt-3">
        <LabelChip v-for="label in activeLabels" :key="label.id" :label="label" />
      </div>
    </div>

    <!-- Bottom bar: toolbar + close button -->
    <div class="flex items-center justify-between px-3 pb-3">
      <NoteToolbar
        :note="note"
        :selected-label-ids="draft.labelIds"
        :copy-source="draft"
        :show-archive="!!note"
        :show-trash="!!note"
        @label="(ids) => (draft.labelIds = ids)"
        @add-file="triggerFileUpload"
        @type-toggle="draft.type = draft.type === 'text' ? 'checklist' : 'text'"
        @archive="$emit('archive')"
        @trash="$emit('trash')"
      />
      <button
        type="button"
        class="px-4 py-1.5 text-sm font-medium text-nord-ice hover:bg-nord-graphite rounded-lg transition-colors flex-shrink-0"
        @click="$emit('close')"
      >
        Close
      </button>
    </div>

    <input
      ref="fileInputRef"
      type="file"
      multiple
      class="hidden"
      tabindex="-1"
      aria-hidden="true"
      @change="onFilesSelected"
    >
  </div>
</template>

<script setup lang="ts">
import type { Note } from '#shared/types/notes'

// Editable fields of a note. Reads and writes the draft owned by the surrounding NoteModal.
const props = defineProps<{ note?: Note }>()

defineEmits<{
  close: []
  archive: []
  trash: []
}>()

const draft = useNoteDraft()
const { deleteAttachment } = useNoteAttachments()
const { labels } = useLabels()
const { isUploading } = useNoteUploadState()

const titleInputId = useId()
const contentInputId = useId()
const titleInputRef = ref<HTMLInputElement>()
const contentRef = ref<HTMLTextAreaElement>()

const {
  pendingImageFiles,
  pendingOtherFiles,
  uploadingOtherFiles,
  fileInputRef,
  triggerFileUpload,
  onFilesSelected,
  removePendingFile,
} = useEditorFileUpload(toRef(props, 'note'), draft)

const showUploading = computed(() => (props.note ? isUploading(props.note.id) : false))

const { images: imageAttachments, files: fileAttachments } = splitAttachments(() => props.note?.attachments ?? [])

const activeLabels = computed(() => labels.value.filter((l) => draft.labelIds.includes(l.id)))

const autoResize = () => {
  const el = contentRef.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = el.scrollHeight + 'px'
}

onMounted(() => {
  if (!props.note) nextTick(() => titleInputRef.value?.focus())
  nextTick(autoResize)
})

const onTitleInput = () => {
  if (draft.title.trim()) draft.titleError = false
}

const deleteAtt = (attId: string) => (props.note ? deleteAttachment(props.note.id, attId) : Promise.resolve(false))
</script>

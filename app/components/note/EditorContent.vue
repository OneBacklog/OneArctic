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
      :confirming-idx="confirmingPendingIdx"
      :class="imageAttachments.length === 0 ? '-mx-px -mt-px' : ''"
      @confirm="confirmingPendingIdx = $event"
      @cancel-confirm="confirmingPendingIdx = null"
      @remove="(i) => { removePendingImage(i); emitUpdate() }"
    />

    <div class="p-4">
      <!-- Title -->
      <input
        ref="titleInputRef"
        v-model="localTitle"
        type="text"
        placeholder="Title"
        :maxlength="CONSTRAINTS.TITLE_MAX_LENGTH"
        class="w-full bg-transparent text-lg font-medium placeholder-nord-frost outline-none mb-2 transition-colors"
        :class="titleError
          ? 'text-nord-ember placeholder-nord-ember/60 border-b border-nord-ember'
          : 'text-nord-snow'"
        @input="onTitleInput"
      >

      <!-- Text content -->
      <textarea
        v-if="localType === 'text'"
        ref="contentRef"
        v-model="localContent"
        placeholder="Take a note..."
        rows="3"
        :maxlength="CONSTRAINTS.CONTENT_MAX_LENGTH"
        class="w-full bg-transparent text-sm text-nord-ice placeholder-nord-frost outline-none resize-none min-h-[80px] max-h-[60vh] overflow-y-auto"
        @input="onContentInput"
      />

      <!-- Checklist -->
      <NoteChecklist
        v-if="localType === 'checklist'"
        v-model="localChecklistItems"
        @update="emitUpdate"
      />

      <!-- File attachments list (existing note, non-image) -->
      <AttachmentFileList
        v-if="fileAttachments.length > 0 || uploadingOtherFiles.length > 0"
        :attachments="fileAttachments"
        :uploading-files="uploadingOtherFiles"
        :deletable="true"
        :note-id="props.note?.id"
        @delete="deleteAtt"
      />

      <!-- Upload indicator -->
      <div v-if="showUploading && fileAttachments.length === 0 && uploadingOtherFiles.length === 0" class="flex items-center gap-2 px-2 py-1.5 text-sm text-nord-frost">
        <div class="w-3 h-3 border border-nord-frost border-t-transparent rounded-full animate-spin flex-shrink-0" />
        Uploading...
      </div>

      <!-- Pending non-image file chips -->
      <div v-if="pendingOtherFiles.length > 0" class="mt-2 flex flex-wrap gap-2">
        <div
          v-for="(f, i) in pendingOtherFiles"
          :key="i"
          class="flex items-center gap-1 px-2 py-1 bg-nord-graphite/50 rounded text-xs text-nord-ice"
        >
          <span>{{ f.name }}</span>
          <button
            class="ml-1 text-nord-frost hover:text-nord-ember transition-colors"
            @click.stop="removePendingOtherFile(i); emitUpdate()"
          >
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M6 18 18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
      </div>

      <!-- Active labels display -->
      <div v-if="activeLabels.length > 0" class="flex flex-wrap gap-1 mt-3">
        <LabelChip v-for="label in activeLabels" :key="label.id" :label="label" />
      </div>
    </div>

    <!-- Bottom bar: toolbar + close button -->
    <div class="flex items-center justify-between px-3 pb-3">
      <NoteToolbar
        :note="props.note"
        :selected-label-ids="localLabelIds"
        :show-archive="!!props.note"
        :show-trash="!!props.note"
        @label="onLabel"
        @add-file="triggerFileUpload"
        @type-toggle="toggleType"
        @archive="$emit('archive')"
        @trash="$emit('trash')"
      />
      <div class="flex items-center gap-2 flex-shrink-0">
        <button
          class="px-4 py-1.5 text-sm font-medium text-nord-ice hover:bg-nord-graphite rounded-lg transition-colors"
          @click="$emit('close')"
        >
          Close
        </button>
      </div>
    </div>

    <input ref="fileInputRef" type="file" multiple class="hidden" @change="onFilesSelected($event, emitUpdate)" >
  </div>
</template>

<script setup lang="ts">
import type { Note, ChecklistItem } from '~/composables/types'

const props = defineProps<{
  type: 'text' | 'checklist'
  title: string
  content: string
  selectedLabelIds: string[]
  checklistItems: ChecklistItem[]
  note?: Note
  initialFiles?: File[]
  titleError?: boolean
}>()

const emit = defineEmits<{
  update: [payload: any]
  close: []
  archive: []
  trash: []
}>()

const { deleteAttachment } = useNotes()
const { labels } = useLabels()

const localType = ref(props.type)
const localTitle = ref(props.title)
const localContent = ref(props.content)
const localLabelIds = ref<string[]>([...props.selectedLabelIds])
const localChecklistItems = ref<ChecklistItem[]>([...props.checklistItems])
const titleError = ref(props.titleError ?? false)
const titleInputRef = ref<HTMLInputElement>()
const contentRef = ref<HTMLTextAreaElement>()

watch(() => props.titleError, (v) => { if (v !== undefined) titleError.value = v })

const {
  pendingImageFiles,
  pendingOtherFiles,
  uploadingOtherFiles,
  uploading,
  confirmingPendingIdx,
  fileInputRef,
  triggerFileUpload,
  onFilesSelected,
  removePendingImage,
  removePendingOtherFile,
} = useEditorFileUpload(toRef(props, 'note'), props.initialFiles)

const { isUploading: isGlobalUploading } = useNoteUploadState()
const showUploading = computed(() =>
  uploading.value || (props.note?.id ? isGlobalUploading(props.note.id) : false)
)

const { images: imageAttachments, files: fileAttachments } = splitAttachments(
  () => props.note?.attachments ?? []
)

const activeLabels = computed(() =>
  labels.value.filter((l) => localLabelIds.value.includes(l.id))
)

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

const emitUpdate = () => {
  emit('update', {
    type: localType.value,
    title: localTitle.value,
    content: localContent.value,
    selectedLabelIds: localLabelIds.value,
    checklistItems: localChecklistItems.value,
    pendingFiles: [...(pendingImageFiles.value), ...(pendingOtherFiles.value)],
  })
}

const onTitleInput = () => {
  if (localTitle.value.trim()) titleError.value = false
  emitUpdate()
}

const onContentInput = () => { autoResize(); emitUpdate() }
const toggleType = () => { localType.value = localType.value === 'text' ? 'checklist' : 'text'; emitUpdate() }
const onLabel = (ids: string[]) => { localLabelIds.value = ids; emitUpdate() }

const deleteAtt = async (attId: string) => {
  if (props.note) await deleteAttachment(props.note.id, attId)
}

defineExpose({ showTitleError: () => { titleError.value = true } })
</script>

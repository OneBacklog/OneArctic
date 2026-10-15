<template>
  <UiModal
    :labelledby="readonly && note ? titleId : undefined"
    :label="readonly && note ? undefined : (note ? 'Edit Note' : 'New Note')"
    backdrop-class="bg-black/60 py-8 overflow-y-auto"
    panel-class="w-full max-w-xl rounded-xl shadow-2xl border border-nord-graphite bg-nord-obsidian my-auto"
    @close="handleClose"
  >
    <NoteReadonlyView
      v-if="readonly && note"
      :note="note"
      :status="note.isTrashed ? 'trashed' : 'archived'"
      :title-id="titleId"
      @close="emit('close')"
      @unarchive="emitAndClose('unarchive')"
      @restore="emitAndClose('restore')"
      @trash="emitAndClose('trash')"
      @delete-forever="emitAndClose('delete-forever')"
    />

    <NoteEditorContent
      v-else
      :note="note"
      @close="handleClose"
      @archive="onArchive"
      @trash="onTrash"
    />
  </UiModal>
</template>

<script setup lang="ts">
import type { Note, NoteType } from '#shared/types/notes'

const props = defineProps<{
  note?: Note
  readonly?: boolean
  initialType?: NoteType
  initialFiles?: File[]
  defaultLabelIds?: string[]
}>()

const emit = defineEmits<{
  close: []
  unarchive: [note: Note]
  trash: [note: Note]
  restore: [note: Note]
  'delete-forever': [note: Note]
}>()

const titleId = useId()
const draft = createNoteDraft(props)
const { createNote, updateNote, archiveNote, unarchiveNote, trashNote } = useNoteMutations()
const { show: showSnackbar } = useSnackbar()
const { isUploading } = useNoteUploadState()

const emitAndClose = (event: 'unarchive' | 'restore' | 'trash' | 'delete-forever') => {
  if (!props.note) return
  // Vue's typed emit can't take a union of event names, so dispatch explicitly
  if (event === 'unarchive') emit('unarchive', props.note)
  else if (event === 'restore') emit('restore', props.note)
  else if (event === 'trash') emit('trash', props.note)
  else emit('delete-forever', props.note)
  emit('close')
}

// After a failed save the next close discards the changes, so the user is never trapped in the modal
const saveFailed = ref(false)

const save = async () => {
  if (props.note) {
    await updateNote(props.note.id, draftToPayload(draft))
    return
  }
  const payload = draftToPayload(draft)
  // Notes created from a label page always keep that label
  payload.labelIds = [...new Set([...(props.defaultLabelIds ?? []), ...payload.labelIds])]
  await createNote(payload, draft.pendingFiles)
}

const handleClose = async () => {
  if (props.readonly) {
    emit('close')
    return
  }
  if (props.note && isUploading(props.note.id)) return

  const isNewAndEmpty = !props.note && !draftHasContent(draft)
  if (!isNewAndEmpty && !saveFailed.value) {
    if (!draft.title.trim()) {
      draft.titleError = true
      showSnackbar('Title is Required', 'error')
      return
    }
    try {
      await save()
    } catch (e) {
      saveFailed.value = true
      const fallback = props.note ? 'Failed to Save Note' : 'Failed to Create Note'
      showSnackbar(`${getErrorMessage(e, fallback)}. Close Again to Discard Changes`, 'error')
      return
    }
  }
  emit('close')
}

const onArchive = async () => {
  if (!props.note) return
  if (props.note.isArchived) await unarchiveNote(props.note.id)
  else await archiveNote(props.note.id)
  emit('close')
}

const onTrash = async () => {
  if (!props.note) return
  await trashNote(props.note.id)
  emit('close')
}
</script>

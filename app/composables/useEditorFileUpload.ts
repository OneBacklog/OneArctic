import type { Note } from '#shared/types/notes'
import type { NoteDraft } from './useNoteDraft'

/**
 * File picking for the note editor. Existing notes upload immediately; new notes keep the
 * files in the draft until the note is created.
 */
export function useEditorFileUpload(noteRef: Readonly<Ref<Note | undefined>>, draft: NoteDraft) {
  const { uploadAttachment } = useNoteAttachments()
  const { validate: validateFiles } = useFileValidation()

  const uploadingOtherFiles = ref<File[]>([])

  // Same rule as the attachment list, so a pending file shows where it will appear once uploaded
  const isImageFile = (f: File) => isDisplayableImage(f.type, f.name)
  const pendingImageFiles = computed(() => draft.pendingFiles.filter(isImageFile))
  const pendingOtherFiles = computed(() => draft.pendingFiles.filter((f) => !isImageFile(f)))

  const fileInputRef = ref<HTMLInputElement>()
  const triggerFileUpload = () => fileInputRef.value?.click()

  const onFilesSelected = async (e: Event) => {
    const input = e.target as HTMLInputElement
    const files = validateFiles(Array.from(input.files || []))
    input.value = ''
    if (!files.length) return

    if (!noteRef.value) {
      draft.pendingFiles = [...draft.pendingFiles, ...files]
      return
    }
    const otherFiles = files.filter((f) => !isImageFile(f))
    uploadingOtherFiles.value = [...uploadingOtherFiles.value, ...otherFiles]
    try {
      await uploadAttachment(noteRef.value.id, files)
    } finally {
      uploadingOtherFiles.value = uploadingOtherFiles.value.filter((f) => !otherFiles.includes(f))
    }
  }

  const removePendingFile = (file: File) => {
    draft.pendingFiles = draft.pendingFiles.filter((f) => f !== file)
  }

  return {
    pendingImageFiles,
    pendingOtherFiles,
    uploadingOtherFiles,
    fileInputRef,
    triggerFileUpload,
    onFilesSelected,
    removePendingFile,
  }
}

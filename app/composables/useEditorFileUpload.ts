import type { Note } from '#shared/types/notes'

export function useEditorFileUpload(
  noteRef: Readonly<Ref<Note | undefined>>,
  initialFiles?: File[]
) {
  const { uploadAttachment } = useNotes()
  const { validate: validateFiles } = useFileValidation()
  const { startUpload, endUpload } = useNoteUploadState()

  const pendingFiles = ref<File[]>([...(initialFiles ?? [])])
  const uploadingOtherFiles = ref<File[]>([])
  const uploading = ref(false)
  const confirmingPendingIdx = ref<number | null>(null)

  const pendingImageFiles = computed(() =>
    pendingFiles.value.filter((f) => f.type.startsWith('image/'))
  )
  const pendingOtherFiles = computed(() =>
    pendingFiles.value.filter((f) => !f.type.startsWith('image/'))
  )

  const fileInputRef = ref<HTMLInputElement>()

  const triggerFileUpload = () => fileInputRef.value?.click()

  const onFilesSelected = async (e: Event, onPendingAdded?: () => void) => {
    const input = e.target as HTMLInputElement
    const files = validateFiles(Array.from(input.files || []))
    if (!files.length) { input.value = ''; return }

    if (noteRef.value) {
      const otherFiles = files.filter((f) => !f.type.startsWith('image/'))
      if (otherFiles.length > 0) {
        uploadingOtherFiles.value = [...uploadingOtherFiles.value, ...otherFiles]
      }
      uploading.value = true
      startUpload(noteRef.value.id)
      try {
        await uploadAttachment(noteRef.value.id, files)
      } finally {
        if (otherFiles.length > 0) {
          uploadingOtherFiles.value = uploadingOtherFiles.value.filter((f) => !otherFiles.includes(f))
        }
        uploading.value = false
        endUpload(noteRef.value.id)
      }
    } else {
      pendingFiles.value.push(...files)
      onPendingAdded?.()
    }
    input.value = ''
  }

  const removePendingImage = (imageIdx: number) => {
    const file = pendingImageFiles.value[imageIdx]
    if (file) {
      pendingFiles.value = pendingFiles.value.filter((f) => f !== file)
      confirmingPendingIdx.value = null
    }
  }

  const removePendingOtherFile = (otherIdx: number) => {
    const file = pendingOtherFiles.value[otherIdx]
    if (file) {
      pendingFiles.value = pendingFiles.value.filter((f) => f !== file)
    }
  }

  return {
    pendingFiles,
    uploadingOtherFiles,
    uploading,
    confirmingPendingIdx,
    pendingImageFiles,
    pendingOtherFiles,
    fileInputRef,
    triggerFileUpload,
    onFilesSelected,
    removePendingImage,
    removePendingOtherFile,
  }
}

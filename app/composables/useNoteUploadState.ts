// Number of uploads in flight per note (a note can have several concurrent uploads)
const _uploading = reactive<Record<string, number>>({})

export const useNoteUploadState = () => {
  const startUpload = (noteId: string) => { _uploading[noteId] = (_uploading[noteId] ?? 0) + 1 }
  const endUpload = (noteId: string) => {
    const remaining = (_uploading[noteId] ?? 1) - 1
    if (remaining > 0) _uploading[noteId] = remaining
    else delete _uploading[noteId]
  }
  const isUploading = (noteId: string) => !!_uploading[noteId]
  return { startUpload, endUpload, isUploading }
}

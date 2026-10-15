import type { Attachment } from '#shared/types/notes'

const attachmentsUrl = (noteId: string): string => `/api/notes/${noteId}/attachments`
const attachmentUrl = (noteId: string, attId: string): string => `/api/notes/${noteId}/attachments/${attId}`

/** Give files without a usable extension (pasted images are often just "blob") one from their type. */
function fileWithExt(f: File): [File, string] {
  const raw = f.name || 'file'
  const dotIdx = raw.lastIndexOf('.')
  const ext = dotIdx > -1 ? raw.slice(dotIdx).toLowerCase() : ''
  const mimeExt = MIME_TO_EXT[f.type]
  if (mimeExt && (!ext || ext === '.bin' || raw === 'blob')) {
    const base = ext ? raw.slice(0, dotIdx) : raw
    return [f, `${base || 'file'}${mimeExt}`]
  }
  return [f, raw]
}

export const useNoteAttachments = () => {
  const apiFetch = useNuxtApp().$api
  const { updateLoadedNote } = useNotesState()
  const { startUpload, endUpload } = useNoteUploadState()

  /** Upload files one request at a time (keeps each under the server's size limit). Failures show a snackbar. */
  const uploadAttachment = async (noteId: string, files: File[]) => {
    const uploaded: Attachment[] = []
    startUpload(noteId)
    try {
      for (const f of files) {
        const form = new FormData()
        const [file, name] = fileWithExt(f)
        form.append('files', file, name)
        const result = await withErrorSnackbar('Upload Failed', () =>
          apiFetch<Attachment[]>(attachmentsUrl(noteId), { method: 'POST', body: form })
        )
        if (result) uploaded.push(...result)
      }
    } finally {
      endUpload(noteId)
    }
    updateLoadedNote(noteId, (note) => ({ ...note, attachments: [...note.attachments, ...uploaded] }))
    return uploaded
  }

  const deleteAttachment = async (noteId: string, attId: string) => {
    const ok = await withErrorSnackbar('Failed to Delete Attachment', async () => {
      await apiFetch(attachmentUrl(noteId, attId), { method: 'DELETE' })
      return true
    })
    if (!ok) return false
    updateLoadedNote(noteId, (note) => ({ ...note, attachments: note.attachments.filter((a) => a.id !== attId) }))
    return true
  }

  /** Resolves to the renamed attachment, or undefined on failure (an error snackbar is shown). */
  const renameAttachment = async (noteId: string, attId: string, filename: string) => {
    const attachment = await withErrorSnackbar('Rename Failed', () =>
      apiFetch<Attachment>(attachmentUrl(noteId, attId), { method: 'PUT', body: { filename } })
    )
    if (!attachment) return undefined
    updateLoadedNote(noteId, (note) => ({
      ...note,
      attachments: note.attachments.map((a) => (a.id === attId ? attachment : a)),
    }))
    return attachment
  }

  const reorderAttachments = async (noteId: string, ids: string[]) => {
    const ok = await withErrorSnackbar('Reorder Failed', async () => {
      await apiFetch(`${attachmentsUrl(noteId)}/reorder`, { method: 'PUT', body: { ids } })
      return true
    })
    if (!ok) return false
    updateLoadedNote(noteId, (note) => {
      const byId = new Map(note.attachments.map((a) => [a.id, a]))
      const attachments = ids.flatMap((id, position) => {
        const att = byId.get(id)
        return att ? [{ ...att, position }] : []
      })
      return { ...note, attachments }
    })
    return true
  }

  return { uploadAttachment, deleteAttachment, renameAttachment, reorderAttachments }
}

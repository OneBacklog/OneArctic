import type { ChecklistItem, Note, NoteType } from '#shared/types/notes'

export interface NotePayload {
  type?: NoteType
  title?: string
  content?: string
  labelIds?: string[]
  checklistItems?: ChecklistItem[]
}

export const useNoteMutations = () => {
  const apiFetch = useNuxtApp().$api
  const { notes, updateLoadedNote, removeLoadedNote } = useNotesState()
  const { uploadAttachment } = useNoteAttachments()
  const { runLocal } = useRealtimeResource({ localEventsKey: 'local-note-events', eventKeys: noteEventKeys })
  const snackbar = useSnackbar()

  /** Create a note, then upload its files in the background. Throws on failure so the editor can stay open. */
  const createNote = async (payload: NotePayload, files: File[] = []) => {
    const note = await apiFetch<Note>('/api/notes', { method: 'POST', body: payload })
    notes.value.unshift(note)
    if (files.length) void uploadAttachment(note.id, files)
    return note
  }

  /** Throws on failure so the editor can keep the user's changes. */
  const updateNote = async (id: string, payload: NotePayload) => {
    const updated = await runLocal(`note.updated:${id}`, () =>
      apiFetch<Note>(noteUrl(id), { method: 'PUT', body: payload })
    )
    const previous = notes.value.find((n) => n.id === id)
    const movedOut = previous && (updated.isArchived || updated.isTrashed) &&
      (previous.isArchived !== updated.isArchived || previous.isTrashed !== updated.isTrashed)
    if (movedOut) removeLoadedNote(id)
    else updateLoadedNote(id, () => updated)
    return updated
  }

  /** Change a note's archive/trash status and drop it from the current list. Resolves false on failure. */
  const setNoteStatus = async (
    id: string,
    patch: { isArchived?: boolean; isTrashed?: boolean },
    successMessage: string,
    errorMessage: string,
  ) => {
    const ok = await withErrorSnackbar(errorMessage, async () => {
      await runLocal(`note.updated:${id}`, () => apiFetch(noteUrl(id), { method: 'PUT', body: patch }))
      return true
    })
    if (!ok) return false
    removeLoadedNote(id)
    snackbar.show(successMessage)
    return true
  }

  const trashNote = (id: string) => setNoteStatus(id, { isTrashed: true }, 'Note Moved to Trash', 'Failed to Move Note to Trash')
  const restoreNote = (id: string) => setNoteStatus(id, { isTrashed: false }, 'Note Restored', 'Failed to Restore Note')
  const archiveNote = (id: string) => setNoteStatus(id, { isArchived: true }, 'Note Archived', 'Failed to Archive Note')
  const unarchiveNote = (id: string) => setNoteStatus(id, { isArchived: false }, 'Note Unarchived', 'Failed to Unarchive Note')

  const deleteNote = async (id: string) => {
    const ok = await withErrorSnackbar('Failed to Delete Note', async () => {
      await runLocal(`note.deleted:${id}`, () => apiFetch(noteUrl(id), { method: 'DELETE' }))
      return true
    })
    if (!ok) return false
    removeLoadedNote(id)
    snackbar.show('Note Permanently Deleted')
    return true
  }

  const emptyTrash = async () => {
    const ok = await withErrorSnackbar('Failed to Empty Trash', async () => {
      await apiFetch('/api/notes/trash', { method: 'DELETE' })
      return true
    })
    if (!ok) return false
    notes.value = notes.value.filter((n) => !n.isTrashed)
    snackbar.show('All Trash Permanently Deleted')
    return true
  }

  return { createNote, updateNote, trashNote, restoreNote, archiveNote, unarchiveNote, deleteNote, emptyTrash }
}

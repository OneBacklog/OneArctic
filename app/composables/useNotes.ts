import type { Note } from './types'

const MIME_EXT: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',
  'image/heic': '.heic',
  'image/heif': '.heif',
  'image/avif': '.avif',
  'image/bmp': '.bmp',
  'image/tiff': '.tiff',
  'image/svg+xml': '.svg',
  'application/pdf': '.pdf',
  'text/plain': '.txt',
  'video/mp4': '.mp4',
  'video/webm': '.webm',
  'audio/mpeg': '.mp3',
  'audio/ogg': '.ogg',
  'audio/wav': '.wav',
}

function fileWithExt(f: File): [File, string] {
  const raw = f.name || 'file'
  const dotIdx = raw.lastIndexOf('.')
  const ext = dotIdx > -1 ? raw.slice(dotIdx).toLowerCase() : ''
  // Use MIME-derived extension when filename has none, is generic (.bin), or is just 'blob'
  const mimeExt = MIME_EXT[f.type]
  if (mimeExt && (!ext || ext === '.bin' || raw === 'blob')) {
    const base = ext ? raw.slice(0, dotIdx) : raw
    return [f, `${base || 'file'}${mimeExt}`]
  }
  return [f, raw]
}

export const useNotes = (options: { realtime?: boolean } = {}) => {
  const notes = useState<Note[]>('notes', () => [])
  const loading = useState<boolean>('notes-loading', () => false)
  const hasMore = useState<boolean>('notes-has-more', () => false)
  const notesPage = useState<number>('notes-page', () => 1)
  const notesParams = useState<{ archived?: boolean; trashed?: boolean; label?: string }>('notes-params', () => ({}))

  const apiFetch = useRequestFetch()
  const { syncNote, refreshSearch } = useSearch()
  const refreshVersion = useState<number>('notes-refresh-version', () => 0)
  const requestVersion = useState<number>('notes-request-version', () => 0)
  const localNoteEvents = useState<string[]>('local-note-events', () => [])

  const markLocalNoteEvent = (key: string) => {
    localNoteEvents.value = [...localNoteEvents.value, key]
  }

  const consumeLocalNoteEvent = (key: string) => {
    const index = localNoteEvents.value.indexOf(key)
    if (index === -1) return false
    localNoteEvents.value = localNoteEvents.value.filter((_, i) => i !== index)
    return true
  }

  const discardLocalNoteEvent = (key: string) => {
    localNoteEvents.value = localNoteEvents.value.filter((eventKey) => eventKey !== key)
  }

  const runLocalNoteMutation = async <T>(id: string, request: () => Promise<T>) => {
    const eventKey = `note.updated:${id}`
    markLocalNoteEvent(eventKey)
    try {
      return await request()
    } catch (error) {
      discardLocalNoteEvent(eventKey)
      throw error
    }
  }

  const fetchNotes = async (params: { archived?: boolean; trashed?: boolean; label?: string } = {}) => {
    const version = ++requestVersion.value
    loading.value = true
    notesParams.value = params
    notesPage.value = 1
    try {
      const query: Record<string, string> = { page: '1' }
      if (params.archived) query.archived = 'true'
      if (params.trashed) query.trashed = 'true'
      if (params.label) query.label = params.label
      const data = await apiFetch<{ notes: Note[]; hasMore: boolean }>('/api/notes', {
        query: { ...query, _sync: String(Date.now()) },
        cache: 'no-store',
      })
      if (version === requestVersion.value && JSON.stringify(params) === JSON.stringify(notesParams.value)) {
        notes.value = data.notes
        hasMore.value = data.hasMore
      }
    } finally {
      loading.value = false
    }
  }

  const fetchMoreNotes = async () => {
    if (loading.value || !hasMore.value) return
    loading.value = true
    try {
      const params = notesParams.value
      const nextPage = notesPage.value + 1
      const query: Record<string, string> = { page: String(nextPage) }
      if (params.archived) query.archived = 'true'
      if (params.trashed) query.trashed = 'true'
      if (params.label) query.label = params.label
      const data = await apiFetch<{ notes: Note[]; hasMore: boolean }>('/api/notes', {
        query,
        cache: 'no-store',
      })
      notes.value = [...notes.value, ...data.notes]
      hasMore.value = data.hasMore
      notesPage.value = nextPage
    } finally {
      loading.value = false
    }
  }

  const refreshLoadedNotes = async () => {
    const version = ++refreshVersion.value
    const request = ++requestVersion.value
    const params = { ...notesParams.value }
    const page = notesPage.value
    const pages: Note[] = []
    let nextHasMore = false

    for (let currentPage = 1; currentPage <= page; currentPage++) {
      const query: Record<string, string> = { page: String(currentPage) }
      if (params.archived) query.archived = 'true'
      if (params.trashed) query.trashed = 'true'
      if (params.label) query.label = params.label
      const data = await apiFetch<{ notes: Note[]; hasMore: boolean }>('/api/notes', {
        query: { ...query, _sync: String(Date.now()) },
        cache: 'no-store',
      })
      pages.push(...data.notes)
      nextHasMore = data.hasMore
      if (!data.hasMore) break
    }

    if (
      version === refreshVersion.value &&
      request === requestVersion.value &&
      JSON.stringify(params) === JSON.stringify(notesParams.value)
    ) {
      notes.value = pages
      hasMore.value = nextHasMore
      await refreshSearch()
    }
  }

  if (options.realtime) {
    const { subscribe } = useEventSource()
    const unsubscribe = subscribe((event) => {
      const labelsChanged = event.type === 'label.updated' || event.type === 'label.deleted'
      const isLabelEvent = event.type.startsWith('label.')
      const shouldRefreshNotes = labelsChanged ||
        (!isLabelEvent && (event.resource === 'notes' || event.resource === 'all'))
      if (shouldRefreshNotes) {
        const data = event.data as { note?: { id?: string }; noteId?: string } | undefined
        const noteId = data?.note?.id ?? data?.noteId
        const eventKey = noteId ? `${event.type}:${noteId}` : null
        if (eventKey && consumeLocalNoteEvent(eventKey)) return
        refreshLoadedNotes().catch(() => {})
      }
    })
    onScopeDispose(unsubscribe)
  }

  const createNote = async (payload: Partial<Note> & { labelIds?: string[] }) => {
    const note = await apiFetch<Note>('/api/notes', { method: 'POST', body: payload })
    notes.value.unshift(note)
    return note
  }

  const updateNote = async (id: string, payload: Partial<Note> & { labelIds?: string[] }) => {
    const updated = await runLocalNoteMutation(id, () =>
      apiFetch<Note>(`/api/notes/${id}`, { method: 'PUT', body: payload })
    )
    const idx = notes.value.findIndex((n) => n.id === id)
    if (idx !== -1) {
      const prev = notes.value[idx]!
      const statusChanged = prev.isArchived !== updated.isArchived || prev.isTrashed !== updated.isTrashed
      if (statusChanged && (updated.isArchived || updated.isTrashed)) {
        notes.value.splice(idx, 1)
      } else {
        notes.value[idx] = updated
      }
    }
    syncNote(updated)
    return updated
  }

  const deleteNote = async (id: string) => {
    await apiFetch(`/api/notes/${id}`, { method: 'DELETE' })
    notes.value = notes.value.filter((n) => n.id !== id)
    useSnackbar().show('Note Permanently Deleted')
  }

  const trashNote = async (id: string) => {
    await runLocalNoteMutation(id, () =>
      apiFetch(`/api/notes/${id}`, { method: 'PUT', body: { isTrashed: true } })
    )
    notes.value = notes.value.filter((n) => n.id !== id)
    useSnackbar().show('Note Moved to Trash')
  }

  const restoreNote = async (id: string) => {
    await runLocalNoteMutation(id, () =>
      apiFetch(`/api/notes/${id}`, { method: 'PUT', body: { isTrashed: false } })
    )
    notes.value = notes.value.filter((n) => n.id !== id)
    useSnackbar().show('Note Restored')
  }

  const archiveNote = async (id: string) => {
    await runLocalNoteMutation(id, () =>
      apiFetch(`/api/notes/${id}`, { method: 'PUT', body: { isArchived: true } })
    )
    notes.value = notes.value.filter((n) => n.id !== id)
    useSnackbar().show('Note Archived')
  }

  const unarchiveNote = async (id: string) => {
    await runLocalNoteMutation(id, () =>
      apiFetch(`/api/notes/${id}`, { method: 'PUT', body: { isArchived: false } })
    )
    notes.value = notes.value.filter((n) => n.id !== id)
    useSnackbar().show('Note Unarchived')
  }

  const uploadAttachment = async (noteId: string, files: File[]) => {
    const form = new FormData()
    files.forEach((f) => {
      const [file, name] = fileWithExt(f)
      form.append('files', file, name)
    })
    let result: { attachments: Note['attachments'] }
    try {
      result = await apiFetch<{ attachments: Note['attachments'] }>(`/api/notes/${noteId}/attachments`, {
        method: 'POST',
        body: form,
      })
    } catch (err: any) {
      const msg = err?.data?.statusMessage || err?.statusMessage || err?.message || 'Upload Failed'
      useSnackbar().show(msg, 'error')
      return []
    }
    const idx = notes.value.findIndex((n) => n.id === noteId)
    if (idx !== -1) {
      notes.value[idx]!.attachments.push(...result.attachments)
    }
    return result.attachments
  }

  const deleteAttachment = async (noteId: string, attId: string) => {
    await apiFetch(`/api/notes/${noteId}/attachments/${attId}`, { method: 'DELETE' })
    const idx = notes.value.findIndex((n) => n.id === noteId)
    if (idx !== -1) {
      notes.value[idx]!.attachments = notes.value[idx]!.attachments.filter((a) => a.id !== attId)
    }
  }

  const renameAttachment = async (noteId: string, attId: string, filename: string) => {
    const data = await apiFetch<{ attachment: Note['attachments'][number] }>(
      `/api/notes/${noteId}/attachments/${attId}`,
      { method: 'PUT', body: { filename } }
    )
    const idx = notes.value.findIndex((n) => n.id === noteId)
    if (idx !== -1) {
      const note = notes.value[idx]!
      note.attachments = note.attachments.map((a) => (a.id === attId ? data.attachment : a))
      syncNote(note)
    }
    return data.attachment
  }

  const reorderAttachments = async (noteId: string, ids: string[]) => {
    await apiFetch(`/api/notes/${noteId}/attachments/reorder`, { method: 'PUT', body: { ids } })
    const idx = notes.value.findIndex((n) => n.id === noteId)
    if (idx !== -1) {
      const note = notes.value[idx]!
      const byId = new Map(note.attachments.map((a) => [a.id, a]))
      note.attachments = ids
        .map((id, position) => {
          const att = byId.get(id)
          return att ? { ...att, position } : null
        })
        .filter((a): a is NonNullable<typeof a> => Boolean(a))
      syncNote(note)
    }
  }

  const emptyTrash = async () => {
    const trashed = notes.value.filter((n) => n.isTrashed)
    await Promise.all(trashed.map((n) => apiFetch(`/api/notes/${n.id}`, { method: 'DELETE' })))
    notes.value = notes.value.filter((n) => !n.isTrashed)
    useSnackbar().show('All Trash Permanently Deleted')
  }

  return {
    notes: readonly(notes),
    loading: readonly(loading),
    hasMore: readonly(hasMore),
    fetchNotes,
    fetchMoreNotes,
    refreshLoadedNotes,
    createNote,
    updateNote,
    deleteNote,
    trashNote,
    restoreNote,
    archiveNote,
    unarchiveNote,
    uploadAttachment,
    deleteAttachment,
    renameAttachment,
    reorderAttachments,
    emptyTrash,
  }
}

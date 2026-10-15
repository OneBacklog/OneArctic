import type { Note } from '#shared/types/notes'

export type NotesParams = { archived?: boolean; trashed?: boolean; labelId?: string }
type NotesPage = { notes: Note[]; hasMore: boolean }

// Typed as plain strings: Nitro's typed routes match `/api/notes/${id}` against static
// siblings such as `/api/notes/search` (GET only) and would reject PUT/DELETE.
export const noteUrl = (id: string): string => `/api/notes/${id}`

const notesQuery = (params: NotesParams, page: number): Record<string, string> => {
  const query: Record<string, string> = { page: String(page) }
  if (params.archived) query.archived = 'true'
  if (params.trashed) query.trashed = 'true'
  if (params.labelId) query.labelId = params.labelId
  return query
}

/** List state shared by the list, note mutations and attachment mutations. */
export const useNotesState = () => {
  const notes = useState<Note[]>('notes', () => [])
  const { syncNote } = useSearch()

  /** Apply `update` to a loaded note and mirror the result into search results. */
  const updateLoadedNote = (id: string, update: (note: Note) => Note) => {
    const index = notes.value.findIndex((n) => n.id === id)
    if (index === -1) return
    const next = update(notes.value[index]!)
    notes.value[index] = next
    syncNote(next)
  }

  const removeLoadedNote = (id: string) => {
    notes.value = notes.value.filter((n) => n.id !== id)
  }

  return {
    notes,
    loading: useState<boolean>('notes-loading', () => false),
    hasMore: useState<boolean>('notes-has-more', () => false),
    page: useState<number>('notes-page', () => 1),
    params: useState<NotesParams>('notes-params', () => ({})),
    updateLoadedNote,
    removeLoadedNote,
  }
}

export const useNotesList = (options: { realtime?: boolean } = {}) => {
  const { notes, loading, hasMore, page, params, updateLoadedNote } = useNotesState()
  const apiFetch = useNuxtApp().$api
  const { refreshSearch } = useSearch()
  const refreshVersion = useState<number>('notes-refresh-version', () => 0)
  const requestVersion = useState<number>('notes-request-version', () => 0)

  const fetchPage = (pageParams: NotesParams, pageNumber: number, bypassCache = false) =>
    apiFetch<NotesPage>('/api/notes', {
      query: bypassCache ? { ...notesQuery(pageParams, pageNumber), _sync: String(Date.now()) } : notesQuery(pageParams, pageNumber),
      cache: 'no-store',
    })

  const fetchNotes = async (nextParams: NotesParams = {}) => {
    const version = ++requestVersion.value
    loading.value = true
    params.value = nextParams
    page.value = 1
    try {
      const data = await fetchPage(nextParams, 1, true)
      if (version === requestVersion.value && JSON.stringify(nextParams) === JSON.stringify(params.value)) {
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
      const nextPage = page.value + 1
      const data = await fetchPage(params.value, nextPage)
      notes.value = [...notes.value, ...data.notes]
      hasMore.value = data.hasMore
      page.value = nextPage
    } finally {
      loading.value = false
    }
  }

  /** Re-fetch every page loaded so far, e.g. after another device changed the list. */
  const refreshLoadedNotes = async () => {
    const version = ++refreshVersion.value
    const request = ++requestVersion.value
    const currentParams = { ...params.value }
    const loaded: Note[] = []
    let nextHasMore = false

    for (let currentPage = 1; currentPage <= page.value; currentPage++) {
      const data = await fetchPage(currentParams, currentPage, true)
      loaded.push(...data.notes)
      nextHasMore = data.hasMore
      if (!data.hasMore) break
    }

    if (
      version === refreshVersion.value &&
      request === requestVersion.value &&
      JSON.stringify(currentParams) === JSON.stringify(params.value)
    ) {
      notes.value = loaded
      hasMore.value = nextHasMore
      await refreshSearch()
    }
  }

  const refreshNote = async (id: string) => {
    if (!notes.value.some((note) => note.id === id)) return
    const note = await apiFetch<Note>(noteUrl(id), { cache: 'no-store' })
    updateLoadedNote(id, () => note)
  }

  if (options.realtime) {
    const logRefreshError = (error: unknown) => console.warn('[realtime] Failed to refresh notes:', error)

    useRealtimeResource({
      localEventsKey: 'local-note-events',
      eventKeys: noteEventKeys,
      onEvent: (event) => {
        // Label renames and deletions change the labels shown on notes
        if (event.type === 'label.updated' || event.type === 'label.deleted') {
          refreshLoadedNotes().catch(logRefreshError)
          return
        }
        if (event.data.resource === 'labels') return

        const noteId = 'noteId' in event.data ? event.data.noteId : 'note' in event.data ? event.data.note.id : undefined
        if (event.type.startsWith('attachment.') && noteId) {
          refreshNote(noteId).catch(logRefreshError)
        } else if (event.type === 'note.updated' && event.data.refresh !== 'list') {
          refreshNote(event.data.note.id).catch(logRefreshError)
        } else {
          refreshLoadedNotes().catch(logRefreshError)
        }
      },
    })
  }

  return {
    notes: readonly(notes),
    loading: readonly(loading),
    hasMore: readonly(hasMore),
    fetchNotes,
    fetchMoreNotes,
  }
}

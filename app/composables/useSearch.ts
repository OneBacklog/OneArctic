import type { Note } from './types'
import { CONSTRAINTS } from '~/utils/constants'

export const useSearch = () => {
  const searchQuery = useState<string>('search-query', () => '')
  const searchResults = useState<Note[] | null>('search-results', () => null)
  const searching = useState<boolean>('searching', () => false)
  const searchPage = useState<number>('search-page', () => 1)
  const searchHasMore = useState<boolean>('search-has-more', () => false)
  const searchContext = useState<'notes' | 'archive' | 'trash'>('search-context', () => 'notes')
  const searchLabelId = useState<string | null>('search-label-id', () => null)
  const apiFetch = useRequestFetch()

  /**
   * Re-syncs an updated note into active search results and re-applies highlights.
   * Called by useNotes.updateNote to keep search state consistent after edits.
   */
  const syncNote = (updated: Note) => {
    if (!searchResults.value) return
    const id = updated.id
    if (!searchResults.value.some((n) => n.id === id)) return

    searchResults.value = searchResults.value.map((n) => (n.id === id ? updated : n))
  }

  const runSearch = async (
    q: string,
    context: 'notes' | 'archive' | 'trash' = 'notes',
    labelId?: string,
    page = 1,
    append = false,
  ) => {
    searching.value = true
    try {
      const params: Record<string, string> = {
        q,
        context,
        page: String(page),
        limit: String(CONSTRAINTS.PAGINATION_LIMIT),
      }
      if (labelId) params.labelId = labelId
      const data = await apiFetch<{ notes: Note[]; hasMore: boolean; page: number }>('/api/notes/search', { query: params })
      searchResults.value = append ? [...(searchResults.value || []), ...data.notes] : data.notes
      searchHasMore.value = data.hasMore
      searchPage.value = data.page
    } finally {
      searching.value = false
    }
  }

  const performSearch = async (
    q: string,
    context: 'notes' | 'archive' | 'trash' = 'notes',
    labelId?: string,
  ) => {
    searchQuery.value = q
    searchContext.value = context
    searchLabelId.value = labelId || null
    if (!q.trim()) {
      searchResults.value = null
      searchHasMore.value = false
      searchPage.value = 1
      return
    }
    searchPage.value = 1
    await runSearch(q, context, labelId, 1, false)
  }

  const fetchMore = async () => {
    if (searching.value || !searchHasMore.value) return
    if (!searchQuery.value.trim()) return
    const nextPage = searchPage.value + 1
    await runSearch(searchQuery.value, searchContext.value, searchLabelId.value || undefined, nextPage, true)
  }

  const refreshSearch = async () => {
    if (!searchQuery.value.trim()) return
    await runSearch(
      searchQuery.value,
      searchContext.value,
      searchLabelId.value || undefined,
      searchPage.value,
      false,
    )
  }

  const clearSearch = () => {
    searchQuery.value = ''
    searchResults.value = null
    searching.value = false
    searchHasMore.value = false
    searchPage.value = 1
    searchContext.value = 'notes'
    searchLabelId.value = null
  }

  return {
    searchQuery: readonly(searchQuery),
    searchResults: readonly(searchResults),
    searching: readonly(searching),
    hasMore: readonly(searchHasMore),
    syncNote,
    performSearch,
    fetchMore,
    refreshSearch,
    clearSearch,
  }
}

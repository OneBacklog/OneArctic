import type { DeepReadonly } from 'vue'
import type { Note } from '#shared/types/notes'

/**
 * Shared setup for all note list pages.
 * Consolidates search state, editingNote, displayedNotes, infinite scroll sentinel,
 * and auto-clears search on unmount.
 */
export function useNotesPage(
  notes: Readonly<Ref<DeepReadonly<Note[]>>>,
  hasMore: Readonly<Ref<boolean>>,
  fetchMoreNotes: () => Promise<void>,
) {
  const { searchResults, searchQuery, hasMore: searchHasMore, fetchMore: fetchMoreSearch, clearSearch } = useSearch()
  const editingNote = ref<Note | null>(null)
  // useNotes/useSearch expose readonly views of their state; list components never mutate their props
  const displayedNotes = computed(() => (searchResults.value ?? notes.value) as Note[])
  const { sentinel } = useInfiniteScroll(() => {
    if (searchQuery.value.trim()) {
      if (searchHasMore.value) fetchMoreSearch()
      return
    }
    if (hasMore.value) fetchMoreNotes()
  })

  onUnmounted(() => clearSearch())

  return { searchResults, editingNote, displayedNotes, sentinel }
}

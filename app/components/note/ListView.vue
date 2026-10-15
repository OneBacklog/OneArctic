<template>
  <div>
    <div
      v-if="heading || mode === 'trash'"
      class="flex items-center justify-between mb-4"
    >
      <h1 class="text-xs font-medium text-nord-slate dark:text-nord-frost uppercase tracking-wider" aria-live="polite">
        {{ heading }}
      </h1>
      <button
        v-if="mode === 'trash' && notes.length > 0 && searchResults === null"
        type="button"
        class="text-sm text-nord-ember hover:text-nord-ember/80 font-medium"
        @click="confirmingEmpty = true"
      >
        Delete All
      </button>
    </div>

    <template v-if="canCreate && searchResults === null">
      <NoteCreateBar v-if="!isOffline" :default-label-ids="labelId ? [labelId] : undefined" />
      <Transition
        enter-active-class="transition-all duration-200 ease-out"
        enter-from-class="opacity-0 -translate-y-2"
        enter-to-class="opacity-100 translate-y-0"
        leave-active-class="transition-all duration-150 ease-in"
        leave-from-class="opacity-100 translate-y-0"
        leave-to-class="opacity-0 -translate-y-2"
      >
        <UiAlertBanner v-if="isOffline" variant="warning">
          You are offline. Changes you make will not be saved.
        </UiAlertBanner>
      </Transition>
    </template>

    <NoteGrid
      :notes="displayedNotes"
      :status="status"
      :empty-message="emptyMessage"
      @open="editingNote = $event"
      @archive="(n) => archiveNote(n.id)"
      @unarchive="(n) => unarchiveNote(n.id)"
      @trash="(n) => trashNote(n.id)"
      @restore="(n) => restoreNote(n.id)"
      @delete="(n) => deleteNote(n.id)"
    />

    <div v-if="searchResults === null" ref="sentinel" class="h-4" />
    <div v-if="loading && notes.length > 0" class="flex justify-center py-4" role="status" aria-label="Loading more notes">
      <div class="w-5 h-5 border-2 border-nord-aurora border-t-transparent rounded-full animate-spin" />
    </div>

    <NoteModal
      v-if="editingNote"
      :note="editingNote"
      :readonly="!!status"
      @close="editingNote = null"
      @unarchive="(n) => unarchiveNote(n.id)"
      @trash="(n) => trashNote(n.id)"
      @restore="(n) => restoreNote(n.id)"
      @delete-forever="(n) => deleteNote(n.id)"
    />

    <UiConfirmDialog
      v-if="confirmingEmpty"
      title="Empty Trash?"
      confirm-label="Delete All"
      :busy="emptying"
      @cancel="confirmingEmpty = false"
      @confirm="onEmptyTrash"
    >
      All notes in Trash, including their images and attachments, will be permanently deleted and cannot be recovered.
    </UiConfirmDialog>
  </div>
</template>

<script setup lang="ts">
import type { Note } from '#shared/types/notes'

// One list page for every view: all notes, a label, the archive and the trash.
const props = defineProps<{
  mode: 'notes' | 'label' | 'archive' | 'trash'
  labelId?: string
}>()

const { notes, loading, hasMore, fetchNotes, fetchMoreNotes } = useNotesList({ realtime: true })
const { archiveNote, unarchiveNote, trashNote, restoreNote, deleteNote, emptyTrash } = useNoteMutations()
const { searchResults, searchQuery, hasMore: searchHasMore, fetchMore: fetchMoreSearch, clearSearch } = useSearch()
const { labels } = useLabels()
const { isOffline } = useOffline()

const status = computed(() => (props.mode === 'archive' ? 'archived' : props.mode === 'trash' ? 'trashed' : undefined))
const canCreate = computed(() => props.mode === 'notes' || props.mode === 'label')
const labelName = computed(() => labels.value.find((l) => l.id === props.labelId)?.name ?? '')

const heading = computed(() => {
  if (searchResults.value !== null) {
    const count = searchResults.value.length
    return count ? `${count} result${count !== 1 ? 's' : ''}` : 'No results found'
  }
  return { notes: '', label: labelName.value || 'Label', archive: 'Archive', trash: 'Trash' }[props.mode]
})

const emptyMessage = computed(() => ({
  notes: 'Notes you add appear here.',
  label: `No notes with label '${labelName.value}'.`,
  archive: 'No notes in Archive.',
  trash: 'No notes in Trash.',
})[props.mode])

const listParams = computed(() => ({
  archived: props.mode === 'archive' || undefined,
  trashed: props.mode === 'trash' || undefined,
  labelId: props.mode === 'label' ? props.labelId : undefined,
}))

// useNotesList/useSearch expose readonly views of their state; list components never mutate their props
const displayedNotes = computed(() => (searchResults.value ?? notes.value) as Note[])
const editingNote = ref<Note | null>(null)

const { sentinel } = useInfiniteScroll(() => {
  if (searchQuery.value.trim()) {
    if (searchHasMore.value) fetchMoreSearch()
    return
  }
  if (hasMore.value) fetchMoreNotes()
})

const confirmingEmpty = ref(false)
const emptying = ref(false)
const onEmptyTrash = async () => {
  emptying.value = true
  try {
    await emptyTrash()
  } finally {
    emptying.value = false
    confirmingEmpty.value = false
  }
}

onUnmounted(() => clearSearch())

await fetchNotes(listParams.value)
watch(listParams, (params) => fetchNotes(params))
</script>

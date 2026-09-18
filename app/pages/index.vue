<template>
  <div>
    <div v-if="searchResults !== null" class="text-xs font-medium text-nord-frost uppercase tracking-wider mb-4">
      {{ searchResults.length ? `${searchResults.length} result${searchResults.length !== 1 ? 's' : ''}` : 'No results found' }}
    </div>
    <NoteCreateBar v-if="searchResults === null && !isOffline" />
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
    <NoteGrid
      :notes="displayedNotes"
      empty-message="Notes you add appear here."
      @open="editingNote = $event"
      @archive="(n) => archiveNote(n.id)"
      @trash="(n) => trashNote(n.id)"
      @label="editingNote = $event"
    />

    <div v-if="searchResults === null" ref="sentinel" class="h-4" />
    <div v-if="loading && notes.length > 0" class="flex justify-center py-4">
      <div class="w-5 h-5 border-2 border-nord-aurora border-t-transparent rounded-full animate-spin" />
    </div>

    <NoteModal v-if="editingNote" :note="editingNote" @close="editingNote = null" />
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const { notes, loading, hasMore, fetchNotes, fetchMoreNotes, archiveNote, trashNote } = useNotes()
const { isOffline } = useOffline()
const { searchResults, editingNote, displayedNotes, sentinel } = useNotesPage(notes, hasMore, fetchMoreNotes)
const { execute } = useAuthRequest()

await execute(() => fetchNotes())
</script>

<template>
  <div>
    <div class="text-xs font-medium text-nord-slate dark:text-nord-frost uppercase tracking-wider mb-4">
      <span v-if="searchResults !== null">
        {{ searchResults.length ? `${searchResults.length} result${searchResults.length !== 1 ? 's' : ''}` : 'No results found' }}
      </span>
      <span v-else>Archive</span>
    </div>
    <NoteGrid
      :notes="displayedNotes"
      :is-archived="true"
      empty-message="No notes in Archive."
      @open="editingNote = $event"
      @unarchive="(n) => restoreArchivedNote(n.id)"
      @trash="(n) => trashNote(n.id)"
      @label="editingNote = $event"
    />

    <div v-if="searchResults === null" ref="sentinel" class="h-4" />
    <div v-if="loading && notes.length > 0" class="flex justify-center py-4">
      <div class="w-5 h-5 border-2 border-nord-aurora border-t-transparent rounded-full animate-spin" />
    </div>

    <NoteModal
      v-if="editingNote"
      :note="editingNote"
      :readonly="true"
      :is-archived="true"
      @close="editingNote = null"
      @unarchive="(n) => { restoreArchivedNote(n.id); editingNote = null }"
      @trash="(n) => { trashNote(n.id); editingNote = null }"
    />
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const { notes, loading, hasMore, fetchNotes, fetchMoreNotes, unarchiveNote, trashNote } = useNotes()
const { searchResults, editingNote, displayedNotes, sentinel } = useNotesPage(notes, hasMore, fetchMoreNotes)
const { execute } = useAuthRequest()

const restoreArchivedNote = (id: string) => unarchiveNote(id)

await execute(() => fetchNotes({ archived: true }))
</script>

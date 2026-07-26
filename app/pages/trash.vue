<template>
  <div>
    <div class="flex items-center justify-between mb-4">
      <span class="text-xs font-medium text-nord-slate dark:text-nord-frost uppercase tracking-wider">
        <span v-if="searchResults !== null">
          {{ searchResults.length ? `${searchResults.length} result${searchResults.length !== 1 ? 's' : ''}` : 'No results found' }}
        </span>
        <span v-else>Trash</span>
      </span>
      <button
        v-if="notes.length > 0 && searchResults === null"
        class="text-sm text-nord-ember hover:text-nord-ember/80 font-medium"
        @click="confirmEmpty = true"
      >
        Delete All
      </button>
    </div>

    <NoteGrid
      :notes="displayedNotes"
      :is-trashed="true"
      empty-message="No notes in Trash."
      @open="editingNote = $event"
      @restore="(n) => restoreTrashedNote(n.id)"
      @delete="(n) => deleteNote(n.id)"
      @label="() => {}"
    />

    <div v-if="searchResults === null" ref="sentinel" class="h-4" />
    <div v-if="loading && notes.length > 0" class="flex justify-center py-4">
      <div class="w-5 h-5 border-2 border-nord-aurora border-t-transparent rounded-full animate-spin" />
    </div>

    <NoteModal
      v-if="editingNote"
      :note="editingNote"
      :readonly="true"
      :is-trashed="true"
      @close="editingNote = null"
      @delete-forever="(n) => { deleteNote(n.id); editingNote = null }"
      @restore="(n) => { restoreTrashedNote(n.id); editingNote = null }"
    />

    <!-- Confirm empty trash dialog -->
    <div v-if="confirmEmpty" class="fixed left-0 top-0 modal-viewport bg-black/40 z-50 flex items-center justify-center px-4">
      <div class="bg-nord-mist dark:bg-nord-obsidian rounded-2xl p-6 w-full max-w-sm shadow-2xl">
        <h3 class="text-base font-semibold text-nord-storm dark:text-nord-snow mb-2">WARNING</h3>
        <p class="text-sm text-nord-slate dark:text-nord-frost mb-6">This action cannot be undone. All notes, images, and files in Trash will be permanently deleted and cannot be recovered.</p>
        <div class="flex gap-3 justify-end">
          <button class="px-4 py-2 text-sm text-nord-slate dark:text-nord-ice hover:bg-nord-ice dark:hover:bg-nord-graphite rounded-lg" @click="confirmEmpty = false">Cancel</button>
          <button class="px-4 py-2 text-sm bg-nord-ember text-white rounded-lg hover:bg-nord-ember/80" @click="doEmpty">Confirm Delete All</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const { notes, loading, hasMore, fetchNotes, fetchMoreNotes, restoreNote, deleteNote, emptyTrash } = useNotes()
const { searchResults, editingNote, displayedNotes, sentinel } = useNotesPage(notes, hasMore, fetchMoreNotes)
const confirmEmpty = ref(false)

const restoreTrashedNote = (id: string) => restoreNote(id)

useBodyScrollLock(confirmEmpty)

try { await fetchNotes({ trashed: true }) } catch (e: any) { if (e?.status === 401) await navigateTo('/login') }

const doEmpty = async () => {
  await emptyTrash()
  confirmEmpty.value = false
}

useEscapeKey(() => { confirmEmpty.value = false })
</script>

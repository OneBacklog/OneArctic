<template>
  <div>
    <div class="text-xs font-medium text-nord-slate dark:text-nord-frost uppercase tracking-wider mb-4">
      <span v-if="searchResults !== null">
        {{ searchResults.length ? `${searchResults.length} result${searchResults.length !== 1 ? 's' : ''}` : 'No results found' }}
      </span>
      <span v-else>{{ currentLabel?.name ?? 'Label' }}</span>
    </div>
    <NoteCreateBar v-if="searchResults === null" :default-label-ids="[labelId]" />
    <NoteGrid
      :notes="displayedNotes"
      :empty-message="`No notes with label '${currentLabel?.name ?? ''}'.`"
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

const route = useRoute()
const { notes, loading, hasMore, fetchNotes, fetchMoreNotes, archiveNote, trashNote } = useNotes({ realtime: true })
const { labels } = useLabels()
const { searchResults, editingNote, displayedNotes, sentinel } = useNotesPage(notes, hasMore, fetchMoreNotes)
const { execute } = useAuthRequest()

const labelId = computed(() => route.params.id as string)
const currentLabel = computed(() => labels.value.find((l) => l.id === labelId.value))

await execute(() => fetchNotes({ label: labelId.value }))

watch(labelId, () => fetchNotes({ label: labelId.value }))
</script>

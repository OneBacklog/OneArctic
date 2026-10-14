<template>
  <ClientOnly>
    <div ref="gridRef" class="flex gap-3 items-start">
      <div
        v-for="(col, ci) in columns"
        :key="ci"
        class="flex flex-col gap-3 flex-1 min-w-0"
      >
        <NoteCard
          v-for="note in col"
          :key="note.id"
          v-bind="cardProps(note)"
          @open="$emit('open', $event)"
          @archive="$emit('archive', $event)"
          @unarchive="$emit('unarchive', $event)"
          @trash="$emit('trash', $event)"
          @label="$emit('label', $event)"
          @restore="$emit('restore', $event)"
          @delete="$emit('delete', $event)"
        />
      </div>
    </div>
    <template #fallback>
      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        <div
          v-for="i in 10"
          :key="i"
          class="h-48 rounded-xl bg-nord-ice dark:bg-nord-graphite animate-pulse"
        />
      </div>
    </template>
  </ClientOnly>

  <div v-if="notes.length === 0" class="text-center py-20 text-nord-slate dark:text-nord-frost">
    <p class="text-lg">{{ emptyMessage }}</p>
  </div>
</template>

<script setup lang="ts">
import type { Note } from '#shared/types/notes'

const props = defineProps<{
  notes: Note[]
  isTrashed?: boolean
  isArchived?: boolean
  emptyMessage?: string
}>()

defineEmits<{
  open: [note: Note]
  archive: [note: Note]
  unarchive: [note: Note]
  trash: [note: Note]
  restore: [note: Note]
  delete: [note: Note]
  label: [note: Note]
}>()

const cardProps = (note: Note) => ({
  note,
  isTrashed: props.isTrashed,
  isArchived: props.isArchived,
})

const gridRef = ref<HTMLElement | null>(null)
const colCount = ref(1)
let ro: ResizeObserver | null = null

const getColCount = (width: number) => {
  if (width < 480) return 1
  if (width < 768) return 2
  if (width < 1024) return 3
  if (width < 1280) return 4
  return 5
}

const bindObserver = (el: HTMLElement | null) => {
  if (!el) return
  colCount.value = getColCount(el.offsetWidth)
  if (ro) ro.disconnect()
  ro = new ResizeObserver(([entry]) => {
    colCount.value = getColCount(entry.contentRect.width)
  })
  ro.observe(el)
}

onMounted(() => {
  bindObserver(gridRef.value)
})

watch(gridRef, (el) => {
  if (el) bindObserver(el)
})

onUnmounted(() => {
  if (ro) ro.disconnect()
})

// Recalculate after sidebar transition (300ms) since padding change resizes the grid
const { sidebarOpen } = useSidebar()
watch(sidebarOpen, () => {
  setTimeout(() => {
    if (gridRef.value) colCount.value = getColCount(gridRef.value.offsetWidth)
  }, 320)
})

const columns = computed(() => {
  const cols: Note[][] = Array.from({ length: colCount.value }, () => [])
  props.notes.forEach((note, i) => cols[i % colCount.value].push(note))
  return cols
})
</script>

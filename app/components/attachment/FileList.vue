<template>
  <div class="mt-2 space-y-1">
    <div
      v-for="(att, idx) in displayAttachments"
      :key="att.id"
      class="flex items-center gap-2 group h-6 rounded-lg"
      :class="dragOverIdx === idx ? 'bg-nord-aurora/10' : ''"
      :data-drag-idx="idx"
      :draggable="isSortable && renamingId !== att.id"
      @dragstart="onDragStart(idx)"
      @dragover.prevent="onDragOver(idx)"
      @drop.prevent="onDrop(idx)"
      @dragend="onDragEnd"
    >
      <svg
        v-if="isSortable"
        class="w-4 h-4 flex-shrink-0 text-white opacity-40 cursor-grab active:cursor-grabbing touch-none select-none"
        fill="currentColor" viewBox="0 0 24 24"
        @touchstart.prevent="startTouchDrag(idx)"
      >
        <path d="M9 4a1 1 0 100 2 1 1 0 000-2zm6 0a1 1 0 100 2 1 1 0 000-2zM9 10a1 1 0 100 2 1 1 0 000-2zm6 0a1 1 0 100 2 1 1 0 000-2zM9 16a1 1 0 100 2 1 1 0 000-2zm6 0a1 1 0 100 2 1 1 0 000-2z"/>
      </svg>
      <svg class="w-4 h-4 text-nord-slate dark:text-nord-frost flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 002.112 2.13"/>
      </svg>
      <template v-if="renamingId === att.id">
        <input
          :ref="(el) => setRenameRef(att.id, el)"
          v-model="renameValue"
          type="text"
          class="flex-1 text-sm bg-nord-obsidian text-nord-snow rounded-md px-2 py-1 border border-nord-graphite outline-none"
          @keydown.enter.prevent="saveRename(att)"
          @keydown.escape.prevent="cancelRename"
        >
      </template>
      <a
        v-else
        :href="`/api/files/${att.id}?download=1`"
        target="_blank"
        rel="noopener noreferrer"
        class="flex-1 text-sm text-nord-slate dark:text-nord-ice truncate hover:underline"
        @click.stop.prevent="openAttachment(att)"
      >
        {{ att.filename }}
      </a>

      <!-- Inline confirmation -->
      <template v-if="confirmingId === att.id">
        <button class="text-sm text-nord-slate dark:text-nord-frost hover:underline" @click.stop="confirmingId = null">Cancel</button>
        <button class="text-sm text-nord-ember font-medium hover:underline" @click.stop="$emit('delete', att.id); confirmingId = null">Delete</button>
      </template>
      <template v-else-if="renamingId === att.id">
        <button class="text-sm text-nord-slate dark:text-nord-frost hover:underline" @click.stop="cancelRename">Cancel</button>
        <button class="text-sm text-nord-aurora font-medium hover:underline" @click.stop="saveRename(att)">Save</button>
      </template>
      <template v-else>
        <span class="text-sm text-nord-slate dark:text-nord-frost">{{ formatSize(att.size) }}</span>
        <button
          v-if="deletable && noteId"
          class="-mr-1 w-6 h-6 flex items-center justify-center rounded-full text-nord-frost hover:bg-nord-graphite/40 transition-all flex-shrink-0"
          title="Rename"
          @click.stop="startRename(att)"
        >
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M16.862 4.487a2.25 2.25 0 013.182 3.182L7.5 20.213l-4.5 1.125 1.125-4.5L16.862 4.487z"/>
          </svg>
        </button>
        <button
          v-if="deletable"
          class="-ml-1 w-6 h-6 flex items-center justify-center rounded-full text-nord-ember hover:bg-nord-ember/10 transition-all flex-shrink-0"
          title="Delete"
          @click.stop="confirmingId = att.id"
        >
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"/>
          </svg>
        </button>
      </template>
    </div>

    <div
      v-for="(file, idx) in displayUploads"
      :key="`upload-${idx}-${file.name}-${file.lastModified}`"
      class="flex items-center gap-2 h-6 rounded-lg"
    >
      <div v-if="isSortable" class="w-4 h-4 flex-shrink-0" />
      <div class="w-4 h-4 border border-nord-frost border-t-transparent rounded-full animate-spin flex-shrink-0" />
      <span class="flex-1 text-sm text-nord-slate dark:text-nord-ice truncate">
        {{ file.name }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Attachment } from '~/composables/types'
const props = defineProps<{
  attachments: Attachment[]
  uploadingFiles?: File[]
  deletable?: boolean
  noteId?: string
}>()
defineEmits<{ delete: [id: string] }>()

const confirmingId = ref<string | null>(null)
const renamingId = ref<string | null>(null)
const renameValue = ref('')
const renameInputRefs = ref<Record<string, HTMLInputElement | null>>({})
const { show: showSnackbar } = useSnackbar()
const { renameAttachment, reorderAttachments } = useNotes()
const localAttachments = ref<Attachment[]>([])
const isSortable = computed(() => Boolean(props.deletable && props.noteId))
const displayAttachments = computed(() => localAttachments.value)
const displayUploads = computed(() => props.uploadingFiles ?? [])
watch(
  () => props.attachments,
  (next) => { localAttachments.value = [...next] },
  { immediate: true }
)
const isStandalone = computed(() => {
  if (import.meta.server) return false
  return window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true
})

const { dragOverIdx, onDragStart, onDragOver, onDrop, onDragEnd, startTouchDrag } = useDragSort({
  getItems: () => localAttachments.value,
  onReorder: async (items) => {
    const nextItems = items.map((item, position) => ({ ...item, position }))
    localAttachments.value = nextItems
    if (!props.noteId) return
    try {
      await reorderAttachments(props.noteId, nextItems.map((att) => att.id))
    } catch (e: any) {
      const msg = e?.data?.statusMessage || e?.statusMessage || e?.message || 'Reorder Failed'
      showSnackbar(msg, 'error')
      localAttachments.value = [...props.attachments]
    }
  },
})

const openAttachment = (att: Attachment) => {
  showSnackbar('Download Starting...')
  const url = `/api/files/${att.id}?download=1`
  if (isStandalone.value) {
    const link = document.createElement('a')
    link.href = url
    link.download = att.filename
    link.rel = 'noopener'
    document.body.appendChild(link)
    link.click()
    link.remove()
    return
  }
  window.open(url, '_blank', 'noopener')
}

const startRename = async (att: Attachment) => {
  renamingId.value = att.id
  renameValue.value = att.filename
  await nextTick()
  renameInputRefs.value[att.id]?.focus()
}

const cancelRename = () => {
  renamingId.value = null
  renameValue.value = ''
}

const saveRename = async (att: Attachment) => {
  if (!props.noteId) return
  const nextName = renameValue.value.trim()
  if (!nextName) {
    showSnackbar('Filename is Required', 'error')
    return
  }
  try {
    await renameAttachment(props.noteId, att.id, nextName)
    showSnackbar('Attachment Renamed')
    cancelRename()
  } catch (e: any) {
    const msg = e?.data?.statusMessage || e?.statusMessage || e?.message || 'Rename Failed'
    showSnackbar(msg, 'error')
  }
}

const setRenameRef = (id: string, el: HTMLInputElement | null) => {
  renameInputRefs.value[id] = el
}
</script>

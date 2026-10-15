<template>
  <ul class="mt-2 space-y-1" aria-label="Attachments">
    <li
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
      <UiIcon
        v-if="isSortable"
        name="drag-handle"
        class="w-4 h-4 flex-shrink-0 text-white opacity-40 cursor-grab active:cursor-grabbing touch-none select-none"
        @touchstart.prevent="startTouchDrag(idx)"
      />
      <UiIcon name="paperclip" class="w-4 h-4 text-nord-slate dark:text-nord-frost flex-shrink-0" />
      <template v-if="renamingId === att.id">
        <input
          :ref="(el) => setRenameRef(att.id, el)"
          v-model="renameValue"
          type="text"
          aria-label="Filename"
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
        <button type="button" class="text-sm text-nord-slate dark:text-nord-frost hover:underline" @click.stop="confirmingId = null">Cancel</button>
        <button type="button" class="text-sm text-nord-ember font-medium hover:underline" :aria-label="`Confirm Delete ${att.filename}`" @click.stop="$emit('delete', att.id); confirmingId = null">Delete</button>
      </template>
      <template v-else-if="renamingId === att.id">
        <button type="button" class="text-sm text-nord-slate dark:text-nord-frost hover:underline" @click.stop="cancelRename">Cancel</button>
        <button type="button" class="text-sm text-nord-aurora font-medium hover:underline" @click.stop="saveRename(att)">Save</button>
      </template>
      <template v-else>
        <span class="text-sm text-nord-slate dark:text-nord-frost">{{ formatSize(att.size) }}</span>
        <button
          v-if="deletable && noteId"
          type="button"
          class="-mr-1 w-6 h-6 flex items-center justify-center rounded-full text-nord-frost hover:bg-nord-graphite/40 transition-all flex-shrink-0"
          title="Rename"
          :aria-label="`Rename ${att.filename}`"
          @click.stop="startRename(att)"
        >
          <UiIcon name="pencil" class="w-3.5 h-3.5" />
        </button>
        <button
          v-if="deletable"
          type="button"
          class="-ml-1 w-6 h-6 flex items-center justify-center rounded-full text-nord-ember hover:bg-nord-ember/10 transition-all flex-shrink-0"
          title="Delete"
          :aria-label="`Delete ${att.filename}`"
          @click.stop="confirmingId = att.id"
        >
          <UiIcon name="trash" class="w-3.5 h-3.5" />
        </button>
      </template>
    </li>

    <li
      v-for="(file, idx) in displayUploads"
      :key="`upload-${idx}-${file.name}-${file.lastModified}`"
      class="flex items-center gap-2 h-6 rounded-lg"
      role="status"
    >
      <div v-if="isSortable" class="w-4 h-4 flex-shrink-0" />
      <div class="w-4 h-4 border border-nord-frost border-t-transparent rounded-full animate-spin flex-shrink-0" />
      <span class="flex-1 text-sm text-nord-slate dark:text-nord-ice truncate">
        <span class="sr-only">Uploading </span>{{ file.name }}
      </span>
    </li>
  </ul>
</template>

<script setup lang="ts">
import type { ComponentPublicInstance } from 'vue'
import type { Attachment } from '#shared/types/notes'
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
const { renameAttachment, reorderAttachments } = useNoteAttachments()
const localAttachments = ref<Attachment[]>([])
const isSortable = computed(() => Boolean(props.deletable && props.noteId))
const displayAttachments = computed(() => localAttachments.value)
const displayUploads = computed(() => props.uploadingFiles ?? [])
watch(
  () => props.attachments,
  (next) => { localAttachments.value = [...next] },
  { immediate: true }
)

const { dragOverIdx, onDragStart, onDragOver, onDrop, onDragEnd, startTouchDrag } = useDragSort({
  getItems: () => localAttachments.value,
  onReorder: async (items) => {
    const nextItems = items.map((item, position) => ({ ...item, position }))
    localAttachments.value = nextItems
    if (!props.noteId) return
    const ok = await reorderAttachments(props.noteId, nextItems.map((att) => att.id))
    if (!ok) localAttachments.value = [...props.attachments]
  },
})

const openAttachment = (att: Attachment) => {
  showSnackbar('Download Starting...')
  downloadFile(`/api/files/${att.id}?download=1`, att.filename)
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
  if (await renameAttachment(props.noteId, att.id, nextName)) {
    showSnackbar('Attachment Renamed')
    cancelRename()
  }
}

const setRenameRef = (id: string, el: Element | ComponentPublicInstance | null) => {
  renameInputRefs.value[id] = el instanceof HTMLInputElement ? el : null
}
</script>

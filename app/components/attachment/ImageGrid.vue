<template>
  <div class="grid" :class="visibleAttachments.length === 1 ? 'grid-cols-1' : 'grid-cols-2'">
    <div
      v-for="(att, idx) in visibleAttachments"
      :key="att.id"
      class="relative group"
    >
      <img
        :src="`/api/files/${att.id}?thumb=true`"
        :alt="att.filename"
        class="w-full object-cover cursor-zoom-in"
        :class="visibleAttachments.length === 1 ? 'max-h-56' : 'h-32'"
        loading="lazy"
        @error="(e) => (e.target as HTMLImageElement).src = `/api/files/${att.id}`"
        @click.stop="openLightbox(idx)"
      >

      <!-- +n more overlay on the last visible slot -->
      <div
        v-if="hiddenCount > 0 && idx === visibleAttachments.length - 1"
        class="absolute inset-0 bg-black/60 flex items-center justify-center cursor-zoom-in"
        @click.stop="openLightbox(idx)"
      >
        <span class="text-white text-lg font-semibold">+{{ hiddenCount }} more</span>
      </div>

      <!-- Trash button (hover) -->
      <button
        v-if="deletable && confirmingId !== att.id && !(hiddenCount > 0 && idx === visibleAttachments.length - 1)"
        class="absolute top-1 right-1 w-7 h-7 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-nord-ember/80"
        title="Delete"
        @click.stop="confirmingId = att.id"
      >
        <svg class="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"/>
        </svg>
      </button>

      <!-- Inline confirmation overlay -->
      <div
        v-if="deletable && confirmingId === att.id"
        class="absolute inset-0 bg-black/70 flex flex-col items-center justify-center gap-2 rounded"
        @click.stop
      >
        <p class="text-white text-xs font-medium">Are You Sure?</p>
        <div class="flex gap-2">
          <button
            class="px-3 py-1 text-xs bg-nord-slate text-nord-snow rounded-full hover:bg-nord-graphite transition-colors"
            @click.stop="confirmingId = null"
          >
            Cancel
          </button>
          <button
            class="px-3 py-1 text-xs bg-nord-ember text-white rounded-full hover:bg-nord-ember/80 transition-colors"
            @click.stop="onConfirmDelete(att.id)"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Attachment } from '#shared/types/notes'

const props = defineProps<{
  attachments: Attachment[]
  deletable?: boolean
  onDelete?: (id: string) => Promise<void>
  maxVisible?: number
}>()
const emit = defineEmits<{ delete: [id: string] }>()

const { open } = useLightbox()
const confirmingId = ref<string | null>(null)

const visibleAttachments = computed(() => {
  if (!props.maxVisible || props.attachments.length <= props.maxVisible) {
    return props.attachments
  }
  return props.attachments.slice(0, props.maxVisible)
})

const hiddenCount = computed(() => {
  if (!props.maxVisible) return 0
  return Math.max(0, props.attachments.length - props.maxVisible)
})

const openLightbox = (startIndex: number) => {
  const urls = props.attachments.map((a) => `/api/files/${a.id}`)
  const ids = props.attachments.map((a) => a.id)
  const names = props.attachments.map((a) => a.filename)
  open(urls, startIndex, ids, props.onDelete, names)
}

const onConfirmDelete = (id: string) => {
  confirmingId.value = null
  emit('delete', id)
}
</script>

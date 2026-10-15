<template>
  <ul class="grid" :class="visibleAttachments.length === 1 ? 'grid-cols-1' : 'grid-cols-2'">
    <li
      v-for="(att, idx) in visibleAttachments"
      :key="att.id"
      class="relative group"
    >
      <button
        type="button"
        class="block w-full cursor-zoom-in focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-nord-aurora"
        :aria-label="isOverflowTile(idx) ? `View all ${attachments.length} images` : `View ${att.filename}`"
        @click.stop="openLightbox(idx)"
      >
        <img
          :src="`/api/files/${att.id}?thumb=true`"
          :alt="att.filename"
          class="w-full object-cover"
          :class="visibleAttachments.length === 1 ? 'max-h-56' : 'h-32'"
          loading="lazy"
          @error="(e) => fallbackToOriginal(e, att.id)"
        >
        <!-- +n more overlay on the last visible slot -->
        <span
          v-if="isOverflowTile(idx)"
          class="absolute inset-0 bg-black/60 flex items-center justify-center text-white text-lg font-semibold"
        >
          +{{ hiddenCount }} more
        </span>
      </button>

      <button
        v-if="deletable && confirmingId !== att.id && !isOverflowTile(idx)"
        type="button"
        class="absolute top-1 right-1 w-7 h-7 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity hover:bg-nord-ember/80"
        title="Delete"
        :aria-label="`Delete ${att.filename}`"
        @click.stop="confirmingId = att.id"
      >
        <UiIcon name="trash" class="w-3.5 h-3.5 text-white" />
      </button>

      <UiInlineConfirm
        v-if="deletable && confirmingId === att.id"
        message="Delete Image?"
        confirm-label="Delete"
        @confirm="onConfirmDelete(att.id)"
        @cancel="confirmingId = null"
      />
    </li>
  </ul>
</template>

<script setup lang="ts">
import type { Attachment } from '#shared/types/notes'

const props = defineProps<{
  attachments: Attachment[]
  deletable?: boolean
  onDelete?: (id: string) => Promise<boolean | undefined>
  maxVisible?: number
}>()
const emit = defineEmits<{ delete: [id: string] }>()

const { open } = useLightbox()
const confirmingId = ref<string | null>(null)

const visibleAttachments = computed(() =>
  props.maxVisible ? props.attachments.slice(0, props.maxVisible) : props.attachments
)
const hiddenCount = computed(() => props.attachments.length - visibleAttachments.value.length)
const isOverflowTile = (idx: number) => hiddenCount.value > 0 && idx === visibleAttachments.value.length - 1

// Fall back from the thumbnail to the original once; retrying a missing original would loop forever
const fallbackToOriginal = (e: Event, attId: string) => {
  const img = e.target as HTMLImageElement
  if (img.dataset.fallback) return
  img.dataset.fallback = '1'
  img.src = `/api/files/${attId}`
}

const openLightbox = (startIndex: number) => {
  open({
    items: props.attachments.map((a) => ({ id: a.id, url: `/api/files/${a.id}`, name: a.filename })),
    startIndex,
    onDelete: props.onDelete,
  })
}

const onConfirmDelete = (id: string) => {
  confirmingId.value = null
  emit('delete', id)
}
</script>

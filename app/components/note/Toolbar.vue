<template>
  <div class="flex items-center gap-1 flex-wrap">
    <!-- Copy content -->
    <button
      v-if="!compact && note?.type === 'text' && note.content"
      class="toolbar-btn"
      title="Copy to Clipboard"
      @click.stop="copyNoteContent(props.note)"
    >
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184" />
      </svg>
    </button>

    <!-- Add image/file (not in compact/hover mode) -->
    <button v-if="!compact" class="toolbar-btn" title="Add Images/Files" @click.stop="$emit('add-file')">
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 002.112 2.13"/>
      </svg>
    </button>

    <!-- Label picker (not in compact/hover mode) -->
    <div v-if="!compact" class="relative">
      <button class="toolbar-btn" title="Set Labels" @click.stop="showLabelPicker = !showLabelPicker">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z"/>
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M6 6h.008v.008H6V6z"/>
        </svg>
      </button>
      <LabelPicker
        v-if="showLabelPicker"
        :selected-ids="localSelectedLabelIds"
        @update="onLabel"
        @close="showLabelPicker = false"
      />
    </div>

    <!-- Type toggle (checklist) -->
    <button
      v-if="showTypeToggle"
      class="toolbar-btn"
      title="Convert to checklist / text"
      @click.stop="$emit('type-toggle')"
    >
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M11.35 3.836c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m8.9-4.414c.376.023.75.05 1.124.08 1.131.094 1.976 1.057 1.976 2.192V16.5A2.25 2.25 0 0118 18.75h-2.25m-7.5-10.5H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V18.75m-7.5-10.5h6.375c.621 0 1.125.504 1.125 1.125v9.375m-8.25-3l1.5 1.5 3-3.75"/>
      </svg>
    </button>

    <!-- Archive -->
    <button
      v-if="showArchive"
      class="toolbar-btn"
      :title="note?.isArchived ? 'Unarchive' : 'Archive'"
      @click.stop="$emit('archive')"
    >
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"/>
      </svg>
    </button>

    <!-- Trash -->
    <button
      v-if="showTrash"
      class="toolbar-btn"
      title="Trash"
      @click.stop="$emit('trash')"
    >
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"/>
      </svg>
    </button>
  </div>
</template>

<script setup lang="ts">
import type { Note } from '~/composables/types'

const props = defineProps<{
  note?: Note
  selectedLabelIds?: string[]
  compact?: boolean
  showArchive?: boolean
  showTrash?: boolean
  showTypeToggle?: boolean
}>()

const emit = defineEmits<{
  'add-file': []
  'label': []
  'archive': []
  'trash': []
  'type-toggle': []
}>()

const showLabelPicker = ref(false)
const localSelectedLabelIds = ref(props.selectedLabelIds ?? props.note?.labels.map((l) => l.id) ?? [])

watch(() => props.selectedLabelIds, (v) => { if (v !== undefined) localSelectedLabelIds.value = v })

const showArchive = computed(() => props.showArchive !== false)
const showTrash = computed(() => props.showTrash !== false)
const showTypeToggle = computed(() => props.showTypeToggle !== false && !props.compact)

const { copyNoteContent } = useClipboard()

const onLabel = (ids: string[]) => {
  localSelectedLabelIds.value = ids
  emit('label', ids)
}
</script>

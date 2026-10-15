<template>
  <UiModal
    label="Manage Labels"
    panel-class="bg-nord-mist dark:bg-nord-obsidian rounded-2xl shadow-2xl w-full max-w-sm p-4"
    @close="onEscape"
  >
    <form class="flex flex-col gap-1 mb-4" @submit.prevent="addLabel">
      <div class="flex gap-2">
        <label :for="newLabelId" class="sr-only">New Label</label>
        <input
          :id="newLabelId"
          v-model="newName"
          type="text"
          :maxlength="MAX_LABEL_LENGTH"
          placeholder="New Label"
          class="flex-1 min-w-0 bg-nord-ice dark:bg-nord-graphite rounded-lg px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-nord-aurora text-nord-storm dark:text-nord-snow placeholder-nord-slate dark:placeholder-nord-frost"
          data-autofocus
        >
        <button
          type="submit"
          :disabled="!newName.trim()"
          class="px-3 py-2 bg-nord-blue text-white rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-nord-frost transition-colors"
        >
          Add
        </button>
      </div>
    </form>

    <!-- Labels list (draggable) -->
    <ul class="space-y-1 max-h-72 overflow-y-auto" aria-label="Labels">
      <li
        v-for="(label, index) in localLabels"
        :key="label.id"
        :data-drag-idx="index"
        class="flex items-center gap-2 rounded-lg px-2 py-1 transition-colors"
        :class="dragOverIndex === index ? 'bg-nord-aurora/20' : 'hover:bg-nord-ice dark:hover:bg-nord-graphite'"
        draggable="true"
        @dragstart="onDragStart(index)"
        @dragover.prevent="onDragOver(index)"
        @drop="onDrop(index)"
        @dragend="onDragEnd"
      >
        <!-- Drag handle — hidden while editing -->
        <UiIcon
          v-show="editingId !== label.id"
          name="drag-handle"
          class="w-4 h-4 text-white opacity-50 flex-shrink-0 cursor-grab active:cursor-grabbing touch-none select-none"
          @touchstart.prevent="startTouchDrag(index)"
        />

        <template v-if="editingId === label.id">
          <label :for="`${newLabelId}-edit`" class="sr-only">Label Name</label>
          <input
            :id="`${newLabelId}-edit`"
            ref="editInput"
            v-model="editName"
            :maxlength="MAX_LABEL_LENGTH"
            class="flex-1 min-w-0 bg-nord-ice dark:bg-nord-graphite rounded-lg px-3 py-1 text-sm outline-none text-nord-storm dark:text-nord-snow"
            @keydown.enter="saveEdit(label.id)"
            @keydown.escape.prevent="editingId = null"
          >
          <button type="button" class="flex-shrink-0 text-nord-aurora hover:text-nord-frost text-sm font-medium px-2" @click="saveEdit(label.id)">Save</button>
        </template>
        <template v-else>
          <span class="flex-1 text-sm text-nord-obsidian dark:text-nord-ice truncate">{{ label.name }}</span>
          <button
            type="button"
            class="w-7 h-7 rounded-full hover:bg-nord-ice dark:hover:bg-nord-graphite flex items-center justify-center"
            :aria-label="`Rename ${label.name}`"
            @click="startEdit(label)"
          >
            <UiIcon name="pencil-square" class="w-4 h-4 text-nord-slate dark:text-nord-frost" />
          </button>
          <button
            type="button"
            class="w-7 h-7 rounded-full hover:bg-nord-ice dark:hover:bg-nord-graphite flex items-center justify-center"
            :aria-label="`Delete ${label.name}`"
            @click="confirmDelete(label)"
          >
            <UiIcon name="trash" class="w-4 h-4 text-nord-ember" />
          </button>
        </template>
      </li>

      <li v-if="localLabels.length === 0" class="text-sm text-nord-slate dark:text-nord-frost text-center py-4">No Labels Yet</li>
    </ul>

    <button
      type="button"
      class="mt-4 w-full py-2 text-sm text-nord-slate dark:text-nord-ice hover:bg-nord-ice dark:hover:bg-nord-graphite rounded-lg transition-colors"
      @click="$emit('close')"
    >
      Done
    </button>

    <UiConfirmDialog
      v-if="deletingLabel"
      title="Delete Label?"
      confirm-label="Delete"
      @cancel="deletingLabel = null"
      @confirm="doDelete"
    >
      "<span class="font-medium text-nord-obsidian dark:text-nord-ice">{{ deletingLabel.name }}</span>" will be removed from all notes. This cannot be undone.
    </UiConfirmDialog>
  </UiModal>
</template>

<script setup lang="ts">
import type { Label } from '#shared/types/notes'

const emit = defineEmits<{ close: [] }>()

const { labels, createLabel, renameLabel, deleteLabel, reorderLabels } = useLabels()

const MAX_LABEL_LENGTH = CONSTRAINTS.LABEL_MAX_LENGTH
const newLabelId = useId()

// Local mutable copy for drag reordering
const localLabels = ref<Label[]>([...labels.value])
watch(labels, (v) => { localLabels.value = [...v] }, { deep: true })

const newName = ref('')
const editingId = ref<string | null>(null)
const editName = ref('')
const editInput = ref<HTMLInputElement[]>()
const deletingLabel = ref<Label | null>(null)

const addLabel = async () => {
  const name = newName.value.trim()
  if (!name) return
  if (await createLabel(name)) newName.value = ''
}

const startEdit = async (label: Label) => {
  editingId.value = label.id
  editName.value = label.name
  await nextTick()
  editInput.value?.[0]?.focus()
}

const saveEdit = async (id: string) => {
  const name = editName.value.trim()
  if (name) await renameLabel(id, name)
  editingId.value = null
}

// Escape first cancels an in-progress rename, then closes the manager
const onEscape = () => {
  if (editingId.value) editingId.value = null
  else emit('close')
}

const confirmDelete = (label: Label) => {
  editingId.value = null
  deletingLabel.value = label
}

const doDelete = async () => {
  if (!deletingLabel.value) return
  await deleteLabel(deletingLabel.value.id)
  deletingLabel.value = null
}

const { dragOverIdx: dragOverIndex, onDragStart, onDragOver, onDrop, onDragEnd, startTouchDrag } = useDragSort({
  getItems: () => localLabels.value,
  onReorder: (items) => reorderLabels(items),
})
</script>

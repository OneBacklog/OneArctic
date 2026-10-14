<template>
  <Teleport to="body">
    <div class="fixed left-0 top-0 modal-viewport bg-black/40 z-50 flex items-center justify-center px-4" @mousedown.self="$emit('close')">
      <div class="bg-nord-mist dark:bg-nord-obsidian rounded-2xl shadow-2xl w-full max-w-sm p-4">
        <!-- New label input -->
        <form class="flex flex-col gap-1 mb-4" @submit.prevent="addLabel">
          <div class="flex gap-2">
            <input
              ref="newLabelInput"
              v-model="newName"
              type="text"
              :maxlength="MAX_LABEL_LENGTH"
              placeholder="New Label"
              class="flex-1 bg-nord-ice dark:bg-nord-graphite rounded-lg px-3 py-2 text-sm outline-none text-nord-storm dark:text-nord-snow placeholder-nord-slate dark:placeholder-nord-frost"
            >
            <button
              type="submit"
              :disabled="!newName.trim() || newName.length > MAX_LABEL_LENGTH"
              class="px-3 py-2 bg-nord-blue text-white rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-nord-frost transition-colors"
            >
              Add
            </button>
          </div>
          <p v-if="newName.length > MAX_LABEL_LENGTH" class="text-xs text-nord-ember px-1">Max {{ MAX_LABEL_LENGTH }} characters</p>
        </form>

        <!-- Labels list (draggable) -->
        <div class="space-y-1 max-h-72 overflow-y-auto">
          <div
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
            <svg
              v-show="editingId !== label.id"
              class="w-4 h-4 text-white opacity-50 flex-shrink-0 cursor-grab active:cursor-grabbing touch-none select-none"
              fill="currentColor" viewBox="0 0 24 24"
              @touchstart.prevent="startTouchDrag(index)"
            >
              <path d="M9 4a1 1 0 100 2 1 1 0 000-2zm6 0a1 1 0 100 2 1 1 0 000-2zM9 10a1 1 0 100 2 1 1 0 000-2zm6 0a1 1 0 100 2 1 1 0 000-2zM9 16a1 1 0 100 2 1 1 0 000-2zm6 0a1 1 0 100 2 1 1 0 000-2z"/>
            </svg>

            <template v-if="editingId === label.id">
              <input
                v-model="editName"
                :maxlength="MAX_LABEL_LENGTH"
                class="flex-1 min-w-0 bg-nord-ice dark:bg-nord-graphite rounded-lg px-3 py-1 text-sm outline-none text-nord-storm dark:text-nord-snow"
                @keydown.enter="saveEdit(label.id)"
                @keydown.escape="saveEdit(label.id)"
              >
              <button class="flex-shrink-0 text-nord-aurora hover:text-nord-frost text-sm font-medium px-2" @click="saveEdit(label.id)">Save</button>
            </template>
            <template v-else>
              <span class="flex-1 text-sm text-nord-obsidian dark:text-nord-ice truncate">{{ label.name }}</span>
              <button class="w-7 h-7 rounded-full hover:bg-nord-ice dark:hover:bg-nord-graphite flex items-center justify-center" @click="startEdit(label)">
                <svg class="w-4 h-4 text-nord-slate dark:text-nord-frost" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"/>
                </svg>
              </button>
              <button class="w-7 h-7 rounded-full hover:bg-nord-ice dark:hover:bg-nord-graphite flex items-center justify-center" @click="confirmDelete(label)">
                <svg class="w-4 h-4 text-nord-ember" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"/>
                </svg>
              </button>
            </template>
          </div>

          <div v-if="localLabels.length === 0" class="text-sm text-nord-slate dark:text-nord-frost text-center py-4">No labels yet</div>
        </div>

        <button
          class="mt-4 w-full py-2 text-sm text-nord-slate dark:text-nord-ice hover:bg-nord-ice dark:hover:bg-nord-graphite rounded-lg transition-colors"
          @click="$emit('close')"
        >
          Done
        </button>
      </div>
    </div>

    <!-- Delete confirmation dialog -->
    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="deletingLabel"
          class="fixed left-0 top-0 modal-viewport bg-black/50 z-[60] flex items-center justify-center px-4"
          @mousedown.self="deletingLabel = null"
        >
          <div class="bg-nord-mist dark:bg-nord-obsidian rounded-2xl shadow-2xl w-full max-w-xs p-6">
            <h3 class="text-base font-semibold text-nord-storm dark:text-nord-snow mb-2">Delete label?</h3>
            <p class="text-sm text-nord-slate dark:text-nord-frost mb-5">
              "<span class="font-medium text-nord-obsidian dark:text-nord-ice">{{ deletingLabel.name }}</span>" will be removed from all notes. This cannot be undone.
            </p>
            <div class="flex gap-3">
              <button
                class="flex-1 py-2 text-sm text-nord-slate dark:text-nord-ice hover:bg-nord-ice dark:hover:bg-nord-graphite rounded-lg transition-colors"
                @click="deletingLabel = null"
              >Cancel</button>
              <button
                class="flex-1 py-2 text-sm font-medium bg-nord-ember hover:bg-nord-ember/80 text-white rounded-lg transition-colors"
                @click="doDelete"
              >Delete</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </Teleport>
</template>

<script setup lang="ts">
import type { Label } from '#shared/types/notes'

useBodyScrollLock(true)

const emit = defineEmits<{ close: [] }>()

const { labels, createLabel, renameLabel, deleteLabel, reorderLabels } = useLabels()

const { LABEL_MAX_LENGTH: MAX_LABEL_LENGTH } = CONSTRAINTS

// Local mutable copy for drag reordering
const newLabelInput = ref<HTMLInputElement | null>(null)
const localLabels = ref<Label[]>([...labels.value])
watch(labels, (v) => { localLabels.value = [...v] }, { deep: true })

const newName = ref('')
const editingId = ref<string | null>(null)
const editName = ref('')

const addLabel = async () => {
  const name = newName.value.trim()
  if (!name || name.length > MAX_LABEL_LENGTH) return
  await createLabel(name)
  newName.value = ''
}

const startEdit = (label: Label) => {
  editingId.value = label.id
  editName.value = label.name
}

const saveEdit = async (id: string) => {
  const name = editName.value.trim()
  if (!name || name.length > MAX_LABEL_LENGTH) {
    editingId.value = null
    return
  }
  await renameLabel(id, name)
  editingId.value = null
}

const removeLabel = async (id: string) => {
  await deleteLabel(id)
}

// Delete confirmation
const deletingLabel = ref<Label | null>(null)

onMounted(() => nextTick(() => newLabelInput.value?.focus()))

// Close modal on Escape; if delete confirmation is open, dismiss it first
useEscapeKey(() => {
  if (deletingLabel.value) { deletingLabel.value = null; return }
  if (editingId.value) { editingId.value = null; return }
  emit('close')
})

const confirmDelete = (label: Label) => {
  editingId.value = null
  deletingLabel.value = label
}

const doDelete = async () => {
  if (!deletingLabel.value) return
  await removeLabel(deletingLabel.value.id)
  deletingLabel.value = null
}

const { dragOverIdx: dragOverIndex, onDragStart, onDragOver, onDrop: onDropSort, onDragEnd, startTouchDrag } = useDragSort({
  getItems: () => localLabels.value,
  onReorder: (items) => reorderLabels(items),
})

const onDrop = (targetIndex: number) => onDropSort(targetIndex)
</script>

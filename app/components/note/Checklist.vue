<template>
  <div class="space-y-1">
    <ul class="space-y-1" aria-label="Checklist">
      <li
        v-for="(item, idx) in props.modelValue"
        :key="item.id ?? idx"
        class="flex items-center gap-1 group rounded transition-colors"
        :class="dragOverIdx === idx ? 'bg-nord-aurora/10' : ''"
        :data-drag-idx="idx"
        draggable="true"
        @dragstart="onDragStart(idx)"
        @dragover.prevent="onDragOver(idx)"
        @drop.prevent="onDrop(idx)"
        @dragend="onDragEnd"
      >
        <UiIcon
          name="drag-handle"
          class="w-4 h-4 flex-shrink-0 text-white opacity-40 cursor-grab active:cursor-grabbing touch-none select-none"
          @touchstart.prevent="startTouchDrag(idx)"
        />

        <button
          type="button"
          role="checkbox"
          :aria-checked="item.isChecked"
          :aria-label="item.text ? `Done: ${item.text}` : 'Done'"
          class="w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center transition-colors"
          :class="item.isChecked
            ? 'border-nord-frost bg-nord-frost'
            : 'border-nord-ice dark:border-nord-slate hover:border-nord-frost dark:hover:border-nord-aurora'"
          @click="toggle(idx)"
        >
          <UiIcon v-if="item.isChecked" name="check" class="w-3 h-3 text-white" />
        </button>

        <!-- Text input -->
        <input
          :ref="(el) => setInputRef(el, idx)"
          :value="item.text"
          type="text"
          placeholder="List Item"
          aria-label="List Item"
          :maxlength="CONSTRAINTS.CHECKLIST_ITEM_MAX_LENGTH"
          class="flex-1 ml-1 bg-transparent text-sm outline-none transition-colors"
          :class="item.isChecked
            ? 'text-nord-slate dark:text-nord-frost line-through placeholder-nord-slate'
            : 'text-nord-obsidian dark:text-nord-ice placeholder-nord-slate dark:placeholder-nord-frost'"
          @keydown.enter.prevent="addAfter(idx)"
          @keydown.backspace="onBackspace(idx, item, $event)"
          @input="setText(idx, ($event.target as HTMLInputElement).value)"
        >

        <button
          type="button"
          class="opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 w-6 h-6 flex items-center justify-center text-nord-slate dark:text-nord-frost hover:text-nord-storm dark:hover:text-nord-snow"
          :aria-label="item.text ? `Remove ${item.text}` : 'Remove Item'"
          @click="removeItem(idx)"
        >
          <UiIcon name="x-mark" class="w-4 h-4" />
        </button>
      </li>
    </ul>

    <!-- Add item -->
    <button
      type="button"
      class="flex items-center gap-2 text-sm text-nord-slate dark:text-nord-frost hover:text-nord-storm dark:hover:text-nord-ice w-full text-left py-0.5 pl-5"
      @click="addItem"
    >
      <span class="w-5 h-5 flex items-center justify-center" aria-hidden="true">+</span>
      List Item
    </button>
  </div>
</template>

<script setup lang="ts">
import type { ComponentPublicInstance } from 'vue'
import type { ChecklistItem } from '#shared/types/notes'
import { nanoid } from 'nanoid'

const props = defineProps<{ modelValue: ChecklistItem[] }>()
const emit = defineEmits<{ 'update:modelValue': [items: ChecklistItem[]] }>()

const inputRefs = ref<(HTMLInputElement | null)[]>([])
const setInputRef = (el: Element | ComponentPublicInstance | null, idx: number) => {
  inputRefs.value[idx] = el instanceof HTMLInputElement ? el : null
}

const addItem = async () => {
  const items = [...props.modelValue, { id: nanoid(), text: '', isChecked: false, position: props.modelValue.length }]
  emit('update:modelValue', items)
  await nextTick()
  inputRefs.value[items.length - 1]?.focus()
}

const addAfter = async (idx: number) => {
  const items = [...props.modelValue]
  items.splice(idx + 1, 0, { id: nanoid(), text: '', isChecked: false, position: idx + 1 })
  emit('update:modelValue', items.map((i, p) => ({ ...i, position: p })))
  await nextTick()
  inputRefs.value[idx + 1]?.focus()
}

const removeItem = (idx: number) => {
  emit('update:modelValue', props.modelValue.filter((_, i) => i !== idx))
}

const setText = (idx: number, text: string) => {
  emit('update:modelValue', props.modelValue.map((item, i) => (i === idx ? { ...item, text } : item)))
}

const toggle = (idx: number) => {
  emit('update:modelValue', props.modelValue.map((item, i) =>
    i === idx ? { ...item, isChecked: !item.isChecked } : item
  ))
}

const onBackspace = (idx: number, item: ChecklistItem, e: KeyboardEvent) => {
  if (item.text === '' && props.modelValue.length > 1) {
    e.preventDefault()
    removeItem(idx)
    nextTick(() => inputRefs.value[Math.max(0, idx - 1)]?.focus())
  }
}

const { dragOverIdx, onDragStart, onDragOver, onDrop, onDragEnd, startTouchDrag } = useDragSort({
  getItems: () => props.modelValue,
  onReorder: (items) => {
    emit('update:modelValue', items.map((i, p) => ({ ...i, position: p })))
  },
})
</script>

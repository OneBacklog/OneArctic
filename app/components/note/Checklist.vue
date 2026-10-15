<template>
  <div class="space-y-1">
    <div
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
      <!-- Drag handle -->
      <svg
        class="w-4 h-4 flex-shrink-0 text-white opacity-40 cursor-grab active:cursor-grabbing touch-none select-none"
        fill="currentColor" viewBox="0 0 24 24"
        @touchstart.prevent="startTouchDrag(idx)"
      >
        <path d="M9 4a1 1 0 100 2 1 1 0 000-2zm6 0a1 1 0 100 2 1 1 0 000-2zM9 10a1 1 0 100 2 1 1 0 000-2zm6 0a1 1 0 100 2 1 1 0 000-2zM9 16a1 1 0 100 2 1 1 0 000-2zm6 0a1 1 0 100 2 1 1 0 000-2z"/>
      </svg>

      <!-- Checkbox -->
      <button
        class="w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center transition-colors"
        :class="item.isChecked
          ? 'border-nord-frost bg-nord-frost'
          : 'border-nord-ice dark:border-nord-slate hover:border-nord-frost dark:hover:border-nord-aurora'"
        @click="toggle(idx)"
      >
        <svg v-if="item.isChecked" class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4.5 12.75l6 6 9-13.5"/>
        </svg>
      </button>

      <!-- Text input -->
      <input
        :ref="(el) => setInputRef(el, idx)"
        :value="item.text"
        type="text"
        placeholder="List item"
        :maxlength="CONSTRAINTS.CHECKLIST_ITEM_MAX_LENGTH"
        class="flex-1 ml-1 bg-transparent text-sm outline-none transition-colors"
        :class="item.isChecked
          ? 'text-nord-slate dark:text-nord-frost line-through placeholder-nord-slate'
          : 'text-nord-obsidian dark:text-nord-ice placeholder-nord-slate dark:placeholder-nord-frost'"
        @keydown.enter.prevent="addAfter(idx)"
        @keydown.backspace="onBackspace(idx, item, $event)"
        @input="setText(idx, ($event.target as HTMLInputElement).value)"
      >

      <!-- Remove button -->
      <button
        class="opacity-0 group-hover:opacity-100 w-6 h-6 flex items-center justify-center text-nord-slate dark:text-nord-frost hover:text-nord-storm dark:hover:text-nord-snow"
        @click="removeItem(idx)"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M6 18 18 6M6 6l12 12"/>
        </svg>
      </button>
    </div>

    <!-- Add item -->
    <button
      class="flex items-center gap-2 text-sm text-nord-slate dark:text-nord-frost hover:text-nord-storm dark:hover:text-nord-ice w-full text-left py-0.5 pl-5"
      @click="addItem"
    >
      <span class="w-5 h-5 flex items-center justify-center">+</span>
      List item
    </button>
  </div>
</template>

<script setup lang="ts">
import type { ComponentPublicInstance } from 'vue'
import type { ChecklistItem } from '#shared/types/notes'
import { nanoid } from 'nanoid'

const props = defineProps<{ modelValue: ChecklistItem[] }>()
const emit = defineEmits<{ 'update:modelValue': [items: ChecklistItem[]]; update: [] }>()

const inputRefs = ref<(HTMLInputElement | null)[]>([])
const setInputRef = (el: Element | ComponentPublicInstance | null, idx: number) => {
  inputRefs.value[idx] = el instanceof HTMLInputElement ? el : null
}

const addItem = async () => {
  const items = [...props.modelValue, { id: nanoid(), text: '', isChecked: false, position: props.modelValue.length }]
  emit('update:modelValue', items)
  emit('update')
  await nextTick()
  inputRefs.value[items.length - 1]?.focus()
}

const addAfter = async (idx: number) => {
  const items = [...props.modelValue]
  items.splice(idx + 1, 0, { id: nanoid(), text: '', isChecked: false, position: idx + 1 })
  emit('update:modelValue', items.map((i, p) => ({ ...i, position: p })))
  emit('update')
  await nextTick()
  inputRefs.value[idx + 1]?.focus()
}

const removeItem = (idx: number) => {
  emit('update:modelValue', props.modelValue.filter((_, i) => i !== idx))
  emit('update')
}

const setText = (idx: number, text: string) => {
  emit('update:modelValue', props.modelValue.map((item, i) => (i === idx ? { ...item, text } : item)))
  emit('update')
}

const toggle = (idx: number) => {
  emit('update:modelValue', props.modelValue.map((item, i) =>
    i === idx ? { ...item, isChecked: !item.isChecked } : item
  ))
  emit('update')
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
    emit('update')
  },
})
</script>

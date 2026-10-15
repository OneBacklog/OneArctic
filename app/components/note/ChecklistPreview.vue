<template>
  <ul class="space-y-1" :aria-label="`Checklist, ${checkedCount} of ${items.length} done`">
    <li
      v-for="item in visibleItems"
      :key="item.id"
      class="flex items-center gap-2 text-sm"
    >
      <span
        class="rounded flex-shrink-0 flex items-center justify-center"
        :class="[
          size === 'md' ? 'w-5 h-5 border-2' : 'w-4 h-4 border',
          item.isChecked ? 'bg-nord-frost border-nord-frost' : 'border-nord-ice dark:border-nord-slate',
        ]"
      >
        <UiIcon v-if="item.isChecked" name="check" class="w-3 h-3 text-white" />
      </span>
      <span :class="item.isChecked ? 'line-through text-nord-slate dark:text-nord-frost' : 'text-nord-obsidian dark:text-nord-ice'">
        <span v-if="item.isChecked" class="sr-only">Done: </span>{{ item.text }}
      </span>
    </li>
    <li v-if="hiddenCount > 0" class="text-xs text-nord-slate dark:text-nord-frost mt-1">
      +{{ hiddenCount }} more
    </li>
  </ul>
</template>

<script setup lang="ts">
import type { ChecklistItem } from '#shared/types/notes'

// Read-only checklist used on note cards and in the read-only note view.
const props = withDefaults(defineProps<{
  items: ChecklistItem[]
  /** Show at most this many items, followed by "+N more" */
  limit?: number
  size?: 'sm' | 'md'
}>(), { limit: undefined, size: 'sm' })

const visibleItems = computed(() => (props.limit ? props.items.slice(0, props.limit) : props.items))
const hiddenCount = computed(() => props.items.length - visibleItems.value.length)
const checkedCount = computed(() => props.items.filter((i) => i.isChecked).length)
</script>

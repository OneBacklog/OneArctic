<template>
  <Teleport to="body">
    <template v-if="visible">
      <!-- Backdrop (no transform wrapper — fixed must not have transformed ancestor) -->
      <div class="fixed inset-0 z-40" @mousedown="close" @contextmenu.prevent="close" />
      <Transition
        appear
        enter-active-class="transition-all duration-100 ease-out"
        enter-from-class="opacity-0 scale-95"
        enter-to-class="opacity-100 scale-100"
        leave-active-class="transition-all duration-75 ease-in"
        leave-from-class="opacity-100 scale-100"
        leave-to-class="opacity-0 scale-95"
      >
        <div
          v-if="visible"
          ref="menuEl"
          role="menu"
          aria-label="Note actions"
          class="fixed z-50 min-w-[180px] bg-white dark:bg-nord-obsidian border border-nord-ice dark:border-nord-graphite rounded-xl shadow-xl py-1 origin-top-left"
          :style="{ top: `${y}px`, left: `${x}px` }"
          @click.stop
          @keydown="onMenuKeydown"
        >
          <button v-if="canCopyNote(note)" type="button" role="menuitem" class="ctx-item" @click="select(() => copyNoteContent(note))">
            <UiIcon name="clipboard" class="ctx-icon" />
            Copy to Clipboard
          </button>
          <button type="button" role="menuitem" class="ctx-item" @click="select(() => emit('add-file'))">
            <UiIcon name="paperclip" class="ctx-icon" />
            Add Images/Files
          </button>
          <button type="button" role="menuitem" class="ctx-item" @click="select(() => emit('label'))">
            <UiIcon name="tag" class="ctx-icon" />
            Set Labels
          </button>
          <div class="my-1 border-t border-nord-ice dark:border-nord-graphite" role="separator" />
          <button type="button" role="menuitem" class="ctx-item" @click="select(() => emit('archive'))">
            <UiIcon name="archive" class="ctx-icon" />
            Archive
          </button>
          <button type="button" role="menuitem" class="ctx-item text-nord-ember dark:text-nord-ember" @click="select(() => emit('trash'))">
            <UiIcon name="trash" class="ctx-icon" />
            Trash
          </button>
        </div>
      </Transition>
    </template>
  </Teleport>
</template>

<script setup lang="ts">
import type { Note } from '#shared/types/notes'

const emit = defineEmits<{
  'add-file': []
  'label': []
  'archive': []
  'trash': []
}>()

defineProps<{
  note?: Note
}>()

const { canCopyNote, copyNoteContent } = useClipboard()

const visible = ref(false)
const x = ref(0)
const y = ref(0)
const menuEl = ref<HTMLElement>()
let returnFocusTo: HTMLElement | null = null

const menuItems = () => Array.from(menuEl.value?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])

const close = () => {
  if (!visible.value) return
  restoreFocus(returnFocusTo, menuEl.value)
  visible.value = false
}

const select = (action: () => void) => {
  action()
  close()
}

const open = (event: MouseEvent) => {
  returnFocusTo = document.activeElement as HTMLElement | null
  x.value = event.clientX
  y.value = event.clientY
  visible.value = true
  nextTick(() => {
    const menuW = menuEl.value?.offsetWidth ?? 180
    const menuH = menuEl.value?.offsetHeight ?? 200
    x.value = event.clientX + menuW > window.innerWidth ? event.clientX - menuW : event.clientX
    y.value = event.clientY + menuH > window.innerHeight ? event.clientY - menuH : event.clientY
    menuItems()[0]?.focus()
  })
}

// Arrow keys move between items; Tab closes the menu like a native one
const onMenuKeydown = (e: KeyboardEvent) => {
  const items = menuItems()
  const index = items.indexOf(document.activeElement as HTMLElement)
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault()
    const step = e.key === 'ArrowDown' ? 1 : -1
    items[(index + step + items.length) % items.length]?.focus()
  } else if (e.key === 'Tab') {
    close()
  }
}

useEscapeKey(close, visible)
onUnmounted(() => { visible.value = false })

defineExpose({ open })
</script>

<style scoped>
@reference "../../assets/css/main.css";

.ctx-item {
  @apply w-full flex items-center gap-3 px-4 py-2 text-sm text-nord-storm dark:text-nord-ice
    hover:bg-nord-snow dark:hover:bg-nord-graphite focus-visible:bg-nord-snow dark:focus-visible:bg-nord-graphite
    outline-none transition-colors cursor-pointer text-left;
}
.ctx-icon {
  @apply w-4 h-4 flex-shrink-0 text-nord-slate dark:text-nord-frost;
}
</style>

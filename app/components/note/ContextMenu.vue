<template>
  <Teleport to="body">
    <template v-if="visible">
      <!-- Backdrop (no transform wrapper — fixed must not have transformed ancestor) -->
      <div class="fixed inset-0 z-40" @mousedown="close" @contextmenu.prevent="close" />
      <!-- Menu with its own transition -->
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
          class="fixed z-50 min-w-[180px] bg-white dark:bg-nord-obsidian border border-nord-ice dark:border-nord-graphite rounded-xl shadow-xl py-1 origin-top-left"
          :style="{ top: `${y}px`, left: `${x}px` }"
          @click.stop
        >
          <button
            v-if="note?.type === 'text' && note.content"
            class="ctx-item"
            @click="copyNoteContent(note); close()"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="ctx-icon">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184" />
            </svg>
            Copy to Clipboard
          </button>
          <button class="ctx-item" @click="emit('add-file'); close()">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="ctx-icon">
              <path stroke-linecap="round" stroke-linejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 0 1 19.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 0 0 2.112 2.13" />
            </svg>
            Add Images/Files
          </button>
          <button class="ctx-item" @click="emit('label'); close()">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="ctx-icon">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9.568 3H5.25A2.25 2.25 0 0 0 3 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 0 0 5.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 0 0 9.568 3Z" />
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 6h.008v.008H6V6Z" />
            </svg>
            Set Labels
          </button>
          <div class="my-1 border-t border-nord-ice dark:border-nord-graphite" />
          <button class="ctx-item" @click="emit('archive'); close()">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="ctx-icon">
              <path stroke-linecap="round" stroke-linejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
            </svg>
            Archive
          </button>
          <button class="ctx-item text-nord-ember dark:text-nord-ember" @click="emit('trash'); close()">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="ctx-icon">
              <path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
            </svg>
            Trash
          </button>
        </div>
      </Transition>
    </template>
  </Teleport>
</template>

<script setup lang="ts">
import type { Note } from '~/composables/types'

const emit = defineEmits<{
  'add-file': []
  'label': []
  'archive': []
  'trash': []
}>()

const props = defineProps<{
  note?: Note
}>()

const { copyNoteContent } = useClipboard()

const visible = ref(false)
const x = ref(0)
const y = ref(0)
const menuEl = ref<HTMLElement>()

const close = () => { visible.value = false }

const open = (event: MouseEvent) => {
  x.value = event.clientX
  y.value = event.clientY
  visible.value = true
  nextTick(() => {
    const menuW = menuEl.value?.offsetWidth ?? 180
    const menuH = menuEl.value?.offsetHeight ?? 200
    x.value = event.clientX + menuW > window.innerWidth ? event.clientX - menuW : event.clientX
    y.value = event.clientY + menuH > window.innerHeight ? event.clientY - menuH : event.clientY
  })
}

const onEscape = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }

watchEffect(() => {
  if (!import.meta.client) return
  if (visible.value) {
    document.addEventListener('keydown', onEscape)
  } else {
    document.removeEventListener('keydown', onEscape)
  }
})

onUnmounted(close)

defineExpose({ open })
</script>

<style scoped>
@reference "../../assets/css/main.css";

.ctx-item {
  @apply w-full flex items-center gap-3 px-4 py-2 text-sm text-nord-storm dark:text-nord-ice
    hover:bg-nord-snow dark:hover:bg-nord-graphite transition-colors cursor-pointer text-left;
}
.ctx-icon {
  @apply w-4 h-4 flex-shrink-0 text-nord-slate dark:text-nord-frost;
}
</style>

<template>
  <Teleport to="body">
    <div
      class="fixed left-0 top-0 modal-viewport flex items-center justify-center px-4"
      :class="[backdropClass, layer === 'top' ? 'z-[300]' : 'z-50']"
      @mousedown.self="emit('close')"
    >
      <div
        ref="panel"
        :role="role"
        aria-modal="true"
        :aria-label="label"
        :aria-labelledby="labelledby"
        tabindex="-1"
        class="outline-none"
        :class="panelClass"
        @keydown.tab="trapFocus"
      >
        <slot />
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
// Accessible modal shell: dialog semantics, focus trap and restore, scroll lock and Escape-to-close.
withDefaults(defineProps<{
  label?: string
  labelledby?: string
  role?: 'dialog' | 'alertdialog'
  panelClass?: string
  backdropClass?: string
  /** 'top' renders above other modals and the lightbox (used by confirm dialogs) */
  layer?: 'base' | 'top'
}>(), {
  label: undefined,
  labelledby: undefined,
  panelClass: '',
  role: 'dialog',
  backdropClass: 'bg-black/40',
  layer: 'base',
})

const emit = defineEmits<{ close: [] }>()

const panel = ref<HTMLElement>()
let previouslyFocused: HTMLElement | null = null

useBodyScrollLock(true)
useEscapeKey(() => emit('close'))

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

const focusableElements = () =>
  Array.from(panel.value?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])
    .filter((el) => el.offsetParent !== null || el === document.activeElement)

const trapFocus = (e: KeyboardEvent) => {
  const elements = focusableElements()
  if (elements.length === 0) {
    e.preventDefault()
    return
  }
  const first = elements[0]!
  const last = elements[elements.length - 1]!
  if (e.shiftKey && (document.activeElement === first || document.activeElement === panel.value)) {
    e.preventDefault()
    last.focus()
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault()
    first.focus()
  }
}

onMounted(() => {
  previouslyFocused = document.activeElement as HTMLElement | null
  // Children may already have focused something (e.g. the title of a new note)
  nextTick(() => {
    if (!panel.value || panel.value.contains(document.activeElement)) return
    const preferred = panel.value.querySelector<HTMLElement>('[data-autofocus]')
    ;(preferred ?? panel.value).focus()
  })
})

// The panel is already detached here, so focus that was inside it has fallen back to <body>
onUnmounted(() => restoreFocus(previouslyFocused))

</script>

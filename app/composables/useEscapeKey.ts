import type { MaybeRefOrGetter } from 'vue'

// Escape closes only the top-most open layer (modal, menu, lightbox, confirm…), never
// everything at once. Layers register while active; the most recently activated one wins.
type Handler = () => void

const stack: Handler[] = []
let listening = false

function onKeydown(e: KeyboardEvent) {
  // Inputs that handle Escape themselves (e.g. inline rename) call preventDefault to claim it
  if (e.key !== 'Escape' || e.defaultPrevented || e.isComposing) return
  const top = stack[stack.length - 1]
  if (!top) return
  e.preventDefault()
  top()
}

/** Run `fn` on Escape while `active` is true and this is the top-most active layer. */
export function useEscapeKey(fn: Handler, active: MaybeRefOrGetter<boolean> = true) {
  if (!import.meta.client) return
  const handler: Handler = () => fn()

  const remove = () => {
    const index = stack.indexOf(handler)
    if (index !== -1) stack.splice(index, 1)
  }

  onMounted(() => {
    if (!listening) {
      document.addEventListener('keydown', onKeydown)
      listening = true
    }
    watch(() => toValue(active), (isActive) => {
      remove()
      if (isActive) stack.push(handler)
    }, { immediate: true })
  })
  onUnmounted(remove)
}

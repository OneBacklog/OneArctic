import { useLightbox } from './useLightbox'

/**
 * Calls `fn` when the Escape key is pressed.
 * Listener is automatically removed when the component unmounts.
 *
 * If the lightbox is open, do not invoke the callback so the lightbox
 * remains the top-most handler for Escape.
 */
export function useEscapeKey(fn: () => void) {
  const { lightboxOpen } = useLightbox()

  const handler = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      // Let the lightbox handle Escape when it's open.
      if (lightboxOpen && lightboxOpen.value) return
      fn()
    }
  }
  onMounted(() => document.addEventListener('keydown', handler))
  onUnmounted(() => document.removeEventListener('keydown', handler))
}

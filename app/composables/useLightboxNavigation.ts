const SWIPE_THRESHOLD_PX = 50

/**
 * Keyboard (arrow keys) and swipe navigation for the lightbox while it is open and
 * `enabled` (e.g. not while a confirm dialog is showing).
 */
export function useLightboxNavigation(
  enabled: MaybeRefOrGetter<boolean>,
  onPrev: () => void,
  onNext: () => void,
) {
  const onKey = (e: KeyboardEvent) => {
    if (!toValue(enabled)) return
    if (e.key === 'ArrowLeft') onPrev()
    if (e.key === 'ArrowRight') onNext()
  }

  let touchStartX = 0
  const onTouchStart = (e: TouchEvent) => { touchStartX = e.touches[0]?.clientX ?? 0 }
  const onTouchEnd = (e: TouchEvent) => {
    if (!toValue(enabled)) return
    const dx = (e.changedTouches[0]?.clientX ?? 0) - touchStartX
    if (Math.abs(dx) < SWIPE_THRESHOLD_PX) return
    if (dx < 0) onNext()
    else onPrev()
  }

  onMounted(() => {
    window.addEventListener('keydown', onKey)
    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchend', onTouchEnd, { passive: true })
  })

  onUnmounted(() => {
    window.removeEventListener('keydown', onKey)
    window.removeEventListener('touchstart', onTouchStart)
    window.removeEventListener('touchend', onTouchEnd)
  })
}

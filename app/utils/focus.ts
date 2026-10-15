/**
 * Give focus back to `target` after a dialog or menu closes, unless the user has already moved
 * it elsewhere (closing can finish late, e.g. after a save) — then leave it where it is.
 */
export function restoreFocus(target: HTMLElement | null, closingContainer?: HTMLElement | null) {
  const active = document.activeElement
  const focusWasLost = !active || active === document.body || !!closingContainer?.contains(active)
  if (focusWasLost && target?.isConnected) target.focus()
}

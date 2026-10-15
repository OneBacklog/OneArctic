let listening = false

/** Whether the browser is offline. One set of window listeners is shared by every caller. */
export const useOffline = () => {
  const isOffline = useState<boolean>('is-offline', () => false)

  if (import.meta.client && !listening) {
    listening = true
    isOffline.value = !navigator.onLine
    window.addEventListener('online', () => { isOffline.value = false })
    window.addEventListener('offline', () => { isOffline.value = true })
  }

  return { isOffline: readonly(isOffline) }
}

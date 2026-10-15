interface SnackbarItem {
  id: number
  message: string
  type?: 'default' | 'error'
}

let counter = 0
let timer: ReturnType<typeof setTimeout> | null = null

export const useSnackbar = () => {
  const queue = useState<SnackbarItem[]>('snackbar-queue', () => [])

  const show = (message: string, type: 'default' | 'error' = 'default') => {
    const id = ++counter
    queue.value = [{ id, message, type }]

    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      queue.value = queue.value.filter((i) => i.id !== id)
    }, SNACKBAR_DURATION_MS)
  }

  const dismiss = () => {
    if (timer) clearTimeout(timer)
    queue.value = []
  }

  return { queue: readonly(queue), show, dismiss }
}

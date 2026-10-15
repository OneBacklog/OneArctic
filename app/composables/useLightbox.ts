export interface LightboxItem {
  url: string
  name: string
  /** Attachment id; items with an id can be deleted from the lightbox */
  id?: string
}

/** Resolves to false when the delete failed, so the image stays in the lightbox. */
type DeleteCallback = (id: string) => Promise<boolean | undefined>

// Functions can't live in useState (it must be serializable), so the callback is module-level
let onDeleteCallback: DeleteCallback | null = null

export function useLightbox() {
  const items = useState<LightboxItem[]>('lightbox-items', () => [])
  const index = useState<number>('lightbox-index', () => 0)
  const isOpen = useState<boolean>('lightbox-open', () => false)

  const current = computed(() => items.value[index.value])

  const open = (options: { items: LightboxItem[]; startIndex?: number; onDelete?: DeleteCallback }) => {
    items.value = options.items
    index.value = options.startIndex ?? 0
    onDeleteCallback = options.onDelete ?? null
    isOpen.value = true
  }

  const close = () => { isOpen.value = false }
  const prev = () => { if (index.value > 0) index.value-- }
  const next = () => { if (index.value < items.value.length - 1) index.value++ }

  const deleteCurrent = async () => {
    const id = current.value?.id
    if (!id || !onDeleteCallback) return
    if ((await onDeleteCallback(id)) === false) return
    items.value = items.value.filter((_, i) => i !== index.value)
    if (items.value.length === 0) close()
    else if (index.value >= items.value.length) index.value = items.value.length - 1
  }

  return {
    isOpen: readonly(isOpen),
    items: readonly(items),
    index: readonly(index),
    current,
    canDelete: computed(() => !!current.value?.id && !!onDeleteCallback),
    open,
    close,
    prev,
    next,
    deleteCurrent,
  }
}

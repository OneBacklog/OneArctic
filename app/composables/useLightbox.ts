// Stored outside useState so it survives across composable calls without needing Nuxt context
// Resolving to false means the delete failed and the image stays in the lightbox
type DeleteCallback = (id: string) => Promise<boolean | undefined>
let _onDeleteCallback: DeleteCallback | null = null

export function useLightbox() {
  const lightboxImages = useState<string[]>('lightbox-images', () => [])
  const lightboxIndex = useState<number>('lightbox-index', () => 0)
  const lightboxOpen = useState<boolean>('lightbox-open', () => false)
  const lightboxAttachmentIds = useState<string[]>('lightbox-att-ids', () => [])
  const lightboxNames = useState<string[]>('lightbox-names', () => [])

  const open = (
    images: string[],
    startIndex = 0,
    attachmentIds: string[] = [],
    onDelete?: DeleteCallback,
    names: string[] = [],
  ) => {
    lightboxImages.value = images
    lightboxIndex.value = startIndex
    lightboxOpen.value = true
    lightboxAttachmentIds.value = attachmentIds
    lightboxNames.value = names
    _onDeleteCallback = onDelete ?? null
  }

  const close = () => {
    lightboxOpen.value = false
  }

  const prev = () => {
    if (lightboxIndex.value > 0) lightboxIndex.value--
  }

  const next = () => {
    if (lightboxIndex.value < lightboxImages.value.length - 1) lightboxIndex.value++
  }

  const deleteCurrentImage = async () => {
    const id = lightboxAttachmentIds.value[lightboxIndex.value]
    if (!id || !_onDeleteCallback) return
    if ((await _onDeleteCallback(id)) === false) return
    // Remove deleted image from lightbox arrays
    const imgs = [...lightboxImages.value]
    const ids = [...lightboxAttachmentIds.value]
    const names = [...lightboxNames.value]
    imgs.splice(lightboxIndex.value, 1)
    ids.splice(lightboxIndex.value, 1)
    names.splice(lightboxIndex.value, 1)
    if (imgs.length === 0) {
      close()
    } else {
      lightboxImages.value = imgs
      lightboxAttachmentIds.value = ids
      lightboxNames.value = names
      if (lightboxIndex.value >= imgs.length) lightboxIndex.value = imgs.length - 1
    }
  }

  return {
    lightboxOpen: readonly(lightboxOpen),
    lightboxImages: readonly(lightboxImages),
    lightboxIndex: readonly(lightboxIndex),
    lightboxAttachmentIds: readonly(lightboxAttachmentIds),
    lightboxNames: readonly(lightboxNames),
    open,
    close,
    prev,
    next,
    deleteCurrentImage,
  }
}

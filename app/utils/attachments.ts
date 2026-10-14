import type { Attachment } from '#shared/types/notes'
import { toRef, computed } from 'vue'
import type { MaybeRefOrGetter } from 'vue'

const isImageAttachment = (att: Attachment) => isDisplayableImage(att.mimeType || '', att.filename || '')

export function splitAttachments(source: MaybeRefOrGetter<Attachment[]>) {
  const att = toRef(source)
  return {
    images: computed(() => att.value.filter((a) => isImageAttachment(a))),
    files: computed(() => att.value.filter((a) => !isImageAttachment(a))),
  }
}

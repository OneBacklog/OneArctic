import type { Note } from '~/composables/types'

export const useClipboard = () => {
  const { show: showSnackbar } = useSnackbar()

  const copyText = async (text: string) => {
    try {
      if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
        throw new Error('Clipboard API Unavailable')
      }

      await navigator.clipboard.writeText(text)
      showSnackbar('Content Copied to Clipboard')
      return true
    } catch {
      showSnackbar('Failed to Copy Content', 'error')
      return false
    }
  }

  const copyNoteContent = async (note?: Pick<Note, 'type' | 'content'>) => {
    if (note?.type !== 'text' || !note.content) return false
    return copyText(note.content)
  }

  return { copyText, copyNoteContent }
}

import type { Note } from '~/composables/types'

export const useClipboard = () => {
  const { show: showSnackbar } = useSnackbar()

  const getCopyableNoteText = (note?: Pick<Note, 'type' | 'content' | 'checklistItems'>) => {
    if (!note) return null

    if (note.type === 'text') {
      return note.content.trim() ? note.content : null
    }

    const checklistLines = note.checklistItems
      .filter((item) => item.text.trim() !== '')
      .map((item) => `- ${item.text}`)

    return checklistLines.length > 0 ? checklistLines.join('\n') : null
  }

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

  const canCopyNote = (note?: Pick<Note, 'type' | 'content' | 'checklistItems'>) =>
    getCopyableNoteText(note) !== null

  const copyNoteContent = async (note?: Pick<Note, 'type' | 'content' | 'checklistItems'>) => {
    const text = getCopyableNoteText(note)
    if (!text) return false
    return copyText(text)
  }

  return { copyText, canCopyNote, copyNoteContent }
}

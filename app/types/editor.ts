import type { ChecklistItem, NoteType } from '#shared/types/notes'

/** Live editor state emitted by NoteEditorContent on every change. */
export interface NoteEditorState {
  type: NoteType
  title: string
  content: string
  selectedLabelIds: string[]
  checklistItems: ChecklistItem[]
  pendingFiles?: File[]
}

/** Payload emitted by NoteModal when a new note is saved. */
export interface NewNotePayload {
  type: NoteType
  title: string
  content: string
  labelIds: string[]
  checklistItems: ChecklistItem[]
  pendingFiles: File[]
}

// API contract shared by the server responses and the client.

export type NoteType = 'text' | 'checklist'

export interface ChecklistItem {
  id?: string
  text: string
  isChecked: boolean
  position: number
}

export interface Attachment {
  id: string
  noteId: string
  filename: string
  storagePath: string
  mimeType: string
  size: number
  thumbnailPath: string | null
  position: number
  createdAt: string
}

export interface Label {
  id: string
  name: string
  position: number
  createdAt: string
}

export interface Note {
  id: string
  type: NoteType
  title: string
  content: string
  isArchived: boolean
  isTrashed: boolean
  trashedAt: string | null
  createdAt: string
  updatedAt: string
  labels: Label[]
  checklistItems: ChecklistItem[]
  attachments: Attachment[]
}

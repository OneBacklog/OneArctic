import type { Attachment, Label, Note } from './notes'

export type RealtimeResource = 'notes' | 'labels'

export type RealtimeEvent =
  | { type: 'note.created'; data: { resource: 'notes'; note: Note } }
  | { type: 'note.updated'; data: { resource: 'notes'; note: Note; refresh: 'note' | 'list' } }
  | { type: 'note.deleted'; data: { resource: 'notes'; noteId: string } }
  | { type: 'attachment.uploaded'; data: { resource: 'notes'; noteId: string; attachments: Attachment[] } }
  | { type: 'attachment.updated'; data: { resource: 'notes'; noteId: string; attachment: Attachment } }
  | { type: 'attachment.deleted'; data: { resource: 'notes'; noteId: string; attachmentId: string } }
  | { type: 'attachment.reordered'; data: { resource: 'notes'; noteId: string; attachmentIds: string[] } }
  | { type: 'label.created'; data: { resource: 'labels'; label: Label } }
  | { type: 'label.updated'; data: { resource: 'labels'; label: Label } }
  | { type: 'label.deleted'; data: { resource: 'labels'; labelId: string } }
  | { type: 'label.reordered'; data: { resource: 'labels'; order: Array<{ id: string; position: number }> } }

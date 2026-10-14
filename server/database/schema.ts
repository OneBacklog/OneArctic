import { sql } from 'drizzle-orm'
import { sqliteTable, text, integer, real, index, uniqueIndex, check } from 'drizzle-orm/sqlite-core'
import { CONSTRAINTS } from '../../shared/utils/constants'

export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
})

export const notes = sqliteTable('notes', {
  id: text('id').primaryKey(),
  type: text('type', { enum: ['text', 'checklist'] }).notNull().default('text'),
  title: text('title').notNull().default(''),
  content: text('content').notNull().default(''),
  isArchived: integer('is_archived', { mode: 'boolean' }).notNull().default(false),
  isTrashed: integer('is_trashed', { mode: 'boolean' }).notNull().default(false),
  trashedAt: text('trashed_at'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (t) => [
  index('notes_list_idx').on(t.isTrashed, t.isArchived, t.createdAt),
  index('notes_updated_at_idx').on(t.updatedAt),
  check('notes_title_length', sql`length(${t.title}) <= ${sql.raw(String(CONSTRAINTS.TITLE_MAX_LENGTH))}`),
  check('notes_content_length', sql`length(${t.content}) <= ${sql.raw(String(CONSTRAINTS.CONTENT_MAX_LENGTH))}`),
])

export const labels = sqliteTable('labels', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
  position: real('position').notNull().default(0),
  createdAt: text('created_at').notNull(),
}, (t) => [
  check('labels_name_length', sql`length(${t.name}) <= ${sql.raw(String(CONSTRAINTS.LABEL_MAX_LENGTH))}`),
])

export const noteLabels = sqliteTable('note_labels', {
  noteId: text('note_id').notNull().references(() => notes.id, { onDelete: 'cascade' }),
  labelId: text('label_id').notNull().references(() => labels.id, { onDelete: 'cascade' }),
}, (t) => [
  uniqueIndex('note_labels_note_id_label_id_unique').on(t.noteId, t.labelId),
  index('note_labels_label_id_idx').on(t.labelId),
])

export const checklistItems = sqliteTable('checklist_items', {
  id: text('id').primaryKey(),
  noteId: text('note_id').notNull().references(() => notes.id, { onDelete: 'cascade' }),
  text: text('text').notNull().default(''),
  isChecked: integer('is_checked', { mode: 'boolean' }).notNull().default(false),
  position: real('position').notNull().default(0),
}, (t) => [
  index('checklist_items_note_id_position_idx').on(t.noteId, t.position),
  check('checklist_items_text_length', sql`length(${t.text}) <= ${sql.raw(String(CONSTRAINTS.CHECKLIST_ITEM_MAX_LENGTH))}`),
])

export const attachments = sqliteTable('attachments', {
  id: text('id').primaryKey(),
  noteId: text('note_id').notNull().references(() => notes.id, { onDelete: 'cascade' }),
  filename: text('filename').notNull(),
  storagePath: text('storage_path').notNull(),
  mimeType: text('mime_type').notNull(),
  size: integer('size').notNull().default(0),
  thumbnailPath: text('thumbnail_path'),
  position: real('position').notNull().default(0),
  createdAt: text('created_at').notNull(),
}, (t) => [
  index('attachments_note_id_position_idx').on(t.noteId, t.position),
  check('attachments_filename_length', sql`length(${t.filename}) <= ${sql.raw(String(CONSTRAINTS.FILENAME_MAX_LENGTH))}`),
])

export const schema = { settings, notes, labels, noteLabels, checklistItems, attachments }

export type NoteRow = typeof notes.$inferSelect
export type LabelRow = typeof labels.$inferSelect
export type ChecklistItemRow = typeof checklistItems.$inferSelect
export type AttachmentRow = typeof attachments.$inferSelect

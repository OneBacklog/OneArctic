import { asc, eq, inArray } from 'drizzle-orm'
import type { Note } from '#shared/types/notes'
import { getDb, schema } from './db'
import { indexNote, removeNoteFromIndex } from './searchSvc'

/** Load notes with their labels, checklist items and attachments, preserving the order of `noteIds`. */
export async function getNotesWithMeta(noteIds: string[]): Promise<Note[]> {
  if (noteIds.length === 0) return []
  const db = getDb()

  const [rows, labelLinks, items, files] = await Promise.all([
    db.select().from(schema.notes).where(inArray(schema.notes.id, noteIds)).all(),
    db
      .select({ noteId: schema.noteLabels.noteId, label: schema.labels })
      .from(schema.noteLabels)
      .innerJoin(schema.labels, eq(schema.noteLabels.labelId, schema.labels.id))
      .where(inArray(schema.noteLabels.noteId, noteIds))
      .orderBy(asc(schema.labels.position))
      .all(),
    db
      .select()
      .from(schema.checklistItems)
      .where(inArray(schema.checklistItems.noteId, noteIds))
      .orderBy(asc(schema.checklistItems.position))
      .all(),
    db
      .select()
      .from(schema.attachments)
      .where(inArray(schema.attachments.noteId, noteIds))
      .orderBy(asc(schema.attachments.position), asc(schema.attachments.createdAt))
      .all(),
  ])

  const byId = new Map<string, Note>(
    rows.map((note) => [note.id, { ...note, labels: [], checklistItems: [], attachments: [] }])
  )
  for (const { noteId, label } of labelLinks) byId.get(noteId)?.labels.push(label)
  for (const item of items) byId.get(item.noteId)?.checklistItems.push(item)
  for (const file of files) byId.get(file.noteId)?.attachments.push(file)

  return noteIds.flatMap((id) => byId.get(id) ?? [])
}

export async function getNoteWithMeta(noteId: string): Promise<Note | undefined> {
  const [note] = await getNotesWithMeta([noteId])
  return note
}

/**
 * Push the current state of a note to the search index. Trashed notes are removed.
 * Never throws: search is best-effort and must not fail the request.
 */
export async function syncNoteToIndex(noteId: string): Promise<void> {
  try {
    const note = await getNoteWithMeta(noteId)
    if (!note || note.isTrashed) {
      await removeNoteFromIndex(noteId)
      return
    }
    await indexNote({
      id: note.id,
      title: note.title,
      content: note.content,
      labels: note.labels.map((l) => l.name),
      checklistItems: note.checklistItems.map((i) => i.text),
      attachmentNames: note.attachments.filter((a) => !a.thumbnailPath).map((a) => a.filename),
      isArchived: note.isArchived,
      isTrashed: note.isTrashed,
      updatedAt: note.updatedAt,
      createdAt: note.createdAt,
    })
  } catch (e) {
    console.warn(`[search] Failed to sync note ${noteId}:`, e instanceof Error ? e.message : e)
  }
}

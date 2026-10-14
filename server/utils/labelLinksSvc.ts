import { eq } from 'drizzle-orm'
import { schema, type DbClient } from './db'

export async function linkLabelsToNote(db: DbClient, noteId: string, labelIds?: string[]) {
  if (!Array.isArray(labelIds) || labelIds.length === 0) return
  await db.insert(schema.noteLabels).values(
    labelIds.map((labelId) => ({
      noteId,
      labelId,
    }))
  )
}

export async function replaceNoteLabels(db: DbClient, noteId: string, labelIds?: string[]) {
  await db.delete(schema.noteLabels).where(eq(schema.noteLabels.noteId, noteId))
  await linkLabelsToNote(db, noteId, labelIds)
}

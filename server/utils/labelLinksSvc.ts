import { eq, inArray } from 'drizzle-orm'
import { schema, type DbExecutor } from './db'

/** Throw 400 unless every id refers to an existing label. Returns the de-duplicated ids. */
export function assertLabelsExist(db: DbExecutor, labelIds: string[]): string[] {
  const unique = [...new Set(labelIds)]
  if (unique.length === 0) return unique
  const found = db
    .select({ id: schema.labels.id })
    .from(schema.labels)
    .where(inArray(schema.labels.id, unique))
    .all()
  if (found.length !== unique.length) {
    throw createError({ statusCode: 400, statusMessage: 'Unknown label' })
  }
  return unique
}

export function linkLabelsToNote(db: DbExecutor, noteId: string, labelIds: string[]) {
  if (labelIds.length === 0) return
  db.insert(schema.noteLabels).values(labelIds.map((labelId) => ({ noteId, labelId }))).run()
}

export function replaceNoteLabels(db: DbExecutor, noteId: string, labelIds: string[]) {
  db.delete(schema.noteLabels).where(eq(schema.noteLabels.noteId, noteId)).run()
  linkLabelsToNote(db, noteId, labelIds)
}

import { getDb, schema } from '../../utils/db'
import { eq } from 'drizzle-orm'
import { removeNotesFromIndex } from '../../utils/searchSvc'
import { deleteNoteDir } from '../../utils/filesSvc'
import { realtimeBus } from '../../utils/realtime'

/** Permanently delete every trashed note, not just the ones loaded in the client. */
export default defineEventHandler(async () => {
  const db = getDb()
  const noteIds = db.transaction((tx) => {
    const ids = tx
      .select({ id: schema.notes.id })
      .from(schema.notes)
      .where(eq(schema.notes.isTrashed, true))
      .all()
      .map((n) => n.id)
    tx.delete(schema.notes).where(eq(schema.notes.isTrashed, true)).run()
    return ids
  })

  for (const id of noteIds) deleteNoteDir(id)
  if (noteIds.length > 0) {
    removeNotesFromIndex(noteIds).catch((e) => console.warn('[search] Failed to remove notes from index:', e?.message))
    realtimeBus.publish({ type: 'note.trash-emptied', data: { resource: 'notes', noteIds } })
  }

  return { deleted: noteIds.length }
})

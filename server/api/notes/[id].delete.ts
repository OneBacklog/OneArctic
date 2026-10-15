import { getDb, schema } from '../../utils/db'
import { eq } from 'drizzle-orm'
import { removeNoteFromIndex } from '../../utils/searchSvc'
import { logger } from '../../utils/logger'
import { deleteNoteDir } from '../../utils/filesSvc'
import { realtimeBus } from '../../utils/realtime'
import { requireNote } from '../../utils/guards'

export default defineEventHandler(async (event) => {
  const { id } = await requireNote(event)

  // Remove the rows first so a failure never leaves a note pointing at deleted files
  getDb().delete(schema.notes).where(eq(schema.notes.id, id)).run()
  deleteNoteDir(id)
  removeNoteFromIndex(id).catch((e) => logger.search.warn('Failed to remove note from index:', e?.message))

  realtimeBus.publish({ type: 'note.deleted', data: { resource: 'notes', noteId: id } })
  return sendNoContent(event)
})

import { getDb, schema } from '../../utils/db'
import { eq } from 'drizzle-orm'
import { removeNoteFromIndex } from '../../utils/searchSvc'
import { deleteFile, deleteNoteDir } from '../../utils/filesSvc'
import { realtimeBus } from '../../utils/realtime'
import { requireNote } from '../../utils/guards'

export default defineEventHandler(async (event) => {
  const db = getDb()
  const { id } = await requireNote(event)

  // Delete associated files and directory
  const attachments = await db.select().from(schema.attachments).where(eq(schema.attachments.noteId, id)).all()
  for (const att of attachments) {
    deleteFile(att.storagePath)
    if (att.thumbnailPath) deleteFile(att.thumbnailPath)
  }
  deleteNoteDir(id)

  await db.delete(schema.notes).where(eq(schema.notes.id, id))
  removeNoteFromIndex(id).catch((e) => console.warn('[search] Failed to remove note from index:', e?.message))

  realtimeBus.publish({ type: 'note.deleted', data: { resource: 'notes', noteId: id } })
  return { success: true }
})

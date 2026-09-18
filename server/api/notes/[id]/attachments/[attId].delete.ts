import { getDb, schema } from '../../../../utils/db'
import { eq } from 'drizzle-orm'
import { deleteFile } from '../../../../utils/filesSvc'
import { realtimeBus } from '../../../../utils/realtime'

export default defineEventHandler(async (event) => {
  const db = getDb()
  const noteId = getRouterParam(event, 'id')!
  const attId = getRouterParam(event, 'attId')!

  const att = await db.select().from(schema.attachments).where(eq(schema.attachments.id, attId)).get()
  if (!att || att.noteId !== noteId) {
    throw createError({ statusCode: 404, statusMessage: 'Attachment not found' })
  }

  deleteFile(att.storagePath)
  if (att.thumbnailPath) deleteFile(att.thumbnailPath)

  await db.delete(schema.attachments).where(eq(schema.attachments.id, attId))

  realtimeBus.publish({ type: 'attachment.deleted', data: { resource: 'notes', noteId, attachmentId: attId } })
  return { success: true }
})

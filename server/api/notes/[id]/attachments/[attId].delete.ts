import { getDb, schema } from '../../../../utils/db'
import { eq } from 'drizzle-orm'
import { deleteFile } from '../../../../utils/filesSvc'
import { realtimeBus } from '../../../../utils/realtime'
import { requireAttachment } from '../../../../utils/guards'

export default defineEventHandler(async (event) => {
  const att = await requireAttachment(event)

  await getDb().delete(schema.attachments).where(eq(schema.attachments.id, att.id))
  deleteFile(att.storagePath)
  if (att.thumbnailPath) deleteFile(att.thumbnailPath)

  realtimeBus.publish({ type: 'attachment.deleted', data: { resource: 'notes', noteId: att.noteId, attachmentId: att.id } })
  return sendNoContent(event)
})

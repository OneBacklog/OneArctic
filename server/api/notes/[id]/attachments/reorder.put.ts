import { and, eq } from 'drizzle-orm'
import { getDb, schema } from '../../../../utils/db'
import { attachmentReorderSchema } from '#shared/schemas/attachments'
import { realtimeBus } from '../../../../utils/realtime'
import { requireNote } from '../../../../utils/guards'
import { readBodyAs } from '../../../../utils/validation'

export default defineEventHandler(async (event) => {
  const db = getDb()
  const { id: noteId } = await requireNote(event)
  const { ids } = await readBodyAs(event, attachmentReorderSchema)

  const existingIds = new Set(
    db.select({ id: schema.attachments.id })
      .from(schema.attachments)
      .where(eq(schema.attachments.noteId, noteId))
      .all()
      .map((a) => a.id)
  )
  if (ids.length !== existingIds.size || ids.some((id) => !existingIds.has(id))) {
    throw createError({ statusCode: 400, message: 'Invalid Attachment Order' })
  }

  db.transaction((tx) => {
    ids.forEach((id, position) => {
      tx.update(schema.attachments)
        .set({ position })
        .where(and(eq(schema.attachments.id, id), eq(schema.attachments.noteId, noteId)))
        .run()
    })
  })

  realtimeBus.publish({ type: 'attachment.reordered', data: { resource: 'notes', noteId, attachmentIds: ids } })
  return sendNoContent(event)
})

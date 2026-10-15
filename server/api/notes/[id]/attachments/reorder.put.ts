import { and, eq } from 'drizzle-orm'
import { getDb, schema } from '../../../../utils/db'
import { realtimeBus } from '../../../../utils/realtime'
import { requireRouterParam } from '../../../../utils/guards'

export default defineEventHandler(async (event) => {
  const db = getDb()
  const noteId = requireRouterParam(event, 'id')
  const body = await readBody(event)
  const ids: string[] = Array.isArray(body?.ids) && body.ids.every((id: unknown) => typeof id === 'string') ? body.ids : []

  if (ids.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'Attachment order is required' })
  }

  const attachments = await db
    .select({ id: schema.attachments.id })
    .from(schema.attachments)
    .where(eq(schema.attachments.noteId, noteId))
    .all()

  const existingIds = new Set(attachments.map((a) => a.id))
  if (ids.length !== existingIds.size || ids.some((id) => !existingIds.has(id))) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid attachment order' })
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
  return { success: true }
})

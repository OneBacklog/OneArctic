import { and, eq } from 'drizzle-orm'
import { getDb, schema } from '../../../../utils/db'
import { realtimeBus } from '../../../../utils/realtime'

export default defineEventHandler(async (event) => {
  const db = getDb()
  const noteId = getRouterParam(event, 'id')!
  const body = await readBody(event)
  const ids: string[] = Array.isArray(body?.ids) ? body.ids : []

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

  for (let i = 0; i < ids.length; i++) {
    await db
      .update(schema.attachments)
      .set({ position: i })
      .where(and(eq(schema.attachments.id, ids[i]!), eq(schema.attachments.noteId, noteId)))
  }

  realtimeBus.publish({ type: 'attachment.reordered', data: { resource: 'notes', noteId, attachmentIds: ids } })
  return { success: true }
})

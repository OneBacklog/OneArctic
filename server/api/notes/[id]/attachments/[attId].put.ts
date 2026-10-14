import { and, eq } from 'drizzle-orm'
import { getDb, schema } from '../../../../utils/db'
import { sanitizeFilename } from '../../../../utils/sanitize'
import { syncNoteToIndex } from '../../../../utils/notesSvc'
import { realtimeBus } from '../../../../utils/realtime'
import { requireRouterParam } from '../../../../utils/guards'
import { CONSTRAINTS } from '#shared/utils/constants'

const MAX_FILENAME_LENGTH = CONSTRAINTS.FILENAME_MAX_LENGTH

export default defineEventHandler(async (event) => {
  const db = getDb()
  const noteId = requireRouterParam(event, 'id')
  const attId = requireRouterParam(event, 'attId')
  const body = await readBody(event)
  const rawName = typeof body?.filename === 'string' ? body.filename : ''

  if (!rawName.trim()) {
    throw createError({ statusCode: 400, statusMessage: 'Filename is required' })
  }

  const safeName = sanitizeFilename(rawName)
  if (safeName.length > MAX_FILENAME_LENGTH) {
    throw createError({ statusCode: 400, statusMessage: `Filename too long (max ${MAX_FILENAME_LENGTH})` })
  }

  const att = await db
    .select()
    .from(schema.attachments)
    .where(and(eq(schema.attachments.id, attId), eq(schema.attachments.noteId, noteId)))
    .get()
  if (!att) {
    throw createError({ statusCode: 404, statusMessage: 'Attachment not found' })
  }

  const updated = await db
    .update(schema.attachments)
    .set({ filename: safeName })
    .where(eq(schema.attachments.id, attId))
    .returning()
    .get()

  void syncNoteToIndex(noteId)

  realtimeBus.publish({ type: 'attachment.updated', data: { resource: 'notes', noteId, attachment: updated } })
  return { attachment: updated }
})

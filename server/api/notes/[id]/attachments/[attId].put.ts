import { and, eq } from 'drizzle-orm'
import { getDb, schema } from '../../../../utils/db'
import { sanitizeFilename } from '../../../../utils/sanitize'
import { indexNote } from '../../../../utils/searchSvc'
import { realtimeBus } from '../../../../utils/realtime'

const MAX_FILENAME_LENGTH = 100

export default defineEventHandler(async (event) => {
  const db = getDb()
  const noteId = getRouterParam(event, 'id')!
  const attId = getRouterParam(event, 'attId')!
  const body = await readBody(event)
  const rawName = typeof body?.filename === 'string' ? body.filename : ''

  if (!rawName.trim()) {
    throw createError({ statusCode: 400, statusMessage: 'Filename is required' })
  }

  let safeName = sanitizeFilename(rawName)
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

  await db
    .update(schema.attachments)
    .set({ filename: safeName })
    .where(eq(schema.attachments.id, attId))

  const updated = await db.select().from(schema.attachments).where(eq(schema.attachments.id, attId)).get()

  const note = await db.select().from(schema.notes).where(eq(schema.notes.id, noteId)).get()
  if (note) {
    const [allAttachments, labelLinks, checklistItemsRaw] = await Promise.all([
      db.select().from(schema.attachments).where(eq(schema.attachments.noteId, noteId)).all(),
      db
        .select({ label: schema.labels })
        .from(schema.noteLabels)
        .innerJoin(schema.labels, eq(schema.noteLabels.labelId, schema.labels.id))
        .where(eq(schema.noteLabels.noteId, noteId))
        .all(),
      db.select().from(schema.checklistItems).where(eq(schema.checklistItems.noteId, noteId)).all(),
    ])

    indexNote({
      id: noteId,
      title: note.title,
      content: note.content,
      labels: labelLinks.map((l) => l.label.name),
      checklistItems: checklistItemsRaw.map((i) => i.text),
      attachmentNames: allAttachments.filter((a) => !a.thumbnailPath).map((a) => a.filename),
      isArchived: note.isArchived,
      isTrashed: note.isTrashed,
      updatedAt: note.updatedAt,
      createdAt: note.createdAt,
    }).catch((e) => console.warn('[search] Failed to index note after attachment rename:', e?.message))
  }

  realtimeBus.publish({ type: 'attachment.updated', data: { resource: 'notes', noteId, attachment: updated } })
  return { attachment: updated }
})

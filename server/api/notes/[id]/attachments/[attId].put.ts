import { eq } from 'drizzle-orm'
import { getDb, schema } from '../../../../utils/db'
import { attachmentRenameSchema } from '#shared/schemas/attachments'
import { CONSTRAINTS } from '#shared/utils/constants'
import { sanitizeFilename } from '../../../../utils/sanitize'
import { syncNoteToIndex } from '../../../../utils/notesSvc'
import { realtimeBus } from '../../../../utils/realtime'
import { requireAttachment } from '../../../../utils/guards'
import { readBodyAs } from '../../../../utils/validation'

export default defineEventHandler(async (event) => {
  const { filename } = await readBodyAs(event, attachmentRenameSchema)
  const safeName = sanitizeFilename(filename)
  if (safeName.length > CONSTRAINTS.FILENAME_MAX_LENGTH) {
    throw createError({ statusCode: 400, message: `Filename Must Be ${CONSTRAINTS.FILENAME_MAX_LENGTH} Characters or Less` })
  }

  const att = await requireAttachment(event)
  const updated = await getDb()
    .update(schema.attachments)
    .set({ filename: safeName })
    .where(eq(schema.attachments.id, att.id))
    .returning()
    .get()

  void syncNoteToIndex(att.noteId)

  realtimeBus.publish({ type: 'attachment.updated', data: { resource: 'notes', noteId: att.noteId, attachment: updated } })
  return updated
})

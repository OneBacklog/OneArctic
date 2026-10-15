import type { H3Event } from 'h3'
import { eq } from 'drizzle-orm'
import { attachmentParamsSchema, idParamsSchema } from '#shared/schemas/common'
import { getDb, schema } from './db'
import { getParamsAs } from './validation'

/** Load the note identified by the `id` route param, or throw 404. */
export async function requireNote(event: H3Event) {
  const { id } = getParamsAs(event, idParamsSchema)
  const note = await getDb().select().from(schema.notes).where(eq(schema.notes.id, id)).get()
  if (!note) throw createError({ statusCode: 404, message: 'Note Not Found' })
  return note
}

/** Load the label identified by the `id` route param, or throw 404. */
export async function requireLabel(event: H3Event) {
  const { id } = getParamsAs(event, idParamsSchema)
  const label = await getDb().select().from(schema.labels).where(eq(schema.labels.id, id)).get()
  if (!label) throw createError({ statusCode: 404, message: 'Label Not Found' })
  return label
}

/** Load the attachment identified by the `id` and `attId` route params, or throw 404. */
export async function requireAttachment(event: H3Event) {
  const { id, attId } = getParamsAs(event, attachmentParamsSchema)
  const att = await getDb().select().from(schema.attachments).where(eq(schema.attachments.id, attId)).get()
  if (!att || att.noteId !== id) throw createError({ statusCode: 404, message: 'Attachment Not Found' })
  return att
}

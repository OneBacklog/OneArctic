import type { H3Event } from 'h3'
import { eq } from 'drizzle-orm'
import { getDb, schema } from './db'

export function requireRouterParam(event: H3Event, name: string): string {
  const value = getRouterParam(event, name)
  if (!value) throw createError({ statusCode: 400, statusMessage: `Missing route parameter: ${name}` })
  return value
}

/** Load the note identified by the `id` route param, or throw 404. */
export async function requireNote(event: H3Event) {
  const id = requireRouterParam(event, 'id')
  const note = await getDb().select().from(schema.notes).where(eq(schema.notes.id, id)).get()
  if (!note) throw createError({ statusCode: 404, statusMessage: 'Note not found' })
  return note
}

/** Load the label identified by the `id` route param, or throw 404. */
export async function requireLabel(event: H3Event) {
  const id = requireRouterParam(event, 'id')
  const label = await getDb().select().from(schema.labels).where(eq(schema.labels.id, id)).get()
  if (!label) throw createError({ statusCode: 404, statusMessage: 'Label not found' })
  return label
}

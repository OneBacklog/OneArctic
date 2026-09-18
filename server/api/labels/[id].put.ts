import { getDb, schema } from '../../utils/db'
import { eq } from 'drizzle-orm'
import { realtimeBus } from '../../utils/realtime'

export default defineEventHandler(async (event) => {
  const db = getDb()
  const id = getRouterParam(event, 'id')!
  const body = await readBody(event) as { name: string }

  if (!body.name?.trim()) {
    throw createError({ statusCode: 400, statusMessage: 'Label name is required' })
  }
  if (body.name.trim().length > 20) {
    throw createError({ statusCode: 400, statusMessage: 'Label name must be 20 characters or fewer' })
  }

  const label = await db.select().from(schema.labels).where(eq(schema.labels.id, id)).get()
  if (!label) throw createError({ statusCode: 404, statusMessage: 'Label not found' })

  await db.update(schema.labels).set({ name: body.name.trim() }).where(eq(schema.labels.id, id))
  const updated = await db.select().from(schema.labels).where(eq(schema.labels.id, id)).get()
  realtimeBus.publish({ type: 'label.updated', data: { resource: 'labels', label: updated } })
  return updated
})

import { getDb, schema } from '../../utils/db'
import { eq, count } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { realtimeBus } from '../../utils/realtime'

export default defineEventHandler(async (event) => {
  const db = getDb()
  const body = await readBody(event) as { name: string }

  if (!body.name?.trim()) {
    throw createError({ statusCode: 400, statusMessage: 'Label name is required' })
  }
  if (body.name.trim().length > 20) {
    throw createError({ statusCode: 400, statusMessage: 'Label name must be 20 characters or fewer' })
  }

  const name = body.name.trim()
  const existing = await db.select().from(schema.labels).where(eq(schema.labels.name, name)).get()
  if (existing) throw createError({ statusCode: 409, statusMessage: 'Label already exists' })

  const [{ total }] = await db.select({ total: count() }).from(schema.labels)
  const id = nanoid()
  const now = new Date().toISOString()
  await db.insert(schema.labels).values({ id, name, position: total, createdAt: now })
  const label = await db.select().from(schema.labels).where(eq(schema.labels.id, id)).get()

  realtimeBus.publish({ type: 'label.created', data: { resource: 'labels', label } })
  return label
})

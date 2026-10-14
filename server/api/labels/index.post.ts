import { getDb, schema } from '../../utils/db'
import { eq, count } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { realtimeBus } from '../../utils/realtime'
import { CONSTRAINTS } from '#shared/utils/constants'

export default defineEventHandler(async (event) => {
  const db = getDb()
  const body = await readBody(event) as { name: string }

  if (!body.name?.trim()) {
    throw createError({ statusCode: 400, statusMessage: 'Label name is required' })
  }
  if (body.name.trim().length > CONSTRAINTS.LABEL_MAX_LENGTH) {
    throw createError({ statusCode: 400, statusMessage: `Label name must be ${CONSTRAINTS.LABEL_MAX_LENGTH} characters or fewer` })
  }

  const name = body.name.trim()
  const existing = await db.select().from(schema.labels).where(eq(schema.labels.name, name)).get()
  if (existing) throw createError({ statusCode: 409, statusMessage: 'Label already exists' })

  const { total } = await db.select({ total: count() }).from(schema.labels).get() ?? { total: 0 }
  const label = await db
    .insert(schema.labels)
    .values({ id: nanoid(), name, position: total, createdAt: new Date().toISOString() })
    .returning()
    .get()

  realtimeBus.publish({ type: 'label.created', data: { resource: 'labels', label } })
  return label
})

import { getDb, schema } from '../../utils/db'
import { eq, max } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { realtimeBus } from '../../utils/realtime'
import { CONSTRAINTS } from '#shared/utils/constants'

export default defineEventHandler(async (event) => {
  const db = getDb()
  const body = await readBody(event) as { name?: unknown } | null

  if (typeof body?.name !== 'string' || !body.name.trim()) {
    throw createError({ statusCode: 400, statusMessage: 'Label name is required' })
  }
  if (body.name.trim().length > CONSTRAINTS.LABEL_MAX_LENGTH) {
    throw createError({ statusCode: 400, statusMessage: `Label name must be ${CONSTRAINTS.LABEL_MAX_LENGTH} characters or fewer` })
  }

  const name = body.name.trim()
  const existing = await db.select().from(schema.labels).where(eq(schema.labels.name, name)).get()
  if (existing) throw createError({ statusCode: 409, statusMessage: 'Label already exists' })

  const { maxPosition } = await db.select({ maxPosition: max(schema.labels.position) }).from(schema.labels).get() ?? {}
  const label = await db
    .insert(schema.labels)
    .values({ id: nanoid(), name, position: (maxPosition ?? -1) + 1, createdAt: new Date().toISOString() })
    .returning()
    .get()

  realtimeBus.publish({ type: 'label.created', data: { resource: 'labels', label } })
  return label
})

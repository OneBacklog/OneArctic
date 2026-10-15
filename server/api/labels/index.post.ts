import { getDb, schema } from '../../utils/db'
import { eq, max } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { labelInputSchema } from '#shared/schemas/labels'
import { realtimeBus } from '../../utils/realtime'
import { readBodyAs } from '../../utils/validation'

export default defineEventHandler(async (event) => {
  const db = getDb()
  const { name } = await readBodyAs(event, labelInputSchema)

  const existing = await db.select().from(schema.labels).where(eq(schema.labels.name, name)).get()
  if (existing) throw createError({ statusCode: 409, message: 'Label Already Exists' })

  const { maxPosition } = await db.select({ maxPosition: max(schema.labels.position) }).from(schema.labels).get() ?? {}
  const label = await db
    .insert(schema.labels)
    .values({ id: nanoid(), name, position: (maxPosition ?? -1) + 1, createdAt: new Date().toISOString() })
    .returning()
    .get()

  realtimeBus.publish({ type: 'label.created', data: { resource: 'labels', label } })
  setResponseStatus(event, 201)
  return label
})

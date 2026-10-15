import { getDb, schema } from '../../utils/db'
import { and, eq, ne } from 'drizzle-orm'
import { realtimeBus } from '../../utils/realtime'
import { CONSTRAINTS } from '#shared/utils/constants'
import { requireLabel } from '../../utils/guards'

export default defineEventHandler(async (event) => {
  const body = await readBody(event) as { name?: unknown } | null

  if (typeof body?.name !== 'string' || !body.name.trim()) {
    throw createError({ statusCode: 400, statusMessage: 'Label name is required' })
  }
  if (body.name.trim().length > CONSTRAINTS.LABEL_MAX_LENGTH) {
    throw createError({ statusCode: 400, statusMessage: `Label name must be ${CONSTRAINTS.LABEL_MAX_LENGTH} characters or fewer` })
  }

  const label = await requireLabel(event)
  const name = body.name.trim()
  const db = getDb()

  const duplicate = await db
    .select({ id: schema.labels.id })
    .from(schema.labels)
    .where(and(eq(schema.labels.name, name), ne(schema.labels.id, label.id)))
    .get()
  if (duplicate) throw createError({ statusCode: 409, statusMessage: 'Label already exists' })

  const updated = await db
    .update(schema.labels)
    .set({ name })
    .where(eq(schema.labels.id, label.id))
    .returning()
    .get()
  realtimeBus.publish({ type: 'label.updated', data: { resource: 'labels', label: updated } })
  return updated
})

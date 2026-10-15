import { getDb, schema } from '../../utils/db'
import { and, eq, ne } from 'drizzle-orm'
import { labelInputSchema } from '#shared/schemas/labels'
import { realtimeBus } from '../../utils/realtime'
import { requireLabel } from '../../utils/guards'
import { readBodyAs } from '../../utils/validation'

export default defineEventHandler(async (event) => {
  const { name } = await readBodyAs(event, labelInputSchema)
  const label = await requireLabel(event)
  const db = getDb()

  const duplicate = await db
    .select({ id: schema.labels.id })
    .from(schema.labels)
    .where(and(eq(schema.labels.name, name), ne(schema.labels.id, label.id)))
    .get()
  if (duplicate) throw createError({ statusCode: 409, message: 'Label Already Exists' })

  const updated = await db
    .update(schema.labels)
    .set({ name })
    .where(eq(schema.labels.id, label.id))
    .returning()
    .get()
  realtimeBus.publish({ type: 'label.updated', data: { resource: 'labels', label: updated } })
  return updated
})

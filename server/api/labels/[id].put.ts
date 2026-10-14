import { getDb, schema } from '../../utils/db'
import { eq } from 'drizzle-orm'
import { realtimeBus } from '../../utils/realtime'
import { CONSTRAINTS } from '#shared/utils/constants'
import { requireLabel } from '../../utils/guards'

export default defineEventHandler(async (event) => {
  const body = await readBody(event) as { name: string }

  if (!body.name?.trim()) {
    throw createError({ statusCode: 400, statusMessage: 'Label name is required' })
  }
  if (body.name.trim().length > CONSTRAINTS.LABEL_MAX_LENGTH) {
    throw createError({ statusCode: 400, statusMessage: `Label name must be ${CONSTRAINTS.LABEL_MAX_LENGTH} characters or fewer` })
  }

  const label = await requireLabel(event)

  const updated = await getDb()
    .update(schema.labels)
    .set({ name: body.name.trim() })
    .where(eq(schema.labels.id, label.id))
    .returning()
    .get()
  realtimeBus.publish({ type: 'label.updated', data: { resource: 'labels', label: updated } })
  return updated
})

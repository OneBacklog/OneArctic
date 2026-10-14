import { getDb, schema } from '../../utils/db'
import { eq } from 'drizzle-orm'
import { realtimeBus } from '../../utils/realtime'
import { requireLabel } from '../../utils/guards'

export default defineEventHandler(async (event) => {
  const label = await requireLabel(event)

  await getDb().delete(schema.labels).where(eq(schema.labels.id, label.id))
  realtimeBus.publish({ type: 'label.deleted', data: { resource: 'labels', labelId: label.id } })
  return { success: true }
})

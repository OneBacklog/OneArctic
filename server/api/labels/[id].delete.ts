import { getDb, schema } from '../../utils/db'
import { eq } from 'drizzle-orm'
import { realtimeBus } from '../../utils/realtime'

export default defineEventHandler(async (event) => {
  const db = getDb()
  const id = getRouterParam(event, 'id')!

  const label = await db.select().from(schema.labels).where(eq(schema.labels.id, id)).get()
  if (!label) throw createError({ statusCode: 404, statusMessage: 'Label not found' })

  await db.delete(schema.labels).where(eq(schema.labels.id, id))
  realtimeBus.publish({ type: 'label.deleted', data: { resource: 'labels', labelId: id } })
  return { success: true }
})

import { getDb, schema } from '../../utils/db'
import { eq } from 'drizzle-orm'
import { realtimeBus } from '../../utils/realtime'

export default defineEventHandler(async (event) => {
  const db = getDb()
  const body = await readBody(event) as { order: Array<{ id: string; position: number }> }

  if (!Array.isArray(body?.order) || body.order.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'order array required' })
  }

  for (const item of body.order) {
    if (typeof item.id !== 'string' || !item.id) {
      throw createError({ statusCode: 400, statusMessage: 'Each item must have a string id' })
    }
    if (typeof item.position !== 'number' || !Number.isFinite(item.position) || item.position < 0) {
      throw createError({ statusCode: 400, statusMessage: 'Each item position must be a non-negative number' })
    }
  }

  await Promise.all(
    body.order.map(({ id, position }) =>
      db.update(schema.labels).set({ position }).where(eq(schema.labels.id, id))
    )
  )

  realtimeBus.publish({ type: 'label.reordered', data: { resource: 'labels', order: body.order } })
  return { ok: true }
})

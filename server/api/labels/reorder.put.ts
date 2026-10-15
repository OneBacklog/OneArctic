import { getDb, schema } from '../../utils/db'
import { eq } from 'drizzle-orm'
import { labelReorderSchema } from '#shared/schemas/labels'
import { realtimeBus } from '../../utils/realtime'
import { readBodyAs } from '../../utils/validation'

export default defineEventHandler(async (event) => {
  const { order } = await readBodyAs(event, labelReorderSchema)

  getDb().transaction((tx) => {
    for (const { id, position } of order) {
      tx.update(schema.labels).set({ position }).where(eq(schema.labels.id, id)).run()
    }
  })

  realtimeBus.publish({ type: 'label.reordered', data: { resource: 'labels', order } })
  return sendNoContent(event)
})

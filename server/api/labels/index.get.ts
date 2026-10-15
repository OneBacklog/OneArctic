import { getDb, schema } from '../../utils/db'
import { asc } from 'drizzle-orm'

export default defineEventHandler(async () => {
  return getDb().select().from(schema.labels).orderBy(asc(schema.labels.position), asc(schema.labels.createdAt)).all()
})

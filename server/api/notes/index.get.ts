import { getDb, schema } from '../../utils/db'
import { eq, and, desc, inArray } from 'drizzle-orm'
import { getNotesWithMeta } from '../../utils/notesSvc'
import { CONSTRAINTS } from '#shared/utils/constants'

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'no-store')
  const db = getDb()
  const query = getQuery(event)

  const isArchived = query.archived === 'true'
  const isTrashed = query.trashed === 'true'
  const labelId = query.label as string | undefined
  const limit = CONSTRAINTS.PAGINATION_LIMIT
  const page = Math.max(parseInt(query.page as string) || 1, 1)
  const offset = (page - 1) * limit

  const conditions = [
    eq(schema.notes.isArchived, isArchived),
    eq(schema.notes.isTrashed, isTrashed),
  ]

  if (labelId) {
    const linked = db
      .select({ noteId: schema.noteLabels.noteId })
      .from(schema.noteLabels)
      .where(eq(schema.noteLabels.labelId, labelId))
    conditions.push(inArray(schema.notes.id, linked))
  }

  const rows = await db
    .select({ id: schema.notes.id })
    .from(schema.notes)
    .where(and(...conditions))
    .orderBy(desc(schema.notes.createdAt))
    .limit(limit)
    .offset(offset)
    .all()

  const notes = await getNotesWithMeta(rows.map((r) => r.id))
  return { notes, hasMore: rows.length === limit }
})

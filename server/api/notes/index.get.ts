import { getDb, schema } from '../../utils/db'
import { eq, and, desc, inArray } from 'drizzle-orm'
import { getNotesWithMeta } from '../../utils/notesSvc'
import { notesListQuerySchema } from '#shared/schemas/notes'
import { CONSTRAINTS } from '#shared/utils/constants'
import { getQueryAs } from '../../utils/validation'

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'no-store')
  const db = getDb()
  const { archived, trashed, labelId, page } = getQueryAs(event, notesListQuerySchema)
  const limit = CONSTRAINTS.PAGINATION_LIMIT

  const conditions = [
    eq(schema.notes.isArchived, archived),
    eq(schema.notes.isTrashed, trashed),
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
    .offset((page - 1) * limit)
    .all()

  const notes = await getNotesWithMeta(rows.map((r) => r.id))
  return { notes, hasMore: rows.length === limit }
})

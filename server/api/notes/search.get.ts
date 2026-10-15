import { searchNotes } from '../../utils/searchSvc'
import { getNotesWithMeta } from '../../utils/notesSvc'
import { getDb, schema } from '../../utils/db'
import { eq } from 'drizzle-orm'
import { searchQuerySchema } from '#shared/schemas/notes'
import { getQueryAs } from '../../utils/validation'

const CONTEXT_FILTERS = {
  notes: 'isArchived = false AND isTrashed = false',
  archive: 'isArchived = true AND isTrashed = false',
  trash: 'isTrashed = true',
} as const

export default defineEventHandler(async (event) => {
  const { q, context, labelId, limit, page } = getQueryAs(event, searchQuerySchema)
  const offset = (page - 1) * limit

  if (!q.trim()) return { notes: [], page, total: 0, hasMore: false }

  let filter: string = CONTEXT_FILTERS[context]

  // Add label filter — escape label name to prevent filter injection
  if (labelId) {
    const label = await getDb().select().from(schema.labels).where(eq(schema.labels.id, labelId)).get()
    if (label) {
      const escapedName = label.name.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
      filter += ` AND labels = "${escapedName}"`
    }
  }

  const results = await searchNotes(q, { filter, limit, offset })
  const notes = await getNotesWithMeta(results.hits.map((h) => h.id as string))
  const total = results.estimatedTotalHits || 0
  return { notes, page, total, hasMore: offset + limit < total }
})

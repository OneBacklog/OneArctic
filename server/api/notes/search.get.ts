import { searchNotes } from '../../utils/searchSvc'
import { getNotesWithMeta } from '../../utils/notesSvc'
import { getDb, schema } from '../../utils/db'
import { eq } from 'drizzle-orm'
import { CONSTRAINTS } from '#shared/utils/constants'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const q = (query.q as string) || ''
  const context = (query.context as string) || 'notes' // notes | archive | trash
  const labelId = query.labelId as string | undefined
  const limit = Math.min(Math.max(parseInt(query.limit as string) || CONSTRAINTS.PAGINATION_LIMIT, 1), 100)
  const page = Math.max(parseInt(query.page as string) || 1, 1)
  const offset = (page - 1) * limit

  if (!q.trim()) return { notes: [] }

  // Build Meilisearch filter based on context
  let filter: string
  if (context === 'archive') {
    filter = 'isArchived = true AND isTrashed = false'
  } else if (context === 'trash') {
    filter = 'isTrashed = true'
  } else {
    filter = 'isArchived = false AND isTrashed = false'
  }

  // Add label filter — escape label name to prevent filter injection
  if (labelId) {
    const db = getDb()
    const label = await db.select().from(schema.labels).where(eq(schema.labels.id, labelId)).get()
    if (label) {
      const escapedName = label.name.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
      filter += ` AND labels = "${escapedName}"`
    }
  }

  const results = await searchNotes(q, { filter, limit, offset })
  const ids = results.hits.map((h) => h.id as string)

  const notes = await getNotesWithMeta(ids)
  const total = results.estimatedTotalHits || 0
  const hasMore = offset + limit < total
  return { notes, query: q, page, total, hasMore }
})

import { getDb, schema } from '../../utils/db'
import { eq, and, asc, desc, inArray } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'no-store')
  const db = getDb()
  const query = getQuery(event)

  const isArchived = query.archived === 'true'
  const isTrashed = query.trashed === 'true'
  const labelId = query.label as string | undefined
  const limit = 20
  const page = Math.max(parseInt(query.page as string) || 1, 1)
  const offset = (page - 1) * limit

  const conditions = [
    eq(schema.notes.isArchived, isArchived),
    eq(schema.notes.isTrashed, isTrashed),
  ]

  let noteIds: string[] | null = null
  if (labelId) {
    const linked = await db
      .select({ noteId: schema.noteLabels.noteId })
      .from(schema.noteLabels)
      .where(eq(schema.noteLabels.labelId, labelId))
      .all()
    noteIds = linked.map((r) => r.noteId)
    if (noteIds.length === 0) return { notes: [], hasMore: false, total: 0 }
  }

  const allConditions = noteIds
    ? [...conditions, inArray(schema.notes.id, noteIds)]
    : conditions

  const rows = await db
    .select()
    .from(schema.notes)
    .where(and(...allConditions))
    .orderBy(desc(schema.notes.createdAt))
    .limit(limit)
    .offset(offset)
    .all()

  const notesWithMeta = await Promise.all(
    rows.map(async (note) => {
      const [labelLinks, checklistItemsRaw, attachmentsRaw] = await Promise.all([
        db
          .select({ label: schema.labels })
          .from(schema.noteLabels)
          .innerJoin(schema.labels, eq(schema.noteLabels.labelId, schema.labels.id))
          .where(eq(schema.noteLabels.noteId, note.id))
          .all(),
        note.type === 'checklist'
          ? db
              .select()
              .from(schema.checklistItems)
              .where(eq(schema.checklistItems.noteId, note.id))
              .orderBy(asc(schema.checklistItems.position))
              .all()
          : Promise.resolve([]),
        db
          .select()
          .from(schema.attachments)
          .where(eq(schema.attachments.noteId, note.id))
          .orderBy(asc(schema.attachments.position), asc(schema.attachments.createdAt))
          .all(),
      ])

      return {
        ...note,
        labels: labelLinks.map((l) => l.label),
        checklistItems: checklistItemsRaw,
        attachments: attachmentsRaw,
      }
    })
  )

  return { notes: notesWithMeta, hasMore: rows.length === limit }
})

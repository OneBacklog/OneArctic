import { getDb, schema } from '../../utils/db'
import { eq, asc } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { indexNote } from '../../utils/searchSvc'
import { linkLabelsToNote } from '../../utils/labelLinksSvc'
import { realtimeBus } from '../../utils/realtime'

export default defineEventHandler(async (event) => {
  const db = getDb()
  const body = await readBody(event)

  const {
    type = 'text',
    title = '',
    content = '',
    checklistItems = [],
    labelIds = [],
  } = body as {
    type?: 'text' | 'checklist'
    title?: string
    content?: string
    checklistItems?: Array<{ text: string; isChecked?: boolean }>
    labelIds?: string[]
  }

  if (!title.trim()) {
    throw createError({ statusCode: 400, statusMessage: 'Title is required' })
  }
  if (title.length > 100) {
    throw createError({ statusCode: 400, statusMessage: 'Title must be 100 characters or less' })
  }
  if (content.length > 10000) {
    throw createError({ statusCode: 400, statusMessage: 'Content must be 10,000 characters or less' })
  }
  if (!Array.isArray(checklistItems) || checklistItems.length > 100) {
    throw createError({ statusCode: 400, statusMessage: 'Checklist may have at most 100 items' })
  }
  if (checklistItems.some((i) => typeof i.text !== 'string' || i.text.length > 100)) {
    throw createError({ statusCode: 400, statusMessage: 'Each checklist item text must be 100 characters or less' })
  }

  const id = nanoid()
  const now = new Date().toISOString()

  await db.insert(schema.notes).values({
    id,
    type,
    title,
    content,
    createdAt: now,
    updatedAt: now,
  })

  // Insert checklist items
  if (type === 'checklist' && checklistItems.length > 0) {
    await db.insert(schema.checklistItems).values(
      checklistItems.map((item, idx) => ({
        id: nanoid(),
        noteId: id,
        text: item.text,
        isChecked: item.isChecked ?? false,
        position: idx,
      }))
    )
  }

  // Link labels
  await linkLabelsToNote(db, id, labelIds)

  // Fetch full note for response & search indexing
  const note = await db.select().from(schema.notes).where(eq(schema.notes.id, id)).get()!
  const [labelLinks, items] = await Promise.all([
    db
      .select({ label: schema.labels })
      .from(schema.noteLabels)
      .innerJoin(schema.labels, eq(schema.noteLabels.labelId, schema.labels.id))
      .where(eq(schema.noteLabels.noteId, id))
      .all(),
    db
      .select()
      .from(schema.checklistItems)
      .where(eq(schema.checklistItems.noteId, id))
      .orderBy(asc(schema.checklistItems.position))
      .all(),
  ])

  const noteLabelsArr = labelLinks.map((l) => l.label)

  // Index in Meilisearch (fire-and-forget)
  indexNote({
    id,
    title,
    content,
    labels: noteLabelsArr.map((l) => l.name),
    checklistItems: items.map((i) => i.text),
    attachmentNames: [],
    isArchived: false,
    isTrashed: false,
    updatedAt: now,
    createdAt: now,
  }).catch((e) => console.warn('[search] Failed to index note:', e?.message))

  const result = {
    ...note,
    labels: noteLabelsArr,
    checklistItems: items,
    attachments: [],
  }
  realtimeBus.publish({ type: 'note.created', data: { resource: 'notes', note: result } })
  return result
})

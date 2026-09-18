import { getDb, schema } from '../../utils/db'
import { eq, asc, inArray } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { indexNote, removeNoteFromIndex } from '../../utils/searchSvc'
import { replaceNoteLabels } from '../../utils/labelLinksSvc'
import { realtimeBus } from '../../utils/realtime'

export default defineEventHandler(async (event) => {
  const db = getDb()
  const id = getRouterParam(event, 'id')!
  const body = await readBody(event)

  const existing = await db.select().from(schema.notes).where(eq(schema.notes.id, id)).get()
  if (!existing) throw createError({ statusCode: 404, statusMessage: 'Note not found' })

  const {
    title,
    content,
    isArchived,
    isTrashed,
    type,
    checklistItems,
    labelIds,
  } = body as {
    title?: string
    content?: string
    isArchived?: boolean
    isTrashed?: boolean
    type?: 'text' | 'checklist'
    checklistItems?: Array<{ id?: string; text: string; isChecked?: boolean; position?: number }>
    labelIds?: string[]
  }

  const now = new Date().toISOString()
  let labelsChanged = false

  const updateData: Partial<typeof schema.notes.$inferInsert> = { updatedAt: now }
  if (title !== undefined) {
    if (!title.trim()) throw createError({ statusCode: 400, statusMessage: 'Title is required' })
    if (title.length > 100) throw createError({ statusCode: 400, statusMessage: 'Title must be 100 characters or less' })
    updateData.title = title
  }
  if (content !== undefined) {
    if (content.length > 10000) throw createError({ statusCode: 400, statusMessage: 'Content must be 10,000 characters or less' })
    updateData.content = content
  }
  if (type !== undefined) updateData.type = type

  if (isArchived !== undefined) {
    updateData.isArchived = isArchived
    if (isArchived) updateData.isTrashed = false
  }
  if (isTrashed !== undefined) {
    updateData.isTrashed = isTrashed
    updateData.trashedAt = isTrashed ? now : null
    if (isTrashed) updateData.isArchived = false
  }

  await db.update(schema.notes).set(updateData).where(eq(schema.notes.id, id))

  // Update checklist items if provided
  if (checklistItems !== undefined) {
    if (!Array.isArray(checklistItems) || checklistItems.length > 100) {
      throw createError({ statusCode: 400, statusMessage: 'Checklist may have at most 100 items' })
    }
    if (checklistItems.some((i) => typeof i.text !== 'string' || i.text.length > 100)) {
      throw createError({ statusCode: 400, statusMessage: 'Each checklist item text must be 100 characters or less' })
    }
    const existingItems = await db
      .select()
      .from(schema.checklistItems)
      .where(eq(schema.checklistItems.noteId, id))
      .all()
    const existingItemIds = new Set(existingItems.map((i) => i.id))

    // Delete items that are no longer in the incoming list
    const incomingIds = checklistItems.filter((i) => i.id && existingItemIds.has(i.id)).map((i) => i.id!)
    const toDelete = existingItems.filter((i) => !incomingIds.includes(i.id)).map((i) => i.id)
    if (toDelete.length > 0) {
      await db.delete(schema.checklistItems).where(inArray(schema.checklistItems.id, toDelete))
    }

    for (let idx = 0; idx < checklistItems.length; idx++) {
      const item = checklistItems[idx]!
      if (item.id && existingItemIds.has(item.id)) {
        // Update existing DB item
        await db
          .update(schema.checklistItems)
          .set({ text: item.text, isChecked: item.isChecked ?? false, position: idx })
          .where(eq(schema.checklistItems.id, item.id))
      } else {
        // Insert new item — use provided client ID so subsequent saves can update it
        await db.insert(schema.checklistItems).values({
          id: item.id ?? nanoid(),
          noteId: id,
          text: item.text,
          isChecked: item.isChecked ?? false,
          position: idx,
        })
      }
    }
  }

  // Update labels if provided
  if (labelIds !== undefined) {
    const existingLabelLinks = await db
      .select({ labelId: schema.noteLabels.labelId })
      .from(schema.noteLabels)
      .where(eq(schema.noteLabels.noteId, id))
      .all()
    const currentLabelIds = existingLabelLinks.map((link) => link.labelId).sort()
    const nextLabelIds = [...labelIds].sort()
    labelsChanged = currentLabelIds.length !== nextLabelIds.length ||
      currentLabelIds.some((labelId, index) => labelId !== nextLabelIds[index])
    await replaceNoteLabels(db, id, labelIds)
  }

  // Fetch updated note for response
  const note = await db.select().from(schema.notes).where(eq(schema.notes.id, id)).get()!
  const [labelLinks, items, attachmentsRaw] = await Promise.all([
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
    db
      .select()
      .from(schema.attachments)
      .where(eq(schema.attachments.noteId, id))
      .orderBy(asc(schema.attachments.position), asc(schema.attachments.createdAt))
      .all(),
  ])

  const noteLabelsArr = labelLinks.map((l) => l.label)

  if (note!.isTrashed) {
    removeNoteFromIndex(id).catch((e) => console.warn('[search] Failed to remove note from index:', e?.message))
  } else {
    indexNote({
      id,
      title: note!.title,
      content: note!.content,
      labels: noteLabelsArr.map((l) => l.name),
      checklistItems: items.map((i) => i.text),
      attachmentNames: attachmentsRaw.filter((a) => !a.thumbnailPath).map((a) => a.filename),
      isArchived: note!.isArchived,
      isTrashed: note!.isTrashed,
      updatedAt: note!.updatedAt,
      createdAt: note!.createdAt,
    }).catch((e) => console.warn('[search] Failed to index note:', e?.message))
  }

  const result = { ...note, labels: noteLabelsArr, checklistItems: items, attachments: attachmentsRaw }
  realtimeBus.publish({
    type: 'note.updated',
    data: {
      resource: 'notes',
      refresh: isArchived !== undefined || isTrashed !== undefined || labelsChanged
        ? 'list'
        : 'note',
      note: result,
    },
  })
  return result
})

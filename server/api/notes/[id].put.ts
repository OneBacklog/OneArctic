import { getDb, schema } from '../../utils/db'
import { and, eq, inArray, ne } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { assertLabelsExist, replaceNoteLabels } from '../../utils/labelLinksSvc'
import { getNoteWithMeta, syncNoteToIndex } from '../../utils/notesSvc'
import { parseNoteInput } from '../../utils/noteInput'
import { realtimeBus } from '../../utils/realtime'
import { requireNote } from '../../utils/guards'

export default defineEventHandler(async (event) => {
  const db = getDb()
  const { id } = await requireNote(event)
  const { title, content, isArchived, isTrashed, type, checklistItems, labelIds: rawLabelIds } =
    parseNoteInput(await readBody(event))
  const labelIds = rawLabelIds && assertLabelsExist(db, rawLabelIds)

  const now = new Date().toISOString()
  const updateData: Partial<typeof schema.notes.$inferInsert> = { updatedAt: now }
  if (title !== undefined) updateData.title = title
  if (content !== undefined) updateData.content = content
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

  let labelsChanged = false

  db.transaction((tx) => {
    tx.update(schema.notes).set(updateData).where(eq(schema.notes.id, id)).run()

    if (checklistItems !== undefined) {
      const ownIds = new Set(
        tx.select({ id: schema.checklistItems.id })
          .from(schema.checklistItems)
          .where(eq(schema.checklistItems.noteId, id))
          .all()
          .map((i) => i.id)
      )
      // New items keep their client-generated id so later saves can update them,
      // unless that id already belongs to another note.
      const foreignIds = new Set(
        tx.select({ id: schema.checklistItems.id })
          .from(schema.checklistItems)
          .where(and(
            inArray(schema.checklistItems.id, checklistItems.flatMap((i) => (i.id && !ownIds.has(i.id) ? [i.id] : []))),
            ne(schema.checklistItems.noteId, id),
          ))
          .all()
          .map((i) => i.id)
      )

      const keptIds = checklistItems.flatMap((i) => (i.id && ownIds.has(i.id) ? [i.id] : []))
      const toDelete = [...ownIds].filter((existingId) => !keptIds.includes(existingId))
      if (toDelete.length > 0) {
        tx.delete(schema.checklistItems).where(inArray(schema.checklistItems.id, toDelete)).run()
      }

      const usedIds = new Set<string>()
      checklistItems.forEach((item, position) => {
        if (item.id && ownIds.has(item.id) && !usedIds.has(item.id)) {
          usedIds.add(item.id)
          tx.update(schema.checklistItems)
            .set({ text: item.text, isChecked: item.isChecked, position })
            .where(eq(schema.checklistItems.id, item.id))
            .run()
          return
        }
        const newId = item.id && !foreignIds.has(item.id) && !usedIds.has(item.id) ? item.id : nanoid()
        usedIds.add(newId)
        tx.insert(schema.checklistItems)
          .values({ id: newId, noteId: id, text: item.text, isChecked: item.isChecked, position })
          .run()
      })
    }

    if (labelIds !== undefined) {
      const current = tx
        .select({ labelId: schema.noteLabels.labelId })
        .from(schema.noteLabels)
        .where(eq(schema.noteLabels.noteId, id))
        .all()
        .map((link) => link.labelId)
      labelsChanged = current.length !== labelIds.length || current.some((labelId) => !labelIds.includes(labelId))
      replaceNoteLabels(tx, id, labelIds)
    }
  })

  const result = (await getNoteWithMeta(id))!
  void syncNoteToIndex(id)

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

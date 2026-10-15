import { getDb, schema } from '../../utils/db'
import { nanoid } from 'nanoid'
import { assertLabelsExist, linkLabelsToNote } from '../../utils/labelLinksSvc'
import { getNoteWithMeta, syncNoteToIndex } from '../../utils/notesSvc'
import { parseNoteInput } from '../../utils/noteInput'
import { realtimeBus } from '../../utils/realtime'

export default defineEventHandler(async (event) => {
  const db = getDb()
  const input = parseNoteInput(await readBody(event))
  if (input.title === undefined) {
    throw createError({ statusCode: 400, statusMessage: 'Title is required' })
  }
  const type = input.type ?? 'text'
  const checklistItems = input.checklistItems ?? []
  const labelIds = assertLabelsExist(db, input.labelIds ?? [])

  const id = nanoid()
  const now = new Date().toISOString()

  db.transaction((tx) => {
    tx.insert(schema.notes).values({
      id,
      type,
      title: input.title!,
      content: input.content ?? '',
      createdAt: now,
      updatedAt: now,
    }).run()

    if (type === 'checklist' && checklistItems.length > 0) {
      tx.insert(schema.checklistItems).values(
        checklistItems.map((item, position) => ({
          id: nanoid(),
          noteId: id,
          text: item.text,
          isChecked: item.isChecked,
          position,
        }))
      ).run()
    }

    linkLabelsToNote(tx, id, labelIds)
  })

  const note = (await getNoteWithMeta(id))!
  void syncNoteToIndex(id)

  realtimeBus.publish({ type: 'note.created', data: { resource: 'notes', note } })
  return note
})

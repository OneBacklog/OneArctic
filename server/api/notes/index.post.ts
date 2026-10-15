import { getDb, schema } from '../../utils/db'
import { nanoid } from 'nanoid'
import { assertLabelsExist, linkLabelsToNote } from '../../utils/labelLinksSvc'
import { getNoteWithMeta, syncNoteToIndex } from '../../utils/notesSvc'
import { noteCreateSchema } from '#shared/schemas/notes'
import { readBodyAs } from '../../utils/validation'
import { realtimeBus } from '../../utils/realtime'

export default defineEventHandler(async (event) => {
  const db = getDb()
  const { type, title, content, checklistItems, labelIds: rawLabelIds } = await readBodyAs(event, noteCreateSchema)
  const labelIds = assertLabelsExist(db, rawLabelIds)

  const id = nanoid()
  const now = new Date().toISOString()

  db.transaction((tx) => {
    tx.insert(schema.notes).values({
      id,
      type,
      title,
      content,
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
  setResponseStatus(event, 201)
  return note
})

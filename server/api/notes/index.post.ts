import { getDb, schema } from '../../utils/db'
import { nanoid } from 'nanoid'
import { linkLabelsToNote } from '../../utils/labelLinksSvc'
import { getNoteWithMeta, syncNoteToIndex } from '../../utils/notesSvc'
import { realtimeBus } from '../../utils/realtime'
import { CONSTRAINTS } from '#shared/utils/constants'

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
  if (title.length > CONSTRAINTS.TITLE_MAX_LENGTH) {
    throw createError({ statusCode: 400, statusMessage: `Title must be ${CONSTRAINTS.TITLE_MAX_LENGTH} characters or less` })
  }
  if (content.length > CONSTRAINTS.CONTENT_MAX_LENGTH) {
    throw createError({ statusCode: 400, statusMessage: 'Content must be 10,000 characters or less' })
  }
  if (!Array.isArray(checklistItems) || checklistItems.length > CONSTRAINTS.CHECKLIST_MAX_ITEMS) {
    throw createError({ statusCode: 400, statusMessage: `Checklist may have at most ${CONSTRAINTS.CHECKLIST_MAX_ITEMS} items` })
  }
  if (checklistItems.some((i) => typeof i.text !== 'string' || i.text.length > CONSTRAINTS.CHECKLIST_ITEM_MAX_LENGTH)) {
    throw createError({ statusCode: 400, statusMessage: `Each checklist item text must be ${CONSTRAINTS.CHECKLIST_ITEM_MAX_LENGTH} characters or less` })
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

  await linkLabelsToNote(db, id, labelIds)

  const note = (await getNoteWithMeta(id))!
  void syncNoteToIndex(id)

  realtimeBus.publish({ type: 'note.created', data: { resource: 'notes', note } })
  return note
})

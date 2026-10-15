import { z } from 'zod'
import { CONSTRAINTS } from '../utils/constants'

const title = z
  .string({ error: 'Title Must Be Text' })
  .max(CONSTRAINTS.TITLE_MAX_LENGTH, `Title Must Be ${CONSTRAINTS.TITLE_MAX_LENGTH} Characters or Less`)
  .refine((value) => value.trim() !== '', 'Title is Required')

const content = z
  .string({ error: 'Content Must Be Text' })
  .max(CONSTRAINTS.CONTENT_MAX_LENGTH, 'Content Must Be 10,000 Characters or Less')

export const checklistItemInputSchema = z.object({
  id: z.string().min(1).optional(),
  text: z
    .string({ error: 'Checklist Item Must Be Text' })
    .max(CONSTRAINTS.CHECKLIST_ITEM_MAX_LENGTH, `Checklist Items Must Be ${CONSTRAINTS.CHECKLIST_ITEM_MAX_LENGTH} Characters or Less`),
  isChecked: z.boolean().default(false),
})

const checklistItems = z
  .array(checklistItemInputSchema, { error: 'Invalid Checklist' })
  .max(CONSTRAINTS.CHECKLIST_MAX_ITEMS, `Checklist May Have at Most ${CONSTRAINTS.CHECKLIST_MAX_ITEMS} Items`)

const labelIds = z.array(z.string(), { error: 'Invalid Labels' })

const noteType = z.enum(['text', 'checklist'], { error: 'Invalid Note Type' })

export const noteCreateSchema = z.object({
  type: noteType.default('text'),
  title: z.string({ error: 'Title is Required' }).pipe(title),
  content: content.default(''),
  checklistItems: checklistItems.default([]),
  labelIds: labelIds.default([]),
})

export const noteUpdateSchema = z.object({
  type: noteType.optional(),
  title: title.optional(),
  content: content.optional(),
  isArchived: z.boolean({ error: 'isArchived Must Be a Boolean' }).optional(),
  isTrashed: z.boolean({ error: 'isTrashed Must Be a Boolean' }).optional(),
  checklistItems: checklistItems.optional(),
  labelIds: labelIds.optional(),
})

const page = z.coerce.number().int().min(1).catch(1)

export const notesListQuerySchema = z.object({
  archived: z.stringbool().catch(false),
  trashed: z.stringbool().catch(false),
  labelId: z.string().min(1).optional(),
  page,
})

export const searchQuerySchema = z.object({
  q: z.string().catch(''),
  context: z.enum(['notes', 'archive', 'trash']).catch('notes'),
  labelId: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).catch(CONSTRAINTS.PAGINATION_LIMIT),
  page,
})

export type NoteCreateInput = z.infer<typeof noteCreateSchema>
export type NoteUpdateInput = z.infer<typeof noteUpdateSchema>
export type ChecklistItemInput = z.infer<typeof checklistItemInputSchema>

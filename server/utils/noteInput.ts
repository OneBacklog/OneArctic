import type { NoteType } from '#shared/types/notes'
import { CONSTRAINTS } from '#shared/utils/constants'

// Hand-rolled request validation for note bodies; turns malformed input into 400s instead of 500s.

export interface ChecklistItemInput {
  id?: string
  text: string
  isChecked: boolean
}

export interface NoteInput {
  type?: NoteType
  title?: string
  content?: string
  isArchived?: boolean
  isTrashed?: boolean
  checklistItems?: ChecklistItemInput[]
  labelIds?: string[]
}

const NOTE_TYPES: readonly NoteType[] = ['text', 'checklist']

function badRequest(message: string): never {
  throw createError({ statusCode: 400, statusMessage: message })
}

function optionalBoolean(value: unknown, field: string): boolean | undefined {
  if (value === undefined) return undefined
  if (typeof value !== 'boolean') badRequest(`${field} must be a boolean`)
  return value
}

function optionalString(value: unknown, field: string, maxLength: number): string | undefined {
  if (value === undefined) return undefined
  if (typeof value !== 'string') badRequest(`${field} must be a string`)
  if (value.length > maxLength) badRequest(`${field} must be ${maxLength.toLocaleString('en-US')} characters or less`)
  return value
}

function parseChecklistItems(value: unknown): ChecklistItemInput[] | undefined {
  if (value === undefined) return undefined
  if (!Array.isArray(value)) badRequest('Checklist items must be an array')
  if (value.length > CONSTRAINTS.CHECKLIST_MAX_ITEMS) {
    badRequest(`Checklist may have at most ${CONSTRAINTS.CHECKLIST_MAX_ITEMS} items`)
  }
  return value.map((raw: unknown) => {
    if (typeof raw !== 'object' || raw === null) badRequest('Invalid checklist item')
    const item = raw as Record<string, unknown>
    if (typeof item.text !== 'string' || item.text.length > CONSTRAINTS.CHECKLIST_ITEM_MAX_LENGTH) {
      badRequest(`Each checklist item text must be ${CONSTRAINTS.CHECKLIST_ITEM_MAX_LENGTH} characters or less`)
    }
    if (item.id !== undefined && (typeof item.id !== 'string' || !item.id)) badRequest('Invalid checklist item id')
    return {
      id: item.id as string | undefined,
      text: item.text,
      isChecked: optionalBoolean(item.isChecked, 'isChecked') ?? false,
    }
  })
}

function parseLabelIds(value: unknown): string[] | undefined {
  if (value === undefined) return undefined
  if (!Array.isArray(value) || value.some((id) => typeof id !== 'string')) badRequest('labelIds must be an array of strings')
  return value as string[]
}

export function parseNoteInput(body: unknown): NoteInput {
  if (typeof body !== 'object' || body === null) badRequest('Request body must be an object')
  const raw = body as Record<string, unknown>

  if (raw.type !== undefined && !NOTE_TYPES.includes(raw.type as NoteType)) badRequest('Invalid note type')
  const title = optionalString(raw.title, 'Title', CONSTRAINTS.TITLE_MAX_LENGTH)
  if (title !== undefined && !title.trim()) badRequest('Title is required')

  return {
    type: raw.type as NoteType | undefined,
    title,
    content: optionalString(raw.content, 'Content', CONSTRAINTS.CONTENT_MAX_LENGTH),
    isArchived: optionalBoolean(raw.isArchived, 'isArchived'),
    isTrashed: optionalBoolean(raw.isTrashed, 'isTrashed'),
    checklistItems: parseChecklistItems(raw.checklistItems),
    labelIds: parseLabelIds(raw.labelIds),
  }
}

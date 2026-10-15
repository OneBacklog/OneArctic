import { describe, expect, it } from 'vitest'
import { noteCreateSchema, noteUpdateSchema, notesListQuerySchema, searchQuerySchema } from '../../shared/schemas/notes'
import { labelInputSchema, labelReorderSchema } from '../../shared/schemas/labels'
import { loginSchema } from '../../shared/schemas/auth'
import { CONSTRAINTS } from '../../shared/utils/constants'

const firstError = (result: { success: boolean; error?: { issues: { message: string }[] } }) =>
  result.error?.issues[0]?.message

describe('noteCreateSchema', () => {
  it('fills in defaults', () => {
    expect(noteCreateSchema.parse({ title: 'Hello' })).toEqual({
      type: 'text', title: 'Hello', content: '', checklistItems: [], labelIds: [],
    })
  })

  it('requires a non-blank title', () => {
    expect(firstError(noteCreateSchema.safeParse({}))).toBe('Title is Required')
    expect(firstError(noteCreateSchema.safeParse({ title: '   ' }))).toBe('Title is Required')
  })

  it('rejects wrong types instead of crashing', () => {
    expect(firstError(noteCreateSchema.safeParse({ title: 5 }))).toBe('Title is Required')
    expect(firstError(noteCreateSchema.safeParse({ title: 'x', type: 'poem' }))).toBe('Invalid Note Type')
    expect(noteCreateSchema.safeParse({ title: 'x', labelIds: [1] }).success).toBe(false)
  })

  it('enforces length limits', () => {
    const long = 'x'.repeat(CONSTRAINTS.TITLE_MAX_LENGTH + 1)
    expect(noteCreateSchema.safeParse({ title: long }).success).toBe(false)
    const items = Array.from({ length: CONSTRAINTS.CHECKLIST_MAX_ITEMS + 1 }, () => ({ text: 'a' }))
    expect(noteCreateSchema.safeParse({ title: 'x', checklistItems: items }).success).toBe(false)
  })

  it('defaults checklist items to unchecked', () => {
    const { checklistItems } = noteCreateSchema.parse({ title: 'x', checklistItems: [{ text: 'a' }] })
    expect(checklistItems).toEqual([{ text: 'a', isChecked: false }])
  })
})

describe('noteUpdateSchema', () => {
  it('accepts partial updates', () => {
    expect(noteUpdateSchema.parse({ isArchived: true })).toEqual({ isArchived: true })
  })

  it('still rejects a blank title when one is sent', () => {
    expect(noteUpdateSchema.safeParse({ title: '' }).success).toBe(false)
  })
})

describe('query schemas', () => {
  it('coerces list query strings', () => {
    expect(notesListQuerySchema.parse({ archived: 'true', page: '3' })).toEqual({ archived: true, trashed: false, page: 3 })
  })

  it('falls back to safe defaults for junk input', () => {
    expect(notesListQuerySchema.parse({ page: '-2', trashed: 'maybe' })).toEqual({ archived: false, trashed: false, page: 1 })
    expect(searchQuerySchema.parse({ context: 'everything', limit: '5000' })).toMatchObject({
      q: '', context: 'notes', limit: CONSTRAINTS.PAGINATION_LIMIT, page: 1,
    })
  })
})

describe('label and auth schemas', () => {
  it('trims label names and enforces the limit', () => {
    expect(labelInputSchema.parse({ name: '  Work  ' })).toEqual({ name: 'Work' })
    expect(firstError(labelInputSchema.safeParse({ name: '   ' }))).toBe('Label Name is Required')
    expect(labelInputSchema.safeParse({ name: 'x'.repeat(CONSTRAINTS.LABEL_MAX_LENGTH + 1) }).success).toBe(false)
  })

  it('rejects negative reorder positions', () => {
    expect(labelReorderSchema.safeParse({ order: [{ id: 'a', position: -1 }] }).success).toBe(false)
    expect(labelReorderSchema.safeParse({ order: [] }).success).toBe(false)
  })

  it('only accepts six-digit codes', () => {
    expect(loginSchema.safeParse({ code: '123456' }).success).toBe(true)
    expect(loginSchema.safeParse({ code: '12345' }).success).toBe(false)
    expect(loginSchema.safeParse({ code: 123456 }).success).toBe(false)
  })
})

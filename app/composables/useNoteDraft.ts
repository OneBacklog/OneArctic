import type { InjectionKey } from 'vue'
import type { ChecklistItem, Note, NoteType } from '#shared/types/notes'

/** The note being edited, shared by NoteModal and the editor fields inside it. */
export interface NoteDraft {
  type: NoteType
  title: string
  content: string
  labelIds: string[]
  checklistItems: ChecklistItem[]
  /** Files picked for a note that doesn't exist yet; uploaded after it is created */
  pendingFiles: File[]
  titleError: boolean
}

const NOTE_DRAFT_KEY: InjectionKey<NoteDraft> = Symbol('note-draft')

export function createNoteDraft(source: {
  note?: Note
  initialType?: NoteType
  initialFiles?: File[]
  defaultLabelIds?: string[]
}): NoteDraft {
  const draft = reactive<NoteDraft>({
    type: source.note?.type ?? source.initialType ?? 'text',
    title: source.note?.title ?? '',
    content: source.note?.content ?? '',
    labelIds: source.note?.labels.map((l) => l.id) ?? [...(source.defaultLabelIds ?? [])],
    checklistItems: source.note?.checklistItems.map((i) => ({ ...i })) ?? [],
    pendingFiles: [...(source.initialFiles ?? [])],
    titleError: false,
  })
  provide(NOTE_DRAFT_KEY, draft)
  return draft
}

export function useNoteDraft(): NoteDraft {
  const draft = inject(NOTE_DRAFT_KEY)
  if (!draft) throw new Error('useNoteDraft() must be used inside a component that called createNoteDraft()')
  return draft
}

export const draftHasContent = (draft: NoteDraft) =>
  draft.title.trim() !== '' ||
  draft.content.trim() !== '' ||
  draft.checklistItems.some((i) => i.text.trim() !== '') ||
  draft.pendingFiles.length > 0

/** The fields sent to the API when saving (empty checklist rows are dropped). */
export const draftToPayload = (draft: NoteDraft) => ({
  type: draft.type,
  title: draft.title,
  content: draft.content,
  labelIds: draft.labelIds,
  checklistItems: draft.checklistItems.filter((i) => i.text.trim() !== ''),
})

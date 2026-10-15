import type { Label, Note } from '#shared/types/notes'
import type { ClientRealtimeEvent } from './useEventSource'

// See noteUrl in useNotesList for why this is typed as a plain string
const labelUrl = (id: string): string => `/api/labels/${id}`

const labelEventKeys = (event: ClientRealtimeEvent): string[] => {
  if (event.data.resource !== 'labels') return []
  const labelId = 'label' in event.data ? event.data.label.id : 'labelId' in event.data ? event.data.labelId : undefined
  return labelId ? [`${event.type}:${labelId}`, event.type] : [event.type]
}

/** Pass `realtime: true` once (in the layout) to keep labels in sync with other devices. */
export const useLabels = (options: { realtime?: boolean } = {}) => {
  // useState ensures SSR state is serialized in the Nuxt payload and
  // transferred to the client, preventing hydration mismatches.
  const labels = useState<Label[]>('labels', () => [])
  const apiFetch = useNuxtApp().$api

  const fetchLabels = async () => {
    labels.value = await apiFetch<Label[]>('/api/labels')
  }

  const { runLocal: runLocalLabelMutation } = useRealtimeResource({
    localEventsKey: 'local-label-events',
    eventKeys: labelEventKeys,
    onEvent: options.realtime
      ? (event) => {
          if (event.data.resource !== 'labels' && event.type !== 'reconnected') return
          fetchLabels().catch((error) => console.warn('[realtime] Failed to refresh labels:', error))
        }
      : undefined,
  })

  /** Resolves to the new label, or undefined on failure (an error snackbar is shown). */
  const createLabel = async (name: string) => {
    const label = await withErrorSnackbar('Failed to Create Label', () =>
      runLocalLabelMutation('label.created', () =>
        apiFetch<Label>('/api/labels', { method: 'POST', body: { name } })
      )
    )
    if (label) labels.value.push(label)
    return label
  }

  /** Resolves to the renamed label, or undefined on failure (an error snackbar is shown). */
  const renameLabel = async (id: string, name: string) => {
    const label = await withErrorSnackbar('Failed to Rename Label', () =>
      runLocalLabelMutation(`label.updated:${id}`, () =>
        apiFetch<Label>(labelUrl(id), { method: 'PUT', body: { name } })
      )
    )
    if (!label) return undefined
    const idx = labels.value.findIndex((l) => l.id === id)
    if (idx !== -1) labels.value[idx] = label
    const notes = useState<Note[]>('notes')
    if (notes.value) {
      notes.value = notes.value.map((note) => ({
        ...note,
        labels: note.labels.map((l) => (l.id === id ? { ...l, name: label.name } : l)),
      }))
    }
    return label
  }

  const deleteLabel = async (id: string) => {
    const ok = await withErrorSnackbar('Failed to Delete Label', async () => {
      await runLocalLabelMutation(`label.deleted:${id}`, () => apiFetch(labelUrl(id), { method: 'DELETE' }))
      return true
    })
    if (!ok) return false
    labels.value = labels.value.filter((l) => l.id !== id)
    // Remove label from all notes in-memory so UI updates immediately
    const notes = useState<Note[]>('notes')
    if (notes.value) {
      notes.value = notes.value.map((note) => ({
        ...note,
        labels: note.labels.filter((l) => l.id !== id),
      }))
    }
    return true
  }

  const reorderLabels = async (ordered: Label[]) => {
    const previous = labels.value
    labels.value = ordered
    const ok = await withErrorSnackbar('Failed to Reorder Labels', async () => {
      await runLocalLabelMutation('label.reordered', () =>
        apiFetch('/api/labels/reorder', {
          method: 'PUT',
          body: { order: ordered.map((l, i) => ({ id: l.id, position: i })) },
        })
      )
      return true
    })
    if (!ok) labels.value = previous
    return Boolean(ok)
  }

  return {
    labels: readonly(labels),
    fetchLabels,
    createLabel,
    renameLabel,
    deleteLabel,
    reorderLabels,
  }
}

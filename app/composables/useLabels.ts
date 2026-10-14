import type { Label, Note } from '#shared/types/notes'

// See noteUrl in useNotes for why this is typed as a plain string
const labelUrl = (id: string): string => `/api/labels/${id}`

export const useLabels = () => {
  // useState ensures SSR state is serialized in the Nuxt payload and
  // transferred to the client, preventing hydration mismatches.
  const labels = useState<Label[]>('labels', () => [])

  // During SSR, forwards the original request's cookies so auth works on hard refresh.
  const apiFetch = useRequestFetch()
  const { subscribe } = useEventSource()
  const realtimeBound = useState<boolean>('labels-realtime-bound', () => false)
  const { consume: consumeLocalLabelEvent, run: runLocalLabelMutation } =
    useLocalRealtimeEvents('local-label-events')

  const fetchLabels = async () => {
    const data = await apiFetch<{ labels: Label[] }>('/api/labels')
    labels.value = data.labels
  }

  if (import.meta.client && !realtimeBound.value) {
    realtimeBound.value = true
    subscribe((event) => {
      if (event.resource === 'labels' || event.type === 'reconnected') {
        const data = event.data as { label?: { id?: string }; labelId?: string } | undefined
        const labelId = data?.label?.id ?? data?.labelId
        const eventKey = labelId ? `${event.type}:${labelId}` : event.type
        if (
          event.type !== 'reconnected' &&
          (consumeLocalLabelEvent(eventKey) || (labelId ? consumeLocalLabelEvent(event.type) : false))
        ) return
        fetchLabels().catch(() => {})
      }
    })
  }

  const createLabel = async (name: string) => {
    const label = await runLocalLabelMutation('label.created', () =>
      apiFetch<Label>('/api/labels', { method: 'POST', body: { name } })
    )
    labels.value.push(label)
    return label
  }

  const renameLabel = async (id: string, name: string) => {
    const label = await runLocalLabelMutation(`label.updated:${id}`, () =>
      apiFetch<Label>(labelUrl(id), { method: 'PUT', body: { name } })
    )
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
    await runLocalLabelMutation(`label.deleted:${id}`, () =>
      apiFetch(labelUrl(id), { method: 'DELETE' })
    )
    labels.value = labels.value.filter((l) => l.id !== id)
    // Remove label from all notes in-memory so UI updates immediately
    const notes = useState<Note[]>('notes')
    if (notes.value) {
      notes.value = notes.value.map((note) => ({
        ...note,
        labels: note.labels.filter((l) => l.id !== id),
      }))
    }
  }

  const reorderLabels = async (ordered: Label[]) => {
    labels.value = ordered
    await runLocalLabelMutation('label.reordered', () =>
      apiFetch('/api/labels/reorder', {
        method: 'PUT',
        body: { order: ordered.map((l, i) => ({ id: l.id, position: i })) },
      })
    )
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

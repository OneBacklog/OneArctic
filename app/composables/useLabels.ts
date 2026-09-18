import type { Label } from './types'

export const useLabels = () => {
  // useState ensures SSR state is serialized in the Nuxt payload and
  // transferred to the client, preventing hydration mismatches.
  const labels = useState<Label[]>('labels', () => [])

  // During SSR, forwards the original request's cookies so auth works on hard refresh.
  const apiFetch = useRequestFetch()
  const { subscribe } = useEventSource()
  const realtimeBound = useState<boolean>('labels-realtime-bound', () => false)

  const fetchLabels = async () => {
    const data = await apiFetch<{ labels: Label[] }>('/api/labels')
    labels.value = data.labels
  }

  if (import.meta.client && !realtimeBound.value) {
    realtimeBound.value = true
    subscribe((event) => {
      if (event.resource === 'labels' || event.resource === 'all') {
        fetchLabels().catch(() => {})
      }
    })
  }

  const createLabel = async (name: string) => {
    const label = await apiFetch<Label>('/api/labels', { method: 'POST', body: { name } })
    labels.value.push(label)
    return label
  }

  const renameLabel = async (id: string, name: string) => {
    const label = await apiFetch<Label>(`/api/labels/${id}`, { method: 'PUT', body: { name } })
    const idx = labels.value.findIndex((l) => l.id === id)
    if (idx !== -1) labels.value[idx] = label
    const notes = useState<any[]>('notes')
    if (notes.value) {
      notes.value = notes.value.map((note) => ({
        ...note,
        labels: note.labels?.map((l: Label) => (l.id === id ? { ...l, name: label.name } : l)) ?? [],
      }))
    }
    return label
  }

  const deleteLabel = async (id: string) => {
    await apiFetch(`/api/labels/${id}`, { method: 'DELETE' })
    labels.value = labels.value.filter((l) => l.id !== id)
    // Remove label from all notes in-memory so UI updates immediately
    const notes = useState<any[]>('notes')
    if (notes.value) {
      notes.value = notes.value.map((note) => ({
        ...note,
        labels: note.labels?.filter((l: Label) => l.id !== id) ?? [],
      }))
    }
  }

  const reorderLabels = async (ordered: Label[]) => {
    labels.value = ordered
    await apiFetch('/api/labels/reorder', {
      method: 'PUT',
      body: { order: ordered.map((l, i) => ({ id: l.id, position: i })) },
    })
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

import type { ClientRealtimeEvent } from './useEventSource'

/**
 * Subscribe to realtime events while skipping the echoes of this client's own mutations.
 * Wrap a mutation in the returned `runLocal(key, request)` and the event with that key is ignored.
 */
export function useRealtimeResource(options: {
  /** useState key holding this resource's pending local event keys */
  localEventsKey: string
  /** Keys under which an event may have been marked as local, tried in order */
  eventKeys: (event: ClientRealtimeEvent) => string[]
  onEvent?: (event: ClientRealtimeEvent) => void
}) {
  const { consume, run } = useLocalRealtimeEvents(options.localEventsKey)

  if (options.onEvent) {
    const onEvent = options.onEvent
    const unsubscribe = useEventSource().subscribe((event) => {
      if (options.eventKeys(event).some(consume)) return
      onEvent(event)
    })
    onScopeDispose(unsubscribe)
  }

  return { runLocal: run }
}

export const noteEventKeys = (event: ClientRealtimeEvent): string[] => {
  const data = event.data as { note?: { id: string }; noteId?: string }
  const noteId = data.note?.id ?? data.noteId
  return noteId ? [`${event.type}:${noteId}`] : []
}

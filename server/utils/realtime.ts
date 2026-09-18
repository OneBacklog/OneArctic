export type RealtimeEvent =
  | { type: 'note.created'; data: { resource: 'notes'; note: unknown } }
  | { type: 'note.updated'; data: { resource: 'notes'; note: unknown } }
  | { type: 'note.deleted'; data: { resource: 'notes'; noteId: string } }
  | { type: 'attachment.uploaded'; data: { resource: 'notes'; noteId: string; attachments: unknown[] } }
  | { type: 'attachment.updated'; data: { resource: 'notes'; noteId: string; attachment: unknown } }
  | { type: 'attachment.deleted'; data: { resource: 'notes'; noteId: string; attachmentId: string } }
  | { type: 'attachment.reordered'; data: { resource: 'notes'; noteId: string; attachmentIds: string[] } }
  | { type: 'label.created'; data: { resource: 'labels'; label: unknown } }
  | { type: 'label.updated'; data: { resource: 'labels'; label: unknown } }
  | { type: 'label.deleted'; data: { resource: 'labels'; labelId: string } }
  | { type: 'label.reordered'; data: { resource: 'labels'; order: Array<{ id: string; position: number }> } }

type Listener = (event: RealtimeEvent) => void

class RealtimeEventBus {
  private readonly listeners = new Set<Listener>()

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  publish(event: RealtimeEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event)
      } catch (error) {
        console.warn('[realtime] Listener failed:', error)
      }
    }
  }
}

export const realtimeBus = new RealtimeEventBus()

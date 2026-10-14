import type { RealtimeEvent } from '#shared/types/realtime'

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

import type { RealtimeEvent } from '#shared/types/realtime'
import { logger } from './logger'

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
        logger.realtime.warn('Listener failed:', error)
      }
    }
  }
}

export const realtimeBus = new RealtimeEventBus()

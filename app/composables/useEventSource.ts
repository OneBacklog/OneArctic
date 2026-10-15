import type { RealtimeEvent } from '#shared/types/realtime'

/** Server events plus the client-side signal sent after the stream reconnects. */
export type ClientRealtimeEvent = RealtimeEvent | { type: 'reconnected'; data: { resource: 'all' } }
type Listener = (event: ClientRealtimeEvent) => void

const listeners = new Set<Listener>()
let source: EventSource | null = null
let retryTimer: ReturnType<typeof setTimeout> | null = null
let retryAttempt = 0
let started = false
let connectedBefore = false

const MAX_RETRY_DELAY = 30_000

function dispatch(raw: string) {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return
  }
  if (typeof parsed !== 'object' || parsed === null || !('type' in parsed)) return
  const { type, ...data } = parsed as { type: string } & Record<string, unknown>
  const event = { type, data } as ClientRealtimeEvent
  listeners.forEach((listener) => listener(event))
}

function closeSource() {
  source?.close()
  source = null
}

function cancelRetry() {
  if (retryTimer) clearTimeout(retryTimer)
  retryTimer = null
}

function scheduleReconnect() {
  if (!started || retryTimer || !navigator.onLine || document.visibilityState === 'hidden') return
  const delay = Math.min(MAX_RETRY_DELAY, 500 * 2 ** retryAttempt++) + Math.random() * 250
  retryTimer = setTimeout(() => {
    retryTimer = null
    connect()
  }, delay)
}

function connect() {
  if (!started || source || !navigator.onLine || document.visibilityState === 'hidden') return
  source = new EventSource('/api/events')
  source.onopen = () => {
    retryAttempt = 0
    if (connectedBefore) dispatch(JSON.stringify({ type: 'reconnected', resource: 'all' }))
    connectedBefore = true
  }
  source.onmessage = (event) => dispatch(event.data)
  source.onerror = () => {
    closeSource()
    scheduleReconnect()
  }
}

function onOffline() {
  cancelRetry()
  closeSource()
}

function onVisibilityChange() {
  if (document.visibilityState === 'visible') {
    retryAttempt = 0
    connect()
  } else {
    cancelRetry()
    closeSource()
  }
}

function start() {
  if (!import.meta.client || started) return
  started = true
  window.addEventListener('online', connect)
  window.addEventListener('offline', onOffline)
  document.addEventListener('visibilitychange', onVisibilityChange)
  connect()
}

/** Close the stream and remove listeners, e.g. when leaving the signed-in layout. */
function stop() {
  if (!started) return
  started = false
  connectedBefore = false
  cancelRetry()
  closeSource()
  window.removeEventListener('online', connect)
  window.removeEventListener('offline', onOffline)
  document.removeEventListener('visibilitychange', onVisibilityChange)
}

export const useEventSource = () => {
  const subscribe = (listener: Listener) => {
    if (!import.meta.client) return () => {}
    listeners.add(listener)
    return () => listeners.delete(listener)
  }

  return { start, stop, subscribe }
}

type RealtimeResource = 'notes' | 'labels' | 'all'
type RealtimeEvent = { resource: RealtimeResource; data: unknown; type: string }
type Listener = (event: RealtimeEvent) => void

const listeners = new Set<Listener>()
let source: EventSource | null = null
let retryTimer: ReturnType<typeof setTimeout> | null = null
let retryAttempt = 0
let started = false
let stopped = false
let connectedBefore = false

const MAX_RETRY_DELAY = 30_000

function resourceFor(type: string, data: any): RealtimeResource {
  const eventType = String(type).toLowerCase()
  if (eventType.startsWith('label.')) return 'labels'
  if (eventType.startsWith('note.') || eventType.startsWith('attachment.')) return 'notes'
  const value = data?.resource ?? data?.entity ?? data?.scope
  if (value === 'labels') return 'labels'
  if (value === 'notes') return 'notes'
  return 'all'
}

function dispatch(type: string, raw: string) {
  let data: unknown = raw
  try {
    data = JSON.parse(raw)
  } catch {
    // Some SSE implementations use an empty heartbeat or a plain event name.
  }
  const eventType = typeof data === 'object' && data !== null && 'type' in data
    ? String(data.type)
    : type
  const eventData = typeof data === 'object' && data !== null && 'type' in data
    ? Object.fromEntries(Object.entries(data).filter(([key]) => key !== 'type'))
    : data
  const event = { resource: resourceFor(eventType, eventData), data: eventData, type: eventType }
  listeners.forEach((listener) => listener(event))
}

function closeSource() {
  source?.close()
  source = null
}

function scheduleReconnect() {
  if (stopped || retryTimer || !navigator.onLine || document.visibilityState === 'hidden') return
  const delay = Math.min(MAX_RETRY_DELAY, 500 * 2 ** retryAttempt++) + Math.random() * 250
  retryTimer = setTimeout(() => {
    retryTimer = null
    connect()
  }, delay)
}

function connect() {
  if (stopped || source || !navigator.onLine || document.visibilityState === 'hidden') return
  closeSource()
  source = new EventSource('/api/events')
  source.onopen = () => {
    retryAttempt = 0
    if (connectedBefore) {
      dispatch('reconnected', JSON.stringify({ resource: 'all' }))
    }
    connectedBefore = true
  }
  source.onmessage = (event) => dispatch(event.type, event.data)
  source.onerror = () => {
    closeSource()
    scheduleReconnect()
  }

  // Supporting named events keeps the client compatible with both generic
  // invalidations and resource-specific SSE events.
  for (const type of ['invalidate', 'notes', 'labels', 'notes.invalidate', 'labels.invalidate']) {
    source.addEventListener(type, (event) => dispatch(type, (event as MessageEvent).data))
  }
}

function start() {
  if (!import.meta.client || started) return
  started = true
  stopped = false
  window.addEventListener('online', connect)
  window.addEventListener('offline', () => {
    if (retryTimer) clearTimeout(retryTimer)
    retryTimer = null
    closeSource()
  })
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      retryAttempt = 0
      connect()
    } else {
      if (retryTimer) clearTimeout(retryTimer)
      retryTimer = null
      closeSource()
    }
  })
  connect()
}

export const useEventSource = () => {
  const subscribe = (listener: Listener) => {
    if (!import.meta.client) return () => {}
    listeners.add(listener)
    return () => listeners.delete(listener)
  }

  const startSource = () => start()

  return { start: startSource, subscribe }
}

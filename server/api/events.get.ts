import { realtimeBus, type RealtimeEvent } from '../utils/realtime'

function formatSseEvent(event: RealtimeEvent): string {
  return `data: ${JSON.stringify({ type: event.type, ...event.data })}\n\n`
}

export default defineEventHandler(async (event) => {
  const response = event.node.res

  setHeader(event, 'Content-Type', 'text/event-stream')
  setHeader(event, 'Cache-Control', 'no-cache, no-transform')
  setHeader(event, 'Connection', 'keep-alive')
  setHeader(event, 'X-Accel-Buffering', 'no')

  response.flushHeaders?.()
  response.write(': connected\n\n')

  await new Promise<void>((resolve) => {
    let closed = false
    const unsubscribe = realtimeBus.subscribe((realtimeEvent) => {
      if (!closed && !response.writableEnded) {
        response.write(formatSseEvent(realtimeEvent))
      }
    })
    const heartbeat = setInterval(() => {
      if (!closed && !response.writableEnded) response.write(': heartbeat\n\n')
    }, 25_000)

    const cleanup = () => {
      if (closed) return
      closed = true
      clearInterval(heartbeat)
      unsubscribe()
      resolve()
    }

    response.once('close', cleanup)
    response.once('error', cleanup)
  })
})

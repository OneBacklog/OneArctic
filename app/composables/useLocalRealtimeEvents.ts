export const useLocalRealtimeEvents = (stateKey: string) => {
  const pendingEvents = useState<string[]>(stateKey, () => [])

  const mark = (eventKey: string) => {
    pendingEvents.value = [...pendingEvents.value, eventKey]
  }

  const consume = (eventKey: string) => {
    const index = pendingEvents.value.indexOf(eventKey)
    if (index === -1) return false
    pendingEvents.value = pendingEvents.value.filter((_, i) => i !== index)
    return true
  }

  const discard = (eventKey: string) => {
    pendingEvents.value = pendingEvents.value.filter((key) => key !== eventKey)
  }

  const run = async <T>(eventKey: string, request: () => Promise<T>) => {
    mark(eventKey)
    try {
      return await request()
    } catch (error) {
      discard(eventKey)
      throw error
    }
  }

  return { consume, run }
}

/**
 * `$api`: the fetch client for the app's own API. It forwards the browser's cookies during
 * SSR (via useRequestFetch) and sends the user to the login page whenever the session expires.
 */
export default defineNuxtPlugin((nuxtApp) => {
  const requestFetch = useRequestFetch()

  const api = (async (request: Parameters<typeof $fetch>[0], options?: Parameters<typeof $fetch>[1]) => {
    try {
      return await requestFetch(request, options)
    } catch (error) {
      if (getErrorStatus(error) === 401) {
        await nuxtApp.runWithContext(() => navigateTo('/login'))
      }
      throw error
    }
  }) as typeof $fetch

  return { provide: { api } }
})

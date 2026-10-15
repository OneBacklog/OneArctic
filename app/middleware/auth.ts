export default defineNuxtRouteMiddleware(async () => {
  // useRequestFetch forwards browser cookies during SSR (hard refresh),
  // falling back to plain $fetch on client-side navigation.
  const apiFetch = useRequestFetch()
  try {
    await apiFetch('/api/auth/me', { credentials: 'include' })
  } catch (error) {
    // Returning navigateTo makes SSR answer with a redirect instead of rendering a 401 page
    if (getErrorStatus(error) === 401) return navigateTo('/login')
    throw error
  }
})

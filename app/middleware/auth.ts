export default defineNuxtRouteMiddleware(async () => {
  // useRequestFetch forwards browser cookies during SSR (hard refresh),
  // falling back to plain $fetch on client-side navigation.
  const apiFetch = useRequestFetch()
  const { execute } = useAuthRequest()
  await execute(() => apiFetch('/api/auth/me', { credentials: 'include' }))
})

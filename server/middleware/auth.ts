import { AUTH_COOKIE, SESSION_REFRESH_AFTER_SECONDS, setAuthCookie, verifyToken } from '../utils/auth'

export default defineEventHandler(async (event) => {
  const path = event.path

  // Public paths
  if (
    (path.startsWith('/api/auth/') && path !== '/api/auth/me') ||
    path.startsWith('/_nuxt/') ||
    path.startsWith('/__nuxt') ||
    path === '/api/health'
  ) return

  // Only protect /api/* routes
  if (!path.startsWith('/api/')) return

  const cookie = getCookie(event, AUTH_COOKIE)
  if (!cookie) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const payload = await verifyToken(cookie)
  if (!payload) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  // Sliding session: re-issue the token once a day instead of on every request
  const issuedAt = typeof payload.iat === 'number' ? payload.iat : 0
  if (Date.now() / 1000 - issuedAt > SESSION_REFRESH_AFTER_SECONDS) {
    await setAuthCookie(event)
  }
})

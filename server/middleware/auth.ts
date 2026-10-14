import { AUTH_COOKIE, setAuthCookie, verifyToken } from '../utils/auth'

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

  // Sliding session: refresh token on each authenticated request
  await setAuthCookie(event)
})

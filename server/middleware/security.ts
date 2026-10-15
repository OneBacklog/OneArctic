// Nuxt's hydration payload and the color-mode script are inline, so scripts and styles allow
// 'unsafe-inline'; everything else is restricted to this origin. Dev mode needs eval and HMR sockets.
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "media-src 'self' blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "worker-src 'self'",
  "manifest-src 'self'",
  "frame-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
].join('; ')

export default defineEventHandler((event) => {
  setHeader(event, 'X-Frame-Options', 'SAMEORIGIN')
  setHeader(event, 'X-Content-Type-Options', 'nosniff')
  setHeader(event, 'Referrer-Policy', 'strict-origin-when-cross-origin')
  setHeader(event, 'Permissions-Policy', 'geolocation=(), microphone=(), camera=()')
  if (!import.meta.dev) {
    setHeader(event, 'Content-Security-Policy', CONTENT_SECURITY_POLICY)
  }
  if (getRequestProtocol(event, { xForwardedProto: true }) === 'https') {
    setHeader(event, 'Strict-Transport-Security', 'max-age=31536000')
  }
})

import { getDb, schema } from '../../utils/db'
import { eq } from 'drizzle-orm'
import { setAuthCookie } from '../../utils/auth'
import { verifyOtp } from '../../utils/otp'
import { getLoginWait, recordLoginFailure, recordLoginSuccess } from '../../utils/loginThrottle'

function tooManyAttempts(secondsLeft: number) {
  return createError({ statusCode: 429, statusMessage: 'Too many attempts', data: { secondsLeft } })
}

export default defineEventHandler(async (event) => {
  const clientKey = getRequestIP(event, { xForwardedFor: true }) ?? 'unknown'

  const wait = getLoginWait(clientKey)
  if (wait > 0) throw tooManyAttempts(wait)

  const body = await readBody(event) as { code?: unknown } | null
  const code = body?.code
  if (typeof code !== 'string' || !/^\d{6}$/.test(code)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid OTP Format' })
  }

  const row = await getDb().select().from(schema.settings).where(eq(schema.settings.key, 'totp_secret')).get()
  if (!row) {
    throw createError({ statusCode: 404, statusMessage: 'OTP Not Configured' })
  }

  if (!(await verifyOtp(code, row.value))) {
    const { wait: nextWait, attemptsLeft } = recordLoginFailure(clientKey)
    if (nextWait > 0) throw tooManyAttempts(nextWait)
    throw createError({ statusCode: 401, statusMessage: 'Invalid OTP', data: { attemptsLeft } })
  }

  recordLoginSuccess(clientKey)
  await setAuthCookie(event)
  return { success: true }
})

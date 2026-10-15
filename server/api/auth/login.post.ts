import { getDb, schema } from '../../utils/db'
import { eq } from 'drizzle-orm'
import { loginSchema } from '#shared/schemas/auth'
import { setAuthCookie } from '../../utils/auth'
import { verifyOtp } from '../../utils/otp'
import { getLoginWait, recordLoginFailure, recordLoginSuccess } from '../../utils/loginThrottle'
import { readBodyAs } from '../../utils/validation'

function tooManyAttempts(secondsLeft: number) {
  return createError({ statusCode: 429, message: 'Too Many Attempts', data: { secondsLeft } })
}

export default defineEventHandler(async (event) => {
  const clientKey = getRequestIP(event, { xForwardedFor: true }) ?? 'unknown'

  const wait = getLoginWait(clientKey)
  if (wait > 0) throw tooManyAttempts(wait)

  const { code } = await readBodyAs(event, loginSchema)

  const row = await getDb().select().from(schema.settings).where(eq(schema.settings.key, 'totp_secret')).get()
  if (!row) {
    throw createError({ statusCode: 404, message: 'OTP Not Configured' })
  }

  if (!(await verifyOtp(code, row.value))) {
    const { wait: nextWait, attemptsLeft } = recordLoginFailure(clientKey)
    if (nextWait > 0) throw tooManyAttempts(nextWait)
    throw createError({ statusCode: 401, message: 'Invalid OTP', data: { attemptsLeft } })
  }

  recordLoginSuccess(clientKey)
  await setAuthCookie(event)
  return sendNoContent(event)
})

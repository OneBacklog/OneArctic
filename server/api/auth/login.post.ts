import { getDb, schema } from '../../utils/db'
import { eq } from 'drizzle-orm'
import { setAuthCookie } from '../../utils/auth'
import { verifyOtp } from '../../utils/otp'

const COOLDOWN_SECONDS = 60
const MAX_ATTEMPTS = 2

// In-memory brute-force protection (single-user app, no persistence needed)
let failedAttempts = 0
let cooldownUntil = 0

export default defineEventHandler(async (event) => {
  const now = Date.now()

  // Check cooldown
  if (cooldownUntil > now) {
    const secondsLeft = Math.ceil((cooldownUntil - now) / 1000)
    throw createError({
      statusCode: 429,
      statusMessage: 'Too many attempts',
      data: { secondsLeft },
    })
  }

  const db = getDb()
  const body = await readBody(event)
  const { code } = body as { code: string }

  if (!code || !/^\d{6}$/.test(code)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid OTP Format' })
  }

  const row = await db.select().from(schema.settings).where(eq(schema.settings.key, 'totp_secret')).get()
  if (!row) {
    throw createError({ statusCode: 404, statusMessage: 'OTP Not Configured' })
  }

  const valid = await verifyOtp(code, row.value)
  if (!valid) {
    failedAttempts++
    if (failedAttempts >= MAX_ATTEMPTS) {
      cooldownUntil = now + COOLDOWN_SECONDS * 1000
      failedAttempts = 0
      throw createError({
        statusCode: 429,
        statusMessage: 'Too many attempts',
        data: { secondsLeft: COOLDOWN_SECONDS },
      })
    }
    throw createError({
      statusCode: 401,
      statusMessage: 'Invalid OTP',
      data: { attemptsLeft: MAX_ATTEMPTS - failedAttempts },
    })
  }

  // Successful login — reset counters
  failedAttempts = 0
  cooldownUntil = 0

  await setAuthCookie(event)

  return { success: true }
})

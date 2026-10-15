import type { H3Event } from 'h3'
import { SignJWT, jwtVerify } from 'jose'

export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30 // 30 days
/** Sliding session: re-issue the token once it is older than this. */
export const SESSION_REFRESH_AFTER_SECONDS = 60 * 60 * 24 // 1 day
export const AUTH_COOKIE = 'auth_token'

export function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET
  if (!secret || secret.length < 32) {
    throw new Error(
      'JWT_SECRET environment variable must be set and at least 32 characters long. ' +
      'Generate one with: openssl rand -hex 32'
    )
  }
  return new TextEncoder().encode(secret)
}

export async function signToken(payload: Record<string, unknown>): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(getJwtSecret())
}

export async function verifyToken(token: string): Promise<Record<string, unknown> | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret(), { algorithms: ['HS256'] })
    return payload as Record<string, unknown>
  } catch {
    return null
  }
}

function authCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    path: '/',
    maxAge,
    // Secure by default; plain-HTTP installs must opt out with COOKIE_SECURE=false
    secure: process.env.COOKIE_SECURE !== 'false',
  }
}

export async function setAuthCookie(event: H3Event): Promise<void> {
  const token = await signToken({ authenticated: true })
  setCookie(event, AUTH_COOKIE, token, authCookieOptions(SESSION_MAX_AGE_SECONDS))
}

export function clearAuthCookie(event: H3Event): void {
  setCookie(event, AUTH_COOKIE, '', authCookieOptions(0))
}

import { TOTP } from 'otplib'
import { NobleCryptoPlugin } from '@otplib/plugin-crypto-noble'
import { ScureBase32Plugin } from '@otplib/plugin-base32-scure'

const totp = new TOTP({
  algorithm: 'sha1',
  digits: 6,
  period: 30,
  crypto: new NobleCryptoPlugin(),
  base32: new ScureBase32Plugin(),
})

export function generateOtpSecret(): string {
  return totp.generateSecret()
}

export function getOtpAuthUri(secret: string, label = 'onearctic', issuer = 'OneArctic'): string {
  return totp.toURI({ secret, label, issuer })
}

export async function verifyOtp(code: string, secret: string): Promise<boolean> {
  const result = await totp.verify(code, { secret, epochTolerance: 0 })
  return result.valid
}

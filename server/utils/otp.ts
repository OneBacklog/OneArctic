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

/** Accept codes from the neighbouring 30s window to tolerate clock drift on the phone. */
const EPOCH_TOLERANCE_SECONDS = 30

// Time step of the last accepted code; a code can only be used once.
let lastUsedTimeStep: number | undefined

export async function verifyOtp(code: string, secret: string): Promise<boolean> {
  const result = await totp.verify(code, {
    secret,
    epochTolerance: EPOCH_TOLERANCE_SECONDS,
    afterTimeStep: lastUsedTimeStep,
  })
  if (!result.valid) return false
  lastUsedTimeStep = result.timeStep
  return true
}

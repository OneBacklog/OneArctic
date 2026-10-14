#!/usr/bin/env node
import Database from 'better-sqlite3'
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

const dbPath = process.env.DATABASE_PATH
if (!dbPath) {
  console.error('Error: DATABASE_PATH is required.')
  process.exit(1)
}

const db = new Database(dbPath)

const existing = db.prepare("SELECT value FROM settings WHERE key = 'totp_secret'").get()
const reset = /^(1|true|yes)$/i.test(process.env.RESET || '')
if (existing?.value && !reset) {
  console.log('OTP is already configured.')
  console.log('For security, the key is only shown once and cannot be retrieved again.')
  console.log('To generate a new key, run: docker compose run --rm -e RESET=1 setup-auth')
  db.close()
  process.exit(0)
}

const secret = totp.generateSecret()

if (existing?.value) {
  db.prepare("UPDATE settings SET value = ? WHERE key = 'totp_secret'").run(secret)
} else {
  db.prepare("INSERT INTO settings (key, value) VALUES ('totp_secret', ?)").run(secret)
}
db.close()

console.log('OTP secret created successfully.')
console.log('Add this key to your authenticator app (Google Authenticator, Authy, etc).')
console.log('This key is shown only once. Do not lose it. Keep a backup in a secure place.')
console.log(secret)

import { mkdtempSync, rmSync } from 'node:fs'
import { request } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import Database from 'better-sqlite3'
import { SignJWT } from 'jose'
import sharp from 'sharp'
import { TOTP } from 'otplib'
import { NobleCryptoPlugin } from '@otplib/plugin-crypto-noble'
import { ScureBase32Plugin } from '@otplib/plugin-base32-scure'
import { fetch, setup, url } from '@nuxt/test-utils/e2e'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

// Runs the production build against a throwaway database. Search tests need a Meilisearch
// instance: set MEILISEARCH_TEST_HOST (and MEILISEARCH_TEST_KEY) to enable them.
const dataDir = mkdtempSync(join(tmpdir(), 'onearctic-e2e-'))
const DATABASE_PATH = join(dataDir, 'db', 'test.db')
const JWT_SECRET = 'e2e-test-secret-'.repeat(3)
const MEILISEARCH_HOST = process.env.MEILISEARCH_TEST_HOST

await setup({
  rootDir: fileURLToPath(new URL('../..', import.meta.url)),
  server: true,
  browser: false,
  env: {
    DATABASE_PATH,
    FILES_PATH: join(dataDir, 'files'),
    JWT_SECRET,
    MEILISEARCH_HOST: MEILISEARCH_HOST ?? 'http://127.0.0.1:9',
    MEILI_MASTER_KEY: process.env.MEILISEARCH_TEST_KEY ?? 'unused',
    SEARCH_REINDEX: 'true',
    // Override a local .env (loaded by the Nuxt build) so the production default is tested
    COOKIE_SECURE: '',
  },
})

afterAll(() => rmSync(dataDir, { recursive: true, force: true }))

const totp = new TOTP({ crypto: new NobleCryptoPlugin(), base32: new ScureBase32Plugin() })
let cookie = ''

beforeAll(async () => {
  const token = await new SignJWT({ authenticated: true })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(new TextEncoder().encode(JWT_SECRET))
  cookie = `auth_token=${token}`
})

interface ApiOptions {
  method?: string
  body?: unknown
  headers?: Record<string, string>
  auth?: boolean
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- response bodies are checked by the assertions
async function api<T = any>(path: string, { method = 'GET', body, headers = {}, auth = true }: ApiOptions = {}) {
  const isForm = body instanceof FormData
  const res = await fetch(path, {
    method,
    redirect: 'manual',
    headers: {
      ...(auth ? { cookie } : {}),
      ...(body !== undefined && !isForm ? { 'content-type': 'application/json' } : {}),
      ...headers,
    },
    body: isForm ? body : body === undefined ? undefined : JSON.stringify(body),
  })
  const text = await res.text()
  let data: unknown = text
  try { data = text ? JSON.parse(text) : null } catch { /* not JSON */ }
  return { status: res.status, headers: res.headers, data: data as T }
}

describe('auth', () => {
  it('rejects requests without a valid session', async () => {
    const res = await api('/api/notes', { auth: false })
    expect(res.status).toBe(401)
    expect(res.data.message).toBe('Unauthorized')

    const forged = await api('/api/notes', { auth: false, headers: { cookie: 'auth_token=eyJhbGciOiJub25lIn0.eyJhdXRoZW50aWNhdGVkIjp0cnVlfQ.' } })
    expect(forged.status).toBe(401)
  })

  it('redirects signed-out page requests to the login page', async () => {
    const res = await api('/', { auth: false })
    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toBe('/login')
  })

  it('throttles wrong codes, accepts a valid one and rejects replays', async () => {
    const secret = totp.generateSecret()
    const db = new Database(DATABASE_PATH)
    db.prepare("INSERT INTO settings (key, value) VALUES ('totp_secret', ?)").run(secret)
    db.close()

    const attempt = (code: string, ip: string) =>
      api('/api/auth/login', { method: 'POST', auth: false, body: { code }, headers: { 'x-forwarded-for': ip } })

    expect((await attempt('12345', '10.0.0.1')).status).toBe(400)
    for (const attemptsLeft of [2, 1, 0]) {
      const res = await attempt('000000', '10.0.0.1')
      expect(res.status).toBe(401)
      expect(res.data.data).toEqual({ attemptsLeft })
    }
    const blocked = await attempt('000000', '10.0.0.1')
    expect(blocked.status).toBe(429)
    expect(blocked.data.data.secondsLeft).toBeGreaterThan(0)

    const code = await totp.generate({ secret })
    const ok = await attempt(code, '10.0.0.2')
    expect(ok.status).toBe(204)
    expect(ok.headers.get('set-cookie')).toMatch(/auth_token=.+; .*HttpOnly; Secure; SameSite=Lax/)

    expect((await attempt(code, '10.0.0.3')).status).toBe(401)
  })
})

describe('labels', () => {
  it('creates, renames, reorders and deletes labels', async () => {
    const a = await api('/api/labels', { method: 'POST', body: { name: '  Work ' } })
    expect(a.status).toBe(201)
    expect(a.data).toMatchObject({ name: 'Work', position: 0 })
    const b = await api('/api/labels', { method: 'POST', body: { name: 'Home' } })
    expect(b.data.position).toBe(1)

    const duplicate = await api('/api/labels', { method: 'POST', body: { name: 'Work' } })
    expect(duplicate.status).toBe(409)
    expect(duplicate.data.message).toBe('Label Already Exists')
    expect((await api(`/api/labels/${b.data.id}`, { method: 'PUT', body: { name: 'Work' } })).status).toBe(409)
    expect((await api(`/api/labels/${b.data.id}`, { method: 'PUT', body: { name: 5 } })).status).toBe(400)

    const renamed = await api(`/api/labels/${b.data.id}`, { method: 'PUT', body: { name: 'Personal' } })
    expect(renamed.data.name).toBe('Personal')

    const reorder = await api('/api/labels/reorder', {
      method: 'PUT',
      body: { order: [{ id: b.data.id, position: 0 }, { id: a.data.id, position: 1 }] },
    })
    expect(reorder.status).toBe(204)
    expect((await api('/api/labels')).data.map((l: { name: string }) => l.name)).toEqual(['Personal', 'Work'])

    expect((await api(`/api/labels/${b.data.id}`, { method: 'DELETE' })).status).toBe(204)
    expect((await api(`/api/labels/${b.data.id}`, { method: 'DELETE' })).status).toBe(404)
  })
})

describe('notes', () => {
  it('validates input with clear messages', async () => {
    const cases: Array<[unknown, string]> = [
      [{}, 'Title is Required'],
      [{ title: '  ' }, 'Title is Required'],
      [{ title: 'x', type: 'poem' }, 'Invalid Note Type'],
      [{ title: 'x', labelIds: ['missing'] }, 'Unknown Label'],
    ]
    for (const [body, message] of cases) {
      const res = await api('/api/notes', { method: 'POST', body })
      expect(res.status).toBe(400)
      expect(res.data.message).toBe(message)
    }
  })

  it('creates, reads, filters and deletes notes', async () => {
    const label = (await api('/api/labels', { method: 'POST', body: { name: 'Filter' } })).data
    const created = await api('/api/notes', {
      method: 'POST',
      body: { title: 'Groceries', type: 'checklist', checklistItems: [{ text: 'Milk' }], labelIds: [label.id] },
    })
    expect(created.status).toBe(201)
    expect(created.data).toMatchObject({ title: 'Groceries', type: 'checklist', isArchived: false })
    expect(created.data.checklistItems).toMatchObject([{ text: 'Milk', isChecked: false }])

    expect((await api(`/api/notes/${created.data.id}`)).data.labels[0].id).toBe(label.id)
    const filtered = await api(`/api/notes?labelId=${label.id}`)
    expect(filtered.data.notes.map((n: { id: string }) => n.id)).toEqual([created.data.id])

    expect((await api(`/api/notes/${created.data.id}`, { method: 'DELETE' })).status).toBe(204)
    const missing = await api(`/api/notes/${created.data.id}`)
    expect(missing.status).toBe(404)
    expect(missing.data.message).toBe('Note Not Found')
  })

  it('applies updates atomically', async () => {
    const note = (await api('/api/notes', { method: 'POST', body: { title: 'Original', type: 'checklist' } })).data
    const res = await api(`/api/notes/${note.id}`, {
      method: 'PUT',
      body: { title: 'Changed', checklistItems: [{ text: 'x'.repeat(500) }] },
    })
    expect(res.status).toBe(400)
    expect((await api(`/api/notes/${note.id}`)).data.title).toBe('Original')
  })

  it('does not reuse checklist item ids that belong to another note', async () => {
    const first = (await api('/api/notes', { method: 'POST', body: { title: 'A', type: 'checklist', checklistItems: [{ text: 'mine' }] } })).data
    const second = (await api('/api/notes', { method: 'POST', body: { title: 'B', type: 'checklist' } })).data
    const stolenId = first.checklistItems[0].id

    const res = await api(`/api/notes/${second.id}`, { method: 'PUT', body: { checklistItems: [{ id: stolenId, text: 'stolen' }] } })
    expect(res.status).toBe(200)
    expect(res.data.checklistItems[0].id).not.toBe(stolenId)
    expect((await api(`/api/notes/${first.id}`)).data.checklistItems[0].text).toBe('mine')
  })

  it('empties the whole trash, not just the first page', async () => {
    for (let i = 0; i < 25; i++) {
      const note = (await api('/api/notes', { method: 'POST', body: { title: `Trash ${i}` } })).data
      await api(`/api/notes/${note.id}`, { method: 'PUT', body: { isTrashed: true } })
    }
    expect((await api('/api/notes?trashed=true')).data.hasMore).toBe(true)

    expect((await api('/api/notes/trash', { method: 'DELETE' })).status).toBe(204)
    expect((await api('/api/notes?trashed=true')).data.notes).toEqual([])
  })
})

describe('attachments', () => {
  let noteId = ''

  // The test server context is only available inside tests, so create the note lazily
  beforeEach(async () => {
    noteId ||= (await api('/api/notes', { method: 'POST', body: { title: 'With files' } })).data.id
  })

  const upload = (data: Buffer | string, filename: string, type: string) => {
    const form = new FormData()
    form.append('files', new Blob([typeof data === 'string' ? data : new Uint8Array(data)], { type }), filename)
    return api(`/api/notes/${noteId}/attachments`, { method: 'POST', body: form })
  }

  it('stores real images with a thumbnail', async () => {
    const png = await sharp({ create: { width: 600, height: 400, channels: 3, background: '#88C0D0' } }).png().toBuffer()
    const res = await upload(png, 'photo.png', 'image/png')
    expect(res.status).toBe(201)
    expect(res.data[0]).toMatchObject({ filename: 'photo.png', mimeType: 'image/png' })
    expect(res.data[0].thumbnailPath).toBeTruthy()

    const file = await api(`/api/files/${res.data[0].id}?thumb=true`)
    expect(file.headers.get('content-type')).toBe('image/webp')
  })

  it('never serves SVG as an image', async () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'
    const res = await upload(svg, 'evil.svg', 'image/svg+xml')
    expect(res.data[0].mimeType).toBe('application/octet-stream')

    const file = await api(`/api/files/${res.data[0].id}`)
    expect(file.headers.get('content-disposition')).toMatch(/^attachment;/)
    expect(file.headers.get('content-security-policy')).toContain('sandbox')
  })

  it('rejects oversized uploads before reading them', async () => {
    // fetch refuses to send a Content-Length that doesn't match the body, so use a raw request
    const status = await new Promise<number>((resolve, reject) => {
      const req = request(url(`/api/notes/${noteId}/attachments`), {
        method: 'POST',
        headers: { cookie, 'content-type': 'multipart/form-data; boundary=x', 'content-length': String(200 * 1024 * 1024) },
      }, (res) => {
        resolve(res.statusCode ?? 0)
        req.destroy()
      })
      req.on('error', reject)
      req.write('x')
    })
    expect(status).toBe(413)
  })

  it('renames, reorders and deletes attachments', async () => {
    const [att] = (await upload('hello', 'notes.txt', 'text/plain')).data
    const renamed = await api(`/api/notes/${noteId}/attachments/${att.id}`, { method: 'PUT', body: { filename: 'my notes.txt' } })
    expect(renamed.data.filename).toBe('my-notes.txt')

    const ids = (await api(`/api/notes/${noteId}`)).data.attachments.map((a: { id: string }) => a.id).reverse()
    expect((await api(`/api/notes/${noteId}/attachments/reorder`, { method: 'PUT', body: { ids } })).status).toBe(204)
    expect((await api(`/api/notes/${noteId}`)).data.attachments.map((a: { id: string }) => a.id)).toEqual(ids)

    expect((await api(`/api/notes/${noteId}/attachments/${att.id}`, { method: 'DELETE' })).status).toBe(204)
  })
})

describe.skipIf(!MEILISEARCH_HOST)('search', () => {
  const searchUntil = async (query: string, expected: number) => {
    for (let i = 0; i < 20; i++) {
      const res = await api(`/api/notes/search?${query}`)
      if (res.data.total === expected) return res
      await new Promise((resolve) => setTimeout(resolve, 250))
    }
    return api(`/api/notes/search?${query}`)
  }

  it('finds notes in the right context, including the trash', async () => {
    const note = (await api('/api/notes', { method: 'POST', body: { title: 'Zebrafish facts', content: 'stripes' } })).data
    expect((await searchUntil('q=zebrafish', 1)).data.notes[0].id).toBe(note.id)

    await api(`/api/notes/${note.id}`, { method: 'PUT', body: { isTrashed: true } })
    expect((await searchUntil('q=zebrafish&context=trash', 1)).data.total).toBe(1)
    expect((await searchUntil('q=zebrafish', 0)).data.total).toBe(0)
  })
})

import { getDb, schema } from '../../../utils/db'
import { eq } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import sharp from 'sharp'
import { writeFile } from 'node:fs'
import { join, extname } from 'node:path'
import { promisify } from 'node:util'
import { ensureFilesDir, getFilesBasePath, isImage } from '../../../utils/filesSvc'
import { indexNote } from '../../../utils/searchSvc'
import { sanitizeFilename } from '../../../utils/sanitize'
import { realtimeBus } from '../../../utils/realtime'

const writeFileAsync = promisify(writeFile)

const MAX_FILE_SIZE = 100 * 1024 * 1024 // 100MB

const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',
  'image/svg+xml': '.svg',
  'image/heic': '.heic',
  'image/heif': '.heif',
  'image/avif': '.avif',
  'image/bmp': '.bmp',
  'image/tiff': '.tiff',
  'application/pdf': '.pdf',
  'text/plain': '.txt',
  'video/mp4': '.mp4',
  'video/webm': '.webm',
  'audio/mpeg': '.mp3',
  'audio/ogg': '.ogg',
  'audio/wav': '.wav',
}

const EXT_TO_MIME: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.heic': 'image/heic',
  '.heif': 'image/heif',
  '.avif': 'image/avif',
  '.bmp': 'image/bmp',
  '.tiff': 'image/tiff',
}

/** Detect MIME type from magic bytes — immune to Cloudflare header stripping. */
function sniffMimeType(buf: Buffer): string | null {
  if (buf.length < 4) return null
  const b = buf
  if (b[0] === 0xFF && b[1] === 0xD8 && b[2] === 0xFF) return 'image/jpeg'
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4E && b[3] === 0x47) return 'image/png'
  if (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46) return 'image/gif'
  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
      buf.length >= 12 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50)
    return 'image/webp'
  if (b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46) return 'application/pdf'
  if ((b[0] === 0x49 && b[1] === 0x49 && b[2] === 0x2A && b[3] === 0x00) ||
      (b[0] === 0x4D && b[1] === 0x4D && b[2] === 0x00 && b[3] === 0x2A)) return 'image/tiff'
  if (b[0] === 0x42 && b[1] === 0x4D) return 'image/bmp'
  if (buf.length >= 12 &&
      b[4] === 0x66 && b[5] === 0x74 && b[6] === 0x79 && b[7] === 0x70) {
    const brand = String.fromCharCode(b[8], b[9], b[10], b[11])
    if (brand === 'heic' || brand === 'heif') return 'image/heic'
    if (brand === 'mif1' || brand === 'msf1' || brand === 'avif') return 'image/avif'
    if (brand === 'isom' || brand === 'iso2' || brand === 'mp41' || brand === 'mp42' || brand === 'avc1')
      return 'video/mp4'
  }
  return null
}

function resolveExt(filename: string, mimeType: string, sniffed: string | null): string {
  // Magic bytes take highest priority — immune to any header/filename manipulation
  if (sniffed && MIME_TO_EXT[sniffed]) return MIME_TO_EXT[sniffed]
  // Good filename extension (not .bin)
  const ext = extname(filename).toLowerCase()
  if (ext && ext !== '.bin') return ext
  // Declared/derived MIME type
  return MIME_TO_EXT[mimeType] ?? ''
}

export default defineEventHandler(async (event) => {
  const db = getDb()
  const noteId = getRouterParam(event, 'id')!

  const note = await db.select().from(schema.notes).where(eq(schema.notes.id, noteId)).get()
  if (!note) throw createError({ statusCode: 404, statusMessage: 'Note not found' })

  const formData = await readMultipartFormData(event)
  if (!formData || formData.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'No files uploaded' })
  }

  const uploaded: typeof schema.attachments.$inferSelect[] = []
  const existingCount = (
    await db.select().from(schema.attachments).where(eq(schema.attachments.noteId, noteId)).all()
  ).length

  for (const part of formData) {
    if (!part.filename || !part.data) continue

    if (part.data.length > MAX_FILE_SIZE) {
      throw createError({ statusCode: 413, statusMessage: `File ${part.filename} exceeds 100MB limit` })
    }

    const sniffed = sniffMimeType(part.data)
    const mimeType = sniffed ?? (part.type || 'application/octet-stream')
    const attId = nanoid()
    let safeFilename = sanitizeFilename(part.filename)
    if (safeFilename.length > 100) {
      throw createError({ statusCode: 400, statusMessage: 'Maximum file name length is 100 characters.' })
    }
    const ext = resolveExt(safeFilename, mimeType, sniffed)
    if (ext) {
      const base = safeFilename.replace(/\.[^.]+$/, '')
      const next = `${base}${ext}`
      if (next.length <= 100) safeFilename = next
    }
    const storedMime = (mimeType && mimeType !== 'application/octet-stream')
      ? mimeType
      : (EXT_TO_MIME[ext] ?? mimeType)
    const storageName = `${attId}${ext}`
    ensureFilesDir(noteId)
    const storagePath = join(noteId, storageName)
    const absPath = join(getFilesBasePath(), storagePath)

    await writeFileAsync(absPath, part.data)

    let thumbnailPath: string | null = null

    if (isImage(storedMime)) {
      try {
        const thumbName = `${attId}_thumb.webp`
        const thumbRelPath = join(noteId, thumbName)
        const thumbAbsPath = join(getFilesBasePath(), thumbRelPath)
        await sharp(part.data)
          .resize(400, 400, { fit: 'inside', withoutEnlargement: true })
          .webp({ quality: 75 })
          .toFile(thumbAbsPath)
        thumbnailPath = thumbRelPath
      } catch {
        // thumbnail generation failed, continue without it
      }
    }

    const now = new Date().toISOString()
    await db.insert(schema.attachments).values({
      id: attId,
      noteId,
      filename: safeFilename,
      storagePath,
      mimeType: storedMime,
      size: part.data.length,
      thumbnailPath,
      position: existingCount + uploaded.length,
      createdAt: now,
    })

    const att = await db.select().from(schema.attachments).where(eq(schema.attachments.id, attId)).get()
    uploaded.push(att!)
  }

  // Re-sync note to search index with updated attachment names
  const [allAttachments, labelLinks, checklistItemsRaw] = await Promise.all([
    db.select().from(schema.attachments).where(eq(schema.attachments.noteId, noteId)).all(),
    db
      .select({ label: schema.labels })
      .from(schema.noteLabels)
      .innerJoin(schema.labels, eq(schema.noteLabels.labelId, schema.labels.id))
      .where(eq(schema.noteLabels.noteId, noteId))
      .all(),
    db.select().from(schema.checklistItems).where(eq(schema.checklistItems.noteId, noteId)).all(),
  ])

  indexNote({
    id: noteId,
    title: note.title,
    content: note.content,
    labels: labelLinks.map((l) => l.label.name),
    checklistItems: checklistItemsRaw.map((i) => i.text),
    attachmentNames: allAttachments.filter((a) => !a.thumbnailPath).map((a) => a.filename),
    isArchived: note.isArchived,
    isTrashed: note.isTrashed,
    updatedAt: note.updatedAt,
    createdAt: note.createdAt,
  }).catch((e) => console.warn('[search] Failed to index note after attachment upload:', e?.message))

  realtimeBus.publish({ type: 'attachment.uploaded', data: { resource: 'notes', noteId, attachments: uploaded } })
  return { attachments: uploaded }
})

import { getDb, schema } from '../../../utils/db'
import type { AttachmentRow } from '../../../utils/db'
import { count, eq } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import sharp from 'sharp'
import { unlink, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { ensureFilesDir, getFilesBasePath } from '../../../utils/filesSvc'
import { resolveUploadType } from '../../../utils/fileTypes'
import { syncNoteToIndex } from '../../../utils/notesSvc'
import { sanitizeFilename } from '../../../utils/sanitize'
import { realtimeBus } from '../../../utils/realtime'
import { requireNote } from '../../../utils/guards'
import { CONSTRAINTS } from '#shared/utils/constants'
import { isImageMime } from '#shared/utils/files'

const MAX_FILE_SIZE = CONSTRAINTS.FILE_MAX_SIZE
const MAX_FILENAME_LENGTH = CONSTRAINTS.FILENAME_MAX_LENGTH
const MAX_FILES_PER_REQUEST = 20
/** Allowance for multipart boundaries and headers on top of the file itself. */
const MULTIPART_OVERHEAD = 1024 * 1024
const THUMBNAIL_SIZE = 400
const THUMBNAIL_QUALITY = 75

/** Reject oversized requests before the body is buffered into memory. */
function assertRequestSize(contentLength: string | undefined) {
  if (!contentLength) {
    throw createError({ statusCode: 411, message: 'Content-Length Header is Required' })
  }
  if (Number(contentLength) > MAX_FILE_SIZE + MULTIPART_OVERHEAD) {
    throw createError({ statusCode: 413, message: 'File is Too Large (Max. 100MB)' })
  }
}

export default defineEventHandler(async (event) => {
  const db = getDb()
  const { id: noteId } = await requireNote(event)
  assertRequestSize(getRequestHeader(event, 'content-length'))

  const parts = (await readMultipartFormData(event))?.filter((part) => part.filename && part.data)
  if (!parts || parts.length === 0) {
    throw createError({ statusCode: 400, message: 'No Files Uploaded' })
  }
  if (parts.length > MAX_FILES_PER_REQUEST) {
    throw createError({ statusCode: 400, message: `At Most ${MAX_FILES_PER_REQUEST} Files per Upload` })
  }

  const { existingCount } = db
    .select({ existingCount: count() })
    .from(schema.attachments)
    .where(eq(schema.attachments.noteId, noteId))
    .get() ?? { existingCount: 0 }

  const writtenPaths: string[] = []
  const rows: AttachmentRow[] = []
  try {
    ensureFilesDir(noteId)
    for (const part of parts) {
      if (part.data.length > MAX_FILE_SIZE) {
        throw createError({ statusCode: 413, message: 'File is Too Large (Max. 100MB)' })
      }

      let filename = sanitizeFilename(part.filename!)
      if (filename.length > MAX_FILENAME_LENGTH) {
        throw createError({ statusCode: 400, message: `Filename Must Be ${MAX_FILENAME_LENGTH} Characters or Less` })
      }
      const { mimeType, ext } = resolveUploadType(part.data, part.type, filename)
      if (ext) {
        const next = `${filename.replace(/\.[^.]+$/, '')}${ext}`
        if (next.length <= MAX_FILENAME_LENGTH) filename = next
      }

      const attId = nanoid()
      const storagePath = join(noteId, `${attId}${ext}`)
      const absPath = join(getFilesBasePath(), storagePath)
      await writeFile(absPath, part.data)
      writtenPaths.push(absPath)

      let thumbnailPath: string | null = null
      if (isImageMime(mimeType)) {
        const thumbRelPath = join(noteId, `${attId}_thumb.webp`)
        const thumbAbsPath = join(getFilesBasePath(), thumbRelPath)
        try {
          await sharp(part.data)
            .resize(THUMBNAIL_SIZE, THUMBNAIL_SIZE, { fit: 'inside', withoutEnlargement: true })
            .webp({ quality: THUMBNAIL_QUALITY })
            .toFile(thumbAbsPath)
          writtenPaths.push(thumbAbsPath)
          thumbnailPath = thumbRelPath
        } catch {
          // thumbnail generation failed, continue without it
        }
      }

      rows.push({
        id: attId,
        noteId,
        filename,
        storagePath,
        mimeType,
        size: part.data.length,
        thumbnailPath,
        position: existingCount + rows.length,
        createdAt: new Date().toISOString(),
      })
    }

    db.insert(schema.attachments).values(rows).run()
  } catch (error) {
    // Don't leave orphaned files behind when any part of the upload fails
    await Promise.all(writtenPaths.map((path) => unlink(path).catch(() => {})))
    throw error
  }

  void syncNoteToIndex(noteId)

  realtimeBus.publish({ type: 'attachment.uploaded', data: { resource: 'notes', noteId, attachments: rows } })
  setResponseStatus(event, 201)
  return rows
})

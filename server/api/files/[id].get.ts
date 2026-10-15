import { getDb, schema } from '../../utils/db'
import { eq } from 'drizzle-orm'
import { createReadStream, existsSync } from 'node:fs'
import { getAbsolutePath } from '../../utils/filesSvc'
import { requireRouterParam } from '../../utils/guards'
import { INLINE_MIME_TYPES } from '#shared/utils/files'

export default defineEventHandler(async (event) => {
  const db = getDb()
  const id = requireRouterParam(event, 'id')
  const query = getQuery(event)
  const thumb = query.thumb === 'true'
  const forceDownload = query.download === 'true' || query.download === '1'

  const att = await db.select().from(schema.attachments).where(eq(schema.attachments.id, id)).get()
  if (!att) throw createError({ statusCode: 404, statusMessage: 'File not found' })

  const useThumb = thumb && !!att.thumbnailPath && existsSync(getAbsolutePath(att.thumbnailPath))
  const filePath = getAbsolutePath(useThumb ? att.thumbnailPath! : att.storagePath)
  if (!existsSync(filePath)) {
    console.warn('[files] Missing file on disk', { id, storagePath: att.storagePath })
    throw createError({ statusCode: 404, statusMessage: 'File not found on disk' })
  }

  const mimeType = useThumb ? 'image/webp' : att.mimeType
  const inline = !forceDownload && INLINE_MIME_TYPES.has(mimeType)

  setHeader(event, 'Content-Type', mimeType)
  setHeader(event, 'Cache-Control', 'private, max-age=31536000, immutable')
  setHeader(event, 'X-Content-Type-Options', 'nosniff')
  // Uploaded content must never run script in the app's origin. Chrome refuses to render
  // sandboxed PDFs, so PDFs rely on their viewer's own isolation instead.
  if (mimeType !== 'application/pdf') {
    setHeader(event, 'Content-Security-Policy', "default-src 'none'; img-src 'self'; media-src 'self'; style-src 'unsafe-inline'; sandbox")
  }
  setHeader(event, 'Content-Disposition', `${inline ? 'inline' : 'attachment'}; filename*=UTF-8''${encodeURIComponent(att.filename)}`)

  return sendStream(event, createReadStream(filePath))
})

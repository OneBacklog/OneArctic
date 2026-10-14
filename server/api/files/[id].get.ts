import { getDb, schema } from '../../utils/db'
import { eq } from 'drizzle-orm'
import { createReadStream, statSync, readdirSync } from 'node:fs'
import { getAbsolutePath, getFilesBasePath } from '../../utils/filesSvc'
import { join, basename, dirname } from 'node:path'
import { requireRouterParam } from '../../utils/guards'

/** Resolve the actual file path, falling back to same-stem different-extension
 *  to handle DB records written before the .bin fix was deployed. */
function resolveFilePath(storagePath: string, filename: string): string | null {
  const abs = getAbsolutePath(storagePath)
  try { statSync(abs); return abs } catch {}

  // Fallback: find any file with the same name stem (different extension)
  const absDir = join(getFilesBasePath(), dirname(storagePath))
  const stem = basename(storagePath).replace(/\.[^.]+$/, '')
  try {
    const match = readdirSync(absDir).find((f) => f.replace(/\.[^.]+$/, '') === stem)
    if (match) return join(absDir, match)
  } catch {}

  // Legacy fallback: files stored with original filename
  if (filename) {
    const byName = join(absDir, basename(filename))
    try { statSync(byName); return byName } catch {}

    const nameStem = basename(filename).replace(/\.[^.]+$/, '')
    try {
      const match = readdirSync(absDir).find((f) => f.replace(/\.[^.]+$/, '') === nameStem)
      if (match) return join(absDir, match)
    } catch {}
  }
  return null
}

export default defineEventHandler(async (event) => {
  const db = getDb()
  const id = requireRouterParam(event, 'id')
  const query = getQuery(event)
  const thumb = query.thumb === 'true'
  const forceDownload = query.download === 'true' || query.download === '1'

  const att = await db.select().from(schema.attachments).where(eq(schema.attachments.id, id)).get()
  if (!att) throw createError({ statusCode: 404, statusMessage: 'File not found' })

  const preferThumb = thumb && att.thumbnailPath
  const storagePath = preferThumb ? att.thumbnailPath! : att.storagePath
  let filePath = resolveFilePath(storagePath, att.filename)

  if (!filePath && preferThumb) {
    filePath = resolveFilePath(att.storagePath, att.filename)
  }

  if (!filePath) {
    console.warn('[files] Missing file on disk', {
      id,
      storagePath,
      filename: att.filename,
      basePath: getFilesBasePath(),
      preferThumb,
    })
    throw createError({ statusCode: 404, statusMessage: 'File not found on disk' })
  }

  const mimeType = preferThumb ? 'image/webp' : att.mimeType
  setHeader(event, 'Content-Type', mimeType)
  setHeader(event, 'Cache-Control', 'private, max-age=31536000, immutable')

  const encodedFilename = encodeURIComponent(att.filename)
  const inline = mimeType.startsWith('image/') || mimeType === 'application/pdf'
  const disposition = forceDownload ? 'attachment' : inline ? 'inline' : 'attachment'
  setHeader(event, 'Content-Disposition', `${disposition}; filename*=UTF-8''${encodedFilename}`)

  return sendStream(event, createReadStream(filePath))
})

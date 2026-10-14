/**
 * Sanitize an uploaded filename: strip path components and restrict to safe characters.
 * Spaces are replaced with `-`; unsafe symbols are removed.
 * If the name (excluding extension) is empty after sanitization, a random 8-char name is used.
 */
export function sanitizeFilename(filename: string): string {
  const base = filename.split(/[\\/]/).pop() || ''
  const dotIdx = base.lastIndexOf('.')
  const rawName = dotIdx > -1 ? base.slice(0, dotIdx) : base
  const ext = dotIdx > -1 ? base.slice(dotIdx) : ''

  const cleanName = rawName
    .replace(/ /g, '-')
    .replace(/[^\w\-.]/g, '')
    .replace(/\.{2,}/g, '.')
    .replace(/^\.+/, '')
    .replace(/\.+$/, '')
  const safeName = cleanName || Math.random().toString(36).slice(2, 10)

  return safeName + ext
}

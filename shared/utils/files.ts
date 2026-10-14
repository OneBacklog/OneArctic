export const MIME_TO_EXT: Record<string, string> = {
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

export const EXT_TO_MIME: Record<string, string> = {
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

/** Any image MIME type — used server-side to decide whether to generate a thumbnail. */
export function isImageMime(mimeType: string): boolean {
  return mimeType.startsWith('image/')
}

/** Image formats every browser can render, shown in the image grid instead of the file list. */
const DISPLAYABLE_IMAGE_MIMES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'])
const DISPLAYABLE_IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp'])

export function isDisplayableImage(mimeType: string, filename = ''): boolean {
  if (DISPLAYABLE_IMAGE_MIMES.has(mimeType.toLowerCase())) return true
  const dot = filename.lastIndexOf('.')
  return dot !== -1 && DISPLAYABLE_IMAGE_EXTS.has(filename.slice(dot).toLowerCase())
}

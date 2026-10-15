import { extname } from 'node:path'
import { MIME_TO_EXT } from '#shared/utils/files'

const startsWith = (buf: Buffer, bytes: number[], offset = 0) =>
  buf.length >= offset + bytes.length && bytes.every((byte, i) => buf[offset + i] === byte)

/** Detect MIME type from magic bytes — immune to Cloudflare header stripping and spoofed headers. */
export function sniffMimeType(buf: Buffer): string | null {
  if (startsWith(buf, [0xFF, 0xD8, 0xFF])) return 'image/jpeg'
  if (startsWith(buf, [0x89, 0x50, 0x4E, 0x47])) return 'image/png'
  if (startsWith(buf, [0x47, 0x49, 0x46])) return 'image/gif'
  if (startsWith(buf, [0x25, 0x50, 0x44, 0x46])) return 'application/pdf'
  if (startsWith(buf, [0x49, 0x49, 0x2A, 0x00]) || startsWith(buf, [0x4D, 0x4D, 0x00, 0x2A])) return 'image/tiff'
  if (startsWith(buf, [0x42, 0x4D])) return 'image/bmp'
  if (startsWith(buf, [0x1A, 0x45, 0xDF, 0xA3])) return 'video/webm'
  if (startsWith(buf, [0x4F, 0x67, 0x67, 0x53])) return 'audio/ogg'
  if (startsWith(buf, [0x49, 0x44, 0x33]) || startsWith(buf, [0xFF, 0xFB]) || startsWith(buf, [0xFF, 0xF3]) || startsWith(buf, [0xFF, 0xF2])) {
    return 'audio/mpeg'
  }
  if (startsWith(buf, [0x52, 0x49, 0x46, 0x46])) {
    const format = buf.toString('latin1', 8, 12)
    if (format === 'WEBP') return 'image/webp'
    if (format === 'WAVE') return 'audio/wav'
  }
  if (startsWith(buf, [0x66, 0x74, 0x79, 0x70], 4)) {
    const brand = buf.toString('latin1', 8, 12)
    if (brand === 'heic' || brand === 'heif') return 'image/heic'
    if (brand === 'mif1' || brand === 'msf1' || brand === 'avif') return 'image/avif'
    if (['isom', 'iso2', 'mp41', 'mp42', 'avc1'].includes(brand)) return 'video/mp4'
  }
  return null
}

/** Types that cannot be recognised from their bytes, so the client's declaration is accepted. */
const DECLARABLE_MIME_TYPES = new Set(['text/plain'])

export const GENERIC_MIME_TYPE = 'application/octet-stream'

/**
 * Decide the stored MIME type and file extension for an upload. Only types verified by their
 * bytes (or harmless declared ones) keep their type; anything else becomes a generic download.
 */
export function resolveUploadType(data: Buffer, declaredType: string | undefined, filename: string) {
  const sniffed = sniffMimeType(data)
  const declared = (declaredType || '').toLowerCase()
  const mimeType = sniffed ?? (DECLARABLE_MIME_TYPES.has(declared) ? declared : GENERIC_MIME_TYPE)

  const nameExt = extname(filename).toLowerCase()
  const ext = MIME_TO_EXT[mimeType] ?? (nameExt && nameExt !== '.bin' && nameExt !== '.svg' ? nameExt : '')
  return { mimeType, ext }
}

import { describe, expect, it } from 'vitest'
import { INLINE_MIME_TYPES, MIME_TO_EXT, isDisplayableImage, isImageMime } from '../../shared/utils/files'
import { resolveUploadType, sniffMimeType } from '../../server/utils/fileTypes'

const PNG = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])
const JPEG = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0])
const PDF = Buffer.from('%PDF-1.7')
const SVG = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>')

describe('shared file helpers', () => {
  it('never treats SVG as an image type', () => {
    expect(MIME_TO_EXT['image/svg+xml']).toBeUndefined()
    expect(INLINE_MIME_TYPES.has('image/svg+xml')).toBe(false)
    expect(isDisplayableImage('image/svg+xml', 'logo.svg')).toBe(false)
  })

  it('recognises displayable images by type or extension', () => {
    expect(isDisplayableImage('image/png')).toBe(true)
    expect(isDisplayableImage('application/octet-stream', 'photo.JPG')).toBe(true)
    expect(isDisplayableImage('image/heic', 'photo.heic')).toBe(false)
    expect(isImageMime('image/heic')).toBe(true)
  })
})

describe('sniffMimeType', () => {
  it('detects types from magic bytes', () => {
    expect(sniffMimeType(PNG)).toBe('image/png')
    expect(sniffMimeType(JPEG)).toBe('image/jpeg')
    expect(sniffMimeType(PDF)).toBe('application/pdf')
  })

  it('does not recognise SVG or plain text', () => {
    expect(sniffMimeType(SVG)).toBeNull()
    expect(sniffMimeType(Buffer.from('hello'))).toBeNull()
  })
})

describe('resolveUploadType', () => {
  it('trusts the bytes over the declared type', () => {
    expect(resolveUploadType(PNG, 'text/plain', 'file')).toEqual({ mimeType: 'image/png', ext: '.png' })
  })

  it('stores SVG as a generic download, even when disguised as PNG', () => {
    expect(resolveUploadType(SVG, 'image/svg+xml', 'logo.svg')).toEqual({ mimeType: 'application/octet-stream', ext: '' })
    expect(resolveUploadType(SVG, 'image/png', 'logo.png')).toEqual({ mimeType: 'application/octet-stream', ext: '.png' })
  })

  it('accepts declared plain text, which has no magic bytes', () => {
    expect(resolveUploadType(Buffer.from('hello'), 'text/plain', 'notes.txt')).toEqual({ mimeType: 'text/plain', ext: '.txt' })
  })

  it('keeps the original extension for unknown files', () => {
    expect(resolveUploadType(Buffer.from('PK'), 'application/zip', 'archive.zip')).toEqual({ mimeType: 'application/octet-stream', ext: '.zip' })
  })
})

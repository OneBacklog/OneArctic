import { z } from 'zod'

export const attachmentRenameSchema = z.object({
  filename: z
    .string({ error: 'Filename is Required' })
    .refine((value) => value.trim() !== '', 'Filename is Required'),
})

export const attachmentReorderSchema = z.object({
  ids: z.array(z.string().min(1), { error: 'Attachment Order is Required' }).min(1, 'Attachment Order is Required'),
})

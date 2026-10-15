import { z } from 'zod'

export const idParamsSchema = z.object({ id: z.string().min(1) })
export const attachmentParamsSchema = z.object({ id: z.string().min(1), attId: z.string().min(1) })

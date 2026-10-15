import { z } from 'zod'

export const loginSchema = z.object({
  code: z.string({ error: 'Invalid OTP Format' }).regex(/^\d{6}$/, 'Invalid OTP Format'),
})

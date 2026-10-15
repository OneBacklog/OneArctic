import { z } from 'zod'
import { CONSTRAINTS } from '../utils/constants'

export const loginSchema = z.object({
  code: z.string({ error: 'Invalid OTP Format' }).regex(new RegExp(`^\\d{${CONSTRAINTS.OTP_LENGTH}}$`), 'Invalid OTP Format'),
})

import { z } from 'zod'
import { CONSTRAINTS } from '../utils/constants'

export const labelInputSchema = z.object({
  name: z
    .string({ error: 'Label Name is Required' })
    .trim()
    .min(1, 'Label Name is Required')
    .max(CONSTRAINTS.LABEL_MAX_LENGTH, `Label Name Must Be ${CONSTRAINTS.LABEL_MAX_LENGTH} Characters or Less`),
})

export const labelReorderSchema = z.object({
  order: z
    .array(z.object({
      id: z.string().min(1),
      position: z.number().nonnegative(),
    }), { error: 'Label Order is Required' })
    .min(1, 'Label Order is Required'),
})

import type { H3Event } from 'h3'
import type { z } from 'zod'

// h3's readValidatedBody wraps thrown errors in a generic "Validation Error", so validate
// here instead to return the first issue's message as a 400.
function validate<T extends z.ZodType>(schema: T, data: unknown): z.output<T> {
  const result = schema.safeParse(data)
  if (result.success) return result.data
  throw createError({
    statusCode: 400,
    message: result.error.issues[0]?.message ?? 'Invalid Request',
    data: { issues: result.error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })) },
  })
}

export async function readBodyAs<T extends z.ZodType>(event: H3Event, schema: T) {
  return validate(schema, await readBody(event))
}

export function getQueryAs<T extends z.ZodType>(event: H3Event, schema: T) {
  return validate(schema, getQuery(event))
}

export function getParamsAs<T extends z.ZodType>(event: H3Event, schema: T) {
  return validate(schema, getRouterParams(event, { decode: true }))
}

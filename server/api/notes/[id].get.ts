import { getNoteWithMeta } from '../../utils/notesSvc'
import { idParamsSchema } from '#shared/schemas/common'
import { getParamsAs } from '../../utils/validation'

export default defineEventHandler(async (event) => {
  const { id } = getParamsAs(event, idParamsSchema)
  const note = await getNoteWithMeta(id)
  if (!note) throw createError({ statusCode: 404, message: 'Note Not Found' })
  return note
})

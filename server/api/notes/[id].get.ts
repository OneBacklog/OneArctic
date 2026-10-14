import { getNoteWithMeta } from '../../utils/notesSvc'
import { requireRouterParam } from '../../utils/guards'

export default defineEventHandler(async (event) => {
  const note = await getNoteWithMeta(requireRouterParam(event, 'id'))
  if (!note) throw createError({ statusCode: 404, statusMessage: 'Note not found' })
  return note
})

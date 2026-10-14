import { runMigrations } from '../utils/db'
import { ensureNotesIndex } from '../utils/searchSvc'
import { getJwtSecret } from '../utils/auth'

export default defineNitroPlugin(async () => {
  // Fail fast on a missing or weak secret instead of on the first request
  getJwtSecret()

  try {
    runMigrations()
    console.log('[db] Migrations applied successfully')
  } catch (e) {
    console.error('[db] Migration failed:', e)
  }

  try {
    await ensureNotesIndex()
    console.log('[search] Meilisearch index ready')
  } catch (e) {
    console.warn('[search] Meilisearch not available, search will be disabled:', e)
  }
})

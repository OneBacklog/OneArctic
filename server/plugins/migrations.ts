import { eq } from 'drizzle-orm'
import { getDb, runMigrations, schema } from '../utils/db'
import { ensureNotesIndex } from '../utils/searchSvc'
import { reindexAllNotes } from '../utils/notesSvc'
import { getJwtSecret } from '../utils/auth'
import { logger } from '../utils/logger'

/** Bump when the shape or scope of indexed documents changes to trigger a full reindex on startup. */
const SEARCH_INDEX_VERSION = '2'
const SEARCH_INDEX_VERSION_KEY = 'search_index_version'

export default defineNitroPlugin(async () => {
  // Fail fast on a missing or weak secret instead of on the first request
  getJwtSecret()

  // A failed migration leaves the schema in an unknown state; refuse to start rather than serve from it
  runMigrations()
  logger.db.success('Migrations applied')

  try {
    await ensureNotesIndex()
    logger.search.success('Meilisearch index ready')
  } catch (e) {
    logger.search.warn('Meilisearch not available, search will be disabled:', e instanceof Error ? e.message : e)
    return
  }

  const db = getDb()
  const stored = db.select().from(schema.settings).where(eq(schema.settings.key, SEARCH_INDEX_VERSION_KEY)).get()
  // SEARCH_REINDEX=true forces a full rebuild, e.g. after deleting data/meili
  const forced = process.env.SEARCH_REINDEX === 'true'
  if (stored?.value === SEARCH_INDEX_VERSION && !forced) return

  try {
    const count = await reindexAllNotes()
    db.insert(schema.settings)
      .values({ key: SEARCH_INDEX_VERSION_KEY, value: SEARCH_INDEX_VERSION })
      .onConflictDoUpdate({ target: schema.settings.key, set: { value: SEARCH_INDEX_VERSION } })
      .run()
    logger.search.success(`Reindexed ${count} notes`)
  } catch (e) {
    logger.search.warn('Reindex failed, will retry on next startup:', e instanceof Error ? e.message : e)
  }
})

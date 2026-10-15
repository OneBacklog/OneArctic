import { eq } from 'drizzle-orm'
import { getDb, runMigrations, schema } from '../utils/db'
import { ensureNotesIndex } from '../utils/searchSvc'
import { reindexAllNotes } from '../utils/notesSvc'
import { getJwtSecret } from '../utils/auth'

/** Bump when the shape or scope of indexed documents changes to trigger a full reindex on startup. */
const SEARCH_INDEX_VERSION = '2'
const SEARCH_INDEX_VERSION_KEY = 'search_index_version'

export default defineNitroPlugin(async () => {
  // Fail fast on a missing or weak secret instead of on the first request
  getJwtSecret()

  // A failed migration leaves the schema in an unknown state; refuse to start rather than serve from it
  runMigrations()
  console.log('[db] Migrations applied successfully')

  try {
    await ensureNotesIndex()
    console.log('[search] Meilisearch index ready')
  } catch (e) {
    console.warn('[search] Meilisearch not available, search will be disabled:', e)
    return
  }

  const db = getDb()
  const stored = db.select().from(schema.settings).where(eq(schema.settings.key, SEARCH_INDEX_VERSION_KEY)).get()
  if (stored?.value === SEARCH_INDEX_VERSION) return

  try {
    const count = await reindexAllNotes()
    db.insert(schema.settings)
      .values({ key: SEARCH_INDEX_VERSION_KEY, value: SEARCH_INDEX_VERSION })
      .onConflictDoUpdate({ target: schema.settings.key, set: { value: SEARCH_INDEX_VERSION } })
      .run()
    console.log(`[search] Reindexed ${count} notes`)
  } catch (e) {
    console.warn('[search] Reindex failed, will retry on next startup:', e)
  }
})

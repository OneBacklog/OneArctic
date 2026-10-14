import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { schema } from '../database/schema'

export { schema }
export type { NoteRow, LabelRow, ChecklistItemRow, AttachmentRow } from '../database/schema'

const MIGRATIONS_FOLDER = './server/database/migrations'

let _db: ReturnType<typeof drizzle<typeof schema>> | null = null

export function getDb() {
  if (_db) return _db

  const dbPath = process.env.DATABASE_PATH
  if (!dbPath) {
    throw new Error('DATABASE_PATH environment variable is required.')
  }
  mkdirSync(dirname(dbPath), { recursive: true, mode: 0o700 })

  const sqlite = new Database(dbPath)
  sqlite.pragma('journal_mode = WAL')
  sqlite.pragma('foreign_keys = ON')

  _db = drizzle(sqlite, { schema })
  return _db
}

export type DbClient = ReturnType<typeof getDb>

export function runMigrations() {
  migrate(getDb(), { migrationsFolder: MIGRATIONS_FOLDER })
}

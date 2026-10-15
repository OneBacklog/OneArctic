import { MeiliSearch, MeiliSearchApiError } from 'meilisearch'
import { logger } from './logger'

let _client: MeiliSearch | null = null

export function getMeiliClient(): MeiliSearch {
  if (_client) return _client
  _client = new MeiliSearch({
    host: (() => {
      const host = process.env.MEILISEARCH_HOST
      if (!host) {
        throw new Error('MEILISEARCH_HOST environment variable is required.')
      }
      return host
    })(),
    apiKey: (() => {
      const key = process.env.MEILI_MASTER_KEY
      if (!key) logger.search.warn('MEILI_MASTER_KEY is not set; requests to Meilisearch will be unauthenticated.')
      return key || ''
    })(),
  })
  return _client
}

export const NOTES_INDEX = 'notes'

export async function ensureNotesIndex() {
  const client = getMeiliClient()
  try {
    await client.getIndex(NOTES_INDEX)
  } catch {
    await client.createIndex(NOTES_INDEX, { primaryKey: 'id' })
  }

  const index = client.index(NOTES_INDEX)
  await index.updateSettings({
    searchableAttributes: ['title', 'content', 'checklistItems', 'attachmentNames'],
    filterableAttributes: ['isArchived', 'isTrashed', 'labels'],
    sortableAttributes: ['updatedAt', 'createdAt'],
    displayedAttributes: ['id', 'title', 'content', 'checklistItems', 'isArchived', 'isTrashed', 'updatedAt'],
  })
  return index
}

export interface NoteSearchDocument {
  id: string
  title: string
  content: string
  labels: string[]
  checklistItems: string[]
  attachmentNames: string[]
  isArchived: boolean
  isTrashed: boolean
  updatedAt: string
  createdAt: string
}

export async function indexNote(doc: NoteSearchDocument) {
  const client = getMeiliClient()
  const index = client.index(NOTES_INDEX)
  await index.addDocuments([doc])
}

export async function indexNotes(docs: NoteSearchDocument[]) {
  if (docs.length === 0) return
  await getMeiliClient().index(NOTES_INDEX).addDocuments(docs)
}

export async function removeNoteFromIndex(id: string) {
  const client = getMeiliClient()
  const index = client.index(NOTES_INDEX)
  await index.deleteDocument(id)
}

export async function removeNotesFromIndex(ids: string[]) {
  await getMeiliClient().index(NOTES_INDEX).deleteDocuments(ids)
}

export async function searchNotes(query: string, options: {
  filter?: string
  sort?: string[]
  limit?: number
  offset?: number
} = {}) {
  const client = getMeiliClient()
  const index = client.index(NOTES_INDEX)
  try {
    return await index.search(query, {
      filter: options.filter,
      sort: options.sort,
      limit: options.limit || 50,
      offset: options.offset || 0,
    })
  } catch (e) {
    if (e instanceof MeiliSearchApiError && e.cause?.code === 'index_not_found') {
      return { hits: [], estimatedTotalHits: 0 }
    }
    throw e
  }
}

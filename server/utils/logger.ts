import { consola } from 'consola'

export const logger = {
  db: consola.withTag('db'),
  search: consola.withTag('search'),
  files: consola.withTag('files'),
  realtime: consola.withTag('realtime'),
}

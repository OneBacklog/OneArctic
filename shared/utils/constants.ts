export const CONSTRAINTS = {
  /** Maximum length of a note title */
  TITLE_MAX_LENGTH: 100,
  /** Maximum length of note content */
  CONTENT_MAX_LENGTH: 10_000,
  /** Maximum number of checklist items per note */
  CHECKLIST_MAX_ITEMS: 100,
  /** Maximum length of a single checklist item text */
  CHECKLIST_ITEM_MAX_LENGTH: 100,
  /** Maximum length of a label name */
  LABEL_MAX_LENGTH: 20,
  /** Maximum length of an attachment filename */
  FILENAME_MAX_LENGTH: 100,
  /** Maximum file upload size in bytes (100 MB) */
  FILE_MAX_SIZE: 100 * 1024 * 1024,
  /** Number of notes per page */
  PAGINATION_LIMIT: 20,
} as const

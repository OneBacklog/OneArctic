interface FetchErrorLike {
  status?: number
  statusCode?: number
  statusMessage?: string
  message?: string
  data?: { statusMessage?: string; data?: unknown } & Record<string, unknown>
}

const asFetchError = (error: unknown): FetchErrorLike =>
  (typeof error === 'object' && error !== null ? error : {}) as FetchErrorLike

export const getErrorStatus = (error: unknown): number | undefined => {
  const err = asFetchError(error)
  return err.statusCode ?? err.status
}

export const getErrorMessage = (error: unknown, fallback: string): string => {
  const err = asFetchError(error)
  return err.data?.statusMessage || err.statusMessage || err.message || fallback
}

/** The `data` object attached to an H3 error (`createError({ data })`). */
export const getErrorData = <T extends object>(error: unknown): Partial<T> => {
  const data = asFetchError(error).data
  return ((data?.data ?? data) || {}) as Partial<T>
}

interface FetchErrorLike {
  status?: number
  statusCode?: number
  data?: { message?: string; data?: unknown } & Record<string, unknown>
}

const asFetchError = (error: unknown): FetchErrorLike =>
  (typeof error === 'object' && error !== null ? error : {}) as FetchErrorLike

export const getErrorStatus = (error: unknown): number | undefined => {
  const err = asFetchError(error)
  return err.statusCode ?? err.status
}

/** The server's message for client errors (4xx); the fallback for network and server failures. */
export const getErrorMessage = (error: unknown, fallback: string): string => {
  const status = getErrorStatus(error)
  if (status === undefined || status >= 500) return fallback
  return asFetchError(error).data?.message || fallback
}

/** The `data` object attached to an H3 error (`createError({ data })`). */
export const getErrorData = <T extends object>(error: unknown): Partial<T> => {
  const data = asFetchError(error).data
  return ((data?.data ?? data) || {}) as Partial<T>
}

/**
 * Run an API action and report failures with an error snackbar instead of throwing.
 * Resolves to `undefined` on failure. 401s are skipped: the $api plugin already redirects to login.
 */
export async function withErrorSnackbar<T>(fallback: string, action: () => Promise<T>): Promise<T | undefined> {
  try {
    return await action()
  } catch (error) {
    if (getErrorStatus(error) !== 401) useSnackbar().show(getErrorMessage(error, fallback), 'error')
    return undefined
  }
}

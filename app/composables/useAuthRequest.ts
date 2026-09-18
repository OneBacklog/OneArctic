export const useAuthRequest = () => {
  const execute = async <T>(request: () => Promise<T>): Promise<T | undefined> => {
    try {
      return await request()
    } catch (error: any) {
      const status = error?.statusCode ?? error?.status
      if (status === 401) {
        await navigateTo('/login')
        return undefined
      }
      throw error
    }
  }

  return { execute }
}

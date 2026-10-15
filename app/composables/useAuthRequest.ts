export const useAuthRequest = () => {
  const nuxtApp = useNuxtApp()

  const execute = async <T>(request: () => Promise<T>): Promise<T | undefined> => {
    try {
      return await request()
    } catch (error) {
      if (getErrorStatus(error) === 401) {
        await nuxtApp.runWithContext(() => navigateTo('/login'))
        return undefined
      }
      throw error
    }
  }

  return { execute }
}

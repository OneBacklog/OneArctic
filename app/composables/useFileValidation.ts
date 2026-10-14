const MAX_FILE_SIZE = CONSTRAINTS.FILE_MAX_SIZE

export const useFileValidation = () => {
  const { show: showSnackbar } = useSnackbar()

  const validate = (files: File[]): File[] => {
    const oversized = files.filter(f => f.size > MAX_FILE_SIZE)
    if (oversized.length > 0) {
      showSnackbar('File is Too Large (Max. 100MB)', 'error')
    }
    return files.filter(f => f.size <= MAX_FILE_SIZE)
  }

  return { validate }
}

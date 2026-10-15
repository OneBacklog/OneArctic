const isStandalonePwa = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  (window.navigator as Navigator & { standalone?: boolean }).standalone === true

/**
 * Download a file from the API. Installed PWAs have no tab to open, so they get a
 * download link instead of a new window.
 */
export function downloadFile(url: string, filename: string) {
  if (isStandalonePwa()) {
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.rel = 'noopener'
    document.body.appendChild(link)
    link.click()
    link.remove()
    return
  }
  window.open(url, '_blank', 'noopener')
}

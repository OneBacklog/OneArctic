<template>
  <div class="min-h-screen flex flex-col bg-nord-snow dark:bg-nord-storm">
    <a href="#main-content" class="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[400] focus:px-4 focus:py-2 focus:rounded-lg focus:bg-nord-blue focus:text-white">Skip to Content</a>
    <AppHeader @toggle-sidebar="toggleSidebar" />
    <div class="flex flex-1 pt-16">
      <AppSidebar :open="sidebarOpen" :animated="sidebarAnimated" @close="sidebarOpen = false" />
      <main id="main-content" class="flex-1 min-w-0">
        <div
          class="max-w-[1400px] mx-auto px-4 py-6"
          :class="[
            sidebarOpen === null ? 'pl-20 md:pl-[272px]' : sidebarOpen ? 'pl-20 md:pl-[272px]' : 'pl-20',
            sidebarAnimated ? 'transition-[padding] duration-300 ease-in-out' : '',
          ]"
        >
          <slot />
        </div>
      </main>
    </div>
    <AppLightbox />
    <AppBackToTop />
    <AppSnackbar />
  </div>
</template>

<script setup lang="ts">
const { sidebarOpen } = useSidebar()
const sidebarAnimated = ref(false)
const route = useRoute()
const { fetchLabels } = useLabels({ realtime: true })
const { start: startEventSource, stop: stopEventSource } = useEventSource()
const { searchFocusTrigger } = useAppShortcuts()

onMounted(() => {
  startEventSource()
  const handler = (e: KeyboardEvent) => {
    if (!e.ctrlKey && !e.metaKey) return
    if (e.key === 'f') {
      e.preventDefault()
      searchFocusTrigger.value++
    }
  }
  document.addEventListener('keydown', handler)
  onUnmounted(() => {
    document.removeEventListener('keydown', handler)
    // Leaving the signed-in layout (e.g. session expired): stop reconnecting to the event stream
    stopEventSource()
  })
})

await callOnce('init-labels', fetchLabels)

const toggleSidebar = () => {
  if (!sidebarAnimated.value) sidebarAnimated.value = true
  if (sidebarOpen.value === null) {
    sidebarOpen.value = isMobileViewport()
  } else {
    sidebarOpen.value = !sidebarOpen.value
  }
}

// Close sidebar on navigation (mobile only, and only if explicitly opened)
watch(() => route.path, () => {
  if (sidebarOpen.value === true && isMobileViewport()) sidebarOpen.value = false
})
</script>

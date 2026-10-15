<template>
  <Transition
    enter-active-class="transition-all duration-200 ease-out"
    enter-from-class="opacity-0 translate-y-4"
    enter-to-class="opacity-100 translate-y-0"
    leave-active-class="transition-all duration-150 ease-in"
    leave-from-class="opacity-100 translate-y-0"
    leave-to-class="opacity-0 translate-y-4"
  >
    <button
      v-if="showButton"
      type="button"
      class="fixed bottom-6 right-6 z-40 w-11 h-11 rounded-full bg-nord-blue hover:bg-nord-frost text-white shadow-lg flex items-center justify-center transition-colors duration-150"
      aria-label="Back to top"
      @click="scrollToTop"
    >
      <UiIcon name="arrow-up" class="w-5 h-5" />
    </button>
  </Transition>
</template>

<script setup lang="ts">
// Show the button once the user has scrolled this far down (px)
const THRESHOLD = 1000

const showButton = ref(false)

const onScroll = () => {
  showButton.value = window.scrollY > THRESHOLD
}

onMounted(() => window.addEventListener('scroll', onScroll, { passive: true }))
onUnmounted(() => window.removeEventListener('scroll', onScroll))

const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' })
</script>

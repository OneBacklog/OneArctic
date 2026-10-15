<template>
  <div
    v-if="!isUnauthorized"
    class="min-h-screen bg-nord-snow dark:bg-nord-storm flex flex-col items-center justify-center gap-3 p-4 text-center"
  >
    <p class="text-5xl font-bold text-nord-aurora">{{ error?.statusCode ?? 500 }}</p>
    <p class="text-nord-slate dark:text-nord-frost">{{ message }}</p>
    <button
      type="button"
      class="mt-4 px-4 py-2 rounded-lg bg-nord-aurora text-nord-storm text-sm font-medium hover:opacity-90 transition-opacity"
      @click="clearError({ redirect: '/' })"
    >
      Back to Notes
    </button>
  </div>
</template>

<script setup lang="ts">
const error = useError()
const isUnauthorized = computed(() => error.value?.statusCode === 401)
const message = computed(() =>
  error.value?.statusCode === 404 ? 'Page Not Found' : 'Something Went Wrong'
)

const redirect = async () => {
  await clearError({ redirect: '/login' })
}

// Both SSR and client-side: redirect 401 to login immediately
if (isUnauthorized.value) {
  await redirect()
} else {
  onMounted(async () => {
    if (isUnauthorized.value) await redirect()
  })
}
</script>

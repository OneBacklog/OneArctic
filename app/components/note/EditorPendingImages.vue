<template>
  <ul
    v-if="files.length > 0"
    class="grid gap-1 rounded-t-xl overflow-hidden"
    :class="files.length === 1 ? 'grid-cols-1' : 'grid-cols-2'"
  >
    <li
      v-for="file in files"
      :key="`${file.name}-${file.lastModified}`"
      class="relative group"
    >
      <img
        :src="getUrl(file)"
        :alt="file.name"
        class="w-full object-cover"
        :class="files.length === 1 ? 'max-h-56' : 'h-32'"
      >

      <button
        v-if="confirming !== file"
        type="button"
        class="absolute top-1 right-1 w-7 h-7 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity hover:bg-nord-ember/80"
        title="Remove Image"
        :aria-label="`Remove ${file.name}`"
        @click.stop="confirming = file"
      >
        <UiIcon name="trash" class="w-3.5 h-3.5 text-white" />
      </button>

      <UiInlineConfirm
        v-else
        message="Remove Image?"
        confirm-label="Remove"
        @confirm="confirming = null; emit('remove', file)"
        @cancel="confirming = null"
      />
    </li>
  </ul>
</template>

<script setup lang="ts">
// Previews of images picked for a note that hasn't been created yet.
const props = defineProps<{ files: File[] }>()
const emit = defineEmits<{ remove: [file: File] }>()

const confirming = ref<File | null>(null)
const urlCache = new Map<File, string>()

const getUrl = (file: File): string => {
  if (!urlCache.has(file)) urlCache.set(file, URL.createObjectURL(file))
  return urlCache.get(file)!
}

watch(() => props.files, (newFiles) => {
  const newSet = new Set(newFiles)
  urlCache.forEach((url, file) => {
    if (!newSet.has(file)) { URL.revokeObjectURL(url); urlCache.delete(file) }
  })
})

onUnmounted(() => { urlCache.forEach((url) => URL.revokeObjectURL(url)); urlCache.clear() })
</script>

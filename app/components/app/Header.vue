<template>
  <header class="fixed top-0 left-0 right-0 h-16 bg-nord-obsidian border-b border-nord-graphite z-40 flex items-center">
    <!-- Left: hamburger, always w-16 -->
    <div class="w-16 flex-shrink-0 flex items-center justify-center">
      <button
        type="button"
        class="w-10 h-10 rounded-full flex items-center justify-center hover:bg-nord-graphite transition-colors"
        aria-label="Toggle Menu"
        aria-controls="app-sidebar"
        @click="$emit('toggle-sidebar')"
      >
        <UiIcon name="menu" class="w-6 h-6 text-nord-ice" />
      </button>
    </div>

    <!-- Center: search bar, full-width on small screens, capped + centered on large -->
    <div class="flex-1 min-w-0 px-4">
      <AppSearchBar class="w-full max-w-[600px] mx-auto" />
    </div>
  </header>
</template>

<script setup lang="ts">
defineEmits<{ 'toggle-sidebar': [] }>()
</script>

<template>
  <NoteListView mode="notes" />
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'auth' })
</script>

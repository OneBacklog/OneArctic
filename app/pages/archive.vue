<template>
  <NoteListView mode="archive" />
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'auth' })
</script>

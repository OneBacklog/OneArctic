<template>
  <NoteListView mode="trash" />
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'auth' })
</script>

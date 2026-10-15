<template>
  <NoteListView mode="label" :label-id="labelId" />
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const route = useRoute()
const labelId = computed(() => route.params.id as string)
</script>

<template>
  <UiModal
    label="Set Labels"
    panel-class="bg-nord-mist dark:bg-nord-obsidian rounded-xl shadow-xl border border-nord-ice dark:border-nord-graphite p-4 w-80 max-h-[90vh] overflow-y-auto"
    @close="$emit('close')"
  >
    <label :for="searchId" class="sr-only">Search Labels</label>
    <input
      :id="searchId"
      v-model="search"
      type="text"
      placeholder="Search Labels"
      class="w-full bg-nord-ice dark:bg-nord-graphite rounded-lg px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-nord-aurora text-nord-storm dark:text-nord-snow placeholder-nord-slate dark:placeholder-nord-frost mb-2"
      data-autofocus
    >

    <!-- Create new label -->
    <form class="flex gap-1.5 mb-2" @submit.prevent="addLabel">
      <label :for="newLabelId" class="sr-only">New Label</label>
      <input
        :id="newLabelId"
        v-model="newName"
        type="text"
        placeholder="New Label"
        :maxlength="CONSTRAINTS.LABEL_MAX_LENGTH"
        class="flex-1 min-w-0 bg-nord-ice dark:bg-nord-graphite rounded-lg px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-nord-aurora text-nord-storm dark:text-nord-snow placeholder-nord-slate dark:placeholder-nord-frost"
      >
      <button
        type="submit"
        :disabled="!newName.trim()"
        class="px-3 py-2 bg-nord-blue text-white rounded-lg text-sm font-medium disabled:opacity-40 hover:bg-nord-frost transition-colors"
      >
        Add
      </button>
    </form>

    <div class="space-y-1 max-h-56 overflow-y-auto">
      <button
        v-for="label in filteredLabels"
        :key="label.id"
        type="button"
        role="checkbox"
        :aria-checked="localSelected.includes(label.id)"
        class="flex items-center gap-2 w-full px-2 py-1.5 rounded-lg hover:bg-nord-ice dark:hover:bg-nord-graphite text-left"
        @click="toggle(label.id)"
      >
        <span
          class="w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0"
          :class="localSelected.includes(label.id) ? 'bg-nord-aurora border-nord-aurora' : 'border-nord-ice dark:border-nord-slate'"
        >
          <UiIcon v-if="localSelected.includes(label.id)" name="check" class="w-3 h-3 text-white" />
        </span>
        <span class="text-sm text-nord-obsidian dark:text-nord-ice truncate">{{ label.name }}</span>
      </button>
      <div v-if="filteredLabels.length === 0" class="text-xs text-nord-slate dark:text-nord-frost text-center py-2" role="status">No Labels Found</div>
    </div>
    <button
      type="button"
      class="mt-2 w-full py-2 text-sm text-nord-slate dark:text-nord-ice hover:bg-nord-ice dark:hover:bg-nord-graphite rounded-lg transition-colors"
      @click="$emit('close')"
    >
      Done
    </button>
  </UiModal>
</template>

<script setup lang="ts">
const props = defineProps<{ selectedIds: string[] }>()
const emit = defineEmits<{ update: [ids: string[]]; close: [] }>()

const { labels, createLabel } = useLabels()
const searchId = useId()
const newLabelId = useId()
const search = ref('')
const newName = ref('')
const localSelected = ref([...props.selectedIds])

const filteredLabels = computed(() =>
  labels.value.filter((l) => l.name.toLowerCase().includes(search.value.toLowerCase()))
)

const toggle = (id: string) => {
  localSelected.value = localSelected.value.includes(id)
    ? localSelected.value.filter((i) => i !== id)
    : [...localSelected.value, id]
  emit('update', localSelected.value)
}

const addLabel = async () => {
  const name = newName.value.trim()
  if (!name) return
  const created = await createLabel(name)
  if (!created) return
  newName.value = ''
  // Auto-select the newly created label
  localSelected.value = [...localSelected.value, created.id]
  emit('update', localSelected.value)
}
</script>

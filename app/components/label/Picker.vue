<template>
  <Teleport to="body">
    <div class="fixed left-0 top-0 modal-viewport bg-black/40 z-50 flex items-center justify-center px-4" @mousedown.self="$emit('close')">
      <div class="bg-nord-mist dark:bg-nord-obsidian rounded-xl shadow-xl border border-nord-ice dark:border-nord-graphite p-4 w-80 max-h-[90vh] overflow-y-auto">
        <input
          v-model="search"
          type="text"
          placeholder="Search Labels"
          class="w-full bg-nord-ice dark:bg-nord-graphite rounded-lg px-3 py-2 text-sm outline-none text-nord-storm dark:text-nord-snow placeholder-nord-slate dark:placeholder-nord-frost mb-2"
        >

        <!-- Create new label -->
        <form class="flex gap-1.5 mb-2" @submit.prevent="addLabel">
          <input
            v-model="newName"
            type="text"
            placeholder="New Label"
            class="flex-1 bg-nord-ice dark:bg-nord-graphite rounded-lg px-3 py-2 text-sm outline-none text-nord-storm dark:text-nord-snow placeholder-nord-slate dark:placeholder-nord-frost"
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
            class="flex items-center gap-2 w-full px-2 py-1.5 rounded-lg hover:bg-nord-ice dark:hover:bg-nord-graphite text-left"
            @click="toggle(label.id)"
          >
            <div
class="w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0"
              :class="localSelected.includes(label.id) ? 'bg-nord-aurora border-nord-aurora' : 'border-nord-ice dark:border-nord-slate'">
              <svg v-if="localSelected.includes(label.id)" class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4.5 12.75l6 6 9-13.5"/>
              </svg>
            </div>
            <span class="text-sm text-nord-obsidian dark:text-nord-ice truncate">{{ label.name }}</span>
          </button>
          <div v-if="filteredLabels.length === 0" class="text-xs text-nord-slate dark:text-nord-frost text-center py-2">No labels found</div>
        </div>
        <button
          class="mt-2 w-full py-2 text-sm text-nord-slate dark:text-nord-ice hover:bg-nord-ice dark:hover:bg-nord-graphite rounded-lg transition-colors"
          @click="$emit('close')"
        >Done</button>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
const props = defineProps<{ selectedIds: string[] }>()
const emit = defineEmits<{ update: [ids: string[]]; close: [] }>()

useBodyScrollLock(true)

useEscapeKey(() => emit('close'))

const { labels, createLabel } = useLabels()
const search = ref('')
const newName = ref('')
const localSelected = ref([...props.selectedIds])

const filteredLabels = computed(() =>
  labels.value.filter((l) => l.name.toLowerCase().includes(search.value.toLowerCase()))
)

const toggle = (id: string) => {
  if (localSelected.value.includes(id)) {
    localSelected.value = localSelected.value.filter((i) => i !== id)
  } else {
    localSelected.value = [...localSelected.value, id]
  }
  emit('update', localSelected.value)
}

const addLabel = async () => {
  if (!newName.value.trim()) return
  const created = await createLabel(newName.value.trim())
  if (!created) return
  newName.value = ''
  // Auto-select the newly created label
  localSelected.value = [...localSelected.value, created.id]
  emit('update', localSelected.value)
}
</script>

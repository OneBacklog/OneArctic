<template>
  <div>
    <!-- Mobile overlay — covers full screen including header -->
    <Transition name="fade">
      <div
        v-if="open === true"
        class="fixed inset-0 bg-black/30 z-20 md:hidden"
        aria-hidden="true"
        @click="$emit('close')"
      />
    </Transition>

    <!-- Sidebar — always visible, width toggles -->
    <aside
      id="app-sidebar"
      class="fixed top-0 left-0 bottom-0 z-30 bg-nord-mist dark:bg-nord-obsidian flex flex-col overflow-hidden pt-16"
      :class="[asideWidthCls, animated ? 'transition-[width] duration-300 ease-in-out' : '']"
    >
      <!-- Fixed nav items (never scroll) -->
      <nav class="flex-shrink-0 pt-2" aria-label="Main">
        <!-- All Notes -->
        <NuxtLink to="/" class="flex items-center h-12 cursor-pointer">
          <div :class="innerCls($route.path === '/')">
            <UiIcon name="document" class="nav-icon" />
            <span :class="labelCls">All Notes</span>
          </div>
        </NuxtLink>

        <!-- Archive -->
        <NuxtLink to="/archive" class="flex items-center h-12 cursor-pointer">
          <div :class="innerCls($route.path === '/archive')">
            <UiIcon name="archive" class="nav-icon" />
            <span :class="labelCls">Archive</span>
          </div>
        </NuxtLink>

        <!-- Trash -->
        <NuxtLink to="/trash" class="flex items-center h-12 cursor-pointer">
          <div :class="innerCls($route.path === '/trash')">
            <UiIcon name="trash" class="nav-icon" />
            <span :class="labelCls">Trash</span>
          </div>
        </NuxtLink>

        <!-- Divider -->
        <div class="border-t border-nord-ice dark:border-nord-graphite my-2 mx-3" />

        <!-- Manage Labels -->
        <button type="button" class="flex items-center h-12 w-full cursor-pointer" @click="showLabelManager = true">
          <div :class="innerCls(false)">
            <UiIcon name="pencil-square" class="nav-icon" />
            <span :class="labelCls">Manage Labels</span>
          </div>
        </button>
      </nav>

      <!-- Scrollable labels list -->
      <nav class="flex-1 overflow-y-auto overflow-x-hidden" aria-label="Labels">
        <NuxtLink
          v-for="label in labels"
          :key="label.id"
          :to="`/label/${label.id}`"
          class="flex items-center h-12 cursor-pointer"
        >
          <div :class="innerCls($route.params.id === label.id)">
            <UiIcon name="tag" class="nav-icon" />
            <span :class="[labelCls, 'truncate']">{{ label.name }}</span>
          </div>
        </NuxtLink>
      </nav>
    </aside>

    <LabelManager v-if="showLabelManager" @close="showLabelManager = false" />
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ open: boolean | null; animated?: boolean }>()
const emit = defineEmits<{ close: [] }>()

const { labels } = useLabels()
const showLabelManager = ref(false)

// Lock body scroll on mobile only when sidebar is open
const isMobile = ref(false)
const updateIsMobile = () => {
  isMobile.value = isMobileViewport()
}
onMounted(() => {
  updateIsMobile()
  window.addEventListener('resize', updateIsMobile, { passive: true })
})
onUnmounted(() => {
  if (typeof window !== 'undefined') window.removeEventListener('resize', updateIsMobile)
})
const isMobileSidebarOpen = computed(() => props.open === true && isMobile.value)
useBodyScrollLock(isMobileSidebarOpen)

// Close mobile sidebar on Escape
useEscapeKey(() => emit('close'), isMobileSidebarOpen)

const asideWidthCls = computed(() => {
  if (props.open === null) return 'w-16 md:w-64'
  return props.open ? 'w-64' : 'w-16'
})

const innerCls = (active: boolean) => [
  'flex items-center h-12 flex-1 mx-2 pl-[14px] pr-3 rounded-full transition-colors duration-200',
  active
    ? 'bg-nord-blue/20 dark:bg-nord-blue/30 text-nord-blue dark:text-nord-aurora font-medium'
    : 'text-nord-obsidian dark:text-nord-ice hover:bg-nord-ice dark:hover:bg-nord-graphite',
]

const labelCls = computed(() => [
  'text-sm whitespace-nowrap overflow-hidden transition-[max-width,opacity,margin] duration-300 ease-in-out',
  props.open === null
    ? 'max-w-0 opacity-0 md:max-w-[180px] md:opacity-100 md:ml-3'
    : props.open ? 'max-w-[180px] opacity-100 ml-3' : 'max-w-0 opacity-0',
])

</script>

<style scoped>
@reference "tailwindcss";

.nav-icon {
  @apply w-5 h-5 flex-shrink-0;
}
</style>

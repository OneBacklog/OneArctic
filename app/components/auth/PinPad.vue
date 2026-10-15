<template>
  <div class="grid grid-cols-3 gap-6 w-full max-w-[260px] mx-auto" role="group" aria-label="Number Pad">
    <button
      v-for="key in keys"
      :key="key"
      type="button"
      class="w-full min-w-0 aspect-square rounded-full border border-nord-graphite bg-nord-obsidian text-nord-snow text-base font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:border-nord-aurora flex items-center justify-center leading-none select-none appearance-none overflow-hidden p-1.5 active:scale-[0.94] active:bg-nord-graphite"
      :class="{
        'col-start-2': key === '0',
        'col-start-3': key === 'backspace',
      }"
      :disabled="disabled"
      :aria-label="key === 'backspace' ? 'Delete Digit' : key"
      @click="onKeyPress(key)"
    >
      <span v-if="key !== 'backspace'">{{ key }}</span>
      <UiIcon v-else name="backspace" class="w-5 h-5 -translate-x-0.5" />
    </button>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  disabled?: boolean
}>()

const emit = defineEmits<{ press: [key: string] }>()

const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', 'backspace']

const onKeyPress = (key: string) => {
  if (props.disabled) return
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate(12)
  }
  emit('press', key)
}

</script>


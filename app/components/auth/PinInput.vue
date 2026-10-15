<template>
  <input
    ref="inputRef"
    v-model="model"
    type="tel"
    inputmode="numeric"
    pattern="[0-9]*"
    :maxlength="CONSTRAINTS.OTP_LENGTH"
    aria-label="One-Time Code"
    :autocomplete="autocomplete"
    class="pin-input w-full max-w-[240px] mx-auto block text-center text-3xl tracking-[0.6em] indent-[0.6em] font-bold border-2 rounded-xl px-4 py-4 bg-nord-obsidian outline-none transition-colors placeholder-nord-slate"
    :class="inputClass"
    placeholder="······"
    :disabled="disabled"
    @input="$emit('input')"
    @keydown.enter.prevent
  >
</template>

<script setup lang="ts">
defineProps<{
  autocomplete?: string
  disabled?: boolean
  inputClass?: string | Record<string, boolean>
}>()

defineEmits<{ input: [] }>()

const model = defineModel<string>({ required: true })
const inputRef = ref<HTMLInputElement>()

const focus = () => inputRef.value?.focus()

onMounted(focus)
defineExpose({ focus })
</script>

<style scoped>
.pin-input {
  -webkit-text-security: disc;
  line-height: 1;
}
.pin-input::placeholder {
  line-height: 1;
}
</style>

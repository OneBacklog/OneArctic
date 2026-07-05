<template>
  <div class="w-full max-w-sm mx-auto text-center flex flex-col items-stretch">
    <div class="mb-8">
      <div class="w-16 h-16 mx-auto mb-4">
        <img src="/icon.svg" alt="OneArctic" class="w-16 h-16" >
      </div>
      <h1 class="text-2xl font-semibold text-nord-snow">OneArctic</h1>
      <p class="text-nord-frost mt-2 text-sm">Enter OTP to Continue</p>
    </div>

    <div class="md:block hidden">
      <AuthPinInput
        ref="pinInputRef"
        v-model="code"
        autocomplete="one-time-code"
        :disabled="loading || cooldown > 0"
        :input-class="{
          'border-nord-ember animate-shake': shake,
          'border-nord-orange opacity-60': cooldown > 0 && !shake,
          'border-nord-graphite focus:border-nord-aurora': !shake && cooldown === 0,
          'cursor-not-allowed': loading || cooldown > 0,
        }"
        @input="onInput"
      />
    </div>

    <div class="md:hidden">
      <div
        class="w-full max-w-[240px] mx-auto mb-8 flex items-center justify-center gap-3"
        :class="{
          'animate-shake': shake,
          'opacity-60': cooldown > 0 && !shake,
        }"
      >
        <span
          v-for="idx in 6"
          :key="idx"
          class="w-[1rem] h-[1rem] rounded-full border-2"
          :class="idx <= code.length ? 'bg-nord-snow border-nord-snow' : 'border-nord-graphite'"
        />
      </div>

      <div class="w-full max-w-[320px] mx-auto">
        <AuthPinPad
          :disabled="loading || cooldown > 0"
          @press="onPadPress"
        />
      </div>
    </div>

    <!-- Cooldown / error (reserve space to avoid layout shift) -->
    <div class="mt-8 min-h-[44px]">
      <div v-if="cooldown > 0" class="flex flex-col items-center gap-1">
        <p class="text-nord-orange text-sm font-medium">Too many wrong attempts</p>
        <p class="text-nord-frost text-sm">Try again in <span class="font-bold text-nord-yellow">{{ cooldown }}s</span></p>
      </div>
      <div v-else-if="error">
        <p class="text-nord-ember text-sm">{{ error }}</p>
        <p v-if="attemptsLeft !== null" class="text-nord-frost text-xs mt-1">
          {{ attemptsLeft }} attempt{{ attemptsLeft !== 1 ? 's' : '' }} left before cooldown
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const { login } = useAuth()

const code = ref('')
const error = ref('')
const loading = ref(false)
const shake = ref(false)
const cooldown = ref(0)
const attemptsLeft = ref<number | null>(null)
const pinInputRef = ref<{ focus: () => void }>()

let cooldownTimer: ReturnType<typeof setInterval> | null = null

onUnmounted(() => { if (cooldownTimer) clearInterval(cooldownTimer) })

const startCooldown = (seconds: number) => {
  cooldown.value = seconds
  attemptsLeft.value = null
  if (cooldownTimer) clearInterval(cooldownTimer)
  cooldownTimer = setInterval(() => {
    cooldown.value--
    if (cooldown.value <= 0) {
      cooldown.value = 0
      clearInterval(cooldownTimer!)
      cooldownTimer = null
      nextTick(() => pinInputRef.value?.focus())
    }
  }, 1000)
}

const onInput = async () => {
  if (cooldown.value > 0) return
  code.value = code.value.replace(/\D/g, '').slice(0, 6)
  error.value = ''

  await submitIfComplete()
}

const submitIfComplete = async () => {
  if (code.value.length !== 6) return
  loading.value = true
  try {
    await login(code.value)
    attemptsLeft.value = null
  } catch (e: any) {
    const status = e?.status ?? e?.statusCode
    const data = e?.data?.data ?? e?.data

    if (status === 429) {
      code.value = ''
      startCooldown(data?.secondsLeft ?? 60)
    } else if (status === 404) {
      error.value = 'OTP Not Configured'
    } else {
      error.value = 'Wrong OTP. Try again.'
      attemptsLeft.value = data?.attemptsLeft ?? null
      shake.value = true
      setTimeout(() => {
        shake.value = false
        code.value = ''
        pinInputRef.value?.focus()
      }, 600)
    }
  } finally {
    loading.value = false
  }
}

const onPadPress = async (key: string) => {
  if (cooldown.value > 0 || loading.value) return
  error.value = ''
  if (key === 'backspace') {
    code.value = code.value.slice(0, -1)
    return
  }
  if (!/^\d$/.test(key)) return
  if (code.value.length >= 6) return
  code.value += key
  await submitIfComplete()
}
</script>

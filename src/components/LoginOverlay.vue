<script setup>
import { ref, computed } from 'vue'
import { X } from 'lucide-vue-next'
import { useAuth } from '@/composables/useAuth'
import { getAuthErrorMessage } from '@/auth'

const props = defineProps({ dismissible: { type: Boolean, default: false } })
const emit = defineEmits(['close'])

// 公用字段
const email = ref('')
const loading = ref(false)
const errorMsg = ref('')
const successMsg = ref('')

// 密码登录 / 注册
const password = ref('')
const isRegister = ref(false)

// 验证码登录
const isOtpMode = ref(false)
const otpCode = ref('')
const otpSending = ref(false)
const otpCountdown = ref(0)
let otpTimer = null

const { handleLogin, handleRegister, sendLoginOtp, verifyLoginOtp, setGuestMode } = useAuth()

const canSubmitPassword = computed(
  () => !!email.value.trim() && typeof password.value === 'string' && password.value.length >= 6,
)
const canSubmitOtp = computed(() => !!email.value.trim() && !!otpCode.value.trim())

function switchToPassword() {
  isOtpMode.value = false
  errorMsg.value = ''
  successMsg.value = ''
}

function switchToOtp() {
  isOtpMode.value = true
  isRegister.value = false
  password.value = ''
  errorMsg.value = ''
  successMsg.value = ''
}

async function handleSubmitPassword() {
  if (!canSubmitPassword.value || loading.value) return
  errorMsg.value = ''
  successMsg.value = ''
  loading.value = true
  const res = isRegister.value
    ? await handleRegister(email.value.trim(), password.value)
    : await handleLogin(email.value.trim(), password.value)
  loading.value = false
  if (res.ok) {
    if (res.needsEmailConfirmation) {
      errorMsg.value = ''
      successMsg.value = '注册成功，请到邮箱查收确认邮件，确认后再登录'
      password.value = ''
      return
    }
    emit('close')
    return
  }
  errorMsg.value = getAuthErrorMessage(res.error) || (isRegister.value ? '注册失败，请重试' : '登录失败，请重试')
}

async function handleSendOtp() {
  const mail = email.value.trim()
  if (!mail || otpSending.value || otpCountdown.value > 0) return
  errorMsg.value = ''
  successMsg.value = ''
  otpSending.value = true
  const res = await sendLoginOtp(mail)
  otpSending.value = false
  if (res.ok) {
    successMsg.value = '验证码已发送，请查收邮箱'
    otpCountdown.value = 60
    if (otpTimer) clearInterval(otpTimer)
    otpTimer = setInterval(() => {
      if (otpCountdown.value <= 1) {
        clearInterval(otpTimer)
        otpTimer = null
        otpCountdown.value = 0
      } else {
        otpCountdown.value -= 1
      }
    }, 1000)
  } else {
    errorMsg.value = getAuthErrorMessage(res.error) || '验证码发送失败，请稍后重试'
  }
}

async function handleSubmitOtp() {
  if (!canSubmitOtp.value || loading.value) return
  errorMsg.value = ''
  successMsg.value = ''
  loading.value = true
  const res = await verifyLoginOtp(email.value.trim(), otpCode.value.trim())
  loading.value = false
  if (res.ok) {
    emit('close')
    return
  }
  errorMsg.value = getAuthErrorMessage(res.error) || '验证码错误或已过期，请重试'
}

function handleGuest() {
  setGuestMode()
  emit('close')
}
</script>

<template>
  <div id="login-overlay" class="login-overlay">
    <div
      class="login-overlay-backdrop"
      aria-hidden="true"
      @click="dismissible && $emit('close')"
    />
    <div class="login-overlay-card">
      <div class="login-overlay-card-head">
        <h2 class="login-overlay-title">欢迎使用 · 中药材百科</h2>
        <button
          v-if="dismissible"
          type="button"
          class="login-overlay-close"
          aria-label="关闭"
          @click="$emit('close')"
        >
          <X class="w-5 h-5" />
        </button>
      </div>
      <p class="login-overlay-desc">登录后可同步您的咨询记录</p>

      <div class="login-overlay-toggle">
        <button
          type="button"
          :class="['login-overlay-tab', { active: !isOtpMode && !isRegister }]"
          @click="switchToPassword(); isRegister = false"
        >
          密码登录
        </button>
        <button
          type="button"
          :class="['login-overlay-tab', { active: !isOtpMode && isRegister }]"
          @click="switchToPassword(); isRegister = true"
        >
          注册
        </button>
        <button
          type="button"
          :class="['login-overlay-tab', { active: isOtpMode }]"
          @click="switchToOtp"
        >
          验证码登录
        </button>
      </div>

      <!-- 密码登录 / 注册 -->
      <form v-if="!isOtpMode" class="login-overlay-form" @submit.prevent="handleSubmitPassword">
        <input
          v-model="email"
          type="email"
          placeholder="邮箱"
          class="login-overlay-input"
          autocomplete="email"
        />
        <input
          v-model="password"
          type="password"
          placeholder="密码（至少 6 位）"
          class="login-overlay-input"
          :autocomplete="isRegister ? 'new-password' : 'current-password'"
        />
        <p v-if="errorMsg" class="login-overlay-error">{{ errorMsg }}</p>
        <p
          v-else-if="successMsg"
          class="login-overlay-success"
        >
          {{ successMsg }}
        </p>
        <p
          v-else-if="password && password.length > 0 && password.length < 6"
          class="login-overlay-error"
        >
          密码长度不能少于 6 位
        </p>
        <button
          type="submit"
          class="login-overlay-btn-primary"
          :disabled="!canSubmitPassword || loading"
        >
          {{ loading ? '处理中…' : (isRegister ? '注册' : '登录') }}
        </button>
      </form>

      <!-- 验证码登录 -->
      <form v-else class="login-overlay-form" @submit.prevent="handleSubmitOtp">
        <input
          v-model="email"
          type="email"
          placeholder="邮箱"
          class="login-overlay-input"
          autocomplete="email"
        />
        <div class="flex gap-2">
          <input
            v-model="otpCode"
            type="text"
            placeholder="邮箱验证码"
            class="login-overlay-input flex-1"
          />
          <button
            type="button"
            class="login-overlay-btn-primary px-3"
            :disabled="!email.trim() || otpSending || otpCountdown > 0"
            @click="handleSendOtp"
          >
            {{ otpCountdown > 0 ? otpCountdown + ' 秒' : '获取验证码' }}
          </button>
        </div>
        <p v-if="errorMsg" class="login-overlay-error">{{ errorMsg }}</p>
        <p v-else-if="successMsg" class="login-overlay-success">{{ successMsg }}</p>
        <button
          type="submit"
          class="login-overlay-btn-primary"
          :disabled="!canSubmitOtp || loading"
        >
          {{ loading ? '验证中…' : '登录' }}
        </button>
      </form>

      <button type="button" class="login-overlay-guest" @click="handleGuest">
        以游客身份试用 (Guest Mode)
      </button>
    </div>
  </div>
</template>

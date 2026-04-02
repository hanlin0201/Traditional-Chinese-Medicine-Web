<script setup>
import { ref, computed, nextTick, onUnmounted } from 'vue'
import { X } from 'lucide-vue-next'
import { useAuth } from '@/composables/useAuth'
import { getAuthErrorMessage } from '@/auth'
import { normalizeLoginEmail } from '@/utils/loginEmail'
import { SITE_SHORT_NAME } from '@/constants/branding'

const props = defineProps({ dismissible: { type: Boolean, default: false } })
const emit = defineEmits(['close'])

// 公用字段
const email = ref('')
const loading = ref(false)
const errorMsg = ref('')
const successMsg = ref('')

// 密码登录
const password = ref('')

// 验证码登录
const isOtpMode = ref(false)
const otpCode = ref('')
const otpSending = ref(false)
const otpCountdown = ref(0)
let otpTimer = null

// 独立注册弹层
const showRegisterModal = ref(false)
const registerEmail = ref('')
const registerPassword = ref('')
const registerUsername = ref('')
const registerLoading = ref(false)
const registerError = ref('')
const registerSuccess = ref('')

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
  password.value = ''
  errorMsg.value = ''
  successMsg.value = ''
}

async function handleSubmitPassword() {
  if (!canSubmitPassword.value || loading.value) return
  errorMsg.value = ''
  successMsg.value = ''
  loading.value = true
  const mail = normalizeLoginEmail(email.value)
  const res = await handleLogin(mail, password.value)
  loading.value = false
  if (res.ok) {
    emit('close')
    return
  }
  errorMsg.value = getAuthErrorMessage(res.error) || '登录失败，请重试'
}

async function handleSendOtp() {
  const mail = normalizeLoginEmail(email.value)
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
  const res = await verifyLoginOtp(normalizeLoginEmail(email.value), otpCode.value.trim())
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

function openRegisterModal() {
  showRegisterModal.value = true
  registerEmail.value = normalizeLoginEmail(email.value)
  registerPassword.value = ''
  registerUsername.value = ''
  registerLoading.value = false
  registerError.value = ''
  registerSuccess.value = ''
}

function closeRegisterModal() {
  showRegisterModal.value = false
  registerLoading.value = false
  registerError.value = ''
  registerSuccess.value = ''
}

async function handleSubmitRegister() {
  if (registerLoading.value) return
  const mail = normalizeLoginEmail(registerEmail.value)
  const nextPassword = registerPassword.value
  const nextUsername = String(registerUsername.value || '').trim()
  if (!mail) {
    registerError.value = '请先填写邮箱'
    return
  }
  if (!nextPassword || nextPassword.length < 6) {
    registerError.value = '密码长度不能少于 6 位'
    return
  }
  if (!nextUsername) {
    registerError.value = '请填写昵称'
    return
  }
  registerLoading.value = true
  registerError.value = ''
  registerSuccess.value = ''
  const res = await handleRegister(mail, nextPassword, nextUsername)
  registerLoading.value = false
  if (!res.ok) {
    const msg = getAuthErrorMessage(res.error) || '注册失败，请重试'
    registerError.value = msg.includes('已注册') ? '该邮箱已注册，请直接登录' : msg
    return
  }
  if (res.needsEmailConfirmation) {
    registerSuccess.value = '注册成功，请先到邮箱完成确认后再登录'
  } else {
    registerSuccess.value = '注册成功'
  }
  successMsg.value = registerSuccess.value
  closeRegisterModal()
  emit('close')
}

/** 测试管理员：请在 Supabase 创建用户 123456@tcm.local / 密码 123456 */
async function handleAdminQuickLogin() {
  isOtpMode.value = false
  email.value = '123456'
  password.value = '123456'
  errorMsg.value = ''
  successMsg.value = ''
  await nextTick()
  await handleSubmitPassword()
}

onUnmounted(() => {
  if (otpTimer) {
    clearInterval(otpTimer)
    otpTimer = null
  }
})
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
        <h2 class="login-overlay-title">欢迎使用 · {{ SITE_SHORT_NAME }}</h2>
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
          :class="['login-overlay-tab', { active: !isOtpMode }]"
          @click="switchToPassword"
        >
          密码登录
        </button>
        <button
          type="button"
          :class="['login-overlay-tab', { active: isOtpMode }]"
          @click="switchToOtp"
        >
          验证码登录
        </button>
      </div>

      <!-- 密码登录 -->
      <form v-if="!isOtpMode" class="login-overlay-form" @submit.prevent="handleSubmitPassword">
        <input
          v-model="email"
          type="text"
          placeholder="邮箱，或账号（如 123456 → 123456@tcm.local）"
          class="login-overlay-input"
          autocomplete="username"
        />
        <input
          v-model="password"
          type="password"
          placeholder="密码（至少 6 位）"
          class="login-overlay-input"
          autocomplete="current-password"
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
          {{ loading ? '处理中…' : '登录' }}
        </button>
      </form>

      <!-- 验证码登录 -->
      <form v-else class="login-overlay-form" @submit.prevent="handleSubmitOtp">
        <input
          v-model="email"
          type="text"
          placeholder="邮箱（验证码登录需真实可收信邮箱）"
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

      <button type="button" class="login-overlay-admin-link" @click="openRegisterModal">
        没有账号？立即注册
      </button>

      <button type="button" class="login-overlay-guest" @click="handleGuest">
        以游客身份试用 (Guest Mode)
      </button>

      <button
        type="button"
        class="login-overlay-admin-link"
        @click="handleAdminQuickLogin"
      >
        管理员登录（测试）
      </button>
    </div>

    <div v-if="showRegisterModal" class="login-overlay register-modal-overlay" @click="closeRegisterModal">
      <div class="login-overlay-card register-modal-card" @click.stop>
        <div class="login-overlay-card-head">
          <h3 class="login-overlay-title">立即注册</h3>
          <button type="button" class="login-overlay-close" aria-label="关闭" @click="closeRegisterModal">
            <X class="w-5 h-5" />
          </button>
        </div>
        <p class="login-overlay-desc">完成注册后可同步你的账号数据</p>

        <form class="login-overlay-form" @submit.prevent="handleSubmitRegister">
          <input
            v-model="registerEmail"
            type="text"
            placeholder="邮箱（用于账号登录）"
            class="login-overlay-input"
            autocomplete="email"
          />
          <input
            v-model="registerPassword"
            type="password"
            placeholder="设置密码（至少 6 位）"
            class="login-overlay-input"
            autocomplete="new-password"
          />
          <input
            v-model="registerUsername"
            type="text"
            placeholder="设置昵称"
            class="login-overlay-input"
            maxlength="32"
            autocomplete="nickname"
          />
          <p v-if="registerError" class="login-overlay-error">{{ registerError }}</p>
          <p v-else-if="registerSuccess" class="login-overlay-success">{{ registerSuccess }}</p>
          <button
            type="submit"
            class="login-overlay-btn-primary"
            :disabled="registerLoading || !registerEmail.trim() || registerPassword.length < 6 || !registerUsername.trim()"
          >
            {{ registerLoading ? '注册中…' : '完成注册' }}
          </button>
        </form>
      </div>
    </div>
  </div>
</template>

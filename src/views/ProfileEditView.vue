<script setup>
defineOptions({ name: 'ProfileEdit' })

import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Camera, ArrowLeft } from 'lucide-vue-next'
import { useAuth } from '@/composables/useAuth'

const router = useRouter()
const { user, profile, updateProfile, fetchProfile } = useAuth()

const username = ref('')
const bio = ref('')
const avatar_url = ref('')
const fileInput = ref(null)
const saving = ref(false)
const errorMsg = ref('')

onMounted(async () => {
  if (!user.value) {
    router.replace('/')
    return
  }
  await fetchProfile()
  if (profile.value) {
    username.value = profile.value.username ?? ''
    bio.value = profile.value.bio ?? ''
    avatar_url.value = profile.value.avatar_url ?? ''
  }
})

function triggerFileInput() {
  fileInput.value?.click()
}

function handleFileChange(event) {
  const file = event.target.files?.[0]
  if (!file) return
  if (file.size > 1024 * 1024) {
    errorMsg.value = '图片太大，请选择小于 1MB 的图片'
    return
  }
  errorMsg.value = ''
  const reader = new FileReader()
  reader.onload = (e) => {
    avatar_url.value = e.target.result || ''
  }
  reader.readAsDataURL(file)
}

async function handleSubmit() {
  const name = username.value?.trim()
  if (!name) {
    errorMsg.value = '请填写昵称'
    return
  }
  errorMsg.value = ''
  saving.value = true
  const res = await updateProfile({
    username: name,
    bio: bio.value ?? '',
    avatar_url: avatar_url.value ?? '',
  })
  saving.value = false
  if (res.ok) {
    window.dispatchEvent(new Event('profile-updated'))
    router.push('/profile')
  } else {
    errorMsg.value = '保存失败，请重试'
  }
}

function goBack() {
  router.push('/profile')
}
</script>

<template>
  <div class="min-h-screen bg-[#FDFBF7] pb-24">
    <header class="sticky top-0 z-30 bg-[#A9805B] text-white shadow-md">
      <div class="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
        <button type="button" class="p-2 -ml-2 rounded-lg hover:bg-white/10 flex items-center gap-1" @click="goBack" aria-label="返回">
          <ArrowLeft class="w-5 h-5" />
          <span class="text-sm font-medium">返回</span>
        </button>
        <h1 class="text-lg font-bold tracking-wide">编辑资料</h1>
        <div class="w-16" />
      </div>
    </header>

    <main class="max-w-2xl mx-auto px-4 py-6">
      <form class="space-y-6" @submit.prevent="handleSubmit">
        <div class="bg-white rounded-xl shadow-card border border-sandalwood/10 p-6">
          <label class="block text-sm font-medium text-stone-600 mb-3">头像</label>
          <input ref="fileInput" type="file" accept="image/*" class="hidden" @change="handleFileChange" />
          <div
            class="w-24 h-24 rounded-full bg-stone-100 flex items-center justify-center border-2 border-dashed border-stone-200 cursor-pointer overflow-hidden hover:border-[#A9805B] transition-colors"
            @click="triggerFileInput"
          >
            <img v-if="avatar_url" :src="avatar_url" class="w-full h-full object-cover" alt="头像" />
            <Camera v-else class="w-10 h-10 text-stone-400" />
          </div>
          <p class="text-xs text-stone-400 mt-2">点击上传，建议小于 1MB</p>
        </div>

        <div class="bg-white rounded-xl shadow-card border border-sandalwood/10 p-6">
          <label class="block text-sm font-medium text-stone-600 mb-2">昵称 <span class="text-red-500">*</span></label>
          <input
            v-model="username"
            type="text"
            maxlength="32"
            placeholder="请输入昵称"
            class="w-full px-4 py-3 rounded-lg border border-stone-200 bg-[#FDFBF7] outline-none focus:border-[#A9805B] focus:ring-1 focus:ring-[#A9805B]/30"
          />
        </div>

        <div class="bg-white rounded-xl shadow-card border border-sandalwood/10 p-6">
          <label class="block text-sm font-medium text-stone-600 mb-2">个人简介 / 签名</label>
          <textarea
            v-model="bio"
            rows="4"
            maxlength="200"
            placeholder="写一句简介，记录你的养生心得..."
            class="w-full px-4 py-3 rounded-lg border border-stone-200 bg-[#FDFBF7] outline-none resize-none focus:border-[#A9805B] focus:ring-1 focus:ring-[#A9805B]/30"
          />
          <p class="text-xs text-stone-400 mt-1">{{ (bio || '').length }}/200</p>
        </div>

        <p v-if="errorMsg" class="text-sm text-red-600">{{ errorMsg }}</p>

        <button
          type="submit"
          :disabled="saving"
          class="w-full py-3 rounded-xl bg-[#A9805B] text-white font-medium shadow-md hover:bg-[#8B6B4A] disabled:opacity-60 transition-colors"
        >
          {{ saving ? '保存中…' : '保存' }}
        </button>
      </form>
    </main>
  </div>
</template>

<style scoped>
.shadow-card {
  box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.05);
}
.border-sandalwood\/10 {
  border-color: rgba(169, 128, 91, 0.1);
}
</style>

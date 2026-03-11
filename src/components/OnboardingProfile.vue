<script setup>
import { ref, onMounted } from 'vue'
import { Camera } from 'lucide-vue-next'
import { useAuth } from '@/composables/useAuth'

const { user, profile, updateProfile, fetchProfile } = useAuth()

const username = ref('')
const bio = ref('')
const avatar_url = ref('')
const fileInput = ref(null)
const saving = ref(false)
const errorMsg = ref('')

onMounted(async () => {
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
    // profile 会由 updateProfile 内部刷新，App 中 showOnboarding 变为 false，本组件自动隐藏
  } else {
    errorMsg.value = '保存失败，请重试'
  }
}
</script>

<template>
  <div class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-stone-900/80 backdrop-blur-sm">
    <div class="bg-[#FDFBF7] rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-stone-200">
      <div class="bg-[#A9805B] text-white px-6 py-5 text-center">
        <h2 class="text-xl font-bold tracking-wide">完善个人资料</h2>
        <p class="text-white/90 text-sm mt-1">设置昵称与头像，即可开始使用</p>
      </div>
      <form class="p-6 space-y-5" @submit.prevent="handleSubmit">
        <div>
          <label class="block text-sm font-medium text-stone-600 mb-2">昵称 <span class="text-red-500">*</span></label>
          <input
            v-model="username"
            type="text"
            maxlength="32"
            placeholder="请输入昵称"
            class="w-full px-4 py-3 rounded-lg border border-stone-200 bg-white outline-none focus:border-[#A9805B] focus:ring-1 focus:ring-[#A9805B]/30"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-stone-600 mb-2">头像（可选）</label>
          <input ref="fileInput" type="file" accept="image/*" class="hidden" @change="handleFileChange" />
          <div
            class="w-20 h-20 rounded-full bg-stone-100 flex items-center justify-center border-2 border-dashed border-stone-200 cursor-pointer overflow-hidden mx-auto hover:border-[#A9805B] transition-colors"
            @click="triggerFileInput"
          >
            <img v-if="avatar_url" :src="avatar_url" class="w-full h-full object-cover" alt="头像" />
            <Camera v-else class="w-8 h-8 text-stone-400" />
          </div>
        </div>
        <div>
          <label class="block text-sm font-medium text-stone-600 mb-2">个人简介（可选）</label>
          <textarea
            v-model="bio"
            rows="3"
            maxlength="200"
            placeholder="写一句简介..."
            class="w-full px-4 py-3 rounded-lg border border-stone-200 bg-white outline-none resize-none focus:border-[#A9805B] focus:ring-1 focus:ring-[#A9805B]/30"
          />
        </div>
        <p v-if="errorMsg" class="text-sm text-red-600">{{ errorMsg }}</p>
        <button
          type="submit"
          :disabled="saving"
          class="w-full py-3 rounded-xl bg-[#A9805B] text-white font-medium shadow-md hover:bg-[#8B6B4A] disabled:opacity-60 transition-colors"
        >
          {{ saving ? '保存中…' : '完成' }}
        </button>
      </form>
    </div>
  </div>
</template>

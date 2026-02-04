<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import AiCompanion from '@/components/AiCompanion.vue'
import LoginOverlay from '@/components/LoginOverlay.vue'
import NavBar from '@/components/NavBar.vue'
import { useAuth } from '@/composables/useAuth'

const router = useRouter()
const route = useRoute()
const { user, gatePassed } = useAuth()

const forceShowLogin = ref(false)
const showLoginOverlay = computed(() => !gatePassed.value || forceShowLogin.value)

// 是否显示导航栏（门户页面不显示，让门户页面自己全屏展示）
const showNavBar = computed(() => {
  return gatePassed.value && route.path !== '/portal'
})

function handleRequestLogin() {
  forceShowLogin.value = true
}

onMounted(() => {
  window.addEventListener('request-login', handleRequestLogin)
})

onUnmounted(() => {
  window.removeEventListener('request-login', handleRequestLogin)
})
</script>

<template>
  <div class="min-h-screen bg-paper">
    <!-- 顶部导航栏 -->
    <NavBar v-if="showNavBar" />
    
    <RouterView />
    <AiCompanion />

    <!-- 门禁 / 从头像打开的登录 -->
    <LoginOverlay
      v-if="showLoginOverlay"
      :dismissible="gatePassed"
      @close="forceShowLogin = false"
    />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
// 引入你需要用到的图标
import { User, Home, BookOpen, UtensilsCrossed, Activity } from 'lucide-vue-next'
import AiCompanion from '@/components/AiCompanion.vue'
import LoginOverlay from '@/components/LoginOverlay.vue'
import { useAuth } from '@/composables/useAuth'

const router = useRouter()
// 保持你原有的登录逻辑不变
const { user, gatePassed } = useAuth()

const forceShowLogin = ref(false)
// 计算属性：决定是否显示全屏登录/门禁遮罩
const showLoginOverlay = computed(() => !gatePassed.value || forceShowLogin.value)

// 打开登录面板或跳转个人中心的逻辑
function openAuthPanel() {
  if (user.value) {
    router.push('/profile')
  } else {
    forceShowLogin.value = true
  }
}
</script>

<template>
  <div class="min-h-screen bg-paper font-sans text-stone-800">
    
    <nav v-if="gatePassed" class="sticky top-0 z-40 bg-[#f4f1ea]/90 backdrop-blur-md border-b border-stone-200 shadow-sm transition-all duration-500">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between h-16 items-center">
          
          <div class="flex-shrink-0 flex items-center gap-2 cursor-pointer" @click="router.push('/')">
            <span class="text-2xl">🌿</span>
            <span class="font-bold text-xl text-emerald-900 tracking-wider">药材百科</span>
          </div>

          <div class="hidden md:flex space-x-8">
            <router-link to="/" active-class="text-emerald-700 font-bold bg-emerald-50" class="flex items-center gap-1 px-3 py-2 rounded-lg text-stone-600 hover:text-emerald-600 hover:bg-white transition-all">
              <Home :size="18" /> 首页
            </router-link>
            
            <router-link to="/herbs" active-class="text-emerald-700 font-bold bg-emerald-50" class="flex items-center gap-1 px-3 py-2 rounded-lg text-stone-600 hover:text-emerald-600 hover:bg-white transition-all">
              <BookOpen :size="18" /> 药材介绍
            </router-link>

            <router-link to="/recipes" active-class="text-emerald-700 font-bold bg-emerald-50" class="flex items-center gap-1 px-3 py-2 rounded-lg text-stone-600 hover:text-emerald-600 hover:bg-white transition-all">
              <UtensilsCrossed :size="18" /> 食谱推荐
            </router-link>

            <router-link to="/acupoints" active-class="text-emerald-700 font-bold bg-emerald-50" class="flex items-center gap-1 px-3 py-2 rounded-lg text-stone-600 hover:text-emerald-600 hover:bg-white transition-all">
              <Activity :size="18" /> 穴位导航
            </router-link>
          </div>

          <div class="flex items-center">
            <button 
              @click="openAuthPanel"
              class="flex items-center gap-2 px-4 py-1.5 rounded-full border border-stone-300 hover:border-emerald-500 hover:text-emerald-700 hover:bg-white transition-all bg-stone-50"
            >
              <User :size="18" />
              <span class="text-sm font-medium">{{ user ? '个人中心' : '登录 / 注册' }}</span>
            </button>
          </div>

        </div>
      </div>
    </nav>

    <main class="relative z-0">
      <RouterView v-slot="{ Component }">
        <KeepAlive include="RecipeMarket">
          <component :is="Component" />
        </KeepAlive>
      </RouterView>
    </main>

    <AiCompanion />

    <LoginOverlay
      v-if="showLoginOverlay"
      :dismissible="gatePassed"
      @close="forceShowLogin = false"
    />

  </div>
</template>

<style scoped>
/* 页面切换动画：淡入淡出 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* 针对移动端的简单适配（隐藏中间菜单，只留Logo和个人中心） */
/* 如果你想做汉堡菜单，可以后续再加 */
@media (max-width: 768px) {
  nav .hidden {
    display: none;
  }
}
</style>
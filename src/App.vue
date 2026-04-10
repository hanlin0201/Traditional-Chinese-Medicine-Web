<script setup>
import { ref, computed, watch, provide } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { User, Home, BookOpen, UtensilsCrossed, Activity, Info } from 'lucide-vue-next'
import AiCompanion from '@/components/AiCompanion.vue'
import LoginOverlay from '@/components/LoginOverlay.vue'
import { useAuth } from '@/composables/useAuth'
import { SITE_SHORT_NAME, SITE_FULL_NAME, FEATURE_COPY } from '@/constants/branding'

const router = useRouter()
const route = useRoute()
const { user, profile, gatePassed } = useAuth()
const forceShowLogin = ref(false)
const showLoginOverlay = computed(() => !gatePassed.value || forceShowLogin.value)
watch(() => route.query.login, (v) => {
  if (v === '1') forceShowLogin.value = true
}, { immediate: true })

const isHomeRoute = computed(() => route.path === '/')

/** 与 DynastyDetailView 全屏朝代 id 一致：这些页顶栏移出视口，main 勿加顶栏占位 */
const DYNASTY_FULLSCREEN_IDS = new Set([
  'shanggu', 'chunqiu', 'qinhan', 'donghan', 'liangjin', 'tang', 'song',
  'ming', 'qing', 'xiandai', 'dangxia',
])

/** 非首页、非全屏朝代详情：内容区需为固定顶栏留出高度（与 nav min-h-[4.5rem] 一致） */
const mainNavPadClass = computed(() => {
  if (!gatePassed.value) return ''
  if (isHomeRoute.value) return ''
  if (route.name === 'DynastyDetail' && DYNASTY_FULLSCREEN_IDS.has(String(route.params.id ?? ''))) return ''
  return 'main-with-fixed-nav'
})

// 首页为整屏 fixed 翻屏：锁住文档与根节点高度，避免从其它页切回时仍出现右侧系统滚动条
watch(
  isHomeRoute,
  (on) => {
    if (typeof document === 'undefined') return
    document.documentElement.classList.toggle('home-no-doc-scroll', on)
    document.body.classList.toggle('home-no-doc-scroll', on)
    if (on) {
      requestAnimationFrame(() => {
        window.scrollTo(0, 0)
        document.documentElement.scrollTop = 0
        document.body.scrollTop = 0
      })
    }
  },
  { immediate: true },
)

// 已登录且展示全局顶栏时：非首页页面与首页一致抑制文档纵向橡皮筋，避免 fixed 顶栏上方露出背景
watch(
  () => gatePassed.value,
  (on) => {
    if (typeof document === 'undefined') return
    document.documentElement.classList.toggle('app-logged-in-shell', on)
    document.body.classList.toggle('app-logged-in-shell', on)
  },
  { immediate: true },
)

function openAuthPanel() {
  if (user.value) { router.push('/profile') } else { forceShowLogin.value = true }
}

const aiCompanionRef = ref(null)
function openAiCompanion() {
  aiCompanionRef.value?.openPanel?.()
}
provide('openAiCompanion', openAiCompanion)
</script>

<template>
  <div
    class="bg-paper font-sans text-stone-800"
    :class="isHomeRoute ? 'h-screen min-h-0 overflow-hidden' : 'min-h-screen'"
  >
    
    <nav
      v-if="gatePassed"
      class="main-nav fixed top-0 left-0 right-0 z-40 w-full max-w-none bg-[#f4f1ea] backdrop-blur-md border-b border-stone-200 shadow-sm transition-transform duration-500 ease-in-out"
    >
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between min-h-[4.5rem] h-[4.5rem] items-center">
          <div class="flex-shrink-0 flex items-center gap-2.5 cursor-pointer" @click="router.push('/')">
            <span class="text-[1.65rem] leading-none">🌿</span>
            <span class="font-['Ma_Shan_Zheng',cursive] text-[1.35rem] sm:text-2xl text-stone-800 tracking-[0.12em]">{{ SITE_SHORT_NAME }}</span>
          </div>

          <div class="hidden md:flex md:items-stretch gap-4 lg:gap-7">
            <router-link to="/" :title="SITE_FULL_NAME" active-class="text-emerald-800 bg-emerald-50/90" class="flex items-center gap-2 px-2.5 py-2.5 rounded-lg text-stone-600 hover:text-emerald-800 hover:bg-white transition-all">
              <Home :size="20" class="shrink-0" />
              <span class="flex flex-col leading-snug"><span class="font-['Ma_Shan_Zheng',cursive] text-[1rem] tracking-wide">首页</span><span class="font-['Ma_Shan_Zheng',cursive] text-[11px] sm:text-xs text-stone-500 tracking-wide max-w-[7.5rem] truncate">{{ SITE_SHORT_NAME }}</span></span>
            </router-link>
            <router-link to="/herbs" :title="FEATURE_COPY.herbs.motto" active-class="text-emerald-800 bg-emerald-50/90" class="flex items-center gap-2 px-2.5 py-2.5 rounded-lg text-stone-600 hover:text-emerald-800 hover:bg-white transition-all">
              <BookOpen :size="20" class="shrink-0" />
              <span class="flex flex-col leading-snug"><span class="font-['Ma_Shan_Zheng',cursive] text-[1rem] tracking-wide">{{ FEATURE_COPY.herbs.title }}</span><span class="font-['Ma_Shan_Zheng',cursive] text-[11px] sm:text-xs text-stone-500">{{ FEATURE_COPY.herbs.motto }}</span></span>
            </router-link>
            <router-link to="/recipes" :title="FEATURE_COPY.recipes.motto" active-class="text-emerald-800 bg-emerald-50/90" class="flex items-center gap-2 px-2.5 py-2.5 rounded-lg text-stone-600 hover:text-emerald-800 hover:bg-white transition-all">
              <UtensilsCrossed :size="20" class="shrink-0" />
              <span class="flex flex-col leading-snug"><span class="font-['Ma_Shan_Zheng',cursive] text-[1rem] tracking-wide">{{ FEATURE_COPY.recipes.title }}</span><span class="font-['Ma_Shan_Zheng',cursive] text-[11px] sm:text-xs text-stone-500">{{ FEATURE_COPY.recipes.motto }}</span></span>
            </router-link>
            <router-link to="/acupoints" :title="FEATURE_COPY.acupoints.motto" active-class="text-emerald-800 bg-emerald-50/90" class="flex items-center gap-2 px-2.5 py-2.5 rounded-lg text-stone-600 hover:text-emerald-800 hover:bg-white transition-all">
              <Activity :size="20" class="shrink-0" />
              <span class="flex flex-col leading-snug"><span class="font-['Ma_Shan_Zheng',cursive] text-[1rem] tracking-wide">{{ FEATURE_COPY.acupoints.title }}</span><span class="font-['Ma_Shan_Zheng',cursive] text-[11px] sm:text-xs text-stone-500">{{ FEATURE_COPY.acupoints.motto }}</span></span>
            </router-link>
          </div>

          <div class="flex items-center gap-2 sm:gap-3">
            <router-link
              to="/about"
              class="flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-stone-600 hover:text-emerald-800 hover:bg-white/90 text-sm font-medium shrink-0"
              active-class="text-emerald-800 bg-emerald-50/90"
            >
              <Info :size="18" class="shrink-0 md:hidden" />
              <span class="hidden sm:inline">关于本站</span>
              <span class="sm:hidden">关于</span>
            </router-link>
            <button @click="openAuthPanel" class="flex items-center gap-2 px-4 sm:px-5 py-2 rounded-full border border-stone-300 hover:border-emerald-500 hover:text-emerald-700 hover:bg-white transition-all bg-stone-50">
              <User :size="20" />
              <span class="text-[0.9375rem] font-medium">{{ user ? '个人中心' : '登录 / 注册' }}</span>
            </button>
          </div>
        </div>
      </div>
    </nav>

    <main class="relative z-0" :class="mainNavPadClass">
      <RouterView v-slot="{ Component }">
        <KeepAlive include="RecipeMarket,HomeView">
          <component :is="Component" />
        </KeepAlive>
      </RouterView>
    </main>

    <AiCompanion ref="aiCompanionRef" />
    <LoginOverlay v-if="showLoginOverlay" :dismissible="gatePassed" @close="forceShowLogin = false" />
  </div>
</template>

<style>
/* 首页：禁止 html/body 出现纵向滚动条（内容在 MenuIndexView 内自洽滚动） */
html.home-no-doc-scroll {
  height: 100%;
  overflow: hidden;
  overscroll-behavior: none;
}
body.home-no-doc-scroll {
  height: 100%;
  max-height: 100vh;
  overflow: hidden !important;
  overscroll-behavior: none;
}
body.home-no-doc-scroll #app {
  height: 100%;
  max-height: 100vh;
  overflow: hidden;
}

/* 已登录、非首页：禁止文档级纵向 overscroll（首页由 .home-no-doc-scroll 处理；全屏朝代由 body 自身 overflow 处理） */
html.app-logged-in-shell:not(.home-no-doc-scroll) {
  overscroll-behavior-y: none;
}
body.app-logged-in-shell:not(.home-no-doc-scroll):not(.dynasty-fullscreen) {
  overscroll-behavior-y: none;
}

/* 当 body 拥有 hide-global-nav 类时，隐藏导航栏 */
body.hide-global-nav .main-nav {
  transform: translateY(-100%);
}

/* 上古朝代详情全屏：顶栏移出文档流 + 整页严格 100vh，消除顶端空白与滚动条 */
body.dynasty-fullscreen {
  overflow: hidden;
  height: 100vh;
}
/* 顶栏改为 fixed 并移出视口，不再占位，main 才能从视口顶部开始 */
body.dynasty-fullscreen .main-nav {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  transform: translateY(-100%);
}
/* 根节点与 App 根 div 严格 100vh，内容从顶部起全屏 */
body.dynasty-fullscreen #app,
body.dynasty-fullscreen #app > div {
  height: 100vh;
  min-height: 100vh;
  overflow: hidden;
}
body.dynasty-fullscreen #app > div main {
  height: 100%;
  min-height: 0;
}

/* 固定顶栏后：普通页面 main 预留导航高度（首页 / 全屏朝代由模板 class 排除） */
.main-with-fixed-nav {
  padding-top: 4.5rem;
}
</style>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

@media (max-width: 768px) {
  nav .hidden { display: none; }
}
</style>
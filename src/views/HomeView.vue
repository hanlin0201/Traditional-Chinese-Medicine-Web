<script setup>
defineOptions({ name: 'HomeView' })

import { ref, computed, onMounted, onActivated, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Search, Loader2, ArrowLeft, Filter, ChevronDown, X } from 'lucide-vue-next'
import { pinyin } from 'pinyin-pro'
import HerbCard from '@/components/HerbCard.vue'
import { useHerbList } from '@/composables/useHerbData'
import { ALL_DETAIL_EFFECTS } from '@/composables/useHerbTags'

const router = useRouter()

// ==========================================
// 1. 数据配置 (保留全量功能)
// ==========================================

const CATEGORY_TAGS = ['全部', '根茎类', '果实/种子类', '全草类', '花类', '藤木类', '动物类', '枝叶/树皮类', '菌藻类', '矿物类', '其他']
const LETTER_TAGS = ['全部', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'W', 'X', 'Y', 'Z']
const EFFECT_TAGS = ['全部', ...ALL_DETAIL_EFFECTS]

// ==========================================
// 2. 核心逻辑
// ==========================================

const { herbs, loading, error, load, loadMore, hasMore, loadingMore, loadAll } = useHerbList()

const keyword = ref('')
const activeTag = ref('全部')              // 类别 / A-Z 使用
const activeEffectTags = ref([])           // 功效多选
const filterMode = ref('category') // 'category' | 'letter' | 'effect'
const showFilterPanel = ref(false)
const sentinelRef = ref(null)
let _observer = null

const currentTags = computed(() => {
  if (filterMode.value === 'category') return CATEGORY_TAGS
  if (filterMode.value === 'letter') return LETTER_TAGS
  return EFFECT_TAGS
})

function hasActiveFilters() {
  return (
    keyword.value.trim() !== '' ||
    activeTag.value !== '全部' ||
    (filterMode.value === 'effect' && activeEffectTags.value.length > 0)
  )
}

function clearAllFilters() {
  keyword.value = ''
  activeTag.value = '全部'
  activeEffectTags.value = []
  showFilterPanel.value = true
}

const filteredHerbs = computed(() => {
  let list = herbs.value
  // 1. 搜索过滤
  if (keyword.value.trim()) {
    const k = keyword.value.trim().toLowerCase()
    list = list.filter(h =>
      (h.name || '').toLowerCase().includes(k) ||
      (h.namePinyin || h.name_pinyin || '').toLowerCase().includes(k) ||
      (h.classification || '').toLowerCase().includes(k) ||
      (h.tags || []).some(t => String(t).toLowerCase().includes(k))
    )
  }
  // 2. 标签过滤（首字母已在数据层预计算，避免重复 pinyin 调用）
  if (filterMode.value === 'category' && activeTag.value !== '全部') {
    list = list.filter(h =>
      (h.tags || []).includes(activeTag.value) ||
      (h.classification || '').includes(activeTag.value)
    )
  } else if (filterMode.value === 'letter' && activeTag.value !== '全部') {
    list = list.filter(h => (h.firstLetter || '#') === activeTag.value)
  } else if (filterMode.value === 'effect' && activeEffectTags.value.length) {
    const selected = activeEffectTags.value
    list = list.filter(h => {
      const effects = h.detailEffects || []
      // 叠加条件：需同时包含所有已选功效
      return selected.every(t => effects.includes(t))
    })
  }
  return list
})

function switchFilterMode(mode) {
  if (filterMode.value === mode) return
  filterMode.value = mode
  activeTag.value = '全部' // 切换模式重置选中
  if (mode !== 'effect') {
    activeEffectTags.value = []
  }
}

function toggleEffectTag(tag) {
  if (tag === '全部') {
    activeEffectTags.value = []
    return
  }
  const current = activeEffectTags.value
  if (current.includes(tag)) {
    activeEffectTags.value = current.filter(t => t !== tag)
  } else {
    activeEffectTags.value = [...current, tag]
  }
}

// ==========================================
// 3. 抽屉打开动画 + 跳转
// ==========================================
const openingHerb = ref(null)

const goToDetail = (herb) => {
  // 如果已经在动画中，忽略
  if (openingHerb.value) return

  // 触发抽屉拉开动画
  openingHerb.value = herb.name

  // 动画结束后跳转
  setTimeout(() => {
    router.push({
      name: 'HerbDetail',
      params: { name: herb.name },
      state: { preloadHerb: JSON.parse(JSON.stringify(herb)) }
    })
    // 跳转后重置状态（用于浏览器返回时）
    setTimeout(() => { openingHerb.value = null }, 100)
  }, 450)
}

// 当切换到 A-Z / 功效 模式或输入搜索关键词时，自动加载全量数据
watch([filterMode, keyword], ([mode, kw]) => {
  if (mode === 'letter' || mode === 'effect' || kw.trim()) {
    loadAll()
  }
})

onMounted(() => {
  load()
  // 交叉观察器 (Infinite Scroll)
  _observer = new IntersectionObserver((entries) => {
    if (entries[0]?.isIntersecting && hasMore.value && !loadingMore.value) {
      loadMore()
    }
  }, { rootMargin: '200px' })

  watch([() => sentinelRef.value, loading], ([el, ld]) => {
    if (el && !ld) _observer?.observe(el)
  }, { flush: 'post', immediate: true })
})

onActivated(() => {
  load()
})

onUnmounted(() => {
  _observer?.disconnect()
})
</script>

<template>
  <div class="herb-ency-page min-h-screen">
    <!-- 固定视口背景：避免整页变长后 cover 按超长画布拉伸发糊 -->
    <div class="herb-ency-foreground min-h-screen pb-24 relative z-[1]">
    <header class="sticky top-0 z-30 px-4 py-3 transition-all duration-300 bg-transparent border-b border-white/25 [text-shadow:0_1px_2px_rgba(0,0,0,0.35)]">
      <div class="max-w-6xl mx-auto space-y-3">
        <div class="flex flex-col sm:flex-row gap-3">
          <button
            @click="router.push('/')"
            class="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-white/35 bg-white/10 backdrop-blur-sm text-white hover:bg-white/20 hover:border-white/50 text-sm font-serif transition-all shadow-sm shrink-0"
          >
            <ArrowLeft class="w-4 h-4" />
            <span>返回主页</span>
          </button>
          <div class="relative flex-1 group">
            <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/65 group-focus-within:text-white pointer-events-none" />
            <input
              v-model="keyword"
              type="search"
              placeholder="搜索本草、拼音或功效..."
              class="w-full pl-9 pr-10 py-2 rounded-xl border border-white/35 bg-white/10 text-white placeholder:text-white/60 text-sm focus:outline-none focus:ring-2 focus:ring-white/40 focus:border-white/50 focus:bg-white/15 backdrop-blur-sm transition-all shadow-sm"
            />
            <button
              v-if="keyword"
              type="button"
              @click="keyword = ''"
              class="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-white/20 text-white/75 hover:text-white"
              aria-label="清空"
            >
              <X class="w-4 h-4" />
            </button>
          </div>
          <button
            type="button"
            @click="showFilterPanel = !showFilterPanel"
            class="flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-white/35 bg-white/10 backdrop-blur-sm text-white hover:bg-white/20 hover:border-white/50 transition shrink-0"
            :class="{ 'ring-2 ring-white/50 border-white/60': showFilterPanel }"
          >
            <Filter class="w-4 h-4" />
            <span>筛选</span>
            <ChevronDown class="w-4 h-4 transition-transform" :class="{ 'rotate-180': showFilterPanel }" />
          </button>
        </div>

        <Transition
          enter-active-class="transition duration-200 ease-out"
          enter-from-class="opacity-0 -translate-y-2"
          enter-to-class="opacity-100 translate-y-0"
          leave-active-class="transition duration-150 ease-in"
          leave-from-class="opacity-100 translate-y-0"
          leave-to-class="opacity-0 -translate-y-2"
        >
          <div v-show="showFilterPanel" class="p-4 rounded-2xl border border-white/30 bg-black/25 backdrop-blur-md shadow-sm space-y-4">
            <div class="flex flex-wrap items-center gap-2">
              <span class="text-sm font-medium text-white/90 shrink-0">筛选方式</span>
              <div class="bg-white/10 p-1 rounded-xl flex items-center flex-wrap gap-1">
                <button
                  v-for="mode in ['category', 'letter', 'effect']"
                  :key="mode"
                  type="button"
                  @click="switchFilterMode(mode)"
                  :class="[
                    'px-4 py-1.5 rounded-lg text-xs font-medium transition-all duration-300',
                    filterMode === mode
                      ? 'bg-white text-cinnabar shadow-sm'
                      : 'text-white/85 hover:text-white hover:bg-white/10'
                  ]"
                >
                  {{ mode === 'category' ? '按类别' : mode === 'letter' ? '按 A-Z' : '按功效' }}
                </button>
              </div>
            </div>
            <div :class="['w-full', filterMode === 'category' ? 'overflow-x-auto scrollbar-hide' : '']">
              <div :class="['flex gap-2', filterMode === 'category' ? 'min-w-max' : 'flex-wrap']">
                <button
                  v-for="tag in currentTags"
                  :key="tag"
                  @click="filterMode === 'effect' ? toggleEffectTag(tag) : (activeTag = tag)"
                  :class="[
                    'rounded-full text-xs font-medium transition-all duration-200 border shrink-0',
                    filterMode === 'letter' ? 'px-2.5 py-1' : 'px-3.5 py-1',
                    filterMode === 'effect'
                      ? (
                          (tag === '全部' && activeEffectTags.length === 0) ||
                          (tag !== '全部' && activeEffectTags.includes(tag))
                        )
                        ? 'bg-cinnabar text-white border-cinnabar shadow-sm'
                        : 'bg-white/15 text-white border-white/30 hover:border-white/50 hover:bg-white/25'
                      : activeTag === tag
                      ? 'bg-cinnabar text-white border-cinnabar shadow-sm'
                      : 'bg-white/15 text-white border-white/30 hover:border-white/50 hover:bg-white/25'
                  ]"
                >
                  {{ tag }}
                </button>
              </div>
            </div>
            <div v-if="hasActiveFilters()" class="pt-2 border-t border-white/20">
              <button
                type="button"
                @click="clearAllFilters()"
                class="text-sm text-white/85 hover:text-white transition"
              >
                清空条件
              </button>
            </div>
          </div>
        </Transition>
      </div>
    </header>

    <main class="max-w-6xl mx-auto px-4 py-4">
      
      <!-- 加载骨架屏 -->
      <div v-if="loading" class="herb-cabinet animate-pulse">
        <div v-for="i in 12" :key="i" class="cabinet-skeleton">
          <div class="skeleton-face"></div>
        </div>
      </div>

      <div v-else-if="error" class="flex flex-col items-center justify-center py-20 text-cinnabar/80 gap-3">
        <span class="text-sm font-serif">加载出错了，请检查网络后重试</span>
        <button @click="load()" class="text-xs px-5 py-2 rounded-full border border-cinnabar/40 hover:bg-cinnabar/10 transition-colors">点击重试</button>
      </div>

      <!-- 药柜网格：v-memo 仅在被点击项动画时重渲染，减少整表重绘 -->
      <div v-else class="herb-cabinet">
        <div
          v-for="herb in filteredHerbs"
          :key="herb.name"
          v-memo="[herb.name, openingHerb === herb.name]"
          @click="goToDetail(herb)"
        >
          <HerbCard
            :herb="herb"
            :opening="openingHerb === herb.name"
          />
        </div>
      </div>

      <div v-if="!loading && !error" class="py-6 flex flex-col items-center justify-center gap-3">
        <div ref="sentinelRef" class="w-full h-1 opacity-0 pointer-events-none"></div>
        
        <div v-if="loadingMore" class="flex items-center gap-2 text-sandalwood/50 text-xs">
          <Loader2 class="w-3.5 h-3.5 animate-spin" />
          <span>正在翻阅古籍...</span>
        </div>
        
        <div v-else-if="!hasMore && filteredHerbs.length > 0" class="flex items-center gap-2 text-sandalwood/30 text-xs font-serif">
          <span class="w-8 h-[1px] bg-sandalwood/20"></span>
          <span>已显示全部内容</span>
          <span class="w-8 h-[1px] bg-sandalwood/20"></span>
        </div>

        <div v-if="filteredHerbs.length === 0" class="py-12 text-center text-sandalwood/40">
          <div class="text-2xl mb-2">🍃</div>
          <p class="text-sm font-serif mb-4">未找到符合条件的药材</p>
          <button
            v-if="hasActiveFilters()"
            type="button"
            @click="clearAllFilters()"
            class="text-sm font-medium text-cinnabar hover:text-cinnabar/80 transition"
          >
            清空条件后重试
          </button>
        </div>
      </div>

      <p
        v-if="!loading && !error && filteredHerbs.length > 0"
        class="text-center text-[11px] text-sandalwood/40 mt-8 max-w-xl mx-auto leading-relaxed px-2"
      >
        条目经整理与清洗，数据及配图参考来源见
        <router-link to="/about" class="text-emerald-800/80 hover:text-emerald-900 underline underline-offset-2">关于本站</router-link>
        。
      </p>
    </main>
    </div>
  </div>
</template>

<style scoped>
.herb-ency-page {
  position: relative;
  background-color: #f3eee4;
}

.herb-ency-page::before {
  content: "";
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background-color: #f3eee4;
  background-image: url("/photo/herb_background.jpg");
  background-repeat: no-repeat;
  background-position: center;
  background-size: cover;
}

/* 隐藏滚动条但保留功能 */
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}

/* ========== 药柜网格布局 ========== */
.herb-cabinet {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(155px, 1fr));
  gap: 12px;
  /* 药柜背景：整体颜色更浅，突出单个抽屉 */
  background:
    radial-gradient(circle at top left, rgba(255, 255, 255, 0.12), transparent 55%),
    radial-gradient(circle at bottom right, rgba(0, 0, 0, 0.12), transparent 55%),
    linear-gradient(145deg, #6F4B3A 0%, #5A4034 45%, #4A3228 100%);
  border-radius: 12px;
  padding: 18px;
  border: 1px solid rgba(55, 36, 24, 0.75);
  box-shadow:
    inset 0 1px 4px rgba(0, 0, 0, 0.25),
    0 6px 18px rgba(62, 39, 35, 0.22);
}

@media (min-width: 640px) {
  .herb-cabinet {
    grid-template-columns: repeat(auto-fill, minmax(165px, 1fr));
    gap: 14px;
    padding: 20px;
  }
}

@media (min-width: 1024px) {
  .herb-cabinet {
    grid-template-columns: repeat(auto-fill, minmax(175px, 1fr));
    gap: 16px;
  }
}

/* ========== 加载骨架屏 ========== */
.cabinet-skeleton {
  border-radius: 6px;
  overflow: hidden;
}

.skeleton-face {
  height: 120px;
  border-radius: 6px;
  background: linear-gradient(170deg, #6B4C3B 0%, #5C3D2E 40%, #4A3228 100%);
  opacity: 0.6;
}
</style>

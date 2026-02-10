<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Search, Loader2 } from 'lucide-vue-next'
import { pinyin } from 'pinyin-pro'
import HerbCard from '@/components/HerbCard.vue'
import { useHerbList } from '@/composables/useHerbData'

const router = useRouter()

// ==========================================
// 1. 数据配置 (保留全量功能)
// ==========================================

const CATEGORY_TAGS = ['全部', '根茎类', '果实/种子类', '全草类', '花类', '藤木类', '动物类', '枝叶/树皮类', '菌藻类', '矿物类', '其他']
const LETTER_TAGS = ['全部', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'W', 'X', 'Y', 'Z']

// 获取首字母逻辑（使用 pinyin-pro 自动转换，支持所有汉字）
function getFirstLetter(name) {
  if (!name) return '#'
  const firstChar = name.charAt(0)
  if (/[A-Za-z]/.test(firstChar)) return firstChar.toUpperCase()
  const py = pinyin(firstChar, { toneType: 'none', type: 'array' })
  if (py && py[0]) return py[0].charAt(0).toUpperCase()
  return '#'
}

// ==========================================
// 2. 核心逻辑
// ==========================================

const { herbs, loading, error, load, loadMore, hasMore, loadingMore, loadAll } = useHerbList()

const keyword = ref('')
const activeTag = ref('全部')
const filterMode = ref('category') // 'category' | 'letter'
const sentinelRef = ref(null)
let _observer = null

const currentTags = computed(() => filterMode.value === 'category' ? CATEGORY_TAGS : LETTER_TAGS)

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
  // 2. 标签过滤
  if (activeTag.value !== '全部') {
    if (filterMode.value === 'category') {
      list = list.filter(h => 
        (h.tags || []).includes(activeTag.value) || 
        (h.classification || '').includes(activeTag.value)
      )
    } else {
      list = list.filter(h => getFirstLetter(h.name) === activeTag.value)
    }
  }
  return list
})

function switchFilterMode(mode) {
  if (filterMode.value === mode) return
  filterMode.value = mode
  activeTag.value = '全部' // 切换模式重置选中
}

// 核心优化：携带数据跳转 (Preload)
const goToDetail = (herb) => {
  router.push({ 
    name: 'HerbDetail', 
    params: { name: herb.name },
    state: { preloadHerb: JSON.parse(JSON.stringify(herb)) } 
  })
}

// 当切换到 A-Z 模式或输入搜索关键词时，自动加载全量数据
watch([filterMode, keyword], ([mode, kw]) => {
  if (mode === 'letter' || kw.trim()) {
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

onUnmounted(() => {
  _observer?.disconnect()
})
</script>

<template>
  <div class="min-h-screen pb-24 bg-[#FDFBF7]">
    
    <header class="sticky top-0 z-30 px-4 py-3 transition-all duration-300 bg-[#FDFBF7]/80 backdrop-blur-md border-b border-sandalwood/5">
      <div class="max-w-6xl mx-auto space-y-3">
        
        <div class="flex flex-col sm:flex-row gap-3">
          <div class="relative flex-1 group">
            <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sandalwood/40 group-focus-within:text-cinnabar transition-colors" />
            <input
              v-model="keyword"
              type="search"
              placeholder="搜索本草、拼音或功效..."
              class="w-full pl-9 pr-4 py-2 rounded-xl border border-sandalwood/10 bg-white/60 text-sandalwood placeholder-sandalwood/30 text-sm focus:outline-none focus:ring-1 focus:ring-cinnabar/30 focus:bg-white transition-all shadow-sm"
            />
          </div>

          <div class="bg-sandalwood/5 p-1 rounded-xl flex items-center shrink-0 self-start sm:self-auto">
            <button
              v-for="mode in ['category', 'letter']"
              :key="mode"
              type="button"
              @click="switchFilterMode(mode)"
              :class="[
                'px-4 py-1.5 rounded-lg text-xs font-medium transition-all duration-300',
                filterMode === mode 
                  ? 'bg-white text-cinnabar shadow-sm scale-100' 
                  : 'text-sandalwood/60 hover:text-sandalwood'
              ]"
            >
              {{ mode === 'category' ? '按类别' : '按 A-Z' }}
            </button>
          </div>
        </div>

        <div :class="[
          'w-full',
          filterMode === 'category' ? 'overflow-x-auto scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0' : ''
        ]">
          <div :class="[
            'flex gap-2 pb-1',
            filterMode === 'category' ? 'min-w-max' : 'flex-wrap'
          ]">
            <button
              v-for="tag in currentTags"
              :key="tag"
              @click="activeTag = tag"
              :class="[
                'rounded-full text-xs font-medium transition-all duration-200 border',
                filterMode === 'letter' ? 'px-2.5 py-1' : 'px-3.5 py-1',
                activeTag === tag
                  ? 'bg-cinnabar text-white border-cinnabar shadow-sm'
                  : 'bg-white text-sandalwood/70 border-sandalwood/10 hover:border-sandalwood/30 hover:text-sandalwood'
              ]"
            >
              {{ tag }}
            </button>
          </div>
        </div>
      </div>
    </header>

    <main class="max-w-6xl mx-auto px-4 py-4">
      
      <div v-if="loading" class="masonry-columns animate-pulse">
        <div v-for="i in 8" :key="i" class="masonry-item mb-4">
          <div class="bg-sandalwood/5 rounded-xl h-48 w-full mb-2"></div>
          <div class="bg-sandalwood/5 rounded h-4 w-3/4 mb-2"></div>
          <div class="bg-sandalwood/5 rounded h-3 w-1/2"></div>
        </div>
      </div>

      <div v-else-if="error" class="flex flex-col items-center justify-center py-20 text-cinnabar/80">
        <Loader2 class="w-8 h-8 animate-spin mb-2" />
        <span class="text-sm font-serif">加载出错了，请刷新重试</span>
      </div>

      <div v-else class="masonry-columns">
        <div
          v-for="herb in filteredHerbs"
          :key="herb.name"
          class="masonry-item mb-4 group cursor-pointer" 
          @click="goToDetail(herb)"
        >
          <HerbCard :herb="herb" class="transition-transform duration-300 group-hover:-translate-y-1 group-hover:shadow-lg" />
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
          <p class="text-sm font-serif">未找到相关药材</p>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
/* 隐藏滚动条但保留功能 */
.scrollbar-hide {
  -ms-overflow-style: none; /* IE and Edge */
  scrollbar-width: none; /* Firefox */
}
.scrollbar-hide::-webkit-scrollbar {
  display: none; /* Chrome, Safari and Opera */
}

/* 瀑布流布局 */
.masonry-columns {
  column-count: 2;
  column-gap: 1rem;
}
@media (min-width: 640px) {
  .masonry-columns {
    column-count: 3;
  }
}
@media (min-width: 1024px) {
  .masonry-columns {
    column-count: 4;
  }
}
.masonry-item {
  break-inside: avoid;
}
</style>
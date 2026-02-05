<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router' // 1. 引入路由
import { Search } from 'lucide-vue-next'
import HerbCard from '@/components/HerbCard.vue'
import { useHerbList } from '@/composables/useHerbData'

const router = useRouter() // 2. 初始化路由

const TAGS = ['全部', '清热', '补气', '安神', '活血', '健脾', '明目', '养心', '解毒']

const { herbs, loading, error, load, loadMore, hasMore, loadingMore } = useHerbList()
const keyword = ref('')
const activeTag = ref('全部')
const sentinelRef = ref(null)
let _observer = null

const filteredHerbs = computed(() => {
  let list = herbs.value
  if (keyword.value.trim()) {
    const k = keyword.value.trim().toLowerCase()
    list = list.filter(h =>
      (h.name || '').toLowerCase().includes(k) ||
      (h.namePinyin || h.name_pinyin || '').toLowerCase().includes(k) ||
      (h.tags || []).some(t => String(t).includes(k))
    )
  }
  if (activeTag.value !== '全部') {
    list = list.filter(h => (h.tags || []).includes(activeTag.value))
  }
  return list
})

// 3. 核心修复：点击卡片跳转详情
// src/views/HomeView.vue

const goToDetail = (herb) => {
  router.push({ 
    name: 'HerbDetail', 
    params: { name: herb.name },
    // 核心修改：把整个 herb 对象存到 history.state 里带过去
    state: { preloadHerb: JSON.parse(JSON.stringify(herb)) } 
  })
}

onMounted(() => {
  load()
  _observer = new IntersectionObserver(
    (entries) => {
      if (!entries[0]?.isIntersecting) return
      if (hasMore.value && !loadingMore.value) loadMore()
    },
    { rootMargin: '100px' }
  )
  watch(
    [() => sentinelRef.value, loading],
    ([el, ld]) => {
      if (el && !ld) _observer?.observe(el)
    },
    { flush: 'post', immediate: true }
  )
})
onUnmounted(() => {
  _observer?.disconnect()
})
</script>

<template>
  <div class="min-h-screen pb-24">
    <header class="sticky top-0 z-20 glass-search wood-overlay px-4 py-3">
      <div class="max-w-4xl mx-auto">
        <div class="relative">
          <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-sandalwood/60" />
          <input
            v-model="keyword"
            type="search"
            placeholder="搜索药材名称、拼音或功效…"
            class="w-full pl-10 pr-4 py-2.5 rounded-xl border border-sandalwood/20 bg-white/80 text-sandalwood placeholder-sandalwood/50 focus:outline-none focus:ring-2 focus:ring-sandalwood/30 focus:border-sandalwood/40"
          />
        </div>
      </div>

      <div class="mt-3 -mx-4 overflow-x-auto scrollbar-hide">
        <div class="flex gap-2 px-4 min-w-max">
          <button
            v-for="tag in TAGS"
            :key="tag"
            type="button"
            :class="[
              'px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors',
              activeTag === tag
                ? 'bg-sandalwood text-white'
                : 'bg-sandalwood/10 text-sandalwood hover:bg-sandalwood/20'
            ]"
            @click="activeTag = tag"
          >
            {{ tag }}
          </button>
        </div>
      </div>
    </header>

    <main class="max-w-6xl mx-auto px-4 py-6">
      <div v-if="loading" class="text-center py-16 text-sandalwood/70">加载中…</div>
      <div v-else-if="error" class="text-center py-16 text-cinnabar">加载失败，请重试</div>

      <div v-else class="masonry-columns">
        <div
          v-for="herb in filteredHerbs"
          :key="herb.name"
          class="masonry-item cursor-pointer hover:opacity-90 transition-opacity" 
          @click="goToDetail(herb)"
        >
          <HerbCard :herb="herb" />
        </div>
      </div>

      <div v-if="!loading && !error && filteredHerbs.length > 0" class="flex flex-col items-center gap-2 py-6">
        <div ref="sentinelRef" class="h-1 w-full" aria-hidden="true" />
        <div v-if="loadingMore" class="text-sandalwood/60 text-sm">加载更多…</div>
        <div v-else-if="!hasMore" class="text-sandalwood/50 text-sm">已经到底了</div>
      </div>

      <div
        v-if="!loading && !error && filteredHerbs.length === 0"
        class="text-center py-16 text-sandalwood/60"
      >
        暂无匹配的药材
      </div>
    </main>
  </div>
</template>

<style scoped>
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
/* 瀑布流：列布局，手机 2 列，桌面 4 列 */
.masonry-columns {
  column-count: 2;
  column-gap: 1rem;
}
@media (min-width: 768px) {
  .masonry-columns {
    column-count: 4;
  }
}
.masonry-item {
  break-inside: avoid;
  margin-bottom: 1rem;
}
</style>
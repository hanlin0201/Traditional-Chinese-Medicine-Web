<script setup>
import { ref, watch, nextTick, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft } from 'lucide-vue-next'
import { getDynastyById, getAdjacentDynasties } from '@/constants/dynasties.js'
import DefaultDynastyDetail from '@/components/dynasty/DefaultDynastyDetail.vue'
import ShangguDynastyDetail from '@/components/dynasty/ShangguDynastyDetail.vue'
import ChunqiuDynastyDetail from '@/components/dynasty/ChunqiuDynastyDetail.vue'
import QinhanDynastyDetail from '@/components/dynasty/QinhanDynastyDetail.vue'
import DonghanDynastyDetail from '@/components/dynasty/DonghanDynastyDetail.vue'
import LiangjinDynastyDetail from '@/components/dynasty/LiangjinDynastyDetail.vue'
import TangDynastyDetail from '@/components/dynasty/TangDynastyDetail.vue'
import SongDynastyDetail from '@/components/dynasty/SongDynastyDetail.vue'
import MingDynastyDetail from '@/components/dynasty/MingDynastyDetail.vue'
import QingDynastyDetail from '@/components/dynasty/QingDynastyDetail.vue'
import XiandaiDynastyDetail from '@/components/dynasty/XiandaiDynastyDetail.vue'
import DangxiaDynastyDetail from '@/components/dynasty/DangxiaDynastyDetail.vue'

const route = useRoute()
const router = useRouter()

const dynasty = ref(null)
const adjacent = ref({ prev: null, next: null })
const shangguPageIndex = ref(0)
const chunqiuPageIndex = ref(0)
const qinhanPageIndex = ref(0)
const donghanPageIndex = ref(0)
const liangjinPageIndex = ref(0)
const tangPageIndex = ref(0)
const songPageIndex = ref(0)
const mingPageIndex = ref(0)
const qingPageIndex = ref(0)
const xiandaiPageIndex = ref(0)
const dangxiaPageIndex = ref(0)

function loadDynasty(id) {
  dynasty.value = getDynastyById(id)
  adjacent.value = getAdjacentDynasties(id)
  nextTick(() => window.scrollTo({ top: 0, behavior: 'smooth' }))
}

watch(
  () => route.params.id,
  (newId) => {
    if (newId) loadDynasty(newId)
  },
  { immediate: true }
)

// 上古、春秋战国详情全屏：隐藏顶栏并禁止页面级滚动，避免右侧出现滚动条
watch(
  () => dynasty.value?.id,
  (id) => {
    if (['shanggu', 'chunqiu', 'qinhan', 'donghan', 'liangjin', 'tang', 'song', 'ming', 'qing', 'xiandai', 'dangxia'].includes(id)) document.body.classList.add('dynasty-fullscreen')
    else document.body.classList.remove('dynasty-fullscreen')
  },
  { immediate: true }
)
onBeforeUnmount(() => document.body.classList.remove('dynasty-fullscreen'))

function goBack() {
  // 统一返回首页的历史模块并保持卷轴展开，不回到上一朝代；用 replace 避免历史栈堆积
  router.replace({ path: '/', query: { history: 'open' } })
}

function goToDynasty(id) {
  router.push({ name: 'DynastyDetail', params: { id } })
}
</script>

<template>
  <div v-if="dynasty" class="dynasty-detail" :class="{ 'dynasty-detail--fullscreen': ['shanggu', 'chunqiu', 'qinhan', 'donghan', 'liangjin', 'tang', 'song', 'ming', 'qing', 'xiandai', 'dangxia'].includes(dynasty.id) }">
    <div class="bg-texture"></div>
    <!-- 上古、春秋战国使用组件内悬浮返回，不显示顶栏以达成全屏 -->
    <header
      v-show="!['shanggu', 'chunqiu', 'qinhan', 'donghan', 'liangjin', 'tang', 'song', 'ming', 'qing', 'xiandai', 'dangxia'].includes(dynasty.id)"
      class="dynasty-header"
    >
      <button class="back-btn" @click="goBack" aria-label="返回">
        <ArrowLeft :size="20" />
      </button>
      <h1 class="header-title">{{ dynasty.name }}</h1>
      <div class="header-placeholder"></div>
    </header>

    <ShangguDynastyDetail
      v-if="dynasty.id === 'shanggu'"
      :dynasty="dynasty"
      :adjacent="adjacent"
      @go-to-dynasty="goToDynasty"
      @page-change="shangguPageIndex = $event"
      @back="goBack"
    />
    <ChunqiuDynastyDetail
      v-else-if="dynasty.id === 'chunqiu'"
      :dynasty="dynasty"
      :adjacent="adjacent"
      @go-to-dynasty="goToDynasty"
      @page-change="chunqiuPageIndex = $event"
      @back="goBack"
    />
    <QinhanDynastyDetail
      v-else-if="dynasty.id === 'qinhan'"
      :dynasty="dynasty"
      :adjacent="adjacent"
      @go-to-dynasty="goToDynasty"
      @page-change="qinhanPageIndex = $event"
      @back="goBack"
    />
    <DonghanDynastyDetail
      v-else-if="dynasty.id === 'donghan'"
      :dynasty="dynasty"
      :adjacent="adjacent"
      @go-to-dynasty="goToDynasty"
      @page-change="donghanPageIndex = $event"
      @back="goBack"
    />
    <LiangjinDynastyDetail
      v-else-if="dynasty.id === 'liangjin'"
      :dynasty="dynasty"
      :adjacent="adjacent"
      @go-to-dynasty="goToDynasty"
      @page-change="liangjinPageIndex = $event"
      @back="goBack"
    />
    <TangDynastyDetail
      v-else-if="dynasty.id === 'tang'"
      :dynasty="dynasty"
      :adjacent="adjacent"
      @go-to-dynasty="goToDynasty"
      @page-change="tangPageIndex = $event"
      @back="goBack"
    />
    <SongDynastyDetail
      v-else-if="dynasty.id === 'song'"
      :dynasty="dynasty"
      :adjacent="adjacent"
      @go-to-dynasty="goToDynasty"
      @page-change="songPageIndex = $event"
      @back="goBack"
    />
    <MingDynastyDetail
      v-else-if="dynasty.id === 'ming'"
      :dynasty="dynasty"
      :adjacent="adjacent"
      @go-to-dynasty="goToDynasty"
      @page-change="mingPageIndex = $event"
      @back="goBack"
    />
    <QingDynastyDetail
      v-else-if="dynasty.id === 'qing'"
      :dynasty="dynasty"
      :adjacent="adjacent"
      @go-to-dynasty="goToDynasty"
      @page-change="qingPageIndex = $event"
      @back="goBack"
    />
    <XiandaiDynastyDetail
      v-else-if="dynasty.id === 'xiandai'"
      :dynasty="dynasty"
      :adjacent="adjacent"
      @go-to-dynasty="goToDynasty"
      @page-change="xiandaiPageIndex = $event"
      @back="goBack"
    />
    <DangxiaDynastyDetail
      v-else-if="dynasty.id === 'dangxia'"
      :dynasty="dynasty"
      :adjacent="adjacent"
      @go-to-dynasty="goToDynasty"
      @page-change="dangxiaPageIndex = $event"
      @back="goBack"
    />
    <DefaultDynastyDetail
      v-else
      :dynasty="dynasty"
      :adjacent="adjacent"
      @go-to-dynasty="goToDynasty"
    />
  </div>

  <div v-else class="dynasty-not-found">
    <span class="text-3xl">📜</span>
    <p>未找到该朝代的记录</p>
    <button @click="router.push('/')" class="back-link">返回首页</button>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400;600;700&display=swap');

.dynasty-detail {
  --primary: #8B5E3C;
  --primary-dark: #5D4037;
  --accent-red: #C44E46;
  --accent-green: #5D7A47;
  --bg: #FDFBF7;
  --card-bg: rgba(255, 255, 255, 0.88);
  --text-main: #2c2c2c;
  --text-secondary: #777;
  --radius: 16px;

  font-family: 'Noto Serif SC', 'SimSun', 宋体, serif;
  min-height: 100vh;
  background: var(--bg);
  position: relative;
  overflow-x: hidden;
}

/* 上古、春秋战国详情：严格 100vh、无页面级滚动，与隐藏顶栏配合实现真正全屏无滚动条 */
.dynasty-detail--fullscreen {
  height: 100vh;
  min-height: 100vh;
  overflow: hidden;
}

.bg-texture {
  position: fixed;
  inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg width='200' height='200' viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E");
  pointer-events: none;
  z-index: 0;
}

.dynasty-header {
  position: sticky;
  top: 0;
  z-index: 30;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  background: rgba(253, 251, 247, 0.88);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  border-bottom: 1px solid rgba(139, 90, 43, 0.1);
}

.back-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  border: none;
  background: transparent;
  color: var(--primary-dark);
  cursor: pointer;
  transition: background 0.2s;
}
.back-btn:hover {
  background: rgba(139, 94, 60, 0.1);
}

.header-title {
  font-size: 1.15rem;
  font-weight: 600;
  color: var(--primary-dark);
  letter-spacing: 3px;
  margin: 0;
}

.header-placeholder {
  width: 36px;
}

.dynasty-detail--fullscreen .dynasty-header {
  background: rgba(30, 25, 22, 0.75);
  border-bottom-color: rgba(255,255,255,0.08);
}
.dynasty-detail--fullscreen .back-btn { color: rgba(255,255,255,0.9); }
.dynasty-detail--fullscreen .back-btn:hover { background: rgba(255,255,255,0.1); }
.dynasty-detail--fullscreen .header-title { color: rgba(255,255,255,0.95); }

.dynasty-not-found {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  gap: 12px;
  font-family: 'Noto Serif SC', serif;
  color: #8B5A2B;
}

.back-link {
  font-size: 0.9rem;
  color: #8B5A2B;
  text-decoration: underline;
  background: none;
  border: none;
  cursor: pointer;
  font-family: inherit;
}
</style>

<script setup>
import { ref, onMounted } from 'vue'
import { HelpCircle, XCircle, RefreshCw } from 'lucide-vue-next'
import { supabase } from '@/supabaseClient'

const bgImage = "https://bpic.588ku.com/back_list_pic/25/01/23/ec0cb9c263b689042869b689494b650e.jpg!/fw/350/quality/95/unsharp/true/compress/true"

const fullMyths = ref([])
const displayedMyths = ref([])
const loading = ref(false)
const expandedId = ref(null)

const FALLBACK = [
  { id: 1, emoji: '❌', question: '感冒了就要立刻喝姜汤捂汗？', answer: '错！', detail: '姜汤只适用于<span class="hl">风寒感冒</span>（怕冷、流清涕）。若是风热感冒，喝姜汤如同火上浇油。', type: 'danger' },
  { id: 2, emoji: '🚫', question: '晚上吃姜，真的等于吃砒霜？', answer: '片面。', detail: '中医认为夜间主收敛，姜主发散，晚上吃姜会影响睡眠、伤阴，但绝无砒霜之毒。', type: 'warning' },
  { id: 3, emoji: '💡', question: '只有肾虚的人才需要吃黑芝麻？', answer: '非也。', detail: '黑芝麻补肝肾、润五脏，还能润肠通便、乌发美容，普通人日常食疗也非常合适。', type: 'safe' }
]

function normalize(row, index) {
  const id = row.id != null ? Number(row.id) || index + 1 : index + 1
  const answer = (row.answer_text != null && String(row.answer_text).trim() !== '') ? row.answer_text : (row.answer ?? '')
  return { id, emoji: row.emoji ?? '', question: row.question ?? '', answer, detail: row.detail ?? '', type: row.type ?? 'warning' }
}

function hasValidItems(list) {
  return Array.isArray(list) && list.length > 0 && list.some(item => item && String(item.question || '').trim() !== '')
}

const BATCH_SIZE = 5

function pickRandomBatch() {
  const list = fullMyths.value
  if (!list || list.length === 0) return
  const copy = [...list]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  displayedMyths.value = copy.slice(0, BATCH_SIZE)
}

async function loadMyths() {
  loading.value = true
  fullMyths.value = []
  displayedMyths.value = []
  try {
    const { data, error } = await supabase.from('myth').select('*')
    if (error) {
      console.warn('[养生避雷针] Supabase error:', error.message)
      fullMyths.value = [...FALLBACK]
      pickRandomBatch()
      return
    }
    const raw = Array.isArray(data) ? data : []
    const mapped = raw.map((r, i) => normalize(r, i))
    fullMyths.value = hasValidItems(mapped) ? mapped : [...FALLBACK]
    pickRandomBatch()
  } catch (e) {
    console.warn('[养生避雷针] load failed:', e)
    fullMyths.value = [...FALLBACK]
    pickRandomBatch()
  } finally {
    loading.value = false
  }
}

function refreshBatch() {
  if (fullMyths.value.length === 0) return
  expandedId.value = null
  pickRandomBatch()
}

function toggle(id) {
  expandedId.value = expandedId.value === id ? null : id
}

onMounted(() => {
  loadMyths()
})
</script>

<template>
  <section class="myth-buster-screen" :style="{ backgroundImage: `url(${bgImage})` }">

    <div class="bg-overlay"></div>

    <div class="content-wrapper">
      <div class="section-header">
        <div class="title-row">
          <h3 class="title">养生避雷针</h3>
          <div class="refresh-control" :class="{ 'is-loading': loading }" @click="refreshBatch">
            <RefreshCw class="refresh-icon" />
            <span class="action-text">随机换一批</span>
          </div>
        </div>
        <span class="subtitle">粉碎谣言 · 正本清源</span>
      </div>

      <div class="myth-list">
        <div
          v-for="item in (displayedMyths.length ? displayedMyths : FALLBACK)"
          :key="item.id"
          class="myth-item"
          :class="{ 'is-expanded': expandedId === item.id }"
          @click="toggle(item.id)"
        >
          <div class="myth-question">
            <span class="emoji" v-if="item.emoji">{{ item.emoji }}</span>
            <HelpCircle class="icon-q" />
            <span>{{ item.question }}</span>
            <span class="indicator">{{ expandedId === item.id ? '收起' : '揭秘' }}</span>
          </div>

          <div v-show="expandedId === item.id" class="myth-answer animate-slide-down">
            <div class="answer-badge" :class="item.type">
              <XCircle class="w-5 h-5 text-red-500" />
              <span class="font-bold answer-text">{{ item.answer }}</span>
            </div>
            <p class="detail" v-html="item.detail"></p>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
/* --- 核心布局：全屏 & 吸附 --- */
.myth-buster-screen {
  position: relative;
  width: 100%;
  height: 100vh; /* 强制全屏高度 */

  /* 关键属性：告诉父容器，滚动到这里时要对齐顶部 */
  scroll-snap-align: start;
  scroll-snap-stop: always; /* 强制停止，防止飞速划过 */

  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;

  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden; /* 防止内容溢出破坏全屏感 */
}

/* 背景遮罩 */
.bg-overlay {
  position: absolute;
  top: 0; left: 0; width: 100%; height: 100%;
  background: rgba(0, 0, 0, 0.3); /* 深色遮罩，根据背景图明暗调整 */
  z-index: 0;
}

/* 内容包装器 */
.content-wrapper {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 800px;
  padding: 40px;
  background: rgba(255, 255, 255, 0.9); /* 强毛玻璃效果 */
  backdrop-filter: blur(12px);
  border-radius: 24px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  border: 1px solid rgba(255, 255, 255, 0.5);

  /* 防止小屏下列变太长超出屏幕 */
  max-height: 90vh;
  overflow-y: auto;
}

.section-header { text-align: center; margin-bottom: 30px; }
.title-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
  flex-wrap: wrap;
  margin-bottom: 8px;
}
.title {
  font-size: 2.2rem;
  color: #5D4037;
  font-weight: bold;
  margin: 0;
  font-family: 'Noto Serif SC', serif;
}
.refresh-control {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  color: #8B5E3C;
  font-size: 0.95rem;
  padding: 6px 14px;
  border-radius: 24px;
  border: 1px solid rgba(139, 94, 60, 0.3);
  background: rgba(255,255,255,0.6);
  transition: all 0.25s;
}
.refresh-control:hover { background: #C44D36; color: white; border-color: #C44D36; }
.refresh-control.is-loading .refresh-icon { animation: spin 0.8s linear infinite; }
@keyframes spin { 100% { transform: rotate(360deg); } }
.refresh-icon { width: 18px; height: 18px; flex-shrink: 0; }
.action-text { font-weight: 600; }
.subtitle {
  font-size: 1rem;
  color: #8B5E3C;
  letter-spacing: 4px;
  text-transform: uppercase;
}

.myth-list { display: flex; flex-direction: column; gap: 16px; }

.myth-item {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 6px rgba(0,0,0,0.02);
  border: 1px solid rgba(139, 94, 60, 0.1);
  transition: all 0.3s ease;
  cursor: pointer;
}
.myth-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 15px rgba(0,0,0,0.05);
  border-color: #C44D36;
}

.myth-question {
  padding: 20px 24px;
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 1.1rem;
  color: #2c2c2c;
  font-weight: 500;
}
.emoji { font-size: 1.2rem; line-height: 1; }
.icon-q { color: #C44D36; width: 22px; height: 22px; flex-shrink: 0; }
.indicator {
  margin-left: auto;
  font-size: 0.85rem;
  color: #888;
  background: #f5f5f5;
  padding: 4px 10px;
  border-radius: 20px;
  transition: all 0.3s;
}
.myth-item:hover .indicator { background: #C44D36; color: white; }

.myth-answer {
  background: #FFF5F2; /* 淡淡的红底，警示感 */
  padding: 15px 24px 24px 58px;
  border-top: 1px dashed rgba(196, 77, 54, 0.2);
}
.answer-badge { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
.answer-badge .answer-text { color: #C62828; }
.answer-badge.warning .answer-text { color: #E65100; }
.answer-badge.safe .answer-text { color: #2E7D32; }
.detail { font-size: 1rem; color: #5D4037; line-height: 1.7; }
.detail :deep(.hl) { font-weight: 700; color: #5D4037; }
.detail :deep(.danger) { color: #C62828; font-weight: 600; }
.detail :deep(.warning) { color: #E65100; font-weight: 500; }
.detail :deep(.safe) { color: #2E7D32; font-weight: 500; }

/* 动画 */
.animate-slide-down { animation: slideDown 0.3s cubic-bezier(0.25, 0.8, 0.5, 1); }
@keyframes slideDown {
  from { opacity: 0; transform: translateY(-10px); height: 0; }
  to { opacity: 1; transform: translateY(0); height: auto; }
}

/* 移动端适配 */
@media (max-width: 768px) {
  .content-wrapper { padding: 24px; width: 90%; }
  .title { font-size: 1.8rem; }
  .myth-question { font-size: 1rem; padding: 16px; }
}
</style>
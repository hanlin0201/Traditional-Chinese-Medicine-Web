<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const historyBgUrl = '/photo/历史模块背景.jpg'

function getPhotoUrl(name) {
  return `/photo/${name}`
}

const unfolded = ref(false)

// 卷轴展开宽度
const PAPER_WIDTH = 'min(calc(96vw - 56px), 1600px)'
const scrollContentWidth = computed(() => unfolded.value ? PAPER_WIDTH : '0')
const rodLeft = computed(() => unfolded.value ? `calc(56px + ${PAPER_WIDTH})` : '56px')

const historyCards = [
  { img: '神农尝百草图.jpg', label: '上古', dynastyId: 'shanggu' },
  { img: '黄帝内经.jpg', label: '春秋战国', dynastyId: 'chunqiu' },
  { img: '伤寒杂病论.jpg', label: '秦汉', dynastyId: 'qinhan' },
  { img: '华佗.jpg', label: '东汉', dynastyId: 'donghan' },
  { img: '肘后方与急救.jpg', label: '两晋', dynastyId: 'liangjin' },
  { img: '千金方.jpg', label: '唐代', dynastyId: 'tang' },
  { img: '宋代针灸铜人.jpg', label: '宋代', dynastyId: 'song' },
  { img: '本草纲目封面.jpg', label: '明代', dynastyId: 'ming' },
  { img: '清代温病学说.jpg', label: '清代', dynastyId: 'qing' },
  { img: '屠呦呦.jpg', label: '现代', dynastyId: 'xiandai' },
  { img: '现代食疗.jpg', label: '当下', dynastyId: 'dangxia' },
]

/**
 * 布局配置：所有卡片大小统一（s=1），仅调整垂直偏移y实现错落
 * y: 垂直偏移 (负数向上，正数向下)
 * s: 缩放比例 (统一为1，保证大小一致)
 * 匹配草图排版：
 * 1. 上古：矮，极低
 * 2. 春秋战国：高，极高
 * 3. 秦汉：中，低
 * 4. 东汉：中，高
 * 5. 两晋：矮，极低
 * 6. 唐代：中，高
 * 7. 宋代：高，极高
 * 8-11：仿照前7个的错落逻辑
 */
const cardLayouts = [
  { y: 70, s: 1 },   // 1. 上古：矮，极低
  { y: -130, s: 1 },   // 2. 春秋战国：高，极高
  { y: 0, s: 1 },    // 3. 秦汉：中，低
  { y: -60, s: 1 },   // 4. 东汉：中，高
  { y: 90, s: 1 },    // 5. 两晋：矮，极低
  { y: -30, s: 1 },   // 6. 唐代：中，高
  { y: -150, s: 1 },   // 7. 宋代：高，极高
  { y: 50, s: 1 },    // 8. 明代：中，低（仿秦汉）
  { y: -50, s: 1 },   // 9. 清代：中，高（仿东汉）
  { y: 80, s: 1 },    // 10. 现代：矮，极低（仿上古/两晋）
  { y: -20, s: 1 },   // 11. 当下：中，高（仿唐代）
]

function toggleScroll() {
  unfolded.value = !unfolded.value
}

function handleWrapperClick() {
  if (!unfolded.value) toggleScroll()
}

function goToDynasty(card) {
  if (!unfolded.value || !card.dynastyId) return
  router.push({ name: 'DynastyDetail', params: { id: card.dynastyId } })
}
</script>

<template>
  <section
    class="tcm-history-section"
    id="tcm-history"
    :style="{ backgroundImage: `url(${historyBgUrl})` }"
  >
    <div class="tcm-history-inner">
      <div class="tcm-scroll-zone">
        <div
          class="tcm-scroll-wrapper"
          :class="{ 'tcm-scroll-wrapper--folded': !unfolded }"
          @click="handleWrapperClick"
        >
          <div class="tcm-scroll-roll" @click.stop="toggleScroll">
            <div class="tcm-roll-shade"></div>
            <div class="tcm-roll-body"></div>
            <div class="tcm-roll-highlight"></div>
            <p class="tcm-roll-label">青囊传世，一卷千年</p>
          </div>

          <div class="tcm-scroll-rod" :style="{ left: rodLeft }"></div>

          <div
            class="tcm-scroll-paper"
            :style="{ width: scrollContentWidth }"
          >
            <div class="tcm-paper-inner">
              <div v-show="unfolded" class="tcm-history-cards">
                <div
                  v-for="(card, index) in historyCards"
                  :key="card.label"
                  class="tcm-history-card"
                  :class="{ 'tcm-history-card--clickable': unfolded && card.dynastyId }"
                  :style="{ 
                    transform: `translateY(${cardLayouts[index]?.y || 0}px) scale(${cardLayouts[index]?.s || 1})`
                  }"
                  @click.stop="goToDynasty(card)"
                >
                  <div class="tcm-history-card-img-wrap">
                    <img :src="getPhotoUrl(card.img)" :alt="card.label" class="tcm-history-card-img" />
                  </div>
                  <p class="tcm-history-card-label">{{ card.label }}</p>
                </div>
              </div>
            </div>
          </div>

          <div v-if="!unfolded" class="tcm-explore-hint">
            <span class="tcm-explore-line"></span>
            <span class="tcm-explore-arrow"></span>
            <span class="tcm-explore-text">点击探索·杏林长卷</span>
          </div>
        </div>

        <p class="tcm-click-hint">{{ unfolded ? '点击左侧卷轴杆可收起' : '点击卷轴展开' }}</p>
      </div>
    </div>
  </section>
</template>

<style scoped>
.tcm-history-section {
  position: relative;
  width: 100%;
  height: 100vh;
  box-sizing: border-box;
  background-color: #e2ddd4;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  overflow: hidden;
}

.tcm-history-inner {
  position: relative;
  z-index: 1;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  min-height: 100%;
  padding: 0 2vw; 
  box-sizing: border-box;
}

.tcm-scroll-zone {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 16px;
}

.tcm-click-hint {
  font-size: 0.75rem;
  color: rgba(45, 55, 45, 0.4);
  letter-spacing: 0.2em;
  margin: 0;
  padding-left: 10px;
}

.tcm-scroll-wrapper {
  position: relative;
  height: clamp(500px, 85vh, 800px);
  cursor: default;
  display: flex;
  align-items: stretch;
  flex-shrink: 0;
}
.tcm-scroll-wrapper--folded {
  cursor: pointer;
}

/* 引导动画 */
.tcm-explore-hint {
  position: absolute;
  left: 56px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  gap: 10px;
  pointer-events: none;
  z-index: 1;
  animation: tcm-explore-flicker 2.2s ease-in-out infinite;
}
.tcm-explore-line {
  width: 28px; height: 2px;
  background: linear-gradient(90deg, rgba(255, 255, 255, 0.75) 0%, rgba(255, 255, 255, 0.4) 100%);
}
.tcm-explore-arrow {
  width: 0; height: 0;
  border-top: 6px solid transparent;
  border-bottom: 6px solid transparent;
  border-left: 10px solid rgba(255, 255, 255, 0.7);
  margin-left: -2px;
}
.tcm-explore-text {
  font-family: 'Noto Serif SC', serif;
  font-size: clamp(1.05rem, 2.5vw, 1.45rem);
  color: rgba(255, 255, 255, 0.75);
  letter-spacing: 0.35em;
  white-space: nowrap;
}
@keyframes tcm-explore-flicker {
  0%, 100% { opacity: 0.65; }
  50% { opacity: 1; }
}

/* 卷轴杆 */
.tcm-scroll-roll {
  position: relative;
  width: 56px;
  flex-shrink: 0;
  border-radius: 28px 0 0 28px;
  overflow: hidden;
  box-shadow: 4px 0 12px rgba(0,0,0,0.08);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
.tcm-roll-label {
  position: absolute;
  margin: 0;
  padding: 10px 0;
  writing-mode: vertical-rl;
  letter-spacing: 0.28em;
  font-family: 'Ma Shan Zheng', 'STKaiti', '楷体', serif;
  font-size: clamp(0.95rem, 2.2vw, 1.2rem);
  color: rgba(35, 28, 22, 0.98);
  text-shadow: 0 0 24px rgba(255,255,255,0.6);
  z-index: 2;
  user-select: none;
  animation: tcm-label-shine 4s ease-in-out infinite;
}
@keyframes tcm-label-shine {
  0%, 100% { opacity: 0.92; }
  50% { opacity: 1; }
}
.tcm-roll-body {
  position: absolute; inset: 0;
  background: linear-gradient(90deg, #C4B8A8 0%, #D4C8B8 25%, #E2D8C8 50%, #D4C8B8 75%, #C4B8A8 100%);
}
.tcm-roll-shade {
  position: absolute; left: 0; top: 0; bottom: 0; width: 40%;
  background: linear-gradient(90deg, rgba(0,0,0,0.15) 0%, transparent 100%);
  pointer-events: none;
}
.tcm-roll-highlight {
  position: absolute; right: 0; top: 15%; bottom: 15%; width: 20%;
  background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.35) 100%);
  pointer-events: none;
}
.tcm-scroll-rod {
  position: absolute; top: 0; bottom: 0; width: 12px; margin-left: -6px;
  background: linear-gradient(90deg, #6B5344 0%, #8B6F5C 30%, #A0806A 50%, #8B6F5C 70%, #6B5344 100%);
  border-radius: 6px;
  box-shadow: 2px 0 8px rgba(0,0,0,0.2);
  transition: left 1.2s cubic-bezier(0.34, 1.56, 0.64, 1);
  left: 0; z-index: 2; flex-shrink: 0;
}

/* 画心（纸张） */
.tcm-scroll-paper {
  position: absolute;
  left: 56px; top: 0; bottom: 0;
  width: 0;
  overflow: hidden;
  transition: width 1.2s cubic-bezier(0.34, 1.56, 0.64, 1);
  box-shadow: 4px 0 20px rgba(0,0,0,0.06);
}
.tcm-scroll-paper::before {
  content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 1px;
  background: rgba(139, 90, 43, 0.12);
}

.tcm-paper-inner {
  position: relative;
  height: 100%;
  min-width: 100%;
  background: url('/photo/卷轴背景.jpg') center center / cover no-repeat;
  background-color: #F5F0E8; /* 图片未覆盖时的底色 */
  border-left: 1px solid rgba(139, 90, 43, 0.08);
  padding: 80px 40px 80px 20px;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  overflow-x: auto;
  overflow-y: hidden;
}

/* --- 卡片容器 --- */
.tcm-history-cards {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center; /* 垂直居中基准 */
  justify-content: flex-start;
  gap: 28px; /* 卡片水平间距，可根据需要调整 */
  width: max-content;
  height: 100%;
  animation: tcm-cards-in 0.5s ease-out 0.25s both;
}

@keyframes tcm-cards-in {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}

/* --- 卡片样式 --- */
/* --- 要改历史卡片大小比例改这里 --- */
.tcm-history-card {
  flex-shrink: 0;
  width: 125px; /* 所有卡片统一宽度 */
  aspect-ratio: 1 / 2; /* 所有卡片统一宽高比 */
  background: #fff;
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  /* 统一大小，仅通过y值调整垂直位置 */
  transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.3s ease, border-color 0.3s ease;
  transform-origin: center center;
}

.tcm-history-card--clickable {
  cursor: pointer;
}

.tcm-history-card:hover {
  z-index: 10;
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.15);
  border-color: rgba(139, 94, 60, 0.5);
}

/* 图片hover放大效果 */
.tcm-history-card:hover .tcm-history-card-img {
  transform: scale(1.1);
}

.tcm-history-card-img-wrap {
  width: 100%;
  flex: 1; 
  background: #f8f6f3;
  overflow: hidden;
}

.tcm-history-card-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.6s ease;
}

.tcm-history-card-label {
  margin: 0;
  padding: 10px 4px;
  font-family: 'Noto Serif SC', 'SimSun', 宋体, serif;
  font-size: 0.9rem;
  font-weight: 600;
  color: #5D4037;
  text-align: center;
  letter-spacing: 0.1em;
  background-color: #fff;
  border-top: 1px solid rgba(0,0,0,0.02);
  flex-shrink: 0;
}
</style>
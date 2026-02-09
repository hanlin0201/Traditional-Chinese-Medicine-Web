<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const historyBgUrl = new URL('../menu/photo/历史模块背景.jpg', import.meta.url).href

function getPhotoUrl(name) {
  return new URL(`../menu/photo/${name}`, import.meta.url).href
}

// 卷轴是否已展开
const unfolded = ref(false)

/* 卷轴在左；展开后画心延伸到「当前卷轴右侧与页面右侧」的中间位置 */
const PAPER_WIDTH = 'min(calc(85vw - 56px), 1100px)'
const scrollContentWidth = computed(() => unfolded.value ? PAPER_WIDTH : '0')
const rodLeft = computed(() => unfolded.value ? `calc(56px + ${PAPER_WIDTH})` : '56px')

const historyCards = [
  { img: '神农尝百草图.jpg', label: '上古', dynastyId: 'shanggu' },
  { img: '伤寒杂病论.jpg', label: '秦汉', dynastyId: 'qinhan' },
  { img: '华佗.jpg', label: '东汉', dynastyId: 'donghan' },
  { img: '千金方.jpg', label: '唐代', dynastyId: 'tang' },
  { img: '本草纲目封面.jpg', label: '明代', dynastyId: 'ming' },
  { img: '屠呦呦.jpg', label: '现代', dynastyId: 'xiandai' },
  { img: '现代食疗.jpg', label: '当下', dynastyId: 'dangxia' },
]

// 每张卡片的纵向偏移（px），无规则错落
const cardOffsets = [22, -34, 8, -28, 26, -16, 14]

function toggleScroll() {
  unfolded.value = !unfolded.value
}

function handleWrapperClick() {
  if (!unfolded.value) toggleScroll()
}

function goToDynasty(dynastyId) {
  if (!unfolded.value) return // 卷轴未展开时不跳转
  router.push({ name: 'DynastyDetail', params: { id: dynastyId } })
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
        <!-- 卷轴容器：仅未展开时点击整条可展开；展开后仅点左侧卷轴杆可收起 -->
        <div
          class="tcm-scroll-wrapper"
          :class="{ 'tcm-scroll-wrapper--folded': !unfolded }"
          @click="handleWrapperClick"
        >
          <!-- 左侧卷轴杆（收拢的卷 + 竖排文案），点击可展开/收起 -->
          <div class="tcm-scroll-roll" @click.stop="toggleScroll">
            <div class="tcm-roll-shade"></div>
            <div class="tcm-roll-body"></div>
            <div class="tcm-roll-highlight"></div>
            <p class="tcm-roll-label">青囊传世，一卷千年</p>
          </div>

          <!-- 轴杆（随展开向右移动） -->
          <div class="tcm-scroll-rod" :style="{ left: rodLeft }"></div>

          <!-- 画心（纸张，由左至右展开） -->
          <div
            class="tcm-scroll-paper"
            :style="{ width: scrollContentWidth }"
          >
            <div class="tcm-paper-inner">
              <!-- 卷轴完全展开时显示：七张历史内容卡片，横向无规则错落 -->
              <div v-show="unfolded" class="tcm-history-cards">
                <div
                  v-for="(card, index) in historyCards"
                  :key="card.label"
                  class="tcm-history-card"
                  :class="{ 'tcm-history-card--clickable': unfolded }"
                  :style="{ '--card-offset': (cardOffsets[index] ?? 0) + 'px' }"
                  @click.stop="goToDynasty(card.dynastyId)"
                >
                  <div class="tcm-history-card-img-wrap">
                    <img :src="getPhotoUrl(card.img)" :alt="card.label" class="tcm-history-card-img" />
                  </div>
                  <p class="tcm-history-card-label">{{ card.label }}</p>
                </div>
              </div>
            </div>
          </div>

          <!-- 未展开时：卷轴右侧引导（箭头左侧接卷轴杆） -->
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
  min-height: 100vh;
  height: 100vh;
  box-sizing: border-box;
  background-color: #e2ddd4;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  padding: 0;
  overflow: hidden;
}

.tcm-history-inner {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 100%;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  min-height: 100%;
  padding: 0 10vw;
  box-sizing: border-box;
}
@media (min-width: 900px) {
  .tcm-history-inner {
    padding-right: 5vw;
  }
}

/* 卷轴区域：靠左，展开后左右与留白对称 */
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
}

/* 卷轴整体容器；仅折叠时整条可点，展开后仅左侧杆可点 */
.tcm-scroll-wrapper {
  position: relative;
  height: clamp(380px, 78vh, 680px);
  cursor: default;
  display: flex;
  align-items: stretch;
  flex-shrink: 0;
}
.tcm-scroll-wrapper--folded {
  cursor: pointer;
}

/* 未展开时：卷轴右侧引导（箭头左端接卷轴杆），淡色、大字号、闪动 */
.tcm-explore-hint {
  position: absolute;
  left: 56px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  gap: 10px;
  padding-left: 0;
  pointer-events: none;
  z-index: 1;
  animation: tcm-explore-flicker 2.2s ease-in-out infinite;
}

.tcm-explore-line {
  width: 28px;
  height: 2px;
  background: linear-gradient(90deg, rgba(255, 255, 255, 0.75) 0%, rgba(255, 255, 255, 0.4) 100%);
  border-radius: 1px;
  flex-shrink: 0;
}

.tcm-explore-arrow {
  width: 0;
  height: 0;
  border-top: 6px solid transparent;
  border-bottom: 6px solid transparent;
  border-left: 10px solid rgba(255, 255, 255, 0.7);
  flex-shrink: 0;
  margin-left: -2px;
}

.tcm-explore-text {
  font-family: 'Noto Serif SC', 'SimSun', 宋体, serif;
  font-size: clamp(1.05rem, 2.5vw, 1.45rem);
  color: rgba(255, 255, 255, 0.75);
  letter-spacing: 0.35em;
  white-space: nowrap;
}

@keyframes tcm-explore-flicker {
  0%, 100% { opacity: 0.65; }
  50% { opacity: 1; }
}

/* 左侧收拢的卷（圆柱），上竖排文案 + 轻微闪动 */
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
  font-family: 'Ma Shan Zheng', 'STKaiti', 'KaiTi', '楷体', serif;
  font-size: clamp(0.95rem, 2.2vw, 1.2rem);
  color: rgba(35, 28, 22, 0.98);
  text-shadow:
    0 0 24px rgba(255,255,255,0.6),
    0 1px 2px rgba(255,255,255,0.8),
    1px 0 1px rgba(0,0,0,0.15),
    0 1px 1px rgba(0,0,0,0.12);
  z-index: 2;
  user-select: none;
  animation: tcm-label-shine 4s ease-in-out infinite;
}

@keyframes tcm-label-shine {
  0%, 100% { opacity: 0.92; }
  50% { opacity: 1; }
}

.tcm-roll-body {
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, #C4B8A8 0%, #D4C8B8 25%, #E2D8C8 50%, #D4C8B8 75%, #C4B8A8 100%);
  border-radius: 28px 0 0 28px;
}

.tcm-roll-shade {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 40%;
  background: linear-gradient(90deg, rgba(0,0,0,0.15) 0%, transparent 100%);
  border-radius: 28px 0 0 28px;
  pointer-events: none;
}

.tcm-roll-highlight {
  position: absolute;
  right: 0;
  top: 15%;
  bottom: 15%;
  width: 20%;
  background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.35) 100%);
  border-radius: 0 4px 4px 0;
  pointer-events: none;
}

/* 轴杆 */
.tcm-scroll-rod {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 12px;
  margin-left: -6px;
  background: linear-gradient(90deg, #6B5344 0%, #8B6F5C 30%, #A0806A 50%, #8B6F5C 70%, #6B5344 100%);
  border-radius: 6px;
  box-shadow: 2px 0 8px rgba(0,0,0,0.2), inset 0 0 0 1px rgba(255,255,255,0.1);
  transition: left 1.2s cubic-bezier(0.34, 1.56, 0.64, 1);
  left: 0;
  z-index: 2;
  flex-shrink: 0;
}

/* 画心（纸张） */
.tcm-scroll-paper {
  position: absolute;
  left: 56px;
  top: 0;
  bottom: 0;
  width: 0;
  overflow: hidden;
  transition: width 1.2s cubic-bezier(0.34, 1.56, 0.64, 1);
  box-shadow: 4px 0 20px rgba(0,0,0,0.06);
}

.tcm-paper-inner {
  position: relative;
  height: 100%;
  min-width: 100%;
  background: linear-gradient(90deg, #F5F0E8 0%, #FDFBF7 8%, #FDFBF7 92%, #F0EBE2 100%);
  background-image:
    url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E"),
    linear-gradient(90deg, #F5F0E8 0%, #FDFBF7 8%, #FDFBF7 92%, #F0EBE2 100%);
  border-left: 1px solid rgba(139, 90, 43, 0.08);
  padding: 40px 24px;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow-x: auto;
  overflow-y: visible;
}

/* 七张历史内容卡片：白底圆角、上图下文、横向交错排列 */
.tcm-history-cards {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 10px;
  width: 100%;
  max-width: 100%;
  padding: 8px 0;
  animation: tcm-cards-in 0.5s ease-out 0.25s both;
}

@keyframes tcm-cards-in {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.tcm-history-card {
  --card-offset: 0px;
  flex: 1 1 0;
  min-width: 52px;
  max-width: 100px;
  background: #fff;
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  transform: translateY(var(--card-offset));
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.tcm-history-card--clickable {
  cursor: pointer;
}

.tcm-history-card:hover {
  transform: translateY(calc(var(--card-offset) - 2px));
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
}

.tcm-history-card--clickable:hover {
  transform: translateY(calc(var(--card-offset) - 6px));
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  border-color: rgba(139, 94, 60, 0.3);
}

.tcm-history-card-img-wrap {
  width: 100%;
  aspect-ratio: 3 / 4;
  background: #f8f6f3;
  overflow: hidden;
}

.tcm-history-card-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.tcm-history-card-label {
  margin: 0;
  padding: 8px 4px 10px;
  font-family: 'Noto Serif SC', 'SimSun', 宋体, serif;
  font-size: clamp(0.7rem, 1.2vw, 0.85rem);
  color: #5D4037;
  text-align: center;
  letter-spacing: 0.1em;
}

/* 展开后轴杆不遮挡纸张边缘 */
.tcm-scroll-paper::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 1px;
  background: rgba(139, 90, 43, 0.12);
}
</style>

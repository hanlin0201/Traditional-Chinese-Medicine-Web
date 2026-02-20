<script setup>
import { ref, watch, onBeforeUnmount, nextTick } from 'vue'
import gsap from 'gsap'
import { ArrowRight, ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-vue-next'
import { getPhotoUrl } from '@/constants/dynasties.js'

const props = defineProps({
  dynasty: { type: Object, required: true },
  adjacent: { type: Object, required: true },
})

const emit = defineEmits(['go-to-dynasty', 'page-change', 'back'])

const xiandaiRootRef = ref(null)
const xiandaiFlipActiveIndex = ref(0)
const xiandaiIsAnimating = ref(false)
const XIANDAI_TOTAL_PAGES = 3

const VH_PER_PAGE = 100

function xiandaiMoveTo(index) {
  if (index < 0 || index >= XIANDAI_TOTAL_PAGES) return
  if (xiandaiIsAnimating.value) return
  xiandaiIsAnimating.value = true
  const container = xiandaiRootRef.value?.querySelector('.xiandai-scroll-container')
  if (!container) {
    xiandaiFlipActiveIndex.value = index
    emit('page-change', index)
    xiandaiIsAnimating.value = false
    return
  }
  const fromIndex = xiandaiFlipActiveIndex.value
  xiandaiFlipActiveIndex.value = index
  emit('page-change', index)

  if (xiandaiRootRef.value) {
    const thirdInner = xiandaiRootRef.value.querySelector('.xiandai-third-inner')
    if (thirdInner) thirdInner.scrollTop = 0
  }

  const yVh = -index * VH_PER_PAGE
  gsap.to(container, {
    y: `${yVh}vh`,
    duration: fromIndex === 0 && index === 1 ? 1 : 0.9,
    ease: 'power2.inOut',
    overwrite: true,
    onComplete: () => { xiandaiIsAnimating.value = false },
  })
}

function xiandaiHandleWheel(e) {
  if (!xiandaiRootRef.value || !props.dynasty || props.dynasty.id !== 'xiandai') return
  const root = xiandaiRootRef.value
  if (xiandaiFlipActiveIndex.value === 2) {
    const thirdInner = root.querySelector('.xiandai-third-inner')
    if (thirdInner) {
      const atTop = thirdInner.scrollTop <= 2
      const atBottom = thirdInner.scrollTop + thirdInner.clientHeight >= thirdInner.scrollHeight - 2
      if (e.deltaY > 0 && !atBottom) return
      if (e.deltaY < 0 && !atTop) return
      if (e.deltaY < 0 && atTop) {
        e.preventDefault()
        if (xiandaiIsAnimating.value) return
        if (Math.abs(e.deltaY) < 18) return
        xiandaiMoveTo(1)
        return
      }
      if (e.deltaY > 0 && atBottom) {
        e.preventDefault()
        return
      }
      return
    }
  }
  e.preventDefault()
  if (xiandaiIsAnimating.value) return
  if (Math.abs(e.deltaY) < 18) return
  if (e.deltaY > 0) {
    if (xiandaiFlipActiveIndex.value < XIANDAI_TOTAL_PAGES - 1) xiandaiMoveTo(xiandaiFlipActiveIndex.value + 1)
  } else {
    xiandaiMoveTo(xiandaiFlipActiveIndex.value - 1)
  }
}

// 典籍：《中华人民共和国药典》，6 页，其中第 3 页为图片
const bookOpen = ref(false)
const bookSpreadIndex = ref(0)
const BOOK_PAGES = [
  { title: '药典概述', body: '《中华人民共和国药典》简称《中国药典》，是国家药品标准的法定技术文件，由中华人民共和国国家药典委员会编纂，经国务院药品监督管理部门批准颁布实施。\n\n药典收载品种包括中药、化学药品、生物制品等，规定了药品的质量标准、检验方法、制剂通则等，是药品研制、生产、经营、使用及监督管理的技术依据。自1953年首版问世以来，已多次修订，不断完善。' },
  { title: '中药标准与制剂', body: '药典一部收载中药，包括药材和饮片、植物油脂和提取物、成方制剂和单味制剂。对每味中药规定了来源、性状、鉴别、检查、含量测定等项目，确保质量可控。\n\n制剂通则规定了丸、散、膏、丹、汤、酒等传统剂型的制备要求。药典既保留了传统中药的特色，又引入现代分析技术，实现中医药的标准化、规范化，促进中医药的传承与发展。' },
  { title: '中医药走向世界', image: '屠呦呦工作室.jpg' },
  { title: '持续修订与创新', body: '药典定期修订，一般每五年出版新版。历版药典不断增修订品种，完善检测方法，提高标准水平。近年来，药典加强了对中药安全性、有效性的研究与评价，引入指纹图谱、多成分含量测定等现代技术。\n\n药典的持续更新，反映了国家对药品质量的高度重视，也体现了中医药与现代科技融合的发展趋势，为保障公众用药安全、推动中医药国际化奠定基础。' },
  { title: '中西医结合', body: '新中国成立后，国家高度重视中医药事业。1955年中国中医研究院（现中国中医科学院）成立，标志着中医药科研进入新阶段。\n\n中西医结合成为重要发展方向，既发挥中医药整体观念、辨证论治之优势，又借鉴现代医学的诊疗技术。青蒿素的发现即是典型：从东晋葛洪《肘后备急方》"青蒿一握绞汁"治疟的记载出发，经现代科学提取、验证，终获诺贝尔奖，彰显了中医药的独特价值。' },
  { title: '结语', body: '《中华人民共和国药典》是保障药品质量、规范中医药发展的国家法定标准。新中国成立以来，中医药事业得到国家高度重视，中医研究院成立、青蒿素发现获诺贝尔奖、中医药法颁布、中医药抗疫等，标志着中医药在传承中创新、在创新中发展。\n\n药典的持续修订与完善，与屠呦呦等科学家的卓越贡献一道，推动中医药走向现代化、国际化，为人类健康事业作出重要贡献。' },
]

function openBook() {
  if (!bookOpen.value) {
    bookOpen.value = true
    bookSpreadIndex.value = 0
  }
}

function turnBookLeft() {
  if (!bookOpen.value) return
  if (bookSpreadIndex.value > 0) bookSpreadIndex.value--
}

function turnBookRight() {
  if (!bookOpen.value) return
  if (bookSpreadIndex.value < 2) bookSpreadIndex.value++
}

function canTurnPrev() {
  return bookOpen.value && bookSpreadIndex.value > 0
}

function canTurnNext() {
  return bookOpen.value && bookSpreadIndex.value < 2
}

function leftPageContent() {
  const i = bookSpreadIndex.value * 2
  return BOOK_PAGES[i] || null
}

function rightPageContent() {
  const i = bookSpreadIndex.value * 2 + 1
  return BOOK_PAGES[i] || null
}

function onBookClick(e) {
  if (!bookOpen.value) return
  const rect = e.currentTarget.getBoundingClientRect()
  const x = e.clientX - rect.left
  if (x < rect.width / 2) turnBookLeft()
  else turnBookRight()
}

watch(
  () => props.dynasty?.id,
  (id) => {
    if (id !== 'xiandai') return
    nextTick(() => {
      const root = xiandaiRootRef.value
      if (!root) return
      root.addEventListener('wheel', xiandaiHandleWheel, { passive: false })
      const container = root.querySelector('.xiandai-scroll-container')
      if (container) gsap.set(container, { y: '0vh' })
      const thirdInner = root.querySelector('.xiandai-third-inner')
      if (thirdInner) thirdInner.scrollTop = 0
      xiandaiFlipActiveIndex.value = 0
      emit('page-change', 0)
      bookOpen.value = false
      bookSpreadIndex.value = 0
    })
  },
  { immediate: true }
)
onBeforeUnmount(() => {
  const root = xiandaiRootRef.value
  if (root) root.removeEventListener('wheel', xiandaiHandleWheel)
})
</script>

<template>
  <div
    ref="xiandaiRootRef"
    class="xiandai-root"
    :class="{ 'xiandai-root--fullscreen': xiandaiFlipActiveIndex <= 1 }"
  >
    <button type="button" class="xiandai-back-float" @click="emit('back')" aria-label="返回">
      <ArrowLeft :size="20" class="xiandai-back-float__icon" />
      <span>返回</span>
    </button>

    <div
      v-show="dynasty"
      class="xiandai-fixed-bg"
      :class="{ 'xiandai-fixed-bg--fade': xiandaiFlipActiveIndex === 2 }"
      aria-hidden="true"
    >
      <img :src="getPhotoUrl(dynasty.heroImage)" :alt="dynasty.name" class="xiandai-fixed-bg__img" />
    </div>

    <div class="xiandai-flip-viewport">
      <div class="xiandai-scroll-container">
        <section class="xiandai-screen xiandai-screen-1">
          <div class="xiandai-curtain__gradient"></div>
          <div class="xiandai-curtain__center">
            <h2 class="xiandai-curtain__name">{{ dynasty.name }}</h2>
            <div class="xiandai-curtain__divider">
              <span class="hero-line"></span>
              <span class="hero-diamond"></span>
              <span class="hero-line"></span>
            </div>
            <p class="xiandai-curtain__period">{{ dynasty.period }}</p>
          </div>
          <div class="xiandai-curtain__overview">
            <p class="xiandai-curtain__overview-text">{{ dynasty.overview }}</p>
          </div>
        </section>

        <section class="xiandai-screen xiandai-screen-2">
          <div class="xiandai-magazine">
            <div class="xiandai-magazine__col">
              <p class="xiandai-magazine__p">新中国成立后，中医药事业得到国家高度重视。1955年中国中医研究院成立，标志着中医药科研进入新阶段。屠呦呦团队从中药青蒿中提取出青蒿素，有效解决抗疟难题，拯救数百万生命，2015年荣获诺贝尔生理学或医学奖，使中医药在世界舞台绽放光彩。</p>
              <p class="xiandai-magazine__p">屠呦呦生于1930年，中国中医科学院终身研究员。1969年接受抗疟药研究任务，从东晋葛洪《肘后备急方》"青蒿一握，以水二升渍，绞取汁，尽服之"的记载中获得灵感，历经190余次失败，最终用乙醚低温萃取法成功提取青蒿素。青蒿素及其衍生物已成为全球抗疟一线药物，被誉为"拯救人类生命的发现"。</p>
              <p class="xiandai-magazine__p">《中华人民共和国药典》作为国家药品标准，自1953年首版以来持续修订，收载中药、化学药、生物制品等，规范药品质量，促进中医药标准化。中西医结合成为重要发展方向，既发挥中医药辨证论治之优势，又借鉴现代医学诊疗技术，形成独具特色的中国医学体系。</p>
              <p class="xiandai-magazine__p">2016年《中华人民共和国中医药法》正式施行，从法律层面保障和促进中医药事业发展。2020年新冠疫情中，中医药深度参与救治，清肺排毒汤等方剂在临床中发挥重要作用。中医药的传承与创新并进，与现代科技深度融合，为人类健康作出重要贡献。</p>
              <p class="xiandai-magazine__p">综观现代，从青蒿素获诺奖到药典不断完善，从中医研究院成立到中医药法颁布，中医药事业蓬勃发展，传承千年智慧，走向世界舞台。</p>
            </div>
            <div class="xiandai-magazine__divider"></div>
            <div class="xiandai-magazine__col">
              <p class="xiandai-magazine__p">屠呦呦因发现青蒿素获得2015年诺贝尔生理学或医学奖，成为首位获科学类诺贝尔奖的中国本土科学家。她从古籍中获得启发，用现代科学方法加以验证，彰显了中医药的独特价值与创新活力。</p>
              <img :src="getPhotoUrl('屠呦呦诺贝尔奖.jpg')" alt="屠呦呦诺贝尔奖" class="xiandai-magazine__img" @error="($e) => ($e.target.style.display = 'none')" />
            </div>
          </div>
        </section>

        <section class="xiandai-screen xiandai-screen-3 xiandai-figures-dark" :style="{ backgroundImage: `url(${getPhotoUrl('朝代背景10.jpg')})` }">
          <div class="xiandai-third-inner">
            <div class="xiandai-figures-row xiandai-figures-row--single">
              <div class="xiandai-figure-cell xiandai-figure-cell--center">
                <img :src="getPhotoUrl('屠呦呦.jpg')" alt="屠呦呦" class="xiandai-figure-img" @error="($e) => ($e.target.src = getPhotoUrl(dynasty.heroImage))" />
                <div class="xiandai-figure-text">
                  <h4 class="xiandai-figure-title">屠呦呦</h4>
                  <p class="xiandai-figure-desc">中国中医科学院终身研究员，发现青蒿素，获2015年诺贝尔生理学或医学奖。从葛洪《肘后备急方》获启发，用现代科学提取青蒿素，拯救数百万生命，使中医药获得世界认可。</p>
                </div>
              </div>
            </div>
            <div class="xiandai-book-wrap">
              <div class="xiandai-book" :class="{ 'xiandai-book--open': bookOpen }">
                <div v-if="!bookOpen" class="xiandai-book-cover" @click="openBook">
                  <span class="xiandai-book-cover__title">《中华人民共和国药典》</span>
                  <span class="xiandai-book-cover__hint">点击翻阅</span>
                </div>
                <div v-else class="xiandai-book-spread" @click="onBookClick">
                  <span class="xiandai-book-spread-hint">点击左侧往前翻，右侧往后翻</span>
                  <div class="xiandai-book-spread-row">
                    <button type="button" class="xiandai-book-turn xiandai-book-turn--prev" :disabled="!canTurnPrev()" @click.stop="turnBookLeft" aria-label="上一页">
                      <ChevronLeft :size="24" />
                    </button>
                    <div class="xiandai-book-inner">
                      <div class="xiandai-book-half xiandai-book-half--left">
                        <template v-if="leftPageContent()">
                          <template v-if="leftPageContent().image">
                            <div class="xiandai-book-page__img-wrap">
                              <img :src="getPhotoUrl(leftPageContent().image)" :alt="leftPageContent().title" class="xiandai-book-page__img" @error="($e) => ($e.target.style.display = 'none')" />
                            </div>
                            <p class="xiandai-book-page__meta">第 {{ bookSpreadIndex * 2 + 1 }} 页</p>
                          </template>
                          <template v-else>
                            <h5 class="xiandai-book-page__title">{{ leftPageContent().title }}</h5>
                            <p class="xiandai-book-page__body">{{ leftPageContent().body }}</p>
                            <p class="xiandai-book-page__meta">第 {{ bookSpreadIndex * 2 + 1 }} 页</p>
                          </template>
                        </template>
                      </div>
                      <div class="xiandai-book-spine"></div>
                      <div class="xiandai-book-half xiandai-book-half--right">
                        <template v-if="rightPageContent()">
                          <template v-if="rightPageContent().image">
                            <div class="xiandai-book-page__img-wrap">
                              <img :src="getPhotoUrl(rightPageContent().image)" :alt="rightPageContent().title" class="xiandai-book-page__img" @error="($e) => ($e.target.style.display = 'none')" />
                            </div>
                            <p class="xiandai-book-page__meta">第 {{ bookSpreadIndex * 2 + 2 }} 页</p>
                          </template>
                          <template v-else>
                            <h5 class="xiandai-book-page__title">{{ rightPageContent().title }}</h5>
                            <p class="xiandai-book-page__body">{{ rightPageContent().body }}</p>
                            <p class="xiandai-book-page__meta">第 {{ bookSpreadIndex * 2 + 2 }} 页</p>
                          </template>
                        </template>
                      </div>
                    </div>
                    <button type="button" class="xiandai-book-turn xiandai-book-turn--next" :disabled="!canTurnNext()" @click.stop="turnBookRight" aria-label="下一页">
                      <ChevronRight :size="24" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <section class="xiandai-achievements-bar">
              <div class="xiandai-achievements-bar__row">
                <div class="xiandai-achievements-bar__main">
                  <h3 class="xiandai-achievements-bar__title">主要成就</h3>
                  <div class="xiandai-achievements-bar__grid">
                    <div v-for="(item, idx) in dynasty.achievements" :key="idx" class="xiandai-achievement-item">
                      <span class="xiandai-achievement-item__year">{{ item.year }}</span>
                      <h4 class="xiandai-achievement-item__title">{{ item.title }}</h4>
                      <p class="xiandai-achievement-item__desc">{{ item.description }}</p>
                    </div>
                  </div>
                </div>
                <div class="xiandai-achievements-bar__nav">
                  <button v-if="adjacent.prev" class="xiandai-nav-btn" @click="emit('go-to-dynasty', adjacent.prev.id)">
                    <ArrowLeft :size="18" />
                    <span>{{ adjacent.prev.name }}</span>
                  </button>
                  <button v-if="adjacent.next" class="xiandai-nav-btn" @click="emit('go-to-dynasty', adjacent.next.id)">
                    <span>{{ adjacent.next.name }}</span>
                    <ArrowRight :size="18" />
                  </button>
                </div>
              </div>
            </section>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<style scoped>
.xiandai-root {
  height: 100vh;
  overflow: hidden;
  overflow-x: hidden;
  overscroll-behavior: none;
}
.xiandai-root--fullscreen {
  height: 100vh;
}

.xiandai-fixed-bg {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  opacity: 1;
  transition: opacity 0.85s ease-out;
}
.xiandai-fixed-bg--fade {
  opacity: 0;
}
.xiandai-fixed-bg__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  filter: brightness(0.82) saturate(0.9);
}

.xiandai-back-float {
  position: fixed;
  left: 20px;
  top: 50%;
  transform: translateY(-50%);
  z-index: 50;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 16px;
  border-radius: 24px;
  border: 1px solid rgba(255,255,255,0.25);
  background: rgba(28, 24, 22, 0.6);
  backdrop-filter: blur(8px);
  color: rgba(255,255,255,0.95);
  font-size: 0.9rem;
  font-family: inherit;
  letter-spacing: 2px;
  cursor: pointer;
  transition: background 0.2s, transform 0.2s;
}
.xiandai-back-float:hover {
  background: rgba(28, 24, 22, 0.85);
  transform: translateY(-50%) translateX(-2px);
}
.xiandai-back-float__icon {
  transform: rotate(180deg);
}

.xiandai-flip-viewport {
  position: relative;
  z-index: 1;
  height: 100vh;
  overflow: hidden;
  flex-shrink: 0;
}
.xiandai-scroll-container {
  width: 100%;
  height: 300vh;
  will-change: transform;
  display: flex;
  flex-direction: column;
}
.xiandai-screen {
  width: 100%;
  flex: 0 0 100vh;
  min-height: 0;
  position: relative;
  overflow: hidden;
}

.xiandai-screen-1 {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
}
.xiandai-curtain__gradient {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  height: 100%;
  background: linear-gradient(to top, rgba(28, 24, 22, 0.92) 0%, rgba(45, 38, 35, 0.5) 45%, transparent 100%);
  pointer-events: none;
}
.xiandai-curtain__center {
  position: absolute;
  left: 50%;
  top: 38vh;
  transform: translate(-50%, -50%);
  text-align: center;
  z-index: 2;
  pointer-events: none;
}
.xiandai-curtain__name {
  font-size: clamp(2.4rem, 5.5vw, 3.8rem);
  color: #fff;
  letter-spacing: 12px;
  margin: 0;
  text-shadow: 0 2px 24px rgba(0,0,0,0.5);
}
.xiandai-curtain__divider {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin: 10px 0;
  opacity: 0.85;
}
.xiandai-curtain__period {
  font-size: 1.05rem;
  color: rgba(255,255,255,0.88);
  letter-spacing: 3px;
  margin: 0;
}
.xiandai-curtain__overview {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 12vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 10vw;
  z-index: 2;
  box-sizing: border-box;
}
.xiandai-curtain__overview-text {
  font-size: 0.98rem;
  line-height: 1.9;
  color: rgba(255,255,255,0.82);
  margin: 0;
  text-align: center;
  max-width: 720px;
}

.xiandai-screen-2 {
  background: var(--bg);
}
.xiandai-magazine {
  width: 100%;
  height: 100%;
  min-height: 0;
  display: grid;
  grid-template-columns: 1fr 1px 1fr;
  gap: 0;
  align-items: start;
  padding: 6vh 6vw 5vh;
  overflow: hidden;
  box-sizing: border-box;
}
.hero-line { width: 36px; height: 1px; background: rgba(255,255,255,0.6); }
.hero-diamond { width: 6px; height: 6px; background: #C44E46; transform: rotate(45deg); }

.xiandai-magazine__col { padding: 0 2.5rem; }
.xiandai-magazine__p {
  font-size: 0.95rem;
  line-height: 2;
  color: var(--primary-dark);
  margin: 0 0 1.2em;
  text-align: justify;
}
.xiandai-magazine__p:last-of-type { margin-bottom: 0; }
.xiandai-magazine__img {
  width: 100%;
  max-width: 100%;
  margin-top: 1em;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.12);
  object-fit: cover;
  display: block;
}
.xiandai-magazine__divider {
  width: 1px;
  min-height: 120px;
  background: rgba(139, 94, 60, 0.2);
}

.xiandai-figures-dark {
  box-sizing: border-box;
  background-color: #6b5d4d;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  padding: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  overflow: hidden;
}
.xiandai-third-inner {
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 12px 4vw 24px;
  -webkit-overflow-scrolling: touch;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.xiandai-figures-row {
  display: flex;
  align-items: stretch;
  justify-content: center;
  gap: 0;
  width: 100%;
  max-width: 1000px;
  margin: 0 auto 16px;
  flex-shrink: 0;
}
.xiandai-figures-row--single {
  justify-content: center;
  width: 100%;
}
.xiandai-figure-cell {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  max-width: 320px;
}
.xiandai-figure-cell--center {
  align-items: center;
  flex: none;
  max-width: 280px;
  margin-left: auto;
  margin-right: auto;
}
.xiandai-figure-img {
  width: 100%;
  max-width: 140px;
  aspect-ratio: 3/4;
  object-fit: cover;
  border-radius: 10px;
  box-shadow: 0 8px 28px rgba(0,0,0,0.4);
}
.xiandai-figure-cell--center .xiandai-figure-text {
  margin-left: 0;
  margin-right: 0;
  text-align: center;
  padding: 12px 10px;
}
.xiandai-figure-text {
  margin-top: 10px;
  max-width: 100%;
  padding: 12px 10px;
  border-radius: 8px;
  background: rgba(253, 251, 247, 0.92);
  border: 1px solid rgba(139, 94, 60, 0.12);
}
.xiandai-figure-title {
  font-size: 1rem;
  font-weight: 600;
  color: #2c2c2c;
  margin: 0 0 6px;
  letter-spacing: 2px;
}
.xiandai-figure-desc {
  font-size: 0.8rem;
  line-height: 1.65;
  color: #3d3629;
  margin: 0;
}

.xiandai-book-wrap {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px 0;
  margin: 8px 0;
}
.xiandai-book {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  max-width: 90vw;
  min-height: 200px;
  max-height: min(42vh, 280px);
}
.xiandai-book-cover {
  cursor: pointer;
  width: clamp(100px, 14vw, 160px);
  height: clamp(170px, 24vw, 260px);
  background: linear-gradient(145deg, #9c8d7a 0%, #857665 100%);
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 6px;
  box-shadow: 0 16px 48px rgba(0,0,0,0.5);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}
.xiandai-book-cover:hover {
  transform: scale(1.02);
  box-shadow: 0 20px 56px rgba(0,0,0,0.6);
}
.xiandai-book-cover__title {
  font-size: clamp(0.75rem, 1.4vw, 0.95rem);
  font-weight: 600;
  color: rgba(255,255,255,0.9);
  letter-spacing: 2px;
  text-align: center;
  padding: 0 8px;
}
.xiandai-book-cover__hint {
  font-size: 0.7rem;
  color: rgba(255,255,255,0.5);
  letter-spacing: 2px;
}
.xiandai-book-spread {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  height: 100%;
  cursor: pointer;
}
.xiandai-book-spread-hint {
  font-size: 0.7rem;
  color: rgba(255,255,255,0.5);
  letter-spacing: 1px;
  flex-shrink: 0;
}
.xiandai-book-spread-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  flex: 1;
  min-height: 0;
  width: 100%;
}
.xiandai-book-spread-row .xiandai-book-turn { flex-shrink: 0; }
.xiandai-book-spread-row .xiandai-book-inner { flex: 1; min-height: 0; }
.xiandai-book-turn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 1px solid rgba(255,255,255,0.25);
  background: rgba(255,255,255,0.08);
  color: rgba(255,255,255,0.9);
  cursor: pointer;
  flex-shrink: 0;
  transition: background 0.2s, opacity 0.2s;
}
.xiandai-book-turn:hover:not(:disabled) {
  background: rgba(255,255,255,0.18);
}
.xiandai-book-turn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}
.xiandai-book-inner {
  display: flex;
  width: 100%;
  max-width: min(90vw, 720px);
  min-height: 260px;
  max-height: min(50vh, 400px);
  background: linear-gradient(145deg, #f5f0e8 0%, #e8e0d5 100%);
  border: 1px solid rgba(139, 94, 60, 0.2);
  border-radius: 8px;
  box-shadow: 0 12px 40px rgba(0,0,0,0.35);
  overflow: hidden;
}
.xiandai-book-half {
  flex: 1;
  min-width: 0;
  min-height: 200px;
  padding: 16px 14px;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}
.xiandai-book-page__img-wrap {
  width: 100%;
  height: 100%;
  min-height: 240px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-radius: 4px;
}
.xiandai-book-page__img {
  max-width: 100%;
  width: auto;
  height: 100%;
  min-height: 240px;
  object-fit: contain;
  display: block;
}
.xiandai-book-spine {
  width: 4px;
  background: linear-gradient(to right, rgba(139, 94, 60, 0.15), rgba(139, 94, 60, 0.35), rgba(139, 94, 60, 0.15));
  flex-shrink: 0;
}
.xiandai-book-page__title {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--primary-dark);
  margin: 0 0 10px;
  letter-spacing: 1px;
  padding-bottom: 6px;
  border-bottom: 1px solid rgba(139, 94, 60, 0.2);
}
.xiandai-book-page__body {
  font-size: 0.8rem;
  line-height: 1.9;
  color: var(--primary-dark);
  margin: 0;
  white-space: pre-line;
}
.xiandai-book-page__meta {
  font-size: 0.7rem;
  color: var(--text-secondary);
  margin-top: 12px;
  text-align: right;
}

.xiandai-achievements-bar {
  margin-top: 20px;
  padding: 28px 0 24px;
  background: linear-gradient(180deg, rgba(235, 229, 220, 0.92) 0%, rgba(224, 216, 204, 0.95) 100%);
  border-radius: 12px;
  border: 1px solid rgba(139, 94, 60, 0.18);
  flex-shrink: 0;
}
.xiandai-screen-3 .xiandai-achievements-bar {
  padding-left: 6vw;
  padding-right: 6vw;
  margin-left: -2vw;
  margin-right: -2vw;
  border-radius: 0;
}
.xiandai-achievements-bar__row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  max-width: 1000px;
  margin: 0 auto;
}
.xiandai-achievements-bar__title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--primary-dark);
  margin: 0 0 16px;
  letter-spacing: 2px;
  display: flex;
  align-items: center;
  gap: 10px;
}
.xiandai-achievements-bar__title::before {
  content: '';
  width: 3px;
  height: 16px;
  background: var(--accent-red);
  border-radius: 2px;
}
.xiandai-achievements-bar__grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px 24px;
}
.xiandai-achievement-item {
  padding: 12px 0;
  border-bottom: 1px solid rgba(139, 94, 60, 0.12);
}
.xiandai-achievement-item__year {
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--accent-red);
  background: rgba(196, 78, 70, 0.1);
  padding: 2px 8px;
  border-radius: 4px;
  margin-bottom: 6px;
  display: inline-block;
}
.xiandai-achievement-item__title {
  font-size: 0.92rem;
  font-weight: 600;
  color: var(--primary-dark);
  margin: 0 0 4px;
}
.xiandai-achievement-item__desc {
  font-size: 0.82rem;
  color: var(--text-secondary);
  margin: 0;
  line-height: 1.5;
}
.xiandai-achievements-bar__nav {
  flex-shrink: 0;
  display: flex;
  gap: 12px;
}
.xiandai-nav-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  border-radius: 10px;
  border: 1px solid rgba(139, 94, 60, 0.25);
  background: rgba(255, 255, 255, 0.7);
  color: var(--primary-dark);
  font-family: inherit;
  font-size: 0.9rem;
  font-weight: 600;
  letter-spacing: 2px;
  cursor: pointer;
  transition: background 0.2s, border-color 0.2s;
}
.xiandai-nav-btn:hover {
  background: rgba(255, 255, 255, 0.95);
  border-color: var(--primary);
}

@media (max-width: 640px) {
  .xiandai-curtain__overview { padding: 20px 6vw 36px; }
  .xiandai-magazine {
    grid-template-columns: 1fr;
    padding: 24px 5vw 32px;
  }
  .xiandai-magazine .xiandai-magazine__divider {
    width: 100%;
    height: 1px;
    min-height: 0;
    margin: 8px 0;
  }
  .xiandai-magazine .xiandai-magazine__col { padding: 0 0.5rem; }
  .xiandai-back-float { left: 12px; padding: 8px 12px; font-size: 0.85rem; }
  .xiandai-figure-cell--center { max-width: 100%; }
  .xiandai-book { min-height: 180px; max-height: min(38vh, 240px); }
  .xiandai-book-cover { width: clamp(90px, 22vw, 130px); height: clamp(150px, 38vw, 220px); }
  .xiandai-book-cover__title { font-size: clamp(0.7rem, 2.5vw, 0.85rem); }
  .xiandai-book-inner { min-height: 260px; max-height: 52vh; }
  .xiandai-book-half { min-height: 220px; }
  .xiandai-book-page__img-wrap { min-height: 200px; }
  .xiandai-book-page__img { min-height: 200px; }
  .xiandai-achievements-bar__row { flex-direction: column; }
  .xiandai-achievements-bar__grid { grid-template-columns: 1fr; }
}
</style>

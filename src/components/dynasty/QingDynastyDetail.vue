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

const qingRootRef = ref(null)
const qingFlipActiveIndex = ref(0)
const qingIsAnimating = ref(false)
const QING_TOTAL_PAGES = 3

const VH_PER_PAGE = 100

function qingMoveTo(index) {
  if (index < 0 || index >= QING_TOTAL_PAGES) return
  if (qingIsAnimating.value) return
  qingIsAnimating.value = true
  const container = qingRootRef.value?.querySelector('.qing-scroll-container')
  if (!container) {
    qingFlipActiveIndex.value = index
    emit('page-change', index)
    qingIsAnimating.value = false
    return
  }
  const fromIndex = qingFlipActiveIndex.value
  qingFlipActiveIndex.value = index
  emit('page-change', index)

  if (qingRootRef.value) {
    const thirdInner = qingRootRef.value.querySelector('.qing-third-inner')
    if (thirdInner) thirdInner.scrollTop = 0
  }

  const yVh = -index * VH_PER_PAGE
  gsap.to(container, {
    y: `${yVh}vh`,
    duration: fromIndex === 0 && index === 1 ? 1 : 0.9,
    ease: 'power2.inOut',
    overwrite: true,
    onComplete: () => { qingIsAnimating.value = false },
  })
}

function qingHandleWheel(e) {
  if (!qingRootRef.value || !props.dynasty || props.dynasty.id !== 'qing') return
  const root = qingRootRef.value
  if (qingFlipActiveIndex.value === 2) {
    const thirdInner = root.querySelector('.qing-third-inner')
    if (thirdInner) {
      const atTop = thirdInner.scrollTop <= 2
      const atBottom = thirdInner.scrollTop + thirdInner.clientHeight >= thirdInner.scrollHeight - 2
      if (e.deltaY > 0 && !atBottom) return
      if (e.deltaY < 0 && !atTop) return
      if (e.deltaY < 0 && atTop) {
        e.preventDefault()
        if (qingIsAnimating.value) return
        if (Math.abs(e.deltaY) < 18) return
        qingMoveTo(1)
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
  if (qingIsAnimating.value) return
  if (Math.abs(e.deltaY) < 18) return
  if (e.deltaY > 0) {
    if (qingFlipActiveIndex.value < QING_TOTAL_PAGES - 1) qingMoveTo(qingFlipActiveIndex.value + 1)
  } else {
    qingMoveTo(qingFlipActiveIndex.value - 1)
  }
}

// 典籍：《温病条辨》，6 页，其中第 3 页为图片
const bookOpen = ref(false)
const bookSpreadIndex = ref(0)
const BOOK_PAGES = [
  { title: '温病条辨自序', body: '夫立德立功立言，圣贤事也。瑭何人斯，敢以自任？缘瑭十九岁时，父病年余，至于不起，瑭愧恨难名，哀痛欲绝，以为父病不知医，尚复何颜立天地间。遂购方书，伏读于苫块之余，至张长沙"外逐荣势，内忘身命"之论，因慨然弃举子业，专事方术。\n\n历取诸贤精妙，考之《内经》，参以心得，十稔而后著成是书。盖以温病之法，度越前人，非敢妄逞私见，实本诸天士先生之旨，而参以诸家之说焉。' },
  { title: '三焦辨证与上焦篇', body: '是书也，以三焦为纲，病名为目。上焦篇凡五十八条，手太阴暑温、风湿、温热、温疫、温毒、冬温，一一辨之。\n\n温病由口鼻而入，自上而下，鼻通于肺，始于手太阴。上焦治法，亦必以轻清为主。伤寒由毛窍而入，自下而上，始于足太阳。温病与伤寒，源头各异，治法自殊。叶氏云：温邪上受，首先犯肺，逆传心包。学者当细察之。' },
  { title: '清代温病学说', image: '清代温病学说.jpg' },
  { title: '中焦与下焦治法', body: '中焦篇凡一百零二条，以阳明、太阴为中心。阳明温病，下之不通，其证有五，承气诸法随证加减。太阴温病，不可发汗，发汗而汗不出者，必发斑疹。\n\n下焦篇凡七十八条，以少阴、厥阴为主。热邪深入，或在少阴，或在厥阴，均宜复脉辈。盖少阴藏精，厥阴必待少阴精足而后能生。治温病者，当步步护其阴液。' },
  { title: '银翘散与桑菊饮', body: '银翘散辛凉平剂，治太阴温病初起，但热不恶寒而渴者。方中银花、连翘清热解毒，薄荷、荆芥、豆豉辛散透邪，桔梗、牛蒡、甘草宣肺利咽，芦根生津止渴。\n\n桑菊饮辛凉轻剂，治风湿但咳、身不甚热、微渴者。桑叶、菊花清透肺络，杏仁、桔梗宣肺止咳，连翘、芦根清热生津。二方至今仍为温病初起之常用方，影响深远。' },
  { title: '结语', body: '吴鞠通取法叶天士，著《温病条辨》，以三焦为纲、病名为目，系统论述风温、温热、温疫、温毒、暑温、湿温、秋燥、冬温诸病，确立温病辨治体系。\n\n清代温病学派与伤寒学派并立，卫气营血辨证与三焦辨证相辅相成，银翘散、桑菊饮、清营汤、加减复脉汤等名方流传至今，对发热性、传染性疾病的辨证论治影响深远，为中医临床之重要瑰宝。' },
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
    if (id !== 'qing') return
    nextTick(() => {
      const root = qingRootRef.value
      if (!root) return
      root.addEventListener('wheel', qingHandleWheel, { passive: false })
      const container = root.querySelector('.qing-scroll-container')
      if (container) gsap.set(container, { y: '0vh' })
      const thirdInner = root.querySelector('.qing-third-inner')
      if (thirdInner) thirdInner.scrollTop = 0
      qingFlipActiveIndex.value = 0
      emit('page-change', 0)
      bookOpen.value = false
      bookSpreadIndex.value = 0
    })
  },
  { immediate: true }
)
onBeforeUnmount(() => {
  const root = qingRootRef.value
  if (root) root.removeEventListener('wheel', qingHandleWheel)
})
</script>

<template>
  <div
    ref="qingRootRef"
    class="qing-root"
    :class="{ 'qing-root--fullscreen': qingFlipActiveIndex <= 1 }"
  >
    <button type="button" class="qing-back-float" @click="emit('back')" aria-label="返回">
      <ArrowLeft :size="20" class="qing-back-float__icon" />
      <span>返回</span>
    </button>

    <div
      v-show="dynasty"
      class="qing-fixed-bg"
      :class="{ 'qing-fixed-bg--fade': qingFlipActiveIndex === 2 }"
      aria-hidden="true"
    >
      <img :src="getPhotoUrl(dynasty.heroImage)" :alt="dynasty.name" class="qing-fixed-bg__img" />
    </div>

    <div class="qing-flip-viewport">
      <div class="qing-scroll-container">
        <section class="qing-screen qing-screen-1">
          <div class="qing-curtain__gradient"></div>
          <div class="qing-curtain__center">
            <h2 class="qing-curtain__name">{{ dynasty.name }}</h2>
            <div class="qing-curtain__divider">
              <span class="hero-line"></span>
              <span class="hero-diamond"></span>
              <span class="hero-line"></span>
            </div>
            <p class="qing-curtain__period">{{ dynasty.period }}</p>
          </div>
          <div class="qing-curtain__overview">
            <p class="qing-curtain__overview-text">{{ dynasty.overview }}</p>
          </div>
        </section>

        <section class="qing-screen qing-screen-2">
          <div class="qing-magazine">
            <div class="qing-magazine__col">
              <p class="qing-magazine__p">清代温病学派成熟，与伤寒学派并立，形成中医外感病辨治之双璧。叶天士创立卫气营血辨证，口述《温热论》，阐发"温邪上受，首先犯肺，逆传心包"；吴鞠通著《温病条辨》，以三焦为纲、病名为目，确立三焦辨证体系，银翘散、桑菊饮等名方流传至今。</p>
              <p class="qing-magazine__p">叶天士名桂，字天士，苏州人。少承家学，博览医籍，又遍访名师，融会各家。其论温病，分卫气营血四个层次，治则"在卫汗之可也，到气才可清气，入营犹可透热转气，入血就恐耗血动血，直须凉血散血"。门人整理其说，成《温热论》《临证指南医案》，为温病学奠基之作。</p>
              <p class="qing-magazine__p">吴鞠通名瑭，淮阴人。因父病而习医，师法叶天士，历十年著《温病条辨》六卷。其上焦篇治手太阴温病，创银翘散、桑菊饮；中焦篇治阳明、太阴；下焦篇治少阴、厥阴，创加减复脉汤、三甲复脉汤等。全书条分缕析，方证对应，为温病学之系统教材，影响深远。</p>
              <p class="qing-magazine__p">清代除叶天士、吴鞠通外，薛生白著《湿热条辨》专论湿热，王孟英撰《温热经纬》荟萃诸家。温病学派在辨证、立法、处方诸方面均有建树，弥补了《伤寒论》对温病论述之不足，使中医对外感热病的诊治臻于完善。温病学与伤寒学并立，共同构成中医外感病学之完整体系。</p>
              <p class="qing-magazine__p">综观清代，温病学派理论成熟、方药齐备，对后世中医临床影响深远。银翘散、桑菊饮至今仍为感冒、流感等病之常用方剂。</p>
            </div>
            <div class="qing-magazine__divider"></div>
            <div class="qing-magazine__col">
              <p class="qing-magazine__p">叶天士为清代温病学奠基人，创卫气营血辨证，《温热论》为其学术代表。吴鞠通承叶氏之学，著《温病条辨》，确立三焦辨证，创银翘散、桑菊饮等名方，与叶天士并称温病大家。薛生白、王孟英等亦各有贡献，温病学派至此臻于成熟。</p>
              <img :src="getPhotoUrl('温病条辨.jpg')" alt="温病条辨" class="qing-magazine__img" @error="($e) => ($e.target.style.display = 'none')" />
            </div>
          </div>
        </section>

        <section class="qing-screen qing-screen-3 qing-figures-dark" :style="{ backgroundImage: `url(${getPhotoUrl('朝代背景9.jpg')})` }">
          <div class="qing-third-inner">
            <div class="qing-figures-row">
              <div class="qing-figure-cell qing-figure-cell--left">
                <img :src="getPhotoUrl('叶天士.jpg')" alt="叶天士" class="qing-figure-img" @error="($e) => ($e.target.src = getPhotoUrl(dynasty.heroImage))" />
                <div class="qing-figure-text">
                  <h4 class="qing-figure-title">叶天士</h4>
                  <p class="qing-figure-desc">温病学奠基人，创卫气营血辨证，口述《温热论》，阐发"温邪上受，首先犯肺"。</p>
                </div>
              </div>
              <div class="qing-figures__gap"></div>
              <div class="qing-figure-cell qing-figure-cell--right">
                <img :src="getPhotoUrl('吴鞠通.jpg')" alt="吴鞠通" class="qing-figure-img" @error="($e) => ($e.target.src = getPhotoUrl(dynasty.heroImage))" />
                <div class="qing-figure-text">
                  <h4 class="qing-figure-title">吴鞠通</h4>
                  <p class="qing-figure-desc">著《温病条辨》，确立三焦辨证，创银翘散、桑菊饮等名方，与叶天士并称温病大家。</p>
                </div>
              </div>
            </div>
            <div class="qing-book-wrap">
              <div class="qing-book" :class="{ 'qing-book--open': bookOpen }">
                <div v-if="!bookOpen" class="qing-book-cover" @click="openBook">
                  <span class="qing-book-cover__title">《温病条辨》</span>
                  <span class="qing-book-cover__hint">点击翻阅</span>
                </div>
                <div v-else class="qing-book-spread" @click="onBookClick">
                  <span class="qing-book-spread-hint">点击左侧往前翻，右侧往后翻</span>
                  <div class="qing-book-spread-row">
                    <button type="button" class="qing-book-turn qing-book-turn--prev" :disabled="!canTurnPrev()" @click.stop="turnBookLeft" aria-label="上一页">
                      <ChevronLeft :size="24" />
                    </button>
                    <div class="qing-book-inner">
                      <div class="qing-book-half qing-book-half--left">
                        <template v-if="leftPageContent()">
                          <template v-if="leftPageContent().image">
                            <div class="qing-book-page__img-wrap">
                              <img :src="getPhotoUrl(leftPageContent().image)" :alt="leftPageContent().title" class="qing-book-page__img" @error="($e) => ($e.target.style.display = 'none')" />
                            </div>
                            <p class="qing-book-page__meta">第 {{ bookSpreadIndex * 2 + 1 }} 页</p>
                          </template>
                          <template v-else>
                            <h5 class="qing-book-page__title">{{ leftPageContent().title }}</h5>
                            <p class="qing-book-page__body">{{ leftPageContent().body }}</p>
                            <p class="qing-book-page__meta">第 {{ bookSpreadIndex * 2 + 1 }} 页</p>
                          </template>
                        </template>
                      </div>
                      <div class="qing-book-spine"></div>
                      <div class="qing-book-half qing-book-half--right">
                        <template v-if="rightPageContent()">
                          <template v-if="rightPageContent().image">
                            <div class="qing-book-page__img-wrap">
                              <img :src="getPhotoUrl(rightPageContent().image)" :alt="rightPageContent().title" class="qing-book-page__img" @error="($e) => ($e.target.style.display = 'none')" />
                            </div>
                            <p class="qing-book-page__meta">第 {{ bookSpreadIndex * 2 + 2 }} 页</p>
                          </template>
                          <template v-else>
                            <h5 class="qing-book-page__title">{{ rightPageContent().title }}</h5>
                            <p class="qing-book-page__body">{{ rightPageContent().body }}</p>
                            <p class="qing-book-page__meta">第 {{ bookSpreadIndex * 2 + 2 }} 页</p>
                          </template>
                        </template>
                      </div>
                    </div>
                    <button type="button" class="qing-book-turn qing-book-turn--next" :disabled="!canTurnNext()" @click.stop="turnBookRight" aria-label="下一页">
                      <ChevronRight :size="24" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <section class="qing-achievements-bar">
              <div class="qing-achievements-bar__row">
                <div class="qing-achievements-bar__main">
                  <h3 class="qing-achievements-bar__title">主要成就</h3>
                  <div class="qing-achievements-bar__grid">
                    <div v-for="(item, idx) in dynasty.achievements" :key="idx" class="qing-achievement-item">
                      <span class="qing-achievement-item__year">{{ item.year }}</span>
                      <h4 class="qing-achievement-item__title">{{ item.title }}</h4>
                      <p class="qing-achievement-item__desc">{{ item.description }}</p>
                    </div>
                  </div>
                </div>
                <div class="qing-achievements-bar__nav">
                  <button v-if="adjacent.prev" class="qing-nav-btn" @click="emit('go-to-dynasty', adjacent.prev.id)">
                    <ArrowLeft :size="18" />
                    <span>{{ adjacent.prev.name }}</span>
                  </button>
                  <button v-if="adjacent.next" class="qing-nav-btn" @click="emit('go-to-dynasty', adjacent.next.id)">
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
.qing-root {
  height: 100vh;
  overflow: hidden;
  overflow-x: hidden;
  overscroll-behavior: none;
}
.qing-root--fullscreen {
  height: 100vh;
}

.qing-fixed-bg {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  opacity: 1;
  transition: opacity 0.85s ease-out;
}
.qing-fixed-bg--fade {
  opacity: 0;
}
.qing-fixed-bg__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  filter: brightness(0.82) saturate(0.9);
}

.qing-back-float {
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
.qing-back-float:hover {
  background: rgba(28, 24, 22, 0.85);
  transform: translateY(-50%) translateX(-2px);
}
.qing-back-float__icon {
  transform: rotate(180deg);
}

.qing-flip-viewport {
  position: relative;
  z-index: 1;
  height: 100vh;
  overflow: hidden;
  flex-shrink: 0;
}
.qing-scroll-container {
  width: 100%;
  height: 300vh;
  will-change: transform;
  display: flex;
  flex-direction: column;
}
.qing-screen {
  width: 100%;
  flex: 0 0 100vh;
  min-height: 0;
  position: relative;
  overflow: hidden;
}

.qing-screen-1 {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
}
.qing-curtain__gradient {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  height: 100%;
  background: linear-gradient(to top, rgba(28, 24, 22, 0.92) 0%, rgba(45, 38, 35, 0.5) 45%, transparent 100%);
  pointer-events: none;
}
.qing-curtain__center {
  position: absolute;
  left: 50%;
  top: 38vh;
  transform: translate(-50%, -50%);
  text-align: center;
  z-index: 2;
  pointer-events: none;
}
.qing-curtain__name {
  font-size: clamp(2.4rem, 5.5vw, 3.8rem);
  color: #fff;
  letter-spacing: 12px;
  margin: 0;
  text-shadow: 0 2px 24px rgba(0,0,0,0.5);
}
.qing-curtain__divider {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin: 10px 0;
  opacity: 0.85;
}
.qing-curtain__period {
  font-size: 1.05rem;
  color: rgba(255,255,255,0.88);
  letter-spacing: 3px;
  margin: 0;
}
.qing-curtain__overview {
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
.qing-curtain__overview-text {
  font-size: 0.98rem;
  line-height: 1.9;
  color: rgba(255,255,255,0.82);
  margin: 0;
  text-align: center;
  max-width: 720px;
}

.qing-screen-2 {
  background: var(--bg);
}
.qing-magazine {
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

.qing-magazine__col { padding: 0 2.5rem; }
.qing-magazine__p {
  font-size: 0.95rem;
  line-height: 2;
  color: var(--primary-dark);
  margin: 0 0 1.2em;
  text-align: justify;
}
.qing-magazine__p:last-of-type { margin-bottom: 0; }
.qing-magazine__img {
  width: 100%;
  max-width: 100%;
  margin-top: 1em;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.12);
  object-fit: cover;
  display: block;
}
.qing-magazine__divider {
  width: 1px;
  min-height: 120px;
  background: rgba(139, 94, 60, 0.2);
}

.qing-figures-dark {
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
.qing-third-inner {
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 12px 4vw 24px;
  -webkit-overflow-scrolling: touch;
  box-sizing: border-box;
}
.qing-figures-row {
  display: flex;
  align-items: stretch;
  justify-content: center;
  gap: 0;
  width: 100%;
  max-width: 1000px;
  margin: 0 auto 10px;
  flex-shrink: 0;
}
.qing-figures__gap {
  width: clamp(32px, 5vw, 64px);
  flex-shrink: 0;
}
.qing-figure-cell {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  max-width: 320px;
}
.qing-figure-cell--left { align-items: flex-end; }
.qing-figure-cell--right { align-items: flex-start; }
.qing-figure-img {
  width: 100%;
  max-width: 140px;
  aspect-ratio: 3/4;
  object-fit: cover;
  border-radius: 10px;
  box-shadow: 0 8px 28px rgba(0,0,0,0.4);
}
.qing-figure-cell--left .qing-figure-text { margin-left: 0; text-align: right; padding-right: 12px; }
.qing-figure-cell--right .qing-figure-text { margin-right: 0; text-align: left; padding-left: 12px; }
.qing-figure-text {
  margin-top: 10px;
  max-width: 100%;
  padding: 12px 10px;
  border-radius: 8px;
  background: rgba(253, 251, 247, 0.92);
  border: 1px solid rgba(139, 94, 60, 0.12);
}
.qing-figure-title {
  font-size: 1rem;
  font-weight: 600;
  color: #2c2c2c;
  margin: 0 0 6px;
  letter-spacing: 2px;
}
.qing-figure-desc {
  font-size: 0.8rem;
  line-height: 1.65;
  color: #3d3629;
  margin: 0;
}

.qing-book-wrap {
  flex: 1;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px 0;
}
.qing-book {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  max-width: 90vw;
  height: 100%;
  min-height: 280px;
  max-height: 72vh;
}
.qing-book-cover {
  cursor: pointer;
  width: clamp(140px, 18vw, 200px);
  height: clamp(240px, 32vw, 340px);
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
.qing-book-cover:hover {
  transform: scale(1.02);
  box-shadow: 0 20px 56px rgba(0,0,0,0.6);
}
.qing-book-cover__title {
  font-size: clamp(0.85rem, 1.6vw, 1rem);
  font-weight: 600;
  color: rgba(255,255,255,0.9);
  letter-spacing: 2px;
  text-align: center;
  padding: 0 8px;
}
.qing-book-cover__hint {
  font-size: 0.7rem;
  color: rgba(255,255,255,0.5);
  letter-spacing: 2px;
}
.qing-book-spread {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  height: 100%;
  cursor: pointer;
}
.qing-book-spread-hint {
  font-size: 0.7rem;
  color: rgba(255,255,255,0.5);
  letter-spacing: 1px;
  flex-shrink: 0;
}
.qing-book-spread-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  flex: 1;
  min-height: 0;
  width: 100%;
}
.qing-book-spread-row .qing-book-turn { flex-shrink: 0; }
.qing-book-spread-row .qing-book-inner { flex: 1; min-height: 0; }
.qing-book-turn {
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
.qing-book-turn:hover:not(:disabled) {
  background: rgba(255,255,255,0.18);
}
.qing-book-turn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}
.qing-book-inner {
  display: flex;
  width: 100%;
  max-width: min(90vw, 720px);
  height: 100%;
  min-height: 320px;
  max-height: 65vh;
  background: linear-gradient(145deg, #f5f0e8 0%, #e8e0d5 100%);
  border: 1px solid rgba(139, 94, 60, 0.2);
  border-radius: 8px;
  box-shadow: 0 12px 40px rgba(0,0,0,0.35);
  overflow: hidden;
}
.qing-book-half {
  flex: 1;
  min-width: 0;
  min-height: 280px;
  padding: 16px 14px;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}
.qing-book-page__img-wrap {
  width: 100%;
  height: 100%;
  min-height: 240px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-radius: 4px;
}
.qing-book-page__img {
  max-width: 100%;
  width: auto;
  height: 100%;
  min-height: 240px;
  object-fit: contain;
  display: block;
}
.qing-book-spine {
  width: 4px;
  background: linear-gradient(to right, rgba(139, 94, 60, 0.15), rgba(139, 94, 60, 0.35), rgba(139, 94, 60, 0.15));
  flex-shrink: 0;
}
.qing-book-page__title {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--primary-dark);
  margin: 0 0 10px;
  letter-spacing: 1px;
  padding-bottom: 6px;
  border-bottom: 1px solid rgba(139, 94, 60, 0.2);
}
.qing-book-page__body {
  font-size: 0.8rem;
  line-height: 1.9;
  color: var(--primary-dark);
  margin: 0;
  white-space: pre-line;
}
.qing-book-page__meta {
  font-size: 0.7rem;
  color: var(--text-secondary);
  margin-top: 12px;
  text-align: right;
}

.qing-achievements-bar {
  margin-top: 24px;
  padding: 28px 0 24px;
  background: linear-gradient(180deg, rgba(235, 229, 220, 0.92) 0%, rgba(224, 216, 204, 0.95) 100%);
  border-radius: 12px;
  border: 1px solid rgba(139, 94, 60, 0.18);
  flex-shrink: 0;
}
.qing-screen-3 .qing-achievements-bar {
  padding-left: 6vw;
  padding-right: 6vw;
  margin-left: -2vw;
  margin-right: -2vw;
  border-radius: 0;
}
.qing-achievements-bar__row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  max-width: 1000px;
  margin: 0 auto;
}
.qing-achievements-bar__title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--primary-dark);
  margin: 0 0 16px;
  letter-spacing: 2px;
  display: flex;
  align-items: center;
  gap: 10px;
}
.qing-achievements-bar__title::before {
  content: '';
  width: 3px;
  height: 16px;
  background: var(--accent-red);
  border-radius: 2px;
}
.qing-achievements-bar__grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px 24px;
}
.qing-achievement-item {
  padding: 12px 0;
  border-bottom: 1px solid rgba(139, 94, 60, 0.12);
}
.qing-achievement-item__year {
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--accent-red);
  background: rgba(196, 78, 70, 0.1);
  padding: 2px 8px;
  border-radius: 4px;
  margin-bottom: 6px;
  display: inline-block;
}
.qing-achievement-item__title {
  font-size: 0.92rem;
  font-weight: 600;
  color: var(--primary-dark);
  margin: 0 0 4px;
}
.qing-achievement-item__desc {
  font-size: 0.82rem;
  color: var(--text-secondary);
  margin: 0;
  line-height: 1.5;
}
.qing-achievements-bar__nav {
  flex-shrink: 0;
  display: flex;
  gap: 12px;
}
.qing-nav-btn {
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
.qing-nav-btn:hover {
  background: rgba(255, 255, 255, 0.95);
  border-color: var(--primary);
}

@media (max-width: 640px) {
  .qing-curtain__overview { padding: 20px 6vw 36px; }
  .qing-magazine {
    grid-template-columns: 1fr;
    padding: 24px 5vw 32px;
  }
  .qing-magazine .qing-magazine__divider {
    width: 100%;
    height: 1px;
    min-height: 0;
    margin: 8px 0;
  }
  .qing-magazine .qing-magazine__col { padding: 0 0.5rem; }
  .qing-back-float { left: 12px; padding: 8px 12px; font-size: 0.85rem; }
  .qing-figures-row {
    flex-direction: column;
    align-items: center;
    gap: 20px;
  }
  .qing-figures__gap { width: 0; height: 0; }
  .qing-figure-cell { max-width: 100%; align-items: center !important; }
  .qing-figure-cell--left .qing-figure-text,
  .qing-figure-cell--right .qing-figure-text {
    text-align: center;
    padding-left: 8px;
    padding-right: 8px;
  }
  .qing-book { min-height: 240px; max-height: 58vh; }
  .qing-book-cover { height: clamp(220px, 50vw, 280px); }
  .qing-book-inner { min-height: 260px; max-height: 52vh; }
  .qing-book-half { min-height: 220px; }
  .qing-book-page__img-wrap { min-height: 200px; }
  .qing-book-page__img { min-height: 200px; }
  .qing-achievements-bar__row { flex-direction: column; }
  .qing-achievements-bar__grid { grid-template-columns: 1fr; }
}
</style>

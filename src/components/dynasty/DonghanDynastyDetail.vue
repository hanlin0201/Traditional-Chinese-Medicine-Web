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

const donghanRootRef = ref(null)
const donghanFlipActiveIndex = ref(0)
const donghanIsAnimating = ref(false)
const DONGHAN_TOTAL_PAGES = 3

const VH_PER_PAGE = 100

function donghanMoveTo(index) {
  if (index < 0 || index >= DONGHAN_TOTAL_PAGES) return
  if (donghanIsAnimating.value) return
  donghanIsAnimating.value = true
  const container = donghanRootRef.value?.querySelector('.donghan-scroll-container')
  if (!container) {
    donghanFlipActiveIndex.value = index
    emit('page-change', index)
    donghanIsAnimating.value = false
    return
  }
  const fromIndex = donghanFlipActiveIndex.value
  donghanFlipActiveIndex.value = index
  emit('page-change', index)

  if (donghanRootRef.value) {
    const thirdInner = donghanRootRef.value.querySelector('.donghan-third-inner')
    if (thirdInner) thirdInner.scrollTop = 0
  }

  const yVh = -index * VH_PER_PAGE
  gsap.to(container, {
    y: `${yVh}vh`,
    duration: fromIndex === 0 && index === 1 ? 1 : 0.9,
    ease: 'power2.inOut',
    overwrite: true,
    onComplete: () => { donghanIsAnimating.value = false },
  })
}

function donghanHandleWheel(e) {
  if (!donghanRootRef.value || !props.dynasty || props.dynasty.id !== 'donghan') return
  const root = donghanRootRef.value
  if (donghanFlipActiveIndex.value === 2) {
    const thirdInner = root.querySelector('.donghan-third-inner')
    if (thirdInner) {
      const atTop = thirdInner.scrollTop <= 2
      const atBottom = thirdInner.scrollTop + thirdInner.clientHeight >= thirdInner.scrollHeight - 2
      if (e.deltaY > 0 && !atBottom) return
      if (e.deltaY < 0 && !atTop) return
      if (e.deltaY < 0 && atTop) {
        e.preventDefault()
        if (donghanIsAnimating.value) return
        if (Math.abs(e.deltaY) < 18) return
        donghanMoveTo(1)
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
  if (donghanIsAnimating.value) return
  if (Math.abs(e.deltaY) < 18) return
  if (e.deltaY > 0) {
    if (donghanFlipActiveIndex.value < DONGHAN_TOTAL_PAGES - 1) donghanMoveTo(donghanFlipActiveIndex.value + 1)
  } else {
    donghanMoveTo(donghanFlipActiveIndex.value - 1)
  }
}

// 典籍：五禽戏介绍，6 页，其中第 3 页为图片
const bookOpen = ref(false)
const bookSpreadIndex = ref(0)
const BOOK_PAGES = [
  { title: '五禽戏简介', body: '五禽戏为东汉名医华佗所创，模仿虎、鹿、熊、猿、鸟五种禽兽的动作与神态，编成导引养生功法。华佗云：人体欲得劳动，但不当使极尔。动摇则谷气得消，血脉流通，病不得生。譬犹户枢不朽是也。\n\n是以古之仙者为导引之事，熊经鸱顾，引挽腰体，动诸关节，以求难老。吾有一术，名五禽之戏：一曰虎，二曰鹿，三曰熊，四曰猿，五曰鸟。亦以除疾，并利蹄足，以当导引。体中不快，起作一禽之戏，沾濡汗出，因上著粉，身体轻便，腹中欲食。' },
  { title: '虎戏与鹿戏', body: '虎戏者，四肢距地，前三踯，却二踯。长引腰，侧脚，仰天，即返距行。前却各七过也。虎属肾，主骨，练之可强腰肾、壮筋骨。\n\n鹿戏者，四肢距地，引项反顾，左三右二。左右脚伸缩，亦三二也。鹿属肝，主筋，练之可舒筋活络、益肝气。\n\n二戏皆以仿生为本，外动肢节，内调脏腑，使气血周流、阴阳和合。' },
  { title: '五禽戏图', image: '五禽戏竖屏.jpg' },
  { title: '熊戏与猿戏', body: '熊戏者，正仰，以两手抱膝下，举头，左擗地七，右亦七。蹲地，以手左右托地。熊属脾，主运化，练之可健脾和胃、充实四肢。\n\n猿戏者，攀物自悬，伸缩身体，上下一七。以脚拘物自悬，左右七。手钩却立，按头各七。猿属心，主血脉，练之可灵便手足、宁心安神。' },
  { title: '鸟戏', body: '鸟戏者，双立手，翘一足，伸两臂，扬眉鼓力，右二七。坐伸脚，手挽足距各七，缩伸二臂各七也。鸟属肺，主气，练之可宣肺理气、轻身延年。\n\n五禽与五脏相应：虎鹿熊猿鸟，对应肾肝脾心肺。常练五禽之戏，可使五脏调和、气血畅通，既除疾又利蹄足，为后世导引、八段锦、太极拳等养生术之先声。' },
  { title: '结语', body: '华佗创编五禽戏，开中医导引养生之先河。其法简便易行，老少皆宜，至今仍在民间与医院康复中广泛流传。\n\n《后汉书·华佗传》载：佗语普曰，人体欲得劳动，但不当使极尔。动摇则谷气得消，血脉流通，病不得生。此与《黄帝内经》中“形劳而不倦”“和于术数”之旨一脉相承，体现了中医治未病与养生防病的智慧。' },
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
    if (id !== 'donghan') return
    nextTick(() => {
      const root = donghanRootRef.value
      if (!root) return
      root.addEventListener('wheel', donghanHandleWheel, { passive: false })
      const container = root.querySelector('.donghan-scroll-container')
      if (container) gsap.set(container, { y: '0vh' })
      const thirdInner = root.querySelector('.donghan-third-inner')
      if (thirdInner) thirdInner.scrollTop = 0
      donghanFlipActiveIndex.value = 0
      emit('page-change', 0)
      bookOpen.value = false
      bookSpreadIndex.value = 0
    })
  },
  { immediate: true }
)
onBeforeUnmount(() => {
  const root = donghanRootRef.value
  if (root) root.removeEventListener('wheel', donghanHandleWheel)
})
</script>

<template>
  <div
    ref="donghanRootRef"
    class="donghan-root"
    :class="{ 'donghan-root--fullscreen': donghanFlipActiveIndex <= 1 }"
  >
    <button type="button" class="donghan-back-float" @click="emit('back')" aria-label="返回">
      <ArrowLeft :size="20" class="donghan-back-float__icon" />
      <span>返回</span>
    </button>

    <div
      v-show="dynasty"
      class="donghan-fixed-bg"
      :class="{ 'donghan-fixed-bg--fade': donghanFlipActiveIndex === 2 }"
      aria-hidden="true"
    >
      <img :src="getPhotoUrl(dynasty.heroImage)" :alt="dynasty.name" class="donghan-fixed-bg__img" />
    </div>

    <div class="donghan-flip-viewport">
      <div class="donghan-scroll-container">
        <section class="donghan-screen donghan-screen-1">
          <div class="donghan-curtain__gradient"></div>
          <div class="donghan-curtain__center">
            <h2 class="donghan-curtain__name">{{ dynasty.name }}</h2>
            <div class="donghan-curtain__divider">
              <span class="hero-line"></span>
              <span class="hero-diamond"></span>
              <span class="hero-line"></span>
            </div>
            <p class="donghan-curtain__period">{{ dynasty.period }}</p>
          </div>
          <div class="donghan-curtain__overview">
            <p class="donghan-curtain__overview-text">{{ dynasty.overview }}</p>
          </div>
        </section>

        <section class="donghan-screen donghan-screen-2">
          <div class="donghan-magazine">
            <div class="donghan-magazine__col">
              <p class="donghan-magazine__p">东汉末年，战乱频仍，疫病流行，却也在乱世中催生了两位影响深远的医学大家：华佗与张仲景。华佗精于外科，创制麻沸散施行腹腔手术，开世界全身麻醉之先河；又仿五禽之态编成五禽戏，将导引养生与防病治病融为一体，被后世尊为外科鼻祖与导引术之宗。</p>
              <p class="donghan-magazine__p">华佗认为“人体欲得劳动，但不当使极尔。动摇则谷气得消，血脉流通，病不得生”，故创虎、鹿、熊、猿、鸟五禽之戏，对应肾、肝、脾、心、肺，外练筋骨、内调脏腑。五禽戏动作简朴易学，老少皆宜，既可除疾又能利蹄足，为后世八段锦、太极拳等养生功法奠定了雏形。</p>
              <p class="donghan-magazine__p">与此同时，张仲景著《伤寒杂病论》，确立辨证论治体系，与华佗一内一外、一药一导引，共同代表了东汉医学的最高成就。华佗的麻沸散与外科技艺虽因本人遇害而部分失传，但其五禽戏与“治未病”思想却代代相传；张仲景之方书则经王叔和整理后流传至今，成为中医临床之圭臬。</p>
              <p class="donghan-magazine__p">综观东汉，中医在临床外科、麻醉、导引养生与辨证论治诸方面均有重大突破。华佗与张仲景并称汉末医林双璧，其学说与技艺对两晋隋唐乃至今日之中医均有深远影响。</p>
            </div>
            <div class="donghan-magazine__divider"></div>
            <div class="donghan-magazine__col">
              <p class="donghan-magazine__p">华佗字元化，沛国谯人，与董奉、张仲景并称“建安三神医”。他通晓内、外、妇、儿诸科，尤擅外科与针灸，曾为关羽刮骨疗毒、欲为曹操开颅治头风。因不愿专事权贵而遭杀害，所著医书亦未得传世，然麻沸散与五禽戏之名却千古流传。《后汉书》载其“晓养性之术，年且百岁而犹有壮容”，足见其身体力行导引养生之效。</p>
              <img :src="getPhotoUrl('五禽戏.jpg')" alt="五禽戏" class="donghan-magazine__img" @error="($e) => ($e.target.style.display = 'none')" />
            </div>
          </div>
        </section>

        <section class="donghan-screen donghan-screen-3 donghan-figures-dark" :style="{ backgroundImage: `url(${getPhotoUrl('朝代背景4.jpg')})` }">
          <div class="donghan-third-inner">
            <div class="donghan-figures-row">
              <div class="donghan-figure-cell donghan-figure-cell--left">
                <img :src="getPhotoUrl('华佗.jpg')" alt="华佗" class="donghan-figure-img" @error="($e) => ($e.target.src = getPhotoUrl(dynasty.heroImage))" />
                <div class="donghan-figure-text">
                  <h4 class="donghan-figure-title">华佗</h4>
                  <p class="donghan-figure-desc">外科鼻祖，发明麻沸散开创全身麻醉手术；创编五禽戏，以虎鹿熊猿鸟对应五脏，开导引养生之先河，被后世尊为“神医”。</p>
                </div>
              </div>
              <div class="donghan-figures__gap"></div>
              <div class="donghan-figure-cell donghan-figure-cell--right">
                <img :src="getPhotoUrl('张仲景.jpg')" alt="张仲景" class="donghan-figure-img" @error="($e) => ($e.target.src = getPhotoUrl(dynasty.heroImage))" />
                <div class="donghan-figure-text">
                  <h4 class="donghan-figure-title">张仲景</h4>
                  <p class="donghan-figure-desc">医圣，著《伤寒杂病论》，创辨证论治与六经辨证，与华佗并称汉末医林双璧，其方书为中医临床之圭臬。</p>
                </div>
              </div>
            </div>
            <div class="donghan-book-wrap">
              <div class="donghan-book" :class="{ 'donghan-book--open': bookOpen }">
                <div v-if="!bookOpen" class="donghan-book-cover" @click="openBook">
                  <span class="donghan-book-cover__title">五禽戏</span>
                  <span class="donghan-book-cover__hint">点击翻阅</span>
                </div>
                <div v-else class="donghan-book-spread" @click="onBookClick">
                  <span class="donghan-book-spread-hint">点击左侧往前翻，右侧往后翻</span>
                  <div class="donghan-book-spread-row">
                    <button type="button" class="donghan-book-turn donghan-book-turn--prev" :disabled="!canTurnPrev()" @click.stop="turnBookLeft" aria-label="上一页">
                      <ChevronLeft :size="24" />
                    </button>
                    <div class="donghan-book-inner">
                      <div class="donghan-book-half donghan-book-half--left">
                        <template v-if="leftPageContent()">
                          <template v-if="leftPageContent().image">
                            <div class="donghan-book-page__img-wrap">
                              <img :src="getPhotoUrl(leftPageContent().image)" :alt="leftPageContent().title" class="donghan-book-page__img" @error="($e) => ($e.target.style.display = 'none')" />
                            </div>
                            <p class="donghan-book-page__meta">第 {{ bookSpreadIndex * 2 + 1 }} 页</p>
                          </template>
                          <template v-else>
                            <h5 class="donghan-book-page__title">{{ leftPageContent().title }}</h5>
                            <p class="donghan-book-page__body">{{ leftPageContent().body }}</p>
                            <p class="donghan-book-page__meta">第 {{ bookSpreadIndex * 2 + 1 }} 页</p>
                          </template>
                        </template>
                      </div>
                      <div class="donghan-book-spine"></div>
                      <div class="donghan-book-half donghan-book-half--right">
                        <template v-if="rightPageContent()">
                          <template v-if="rightPageContent().image">
                            <div class="donghan-book-page__img-wrap">
                              <img :src="getPhotoUrl(rightPageContent().image)" :alt="rightPageContent().title" class="donghan-book-page__img" @error="($e) => ($e.target.style.display = 'none')" />
                            </div>
                            <p class="donghan-book-page__meta">第 {{ bookSpreadIndex * 2 + 2 }} 页</p>
                          </template>
                          <template v-else>
                            <h5 class="donghan-book-page__title">{{ rightPageContent().title }}</h5>
                            <p class="donghan-book-page__body">{{ rightPageContent().body }}</p>
                            <p class="donghan-book-page__meta">第 {{ bookSpreadIndex * 2 + 2 }} 页</p>
                          </template>
                        </template>
                      </div>
                    </div>
                    <button type="button" class="donghan-book-turn donghan-book-turn--next" :disabled="!canTurnNext()" @click.stop="turnBookRight" aria-label="下一页">
                      <ChevronRight :size="24" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <section class="donghan-achievements-bar">
              <div class="donghan-achievements-bar__row">
                <div class="donghan-achievements-bar__main">
                  <h3 class="donghan-achievements-bar__title">主要成就</h3>
                  <div class="donghan-achievements-bar__grid">
                    <div v-for="(item, idx) in dynasty.achievements" :key="idx" class="donghan-achievement-item">
                      <span class="donghan-achievement-item__year">{{ item.year }}</span>
                      <h4 class="donghan-achievement-item__title">{{ item.title }}</h4>
                      <p class="donghan-achievement-item__desc">{{ item.description }}</p>
                    </div>
                  </div>
                </div>
                <div class="donghan-achievements-bar__nav">
                  <button v-if="adjacent.prev" class="donghan-nav-btn" @click="emit('go-to-dynasty', adjacent.prev.id)">
                    <ArrowLeft :size="18" />
                    <span>{{ adjacent.prev.name }}</span>
                  </button>
                  <button v-if="adjacent.next" class="donghan-nav-btn" @click="emit('go-to-dynasty', adjacent.next.id)">
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
.donghan-root {
  height: 100vh;
  overflow: hidden;
  overflow-x: hidden;
  overscroll-behavior: none;
}
.donghan-root--fullscreen {
  height: 100vh;
}

.donghan-fixed-bg {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  opacity: 1;
  transition: opacity 0.85s ease-out;
}
.donghan-fixed-bg--fade {
  opacity: 0;
}
.donghan-fixed-bg__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  filter: brightness(0.82) saturate(0.9);
}

.donghan-back-float {
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
.donghan-back-float:hover {
  background: rgba(28, 24, 22, 0.85);
  transform: translateY(-50%) translateX(-2px);
}
.donghan-back-float__icon {
  transform: rotate(180deg);
}

.donghan-flip-viewport {
  position: relative;
  z-index: 1;
  height: 100vh;
  overflow: hidden;
  flex-shrink: 0;
}
.donghan-scroll-container {
  width: 100%;
  height: 300vh;
  will-change: transform;
  display: flex;
  flex-direction: column;
}
.donghan-screen {
  width: 100%;
  flex: 0 0 100vh;
  min-height: 0;
  position: relative;
  overflow: hidden;
}

.donghan-screen-1 {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
}
.donghan-curtain__gradient {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  height: 100%;
  background: linear-gradient(to top, rgba(28, 24, 22, 0.92) 0%, rgba(45, 38, 35, 0.5) 45%, transparent 100%);
  pointer-events: none;
}
.donghan-curtain__center {
  position: absolute;
  left: 50%;
  top: 38vh;
  transform: translate(-50%, -50%);
  text-align: center;
  z-index: 2;
  pointer-events: none;
}
.donghan-curtain__name {
  font-size: clamp(2.4rem, 5.5vw, 3.8rem);
  color: #fff;
  letter-spacing: 12px;
  margin: 0;
  text-shadow: 0 2px 24px rgba(0,0,0,0.5);
}
.donghan-curtain__divider {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin: 10px 0;
  opacity: 0.85;
}
.donghan-curtain__period {
  font-size: 1.05rem;
  color: rgba(255,255,255,0.88);
  letter-spacing: 3px;
  margin: 0;
}
.donghan-curtain__overview {
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
.donghan-curtain__overview-text {
  font-size: 0.98rem;
  line-height: 1.9;
  color: rgba(255,255,255,0.82);
  margin: 0;
  text-align: center;
  max-width: 720px;
  white-space: pre-line;
}

.donghan-screen-2 {
  background: var(--bg);
}
.donghan-magazine {
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

.donghan-magazine__col { padding: 0 2.5rem; }
.donghan-magazine__p {
  font-size: 0.95rem;
  line-height: 2;
  color: var(--primary-dark);
  margin: 0 0 1.2em;
  text-align: justify;
}
.donghan-magazine__p:last-of-type { margin-bottom: 0; }
.donghan-magazine__img {
  width: 100%;
  max-width: 100%;
  margin-top: 1em;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.12);
  object-fit: cover;
  display: block;
}
.donghan-magazine__divider {
  width: 1px;
  min-height: 120px;
  background: rgba(139, 94, 60, 0.2);
}

.donghan-figures-dark {
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
.donghan-third-inner {
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 12px 4vw 24px;
  -webkit-overflow-scrolling: touch;
  box-sizing: border-box;
}
.donghan-figures-row {
  display: flex;
  align-items: stretch;
  justify-content: center;
  gap: 0;
  width: 100%;
  max-width: 1000px;
  margin: 0 auto 10px;
  flex-shrink: 0;
}
.donghan-figures__gap {
  width: clamp(32px, 5vw, 64px);
  flex-shrink: 0;
}
.donghan-figure-cell {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  max-width: 320px;
}
.donghan-figure-cell--left { align-items: flex-end; }
.donghan-figure-cell--right { align-items: flex-start; }
.donghan-figure-img {
  width: 100%;
  max-width: 140px;
  aspect-ratio: 3/4;
  object-fit: cover;
  border-radius: 10px;
  box-shadow: 0 8px 28px rgba(0,0,0,0.4);
}
.donghan-figure-cell--left .donghan-figure-text { margin-left: 0; text-align: right; padding-right: 12px; }
.donghan-figure-cell--right .donghan-figure-text { margin-right: 0; text-align: left; padding-left: 12px; }
.donghan-figure-text {
  margin-top: 10px;
  max-width: 100%;
  padding: 12px 10px;
  border-radius: 8px;
  background: rgba(253, 251, 247, 0.92);
  border: 1px solid rgba(139, 94, 60, 0.12);
}
.donghan-figure-title {
  font-size: 1rem;
  font-weight: 600;
  color: #2c2c2c;
  margin: 0 0 6px;
  letter-spacing: 2px;
}
.donghan-figure-desc {
  font-size: 0.8rem;
  line-height: 1.65;
  color: #3d3629;
  margin: 0;
}

.donghan-book-wrap {
  flex: 1;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px 0;
}
.donghan-book {
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
.donghan-book-cover {
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
.donghan-book-cover:hover {
  transform: scale(1.02);
  box-shadow: 0 20px 56px rgba(0,0,0,0.6);
}
.donghan-book-cover__title {
  font-size: clamp(0.9rem, 1.8vw, 1.1rem);
  font-weight: 600;
  color: rgba(255,255,255,0.9);
  letter-spacing: 3px;
}
.donghan-book-cover__hint {
  font-size: 0.7rem;
  color: rgba(255,255,255,0.5);
  letter-spacing: 2px;
}
.donghan-book-spread {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  height: 100%;
  cursor: pointer;
}
.donghan-book-spread-hint {
  font-size: 0.7rem;
  color: rgba(255,255,255,0.5);
  letter-spacing: 1px;
  flex-shrink: 0;
}
.donghan-book-spread-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  flex: 1;
  min-height: 0;
  width: 100%;
}
.donghan-book-spread-row .donghan-book-turn { flex-shrink: 0; }
.donghan-book-spread-row .donghan-book-inner { flex: 1; min-height: 0; }
.donghan-book-turn {
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
.donghan-book-turn:hover:not(:disabled) {
  background: rgba(255,255,255,0.18);
}
.donghan-book-turn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}
.donghan-book-inner {
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
.donghan-book-half {
  flex: 1;
  min-width: 0;
  min-height: 280px;
  padding: 16px 14px;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}
.donghan-book-page__img-wrap {
  width: 100%;
  height: 100%;
  min-height: 240px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-radius: 4px;
}
.donghan-book-page__img {
  max-width: 100%;
  width: auto;
  height: 100%;
  min-height: 240px;
  object-fit: contain;
  display: block;
}
.donghan-book-spine {
  width: 4px;
  background: linear-gradient(to right, rgba(139, 94, 60, 0.15), rgba(139, 94, 60, 0.35), rgba(139, 94, 60, 0.15));
  flex-shrink: 0;
}
.donghan-book-page__title {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--primary-dark);
  margin: 0 0 10px;
  letter-spacing: 1px;
  padding-bottom: 6px;
  border-bottom: 1px solid rgba(139, 94, 60, 0.2);
}
.donghan-book-page__body {
  font-size: 0.8rem;
  line-height: 1.9;
  color: var(--primary-dark);
  margin: 0;
  white-space: pre-line;
}
.donghan-book-page__meta {
  font-size: 0.7rem;
  color: var(--text-secondary);
  margin-top: 12px;
  text-align: right;
}

.donghan-achievements-bar {
  margin-top: 24px;
  padding: 28px 0 24px;
  background: linear-gradient(180deg, rgba(235, 229, 220, 0.92) 0%, rgba(224, 216, 204, 0.95) 100%);
  border-radius: 12px;
  border: 1px solid rgba(139, 94, 60, 0.18);
  flex-shrink: 0;
}
.donghan-screen-3 .donghan-achievements-bar {
  padding-left: 6vw;
  padding-right: 6vw;
  margin-left: -2vw;
  margin-right: -2vw;
  border-radius: 0;
}
.donghan-achievements-bar__row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  max-width: 1000px;
  margin: 0 auto;
}
.donghan-achievements-bar__main {
  flex: 1;
  min-width: 0;
}
.donghan-achievements-bar__title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--primary-dark);
  margin: 0 0 16px;
  letter-spacing: 2px;
  display: flex;
  align-items: center;
  gap: 10px;
}
.donghan-achievements-bar__title::before {
  content: '';
  width: 3px;
  height: 16px;
  background: var(--accent-red);
  border-radius: 2px;
}
.donghan-achievements-bar__grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px 24px;
}
.donghan-achievement-item {
  padding: 12px 0;
  border-bottom: 1px solid rgba(139, 94, 60, 0.12);
}
.donghan-achievement-item__year {
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--accent-red);
  background: rgba(196, 78, 70, 0.1);
  padding: 2px 8px;
  border-radius: 4px;
  margin-bottom: 6px;
  display: inline-block;
}
.donghan-achievement-item__title {
  font-size: 0.92rem;
  font-weight: 600;
  color: var(--primary-dark);
  margin: 0 0 4px;
}
.donghan-achievement-item__desc {
  font-size: 0.82rem;
  color: var(--text-secondary);
  margin: 0;
  line-height: 1.5;
}
.donghan-achievements-bar__nav {
  flex-shrink: 0;
  display: flex;
  gap: 12px;
}
.donghan-nav-btn {
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
.donghan-nav-btn:hover {
  background: rgba(255, 255, 255, 0.95);
  border-color: var(--primary);
}

@media (max-width: 640px) {
  .donghan-curtain__overview { padding: 20px 6vw 36px; }
  .donghan-magazine {
    grid-template-columns: 1fr;
    padding: 24px 5vw 32px;
  }
  .donghan-magazine .donghan-magazine__divider {
    width: 100%;
    height: 1px;
    min-height: 0;
    margin: 8px 0;
  }
  .donghan-magazine .donghan-magazine__col { padding: 0 0.5rem; }
  .donghan-back-float { left: 12px; padding: 8px 12px; font-size: 0.85rem; }
  .donghan-figures-row {
    flex-direction: column;
    align-items: center;
    gap: 20px;
  }
  .donghan-figures__gap { width: 0; height: 0; }
  .donghan-figure-cell { max-width: 100%; align-items: center !important; }
  .donghan-figure-cell--left .donghan-figure-text,
  .donghan-figure-cell--right .donghan-figure-text {
    text-align: center;
    padding-left: 8px;
    padding-right: 8px;
  }
  .donghan-book { min-height: 240px; max-height: 58vh; }
  .donghan-book-cover { height: clamp(220px, 50vw, 280px); }
  .donghan-book-inner { min-height: 260px; max-height: 52vh; }
  .donghan-book-half { min-height: 220px; }
  .donghan-book-page__img-wrap { min-height: 200px; }
  .donghan-book-page__img { min-height: 200px; }
  .donghan-achievements-bar__row { flex-direction: column; }
  .donghan-achievements-bar__grid { grid-template-columns: 1fr; }
}
</style>

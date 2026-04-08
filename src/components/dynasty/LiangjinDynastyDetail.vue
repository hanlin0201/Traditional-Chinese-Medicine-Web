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

const liangjinRootRef = ref(null)
const liangjinFlipActiveIndex = ref(0)
const liangjinIsAnimating = ref(false)
const LIANGJIN_TOTAL_PAGES = 3

const VH_PER_PAGE = 100

function liangjinMoveTo(index) {
  if (index < 0 || index >= LIANGJIN_TOTAL_PAGES) return
  if (liangjinIsAnimating.value) return
  liangjinIsAnimating.value = true
  const container = liangjinRootRef.value?.querySelector('.liangjin-scroll-container')
  if (!container) {
    liangjinFlipActiveIndex.value = index
    emit('page-change', index)
    liangjinIsAnimating.value = false
    return
  }
  const fromIndex = liangjinFlipActiveIndex.value
  liangjinFlipActiveIndex.value = index
  emit('page-change', index)

  if (liangjinRootRef.value) {
    const thirdInner = liangjinRootRef.value.querySelector('.liangjin-third-inner')
    if (thirdInner) thirdInner.scrollTop = 0
  }

  const yVh = -index * VH_PER_PAGE
  gsap.to(container, {
    y: `${yVh}vh`,
    duration: fromIndex === 0 && index === 1 ? 1 : 0.9,
    ease: 'power2.inOut',
    overwrite: true,
    onComplete: () => { liangjinIsAnimating.value = false },
  })
}

function liangjinHandleWheel(e) {
  if (!liangjinRootRef.value || !props.dynasty || props.dynasty.id !== 'liangjin') return
  const root = liangjinRootRef.value
  if (liangjinFlipActiveIndex.value === 2) {
    const thirdInner = root.querySelector('.liangjin-third-inner')
    if (thirdInner) {
      const atTop = thirdInner.scrollTop <= 2
      const atBottom = thirdInner.scrollTop + thirdInner.clientHeight >= thirdInner.scrollHeight - 2
      if (e.deltaY > 0 && !atBottom) return
      if (e.deltaY < 0 && !atTop) return
      if (e.deltaY < 0 && atTop) {
        e.preventDefault()
        if (liangjinIsAnimating.value) return
        if (Math.abs(e.deltaY) < 18) return
        liangjinMoveTo(1)
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
  if (liangjinIsAnimating.value) return
  if (Math.abs(e.deltaY) < 18) return
  if (e.deltaY > 0) {
    if (liangjinFlipActiveIndex.value < LIANGJIN_TOTAL_PAGES - 1) liangjinMoveTo(liangjinFlipActiveIndex.value + 1)
  } else {
    liangjinMoveTo(liangjinFlipActiveIndex.value - 1)
  }
}

// 典籍：《脉经》封面 + 6 内页
const bookOpen = ref(false)
const bookSpreadIndex = ref(0)
const BOOK_PAGES = [
  { title: '脉形状与二十四脉', body: '脉理精微，其体难辨。弦紧浮芤，展转相类。在心易了，指下难明。谓沉为伏，则方治永乖；以缓为迟，则危殆立至。\n\n脉有二十四形，曰浮、芤、洪、滑、数、促、弦、紧、沉、伏、革、实、微、涩、细、软、弱、虚、散、缓、迟、结、代、动。各有形状与主病。\n\n浮脉，举之有余，按之不足。沉脉，举之不足，按之有余。迟脉，呼吸三至，去来极迟。数脉，去来促急，一息六至。' },
  { title: '寸关尺与三部', body: '从鱼际至高骨却行一寸，其中名曰寸口。从寸至尺，名曰尺泽。故曰尺寸。寸后尺前，名曰关。阳出阴入，以关为界。\n\n寸主射上焦，出头及皮毛竟手。关主射中焦，腹及腰。尺主射下焦，少腹至足。\n\n脉有三部，部有四经。手有太阴、阳明，足有太阳、少阴，上下合一十二经。知其所苦，参伍不调者病。' },
  { title: '脉与脏腑', body: '心部在左手关前寸口是也。肝部在左手关上是也。肾部在左手关后尺中是也。肺部在右手关前寸口是也。脾部在右手关上是也。命门在右手关后尺中是也。\n\n脉来如循长竿者，曰弦。脉来如数而时一止，曰促。脉来缓而时一止，曰结。脉来动而中止，不能自还，因而复动，曰代。\n\n诸脉浮数，当发热而反洒淅恶寒，若有痛处，当发其痈。诸脉沉细，皆属于湿。' },
  { title: '脉证与病机', body: '脉盛则热，脉虚则寒。脉滑则气实，脉涩则血虚。脉大则病进，脉小则病退。脉紧则痛，脉缓则痹。\n\n热病脉静，汗已出脉盛躁，此名阴阳交，死不治。热病已得汗，脉静安者生，脉躁者难治。\n\n伤寒热病，脉洪大者生，沉小者死。水病脉洪大者可治，微细者不可治。腹胀脉浮大者生，沉小者死。' },
  { title: '平人脉与四时脉', body: '人一呼脉再动，一吸脉亦再动，呼吸定息脉五动，闰以太息，命曰平人。平人者，不病也。\n\n春脉弦，夏脉钩，秋脉毛，冬脉石。春弦者，肝东方木也，万物始生，未有枝叶，故其脉之来濡弱而长。夏钩者，心南方火也，万物之所茂，垂枝布叶，故其脉之来疾去迟。秋毛冬石，各应其气。\n\n脉从四时，谓之可治；脉逆四时，为不可治。' },
  { title: '结语', body: '《脉经》为晋代王叔和所著，乃现存最早之脉学专著。其书集汉以前脉学之大成，确立二十四脉名称与脉形，规范寸关尺分部与脏腑配属，使脉诊有章可循，对后世脉学影响深远。\n\n葛洪《肘后备急方》与王叔和《脉经》，一重急救实用，一重诊法规范，共同代表两晋医学之成就。《肘后方》中“青蒿一握绞汁”治疟之载，更为后世青蒿素发现提供古典依据。' },
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
    if (id !== 'liangjin') return
    nextTick(() => {
      const root = liangjinRootRef.value
      if (!root) return
      root.addEventListener('wheel', liangjinHandleWheel, { passive: false })
      const container = root.querySelector('.liangjin-scroll-container')
      if (container) gsap.set(container, { y: '0vh' })
      const thirdInner = root.querySelector('.liangjin-third-inner')
      if (thirdInner) thirdInner.scrollTop = 0
      liangjinFlipActiveIndex.value = 0
      emit('page-change', 0)
      bookOpen.value = false
      bookSpreadIndex.value = 0
    })
  },
  { immediate: true }
)
onBeforeUnmount(() => {
  const root = liangjinRootRef.value
  if (root) root.removeEventListener('wheel', liangjinHandleWheel)
})
</script>

<template>
  <div
    ref="liangjinRootRef"
    class="liangjin-root"
    :class="{ 'liangjin-root--fullscreen': liangjinFlipActiveIndex <= 1 }"
  >
    <button type="button" class="liangjin-back-float" @click="emit('back')" aria-label="返回">
      <ArrowLeft :size="20" class="liangjin-back-float__icon" />
      <span>返回</span>
    </button>

    <div
      v-show="dynasty"
      class="liangjin-fixed-bg"
      :class="{ 'liangjin-fixed-bg--fade': liangjinFlipActiveIndex === 2 }"
      aria-hidden="true"
    >
      <img :src="getPhotoUrl(dynasty.heroImage)" :alt="dynasty.name" class="liangjin-fixed-bg__img" />
    </div>

    <div class="liangjin-flip-viewport">
      <div class="liangjin-scroll-container">
        <section class="liangjin-screen liangjin-screen-1">
          <div class="liangjin-curtain__gradient"></div>
          <div class="liangjin-curtain__center">
            <h2 class="liangjin-curtain__name">{{ dynasty.name }}</h2>
            <div class="liangjin-curtain__divider">
              <span class="hero-line"></span>
              <span class="hero-diamond"></span>
              <span class="hero-line"></span>
            </div>
            <p class="liangjin-curtain__period">{{ dynasty.period }}</p>
          </div>
          <div class="liangjin-curtain__overview">
            <p class="liangjin-curtain__overview-text">{{ dynasty.overview }}</p>
          </div>
        </section>

        <section class="liangjin-screen liangjin-screen-2">
          <div class="liangjin-magazine">
            <div class="liangjin-magazine__col">
              <p class="liangjin-magazine__p">两晋时期医学注重实用与急救，在动荡年代里，简便验廉的方药与规范的诊法并重发展。葛洪《肘后备急方》收录大量急救方与传染病治法，便于随身携带、随时取用；王叔和《脉经》则系统整理脉学，确立二十四脉名称与寸关尺分部，使脉诊有章可循，二者共同代表了两晋医学的成就。</p>
              <p class="liangjin-magazine__p">《肘后备急方》记载了天花、狂犬病、脚气、瘴气等多种疾病的症状与治法，尤以“青蒿一握，以水二升渍，绞取汁，尽服之”治寒热诸症之载闻名后世，为二十世纪青蒿素的发现提供了古典文献依据。葛洪本人兼通医道与丹道，其书不求繁复理论，但求“率多易得之药，其不获已须买之者，亦皆贱价草石”，体现了面向民间的实用精神。</p>
              <p class="liangjin-magazine__p">王叔和曾为晋太医令，在整理张仲景《伤寒杂病论》之余，博采前代脉说，撰成《脉经》十卷。书中厘定浮、沉、迟、数、弦、紧等二十四脉的脉形与主病，明确寸关尺与脏腑的对应关系，并论及脉证结合与四时平脉，为后世脉学奠定了规范。自此脉诊从口耳相传、各家异说走向系统化，与仲景辨证论治相配合，促进了临床诊断的规范化。</p>
              <p class="liangjin-magazine__p">综观两晋，医学在急救方药与脉学理论两方面均有重要建树。《肘后备急方》与《脉经》一重方、一重诊，对隋唐乃至后世之方剂学与诊法影响深远，亦为今日中医药传承与创新所不可或缺的古典资源。</p>
            </div>
            <div class="liangjin-magazine__divider"></div>
            <div class="liangjin-magazine__col">
              <p class="liangjin-magazine__p">葛洪字稚川，号抱朴子，丹阳句容人，东晋道教学者与医家。其《肘后备急方》原名《肘后救卒方》，意即可置诸肘后、随时取用。书中方药多取材易得、操作简便，适合战乱与偏远之地。王叔和名熙，高平人，曾任太医令，除著《脉经》外，还整理编次张仲景《伤寒论》，使仲景之学得以流传，功在千秋。</p>
              <img :src="getPhotoUrl('肘后方急救横屏.jpg')" alt="肘后备急方" class="liangjin-magazine__img" @error="($e) => ($e.target.style.display = 'none')" />
            </div>
          </div>
        </section>

        <section class="liangjin-screen liangjin-screen-3 liangjin-figures-dark" :style="{ backgroundImage: `url(${getPhotoUrl('朝代背景5.jpg')})` }">
          <div class="liangjin-third-inner">
            <div class="liangjin-figures-row">
              <div class="liangjin-figure-cell liangjin-figure-cell--left">
                <img :src="getPhotoUrl('葛洪.jpg')" alt="葛洪" class="liangjin-figure-img" @error="($e) => ($e.target.src = getPhotoUrl(dynasty.heroImage))" />
                <div class="liangjin-figure-text">
                  <h4 class="liangjin-figure-title">葛洪</h4>
                  <p class="liangjin-figure-desc">著《肘后备急方》，记载简便急救方与传染病治法，“青蒿绞汁”治疟之载为后世青蒿素研究提供古典依据，兼通医道与丹道。</p>
                </div>
              </div>
              <div class="liangjin-figures__gap"></div>
              <div class="liangjin-figure-cell liangjin-figure-cell--right">
                <img :src="getPhotoUrl('王叔和.jpg')" alt="王叔和" class="liangjin-figure-img" @error="($e) => ($e.target.src = getPhotoUrl(dynasty.heroImage))" />
                <div class="liangjin-figure-text">
                  <h4 class="liangjin-figure-title">王叔和</h4>
                  <p class="liangjin-figure-desc">著《脉经》，系统整理脉学，确立二十四脉与寸关尺规范，又整理编次《伤寒论》，使仲景之学得以流传。</p>
                </div>
              </div>
            </div>
            <div class="liangjin-book-wrap">
              <div class="liangjin-book" :class="{ 'liangjin-book--open': bookOpen }">
                <div v-if="!bookOpen" class="liangjin-book-cover" @click="openBook">
                  <span class="liangjin-book-cover__title">《脉经》</span>
                  <span class="liangjin-book-cover__hint">点击翻阅</span>
                </div>
                <div v-else class="liangjin-book-spread" @click="onBookClick">
                  <span class="liangjin-book-spread-hint">点击左侧往前翻，右侧往后翻</span>
                  <div class="liangjin-book-spread-row">
                    <button type="button" class="liangjin-book-turn liangjin-book-turn--prev" :disabled="!canTurnPrev()" @click.stop="turnBookLeft" aria-label="上一页">
                      <ChevronLeft :size="24" />
                    </button>
                    <div class="liangjin-book-inner">
                      <div class="liangjin-book-half liangjin-book-half--left">
                        <template v-if="leftPageContent()">
                          <h5 class="liangjin-book-page__title">{{ leftPageContent().title }}</h5>
                          <p class="liangjin-book-page__body">{{ leftPageContent().body }}</p>
                          <p class="liangjin-book-page__meta">第 {{ bookSpreadIndex * 2 + 1 }} 页</p>
                        </template>
                      </div>
                      <div class="liangjin-book-spine"></div>
                      <div class="liangjin-book-half liangjin-book-half--right">
                        <template v-if="rightPageContent()">
                          <h5 class="liangjin-book-page__title">{{ rightPageContent().title }}</h5>
                          <p class="liangjin-book-page__body">{{ rightPageContent().body }}</p>
                          <p class="liangjin-book-page__meta">第 {{ bookSpreadIndex * 2 + 2 }} 页</p>
                        </template>
                      </div>
                    </div>
                    <button type="button" class="liangjin-book-turn liangjin-book-turn--next" :disabled="!canTurnNext()" @click.stop="turnBookRight" aria-label="下一页">
                      <ChevronRight :size="24" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <section class="liangjin-achievements-bar">
              <div class="liangjin-achievements-bar__row">
                <div class="liangjin-achievements-bar__main">
                  <h3 class="liangjin-achievements-bar__title">主要成就</h3>
                  <div class="liangjin-achievements-bar__grid">
                    <div v-for="(item, idx) in dynasty.achievements" :key="idx" class="liangjin-achievement-item">
                      <span class="liangjin-achievement-item__year">{{ item.year }}</span>
                      <h4 class="liangjin-achievement-item__title">{{ item.title }}</h4>
                      <p class="liangjin-achievement-item__desc">{{ item.description }}</p>
                    </div>
                  </div>
                </div>
                <div class="liangjin-achievements-bar__nav">
                  <button v-if="adjacent.prev" class="liangjin-nav-btn" @click="emit('go-to-dynasty', adjacent.prev.id)">
                    <ArrowLeft :size="18" />
                    <span>{{ adjacent.prev.name }}</span>
                  </button>
                  <button v-if="adjacent.next" class="liangjin-nav-btn" @click="emit('go-to-dynasty', adjacent.next.id)">
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
.liangjin-root {
  height: 100vh;
  overflow: hidden;
  overflow-x: hidden;
  overscroll-behavior: none;
}
.liangjin-root--fullscreen {
  height: 100vh;
}

.liangjin-fixed-bg {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  opacity: 1;
  transition: opacity 0.85s ease-out;
}
.liangjin-fixed-bg--fade {
  opacity: 0;
}
.liangjin-fixed-bg__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  filter: brightness(0.82) saturate(0.9);
}

.liangjin-back-float {
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
.liangjin-back-float:hover {
  background: rgba(28, 24, 22, 0.85);
  transform: translateY(-50%) translateX(-2px);
}
.liangjin-back-float__icon {
  transform: rotate(180deg);
}

.liangjin-flip-viewport {
  position: relative;
  z-index: 1;
  height: 100vh;
  overflow: hidden;
  flex-shrink: 0;
}
.liangjin-scroll-container {
  width: 100%;
  height: 300vh;
  will-change: transform;
  display: flex;
  flex-direction: column;
}
.liangjin-screen {
  width: 100%;
  flex: 0 0 100vh;
  min-height: 0;
  position: relative;
  overflow: hidden;
}

.liangjin-screen-1 {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
}
.liangjin-curtain__gradient {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  height: 100%;
  background: linear-gradient(to top, rgba(28, 24, 22, 0.92) 0%, rgba(45, 38, 35, 0.5) 45%, transparent 100%);
  pointer-events: none;
}
.liangjin-curtain__center {
  position: absolute;
  left: 50%;
  top: 38vh;
  transform: translate(-50%, -50%);
  text-align: center;
  z-index: 2;
  pointer-events: none;
}
.liangjin-curtain__name {
  font-size: clamp(2.4rem, 5.5vw, 3.8rem);
  color: #fff;
  letter-spacing: 12px;
  margin: 0;
  text-shadow: 0 2px 24px rgba(0,0,0,0.5);
}
.liangjin-curtain__divider {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin: 10px 0;
  opacity: 0.85;
}
.liangjin-curtain__period {
  font-size: 1.05rem;
  color: rgba(255,255,255,0.88);
  letter-spacing: 3px;
  margin: 0;
}
.liangjin-curtain__overview {
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
.liangjin-curtain__overview-text {
  font-size: 0.98rem;
  line-height: 1.9;
  color: rgba(255,255,255,0.82);
  margin: 0;
  text-align: center;
  max-width: 720px;
  white-space: pre-line;
}

.liangjin-screen-2 {
  background: var(--bg);
}
.liangjin-magazine {
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

.liangjin-magazine__col { padding: 0 2.5rem; }
.liangjin-magazine__p {
  font-size: 0.95rem;
  line-height: 2;
  color: var(--primary-dark);
  margin: 0 0 1.2em;
  text-align: justify;
}
.liangjin-magazine__p:last-of-type { margin-bottom: 0; }
.liangjin-magazine__img {
  width: 100%;
  max-width: 100%;
  margin-top: 1em;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.12);
  object-fit: cover;
  display: block;
}
.liangjin-magazine__divider {
  width: 1px;
  min-height: 120px;
  background: rgba(139, 94, 60, 0.2);
}

.liangjin-figures-dark {
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
.liangjin-third-inner {
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 12px 4vw 24px;
  -webkit-overflow-scrolling: touch;
  box-sizing: border-box;
}
.liangjin-figures-row {
  display: flex;
  align-items: stretch;
  justify-content: center;
  gap: 0;
  width: 100%;
  max-width: 1000px;
  margin: 0 auto 10px;
  flex-shrink: 0;
}
.liangjin-figures__gap {
  width: clamp(32px, 5vw, 64px);
  flex-shrink: 0;
}
.liangjin-figure-cell {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  max-width: 320px;
}
.liangjin-figure-cell--left { align-items: flex-end; }
.liangjin-figure-cell--right { align-items: flex-start; }
.liangjin-figure-img {
  width: 100%;
  max-width: 140px;
  aspect-ratio: 3/4;
  object-fit: cover;
  border-radius: 10px;
  box-shadow: 0 8px 28px rgba(0,0,0,0.4);
}
.liangjin-figure-cell--left .liangjin-figure-text { margin-left: 0; text-align: right; padding-right: 12px; }
.liangjin-figure-cell--right .liangjin-figure-text { margin-right: 0; text-align: left; padding-left: 12px; }
.liangjin-figure-text {
  margin-top: 10px;
  max-width: 100%;
  padding: 12px 10px;
  border-radius: 8px;
  background: rgba(253, 251, 247, 0.92);
  border: 1px solid rgba(139, 94, 60, 0.12);
}
.liangjin-figure-title {
  font-size: 1rem;
  font-weight: 600;
  color: #2c2c2c;
  margin: 0 0 6px;
  letter-spacing: 2px;
}
.liangjin-figure-desc {
  font-size: 0.8rem;
  line-height: 1.65;
  color: #3d3629;
  margin: 0;
}

.liangjin-book-wrap {
  flex: 1;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px 0;
}
.liangjin-book {
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
.liangjin-book-cover {
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
.liangjin-book-cover:hover {
  transform: scale(1.02);
  box-shadow: 0 20px 56px rgba(0,0,0,0.6);
}
.liangjin-book-cover__title {
  font-size: clamp(0.9rem, 1.8vw, 1.1rem);
  font-weight: 600;
  color: rgba(255,255,255,0.9);
  letter-spacing: 3px;
}
.liangjin-book-cover__hint {
  font-size: 0.7rem;
  color: rgba(255,255,255,0.5);
  letter-spacing: 2px;
}
.liangjin-book-spread {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  height: 100%;
  cursor: pointer;
}
.liangjin-book-spread-hint {
  font-size: 0.7rem;
  color: rgba(255,255,255,0.5);
  letter-spacing: 1px;
  flex-shrink: 0;
}
.liangjin-book-spread-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  flex: 1;
  min-height: 0;
  width: 100%;
}
.liangjin-book-spread-row .liangjin-book-turn { flex-shrink: 0; }
.liangjin-book-spread-row .liangjin-book-inner { flex: 1; min-height: 0; }
.liangjin-book-turn {
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
.liangjin-book-turn:hover:not(:disabled) {
  background: rgba(255,255,255,0.18);
}
.liangjin-book-turn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}
.liangjin-book-inner {
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
.liangjin-book-half {
  flex: 1;
  min-width: 0;
  min-height: 280px;
  padding: 16px 14px;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}
.liangjin-book-spine {
  width: 4px;
  background: linear-gradient(to right, rgba(139, 94, 60, 0.15), rgba(139, 94, 60, 0.35), rgba(139, 94, 60, 0.15));
  flex-shrink: 0;
}
.liangjin-book-page__title {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--primary-dark);
  margin: 0 0 10px;
  letter-spacing: 1px;
  padding-bottom: 6px;
  border-bottom: 1px solid rgba(139, 94, 60, 0.2);
}
.liangjin-book-page__body {
  font-size: 0.8rem;
  line-height: 1.9;
  color: var(--primary-dark);
  margin: 0;
  white-space: pre-line;
}
.liangjin-book-page__meta {
  font-size: 0.7rem;
  color: var(--text-secondary);
  margin-top: 12px;
  text-align: right;
}

.liangjin-achievements-bar {
  margin-top: 24px;
  padding: 28px 0 24px;
  background: linear-gradient(180deg, rgba(235, 229, 220, 0.92) 0%, rgba(224, 216, 204, 0.95) 100%);
  border-radius: 12px;
  border: 1px solid rgba(139, 94, 60, 0.18);
  flex-shrink: 0;
}
.liangjin-screen-3 .liangjin-achievements-bar {
  padding-left: 6vw;
  padding-right: 6vw;
  margin-left: -2vw;
  margin-right: -2vw;
  border-radius: 0;
}
.liangjin-achievements-bar__row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  max-width: 1000px;
  margin: 0 auto;
}
.liangjin-achievements-bar__main {
  flex: 1;
  min-width: 0;
}
.liangjin-achievements-bar__title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--primary-dark);
  margin: 0 0 16px;
  letter-spacing: 2px;
  display: flex;
  align-items: center;
  gap: 10px;
}
.liangjin-achievements-bar__title::before {
  content: '';
  width: 3px;
  height: 16px;
  background: var(--accent-red);
  border-radius: 2px;
}
.liangjin-achievements-bar__grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px 24px;
}
.liangjin-achievement-item {
  padding: 12px 0;
  border-bottom: 1px solid rgba(139, 94, 60, 0.12);
}
.liangjin-achievement-item__year {
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--accent-red);
  background: rgba(196, 78, 70, 0.1);
  padding: 2px 8px;
  border-radius: 4px;
  margin-bottom: 6px;
  display: inline-block;
}
.liangjin-achievement-item__title {
  font-size: 0.92rem;
  font-weight: 600;
  color: var(--primary-dark);
  margin: 0 0 4px;
}
.liangjin-achievement-item__desc {
  font-size: 0.82rem;
  color: var(--text-secondary);
  margin: 0;
  line-height: 1.5;
}
.liangjin-achievements-bar__nav {
  flex-shrink: 0;
  display: flex;
  gap: 12px;
}
.liangjin-nav-btn {
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
.liangjin-nav-btn:hover {
  background: rgba(255, 255, 255, 0.95);
  border-color: var(--primary);
}

@media (max-width: 640px) {
  .liangjin-curtain__overview { padding: 20px 6vw 36px; }
  .liangjin-magazine {
    grid-template-columns: 1fr;
    padding: 24px 5vw 32px;
  }
  .liangjin-magazine .liangjin-magazine__divider {
    width: 100%;
    height: 1px;
    min-height: 0;
    margin: 8px 0;
  }
  .liangjin-magazine .liangjin-magazine__col { padding: 0 0.5rem; }
  .liangjin-back-float { left: 12px; padding: 8px 12px; font-size: 0.85rem; }
  .liangjin-figures-row {
    flex-direction: column;
    align-items: center;
    gap: 20px;
  }
  .liangjin-figures__gap { width: 0; height: 0; }
  .liangjin-figure-cell { max-width: 100%; align-items: center !important; }
  .liangjin-figure-cell--left .liangjin-figure-text,
  .liangjin-figure-cell--right .liangjin-figure-text {
    text-align: center;
    padding-left: 8px;
    padding-right: 8px;
  }
  .liangjin-book { min-height: 240px; max-height: 58vh; }
  .liangjin-book-cover { height: clamp(220px, 50vw, 280px); }
  .liangjin-book-inner { min-height: 260px; max-height: 52vh; }
  .liangjin-book-half { min-height: 220px; }
  .liangjin-achievements-bar__row { flex-direction: column; }
  .liangjin-achievements-bar__grid { grid-template-columns: 1fr; }
}
</style>

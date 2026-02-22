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

const tangRootRef = ref(null)
const tangFlipActiveIndex = ref(0)
const tangIsAnimating = ref(false)
const TANG_TOTAL_PAGES = 3

const VH_PER_PAGE = 100

function tangMoveTo(index) {
  if (index < 0 || index >= TANG_TOTAL_PAGES) return
  if (tangIsAnimating.value) return
  tangIsAnimating.value = true
  const container = tangRootRef.value?.querySelector('.tang-scroll-container')
  if (!container) {
    tangFlipActiveIndex.value = index
    emit('page-change', index)
    tangIsAnimating.value = false
    return
  }
  const fromIndex = tangFlipActiveIndex.value
  tangFlipActiveIndex.value = index
  emit('page-change', index)

  if (tangRootRef.value) {
    const thirdInner = tangRootRef.value.querySelector('.tang-third-inner')
    if (thirdInner) thirdInner.scrollTop = 0
  }

  const yVh = -index * VH_PER_PAGE
  gsap.to(container, {
    y: `${yVh}vh`,
    duration: fromIndex === 0 && index === 1 ? 1 : 0.9,
    ease: 'power2.inOut',
    overwrite: true,
    onComplete: () => { tangIsAnimating.value = false },
  })
}

function tangHandleWheel(e) {
  if (!tangRootRef.value || !props.dynasty || props.dynasty.id !== 'tang') return
  const root = tangRootRef.value
  if (tangFlipActiveIndex.value === 2) {
    const thirdInner = root.querySelector('.tang-third-inner')
    if (thirdInner) {
      const atTop = thirdInner.scrollTop <= 2
      const atBottom = thirdInner.scrollTop + thirdInner.clientHeight >= thirdInner.scrollHeight - 2
      if (e.deltaY > 0 && !atBottom) return
      if (e.deltaY < 0 && !atTop) return
      if (e.deltaY < 0 && atTop) {
        e.preventDefault()
        if (tangIsAnimating.value) return
        if (Math.abs(e.deltaY) < 18) return
        tangMoveTo(1)
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
  if (tangIsAnimating.value) return
  if (Math.abs(e.deltaY) < 18) return
  if (e.deltaY > 0) {
    if (tangFlipActiveIndex.value < TANG_TOTAL_PAGES - 1) tangMoveTo(tangFlipActiveIndex.value + 1)
  } else {
    tangMoveTo(tangFlipActiveIndex.value - 1)
  }
}

// 典籍：《千金要方》封面 + 6 内页
const bookOpen = ref(false)
const bookSpreadIndex = ref(0)
const BOOK_PAGES = [
  { title: '大医精诚', body: '凡大医治病，必当安神定志，无欲无求，先发大慈恻隐之心，誓愿普救含灵之苦。若有疾厄来求救者，不得问其贵贱贫富，长幼妍蚩，怨亲善友，华夷愚智，普同一等，皆如至亲之想。\n\n亦不得瞻前顾后，自虑吉凶，护惜身命。见彼苦恼，若己有之，深心凄怆，勿避险巇、昼夜、寒暑、饥渴、疲劳，一心赴救，无作功夫形迹之心。如此可为苍生大医，反此则是含灵巨贼。\n\n夫大医之体，欲得澄神内视，望之俨然，宽裕汪汪，不皎不昧。省病诊疾，至意深心，详察形候，纤毫勿失。' },
  { title: '妇人与少小', body: '妇人者，众阴之所集，常与湿居。十四已上，阴气浮溢，百想经心，内伤五脏，外损姿颜。故妇人病比之男子十倍难疗。\n\n凡妇人非止临产须忧，至于产后，大须将慎。产后血气未平，五脏虚羸，若有所犯，多致丧命。\n\n凡生后六十日，瞳子成，能咳笑应和人。百五十日，任脉成，能自反覆。二百日，尻骨成，能独坐。三百日，膑骨成，能立。凡小儿病与大人不殊，惟用药有多少为异。' },
  { title: '脏腑与方剂', body: '肝藏血，血舍魂。心藏脉，脉舍神。脾藏营，营舍意。肺藏气，气舍魄。肾藏精，精舍志。五脏所藏，各有所主。\n\n凡欲疗病，先察其源，先候病机。五脏未虚，六腑未竭，血脉未乱，精神未散，服药必活。若病已成，可得半愈。病势已过，命将难全。\n\n古之善为医者，上医医国，中医医人，下医医病。又曰：上工治未病，中工治欲病，下工治已病。' },
  { title: '用药与合和', body: '药有君臣佐使，以相宣摄。合和之时，须从五行、四时、君臣佐使。凡合和汤药，务在精专。秤两既正，勿以秤覆。\n\n凡药皆须采之有时日，阴干暴干，则有气力。若不依时采之，则与凡草无别，徒弃功用，终无益也。\n\n凡服汤药，虽品物专精，修治如法，而煎煮失度，水火不良，火候失宜，则药亦无功。凡煮汤，当以井华水，极令净洁。' },
  { title: '养生与食疗', body: '安身之本，必资于食。救疾之速，必凭于药。不知食宜者，不足以存生也。不明药忌者，不能以除病也。\n\n食能排邪而安脏腑，悦神爽志以资血气。若能用食平疴释情遣疾者，可谓良工。长年饵老之奇法，极养生之术也。\n\n夫为医者，当须先洞晓病源，知其所犯，以食治之。食疗不愈，然后命药。药性刚烈，犹若御兵；兵之猛暴，岂容妄发。' },
  { title: '结语', body: '《备急千金要方》为孙思邈所著，集唐以前医学之大成，被誉为中国最早的临床百科全书。全书三十卷，分二百三十二门，载方五千三百余首，涵盖妇人、少小、七窍、风毒、伤寒、脏腑、痈疽、解毒、备急等，理法方药兼备。\n\n孙思邈被后世尊为“药王”，其“大医精诚”之论，至今仍为医家行为圭臬。唐代另有王焘《外台秘要》、政府颁行《新修本草》，与《千金要方》共同标志着唐代医学之鼎盛。' },
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
    if (id !== 'tang') return
    nextTick(() => {
      const root = tangRootRef.value
      if (!root) return
      root.addEventListener('wheel', tangHandleWheel, { passive: false })
      const container = root.querySelector('.tang-scroll-container')
      if (container) gsap.set(container, { y: '0vh' })
      const thirdInner = root.querySelector('.tang-third-inner')
      if (thirdInner) thirdInner.scrollTop = 0
      tangFlipActiveIndex.value = 0
      emit('page-change', 0)
      bookOpen.value = false
      bookSpreadIndex.value = 0
    })
  },
  { immediate: true }
)
onBeforeUnmount(() => {
  const root = tangRootRef.value
  if (root) root.removeEventListener('wheel', tangHandleWheel)
})
</script>

<template>
  <div
    ref="tangRootRef"
    class="tang-root"
    :class="{ 'tang-root--fullscreen': tangFlipActiveIndex <= 1 }"
  >
    <button type="button" class="tang-back-float" @click="emit('back')" aria-label="返回">
      <ArrowLeft :size="20" class="tang-back-float__icon" />
      <span>返回</span>
    </button>

    <div
      v-show="dynasty"
      class="tang-fixed-bg"
      :class="{ 'tang-fixed-bg--fade': tangFlipActiveIndex === 2 }"
      aria-hidden="true"
    >
      <img :src="getPhotoUrl(dynasty.heroImage)" :alt="dynasty.name" class="tang-fixed-bg__img" />
    </div>

    <div class="tang-flip-viewport">
      <div class="tang-scroll-container">
        <section class="tang-screen tang-screen-1">
          <div class="tang-curtain__gradient"></div>
          <div class="tang-curtain__center">
            <h2 class="tang-curtain__name">{{ dynasty.name }}</h2>
            <div class="tang-curtain__divider">
              <span class="hero-line"></span>
              <span class="hero-diamond"></span>
              <span class="hero-line"></span>
            </div>
            <p class="tang-curtain__period">{{ dynasty.period }}</p>
          </div>
          <div class="tang-curtain__overview">
            <p class="tang-curtain__overview-text">{{ dynasty.overview }}</p>
          </div>
        </section>

        <section class="tang-screen tang-screen-2">
          <div class="tang-magazine">
            <div class="tang-magazine__col">
              <p class="tang-magazine__p">唐代是中国传统医学发展的鼎盛时期。政治稳定、经济繁荣，促进了医学的全面进步。朝廷设太医署，集医学教育、医疗与行政管理于一体；医学典籍大量编纂，孙思邈《备急千金要方》集唐以前医学大成，被誉为中国最早的临床百科全书，王焘《外台秘要》汇集大量医方，政府又颁行《新修本草》，成为世界上第一部国家药典。</p>
              <p class="tang-magazine__p">孙思邈被后世尊为“药王”，其《千金要方》三十卷，分二百三十二门，载方五千三百余首，涵盖妇人、少小、七窍、风毒、伤寒、脏腑、痈疽、备急等，理法方药兼备。书中“大医精诚”一篇，论医者须发大慈恻隐之心、誓愿普救含灵之苦，不问贵贱贫富、普同一等，至今仍为医德规范之圭臬。</p>
              <p class="tang-magazine__p">《新修本草》由唐政府组织苏敬等人编纂，共五十四卷，收药八百五十种，并绘有药图，于显庆四年颁行天下，标志着国家药典的诞生。王焘《外台秘要》四十卷，汇集东汉至唐大量医方，每方注明出处，为后世辑佚与临床参考之重要文献。唐代医学对外交流亦盛，其制度与典籍东传日本、朝鲜，影响深远。</p>
              <p class="tang-magazine__p">综观唐代，医学在官方制度、方书编纂、本草规范与医德建设诸方面均达空前高度，为宋金元明清医学之发展奠定了坚实基础。</p>
            </div>
            <div class="tang-magazine__divider"></div>
            <div class="tang-magazine__col">
              <p class="tang-magazine__p">孙思邈京兆华原人，少时多病，因立志学医。他博通经史、兼及释道，认为“人命至重，有贵千金，一方济之，德逾于此”，故以“千金”名其方书。又著《千金翼方》以辅翼前书。王焘曾任职弘文馆，长期管理图籍，得阅大量医书，遂采摭群经、汇成《外台秘要》，所引前人著作多已亡佚，赖此书得存一斑。</p>
              <img :src="getPhotoUrl('千金药方横屏.jpg')" alt="千金要方" class="tang-magazine__img" @error="($e) => ($e.target.style.display = 'none')" />
            </div>
          </div>
        </section>

        <section class="tang-screen tang-screen-3 tang-figures-dark" :style="{ backgroundImage: `url(${getPhotoUrl('朝代背景6.jpg')})` }">
          <div class="tang-third-inner">
            <div class="tang-figures-row">
              <div class="tang-figure-cell tang-figure-cell--left">
                <img :src="getPhotoUrl('孙思邈.jpg')" alt="孙思邈" class="tang-figure-img" @error="($e) => ($e.target.src = getPhotoUrl(dynasty.heroImage))" />
                <div class="tang-figure-text">
                  <h4 class="tang-figure-title">孙思邈</h4>
                  <p class="tang-figure-desc">“药王”，著《备急千金要方》《千金翼方》，集唐以前医学大成；“大医精诚”论医德，至今为医家圭臬。</p>
                </div>
              </div>
              <div class="tang-figures__gap"></div>
              <div class="tang-figure-cell tang-figure-cell--right">
                <img :src="getPhotoUrl('王焘.jpg')" alt="王焘" class="tang-figure-img" @error="($e) => ($e.target.src = getPhotoUrl(dynasty.heroImage))" />
                <div class="tang-figure-text">
                  <h4 class="tang-figure-title">王焘</h4>
                  <p class="tang-figure-desc">著《外台秘要》四十卷，汇集东汉至唐大量医方，每方注明出处，为辑佚与临床参考之重要文献。</p>
                </div>
              </div>
            </div>
            <div class="tang-book-wrap">
              <div class="tang-book" :class="{ 'tang-book--open': bookOpen }">
                <div v-if="!bookOpen" class="tang-book-cover" @click="openBook">
                  <span class="tang-book-cover__title">《千金要方》</span>
                  <span class="tang-book-cover__hint">点击翻阅</span>
                </div>
                <div v-else class="tang-book-spread" @click="onBookClick">
                  <span class="tang-book-spread-hint">点击左侧往前翻，右侧往后翻</span>
                  <div class="tang-book-spread-row">
                    <button type="button" class="tang-book-turn tang-book-turn--prev" :disabled="!canTurnPrev()" @click.stop="turnBookLeft" aria-label="上一页">
                      <ChevronLeft :size="24" />
                    </button>
                    <div class="tang-book-inner">
                      <div class="tang-book-half tang-book-half--left">
                        <template v-if="leftPageContent()">
                          <h5 class="tang-book-page__title">{{ leftPageContent().title }}</h5>
                          <p class="tang-book-page__body">{{ leftPageContent().body }}</p>
                          <p class="tang-book-page__meta">第 {{ bookSpreadIndex * 2 + 1 }} 页</p>
                        </template>
                      </div>
                      <div class="tang-book-spine"></div>
                      <div class="tang-book-half tang-book-half--right">
                        <template v-if="rightPageContent()">
                          <h5 class="tang-book-page__title">{{ rightPageContent().title }}</h5>
                          <p class="tang-book-page__body">{{ rightPageContent().body }}</p>
                          <p class="tang-book-page__meta">第 {{ bookSpreadIndex * 2 + 2 }} 页</p>
                        </template>
                      </div>
                    </div>
                    <button type="button" class="tang-book-turn tang-book-turn--next" :disabled="!canTurnNext()" @click.stop="turnBookRight" aria-label="下一页">
                      <ChevronRight :size="24" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <section class="tang-achievements-bar">
              <div class="tang-achievements-bar__row">
                <div class="tang-achievements-bar__main">
                  <h3 class="tang-achievements-bar__title">主要成就</h3>
                  <div class="tang-achievements-bar__grid">
                    <div v-for="(item, idx) in dynasty.achievements" :key="idx" class="tang-achievement-item">
                      <span class="tang-achievement-item__year">{{ item.year }}</span>
                      <h4 class="tang-achievement-item__title">{{ item.title }}</h4>
                      <p class="tang-achievement-item__desc">{{ item.description }}</p>
                    </div>
                  </div>
                </div>
                <div class="tang-achievements-bar__nav">
                  <button v-if="adjacent.prev" class="tang-nav-btn" @click="emit('go-to-dynasty', adjacent.prev.id)">
                    <ArrowLeft :size="18" />
                    <span>{{ adjacent.prev.name }}</span>
                  </button>
                  <button v-if="adjacent.next" class="tang-nav-btn" @click="emit('go-to-dynasty', adjacent.next.id)">
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
.tang-root {
  height: 100vh;
  overflow: hidden;
  overflow-x: hidden;
  overscroll-behavior: none;
}
.tang-root--fullscreen {
  height: 100vh;
}

.tang-fixed-bg {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  opacity: 1;
  transition: opacity 0.85s ease-out;
}
.tang-fixed-bg--fade {
  opacity: 0;
}
.tang-fixed-bg__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  filter: brightness(0.82) saturate(0.9);
}

.tang-back-float {
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
.tang-back-float:hover {
  background: rgba(28, 24, 22, 0.85);
  transform: translateY(-50%) translateX(-2px);
}
.tang-back-float__icon {
  transform: rotate(180deg);
}

.tang-flip-viewport {
  position: relative;
  z-index: 1;
  height: 100vh;
  overflow: hidden;
  flex-shrink: 0;
}
.tang-scroll-container {
  width: 100%;
  height: 300vh;
  will-change: transform;
  display: flex;
  flex-direction: column;
}
.tang-screen {
  width: 100%;
  flex: 0 0 100vh;
  min-height: 0;
  position: relative;
  overflow: hidden;
}

.tang-screen-1 {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
}
.tang-curtain__gradient {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  height: 100%;
  background: linear-gradient(to top, rgba(28, 24, 22, 0.92) 0%, rgba(45, 38, 35, 0.5) 45%, transparent 100%);
  pointer-events: none;
}
.tang-curtain__center {
  position: absolute;
  left: 50%;
  top: 38vh;
  transform: translate(-50%, -50%);
  text-align: center;
  z-index: 2;
  pointer-events: none;
}
.tang-curtain__name {
  font-size: clamp(2.4rem, 5.5vw, 3.8rem);
  color: #fff;
  letter-spacing: 12px;
  margin: 0;
  text-shadow: 0 2px 24px rgba(0,0,0,0.5);
}
.tang-curtain__divider {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin: 10px 0;
  opacity: 0.85;
}
.tang-curtain__period {
  font-size: 1.05rem;
  color: rgba(255,255,255,0.88);
  letter-spacing: 3px;
  margin: 0;
}
.tang-curtain__overview {
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
.tang-curtain__overview-text {
  font-size: 0.98rem;
  line-height: 1.9;
  color: rgba(255,255,255,0.82);
  margin: 0;
  text-align: center;
  max-width: 720px;
}

.tang-screen-2 {
  background: var(--bg);
}
.tang-magazine {
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

.tang-magazine__col { padding: 0 2.5rem; }
.tang-magazine__p {
  font-size: 0.95rem;
  line-height: 2;
  color: var(--primary-dark);
  margin: 0 0 1.2em;
  text-align: justify;
}
.tang-magazine__p:last-of-type { margin-bottom: 0; }
.tang-magazine__img {
  width: 100%;
  max-width: 100%;
  margin-top: 1em;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.12);
  object-fit: cover;
  display: block;
}
.tang-magazine__divider {
  width: 1px;
  min-height: 120px;
  background: rgba(139, 94, 60, 0.2);
}

.tang-figures-dark {
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
.tang-third-inner {
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 12px 4vw 24px;
  -webkit-overflow-scrolling: touch;
  box-sizing: border-box;
}
.tang-figures-row {
  display: flex;
  align-items: stretch;
  justify-content: center;
  gap: 0;
  width: 100%;
  max-width: 1000px;
  margin: 0 auto 10px;
  flex-shrink: 0;
}
.tang-figures__gap {
  width: clamp(32px, 5vw, 64px);
  flex-shrink: 0;
}
.tang-figure-cell {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  max-width: 320px;
}
.tang-figure-cell--left { align-items: flex-end; }
.tang-figure-cell--right { align-items: flex-start; }
.tang-figure-img {
  width: 100%;
  max-width: 140px;
  aspect-ratio: 3/4;
  object-fit: cover;
  border-radius: 10px;
  box-shadow: 0 8px 28px rgba(0,0,0,0.4);
}
.tang-figure-cell--left .tang-figure-text { margin-left: 0; text-align: right; padding-right: 12px; }
.tang-figure-cell--right .tang-figure-text { margin-right: 0; text-align: left; padding-left: 12px; }
.tang-figure-text {
  margin-top: 10px;
  max-width: 100%;
  padding: 12px 10px;
  border-radius: 8px;
  background: rgba(253, 251, 247, 0.92);
  border: 1px solid rgba(139, 94, 60, 0.12);
}
.tang-figure-title {
  font-size: 1rem;
  font-weight: 600;
  color: #2c2c2c;
  margin: 0 0 6px;
  letter-spacing: 2px;
}
.tang-figure-desc {
  font-size: 0.8rem;
  line-height: 1.65;
  color: #3d3629;
  margin: 0;
}

.tang-book-wrap {
  flex: 1;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px 0;
}
.tang-book {
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
.tang-book-cover {
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
.tang-book-cover:hover {
  transform: scale(1.02);
  box-shadow: 0 20px 56px rgba(0,0,0,0.6);
}
.tang-book-cover__title {
  font-size: clamp(0.9rem, 1.8vw, 1.1rem);
  font-weight: 600;
  color: rgba(255,255,255,0.9);
  letter-spacing: 3px;
}
.tang-book-cover__hint {
  font-size: 0.7rem;
  color: rgba(255,255,255,0.5);
  letter-spacing: 2px;
}
.tang-book-spread {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  height: 100%;
  cursor: pointer;
}
.tang-book-spread-hint {
  font-size: 0.7rem;
  color: rgba(255,255,255,0.5);
  letter-spacing: 1px;
  flex-shrink: 0;
}
.tang-book-spread-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  flex: 1;
  min-height: 0;
  width: 100%;
}
.tang-book-spread-row .tang-book-turn { flex-shrink: 0; }
.tang-book-spread-row .tang-book-inner { flex: 1; min-height: 0; }
.tang-book-turn {
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
.tang-book-turn:hover:not(:disabled) {
  background: rgba(255,255,255,0.18);
}
.tang-book-turn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}
.tang-book-inner {
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
.tang-book-half {
  flex: 1;
  min-width: 0;
  min-height: 280px;
  padding: 16px 14px;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}
.tang-book-spine {
  width: 4px;
  background: linear-gradient(to right, rgba(139, 94, 60, 0.15), rgba(139, 94, 60, 0.35), rgba(139, 94, 60, 0.15));
  flex-shrink: 0;
}
.tang-book-page__title {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--primary-dark);
  margin: 0 0 10px;
  letter-spacing: 1px;
  padding-bottom: 6px;
  border-bottom: 1px solid rgba(139, 94, 60, 0.2);
}
.tang-book-page__body {
  font-size: 0.8rem;
  line-height: 1.9;
  color: var(--primary-dark);
  margin: 0;
  white-space: pre-line;
}
.tang-book-page__meta {
  font-size: 0.7rem;
  color: var(--text-secondary);
  margin-top: 12px;
  text-align: right;
}

.tang-achievements-bar {
  margin-top: 24px;
  padding: 28px 0 24px;
  background: linear-gradient(180deg, rgba(235, 229, 220, 0.92) 0%, rgba(224, 216, 204, 0.95) 100%);
  border-radius: 12px;
  border: 1px solid rgba(139, 94, 60, 0.18);
  flex-shrink: 0;
}
.tang-screen-3 .tang-achievements-bar {
  padding-left: 6vw;
  padding-right: 6vw;
  margin-left: -2vw;
  margin-right: -2vw;
  border-radius: 0;
}
.tang-achievements-bar__row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  max-width: 1000px;
  margin: 0 auto;
}
.tang-achievements-bar__main {
  flex: 1;
  min-width: 0;
}
.tang-achievements-bar__title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--primary-dark);
  margin: 0 0 16px;
  letter-spacing: 2px;
  display: flex;
  align-items: center;
  gap: 10px;
}
.tang-achievements-bar__title::before {
  content: '';
  width: 3px;
  height: 16px;
  background: var(--accent-red);
  border-radius: 2px;
}
.tang-achievements-bar__grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px 24px;
}
.tang-achievement-item {
  padding: 12px 0;
  border-bottom: 1px solid rgba(139, 94, 60, 0.12);
}
.tang-achievement-item__year {
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--accent-red);
  background: rgba(196, 78, 70, 0.1);
  padding: 2px 8px;
  border-radius: 4px;
  margin-bottom: 6px;
  display: inline-block;
}
.tang-achievement-item__title {
  font-size: 0.92rem;
  font-weight: 600;
  color: var(--primary-dark);
  margin: 0 0 4px;
}
.tang-achievement-item__desc {
  font-size: 0.82rem;
  color: var(--text-secondary);
  margin: 0;
  line-height: 1.5;
}
.tang-achievements-bar__nav {
  flex-shrink: 0;
  display: flex;
  gap: 12px;
}
.tang-nav-btn {
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
.tang-nav-btn:hover {
  background: rgba(255, 255, 255, 0.95);
  border-color: var(--primary);
}

@media (max-width: 640px) {
  .tang-curtain__overview { padding: 20px 6vw 36px; }
  .tang-magazine {
    grid-template-columns: 1fr;
    padding: 24px 5vw 32px;
  }
  .tang-magazine .tang-magazine__divider {
    width: 100%;
    height: 1px;
    min-height: 0;
    margin: 8px 0;
  }
  .tang-magazine .tang-magazine__col { padding: 0 0.5rem; }
  .tang-back-float { left: 12px; padding: 8px 12px; font-size: 0.85rem; }
  .tang-figures-row {
    flex-direction: column;
    align-items: center;
    gap: 20px;
  }
  .tang-figures__gap { width: 0; height: 0; }
  .tang-figure-cell { max-width: 100%; align-items: center !important; }
  .tang-figure-cell--left .tang-figure-text,
  .tang-figure-cell--right .tang-figure-text {
    text-align: center;
    padding-left: 8px;
    padding-right: 8px;
  }
  .tang-book { min-height: 240px; max-height: 58vh; }
  .tang-book-cover { height: clamp(220px, 50vw, 280px); }
  .tang-book-inner { min-height: 260px; max-height: 52vh; }
  .tang-book-half { min-height: 220px; }
  .tang-achievements-bar__row { flex-direction: column; }
  .tang-achievements-bar__grid { grid-template-columns: 1fr; }
}
</style>

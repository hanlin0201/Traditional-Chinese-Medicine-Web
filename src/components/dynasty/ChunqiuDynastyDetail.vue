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

const chunqiuRootRef = ref(null)
const chunqiuFlipActiveIndex = ref(0)
const chunqiuIsAnimating = ref(false)
const CHUNQIU_TOTAL_PAGES = 3

const VH_PER_PAGE = 100

function chunqiuMoveTo(index) {
  if (index < 0 || index >= CHUNQIU_TOTAL_PAGES) return
  if (chunqiuIsAnimating.value) return
  chunqiuIsAnimating.value = true
  const container = chunqiuRootRef.value?.querySelector('.chunqiu-scroll-container')
  if (!container) {
    chunqiuFlipActiveIndex.value = index
    emit('page-change', index)
    chunqiuIsAnimating.value = false
    return
  }
  const fromIndex = chunqiuFlipActiveIndex.value
  chunqiuFlipActiveIndex.value = index
  emit('page-change', index)

  if (chunqiuRootRef.value) {
    const thirdInner = chunqiuRootRef.value.querySelector('.chunqiu-third-inner')
    if (thirdInner) thirdInner.scrollTop = 0
  }

  const yVh = -index * VH_PER_PAGE
  gsap.to(container, {
    y: `${yVh}vh`,
    duration: fromIndex === 0 && index === 1 ? 1 : 0.9,
    ease: 'power2.inOut',
    overwrite: true,
    onComplete: () => { chunqiuIsAnimating.value = false },
  })
}

function chunqiuHandleWheel(e) {
  if (!chunqiuRootRef.value || !props.dynasty || props.dynasty.id !== 'chunqiu') return
  const root = chunqiuRootRef.value
  if (chunqiuFlipActiveIndex.value === 2) {
    const thirdInner = root.querySelector('.chunqiu-third-inner')
    if (thirdInner) {
      const atTop = thirdInner.scrollTop <= 2
      const atBottom = thirdInner.scrollTop + thirdInner.clientHeight >= thirdInner.scrollHeight - 2
      if (e.deltaY > 0 && !atBottom) return
      if (e.deltaY < 0 && !atTop) return
      if (e.deltaY < 0 && atTop) {
        e.preventDefault()
        if (chunqiuIsAnimating.value) return
        if (Math.abs(e.deltaY) < 18) return
        chunqiuMoveTo(1)
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
  if (chunqiuIsAnimating.value) return
  if (Math.abs(e.deltaY) < 18) return
  if (e.deltaY > 0) {
    if (chunqiuFlipActiveIndex.value < CHUNQIU_TOTAL_PAGES - 1) chunqiuMoveTo(chunqiuFlipActiveIndex.value + 1)
  } else {
    chunqiuMoveTo(chunqiuFlipActiveIndex.value - 1)
  }
}

// 典籍：《黄帝内经》封面 + 6 内页
const bookOpen = ref(false)
const bookSpreadIndex = ref(0)
const BOOK_PAGES = [
  { title: '阴阳与天地', body: '阴阳者，天地之道也，万物之纲纪，变化之父母，生杀之本始，神明之府也。治病必求于本。\n\n故积阳为天，积阴为地。阴静阳躁，阳生阴长，阳杀阴藏。阳化气，阴成形。寒极生热，热极生寒。\n\n阴阳之要，阳密乃固。两者不和，若春无秋，若冬无夏。因而和之，是谓圣度。故阳强不能密，阴气乃绝；阴平阳秘，精神乃治；阴阳离决，精气乃绝。' },
  { title: '藏象与经络', body: '心者，君主之官也，神明出焉。肺者，相傅之官，治节出焉。肝者，将军之官，谋虑出焉。胆者，中正之官，决断出焉。脾胃者，仓廪之官，五味出焉。大肠者，传道之官，变化出焉。小肠者，受盛之官，化物出焉。肾者，作强之官，伎巧出焉。三焦者，决渎之官，水道出焉。膀胱者，州都之官，津液藏焉。\n\n经脉者，所以能决死生、处百病、调虚实，不可不通。十二经脉者，内属于腑脏，外络于肢节。夫十二经脉者，人之所以生，病之所以成，人之所以治，病之所以起；学之所始，工之所止也。' },
  { title: '病因与病机', body: '夫邪之生也，或生于阴，或生于阳。其生于阳者，得之风雨寒暑；其生于阴者，得之饮食居处、阴阳喜怒。\n\n正气存内，邪不可干。邪之所凑，其气必虚。故善治者治皮毛，其次治肌肤，其次治筋脉，其次治六腑，其次治五脏。治五脏者，半死半生也。\n\n喜怒不节则伤脏，风雨则伤上，清湿则伤下。三部之气，所伤异类。虚邪之风，与其身形，两虚相得，乃客其形。两实相逢，众人肉坚。' },
  { title: '四气调神', body: '春三月，此谓发陈，天地俱生，万物以荣。夜卧早起，广步于庭，被发缓形，以使志生。生而勿杀，予而勿夺，赏而勿罚。此春气之应，养生之道也。逆之则伤肝，夏为寒变，奉长者少。\n\n夏三月，此谓蕃秀，天地气交，万物华实。夜卧早起，无厌于日，使志无怒，使华英成秀，使气得泄。此夏气之应，养长之道也。逆之则伤心，秋为痎疟，奉收者少。\n\n秋三月，此谓容平；冬三月，此谓闭藏。顺四时之气，则生；逆之则病。故阴阳四时者，万物之终始也，死生之本也。逆之则灾害生，从之则苛疾不起，是谓得道。' },
  { title: '治则与治法', body: '治病必求于本。其高者因而越之，其下者引而竭之，中满者泻之于内。其在皮者汗而发之，其慓悍者按而收之。\n\n寒者热之，热者寒之；微者逆之，甚者从之。坚者削之，客者除之，劳者温之，结者散之。留者攻之，燥者濡之，急者缓之，散者收之。\n\n形不足者温之以气，精不足者补之以味。其高者因而越之，其下者引而竭之。中满者泻之于内。有邪者渍形以为汗，其在皮者汗而发之。审其阴阳，以别柔刚，阳病治阴，阴病治阳。' },
  { title: '结语', body: '《黄帝内经》奠定了中医学的理论基础，阴阳五行、藏象经络、病因病机、治则治法，影响至今。与《伤寒杂病论》《神农本草经》《温病条辨》等并称中医经典。\n\n习医者当以《素问》《灵枢》为宗，再及历代注家与临床，则理论有本、辨证有据。\n\n上古之人，其知道者，法于阴阳，和于术数，食饮有节，起居有常，不妄作劳，故能形与神俱，而尽终其天年，度百岁乃去。今时之人不然也，以酒为浆，以妄为常，醉以入房，以欲竭其精，以耗散其真，不知持满，不时御神，务快其心，逆于生乐，起居无节，故半百而衰也。' },
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
    if (id !== 'chunqiu') return
    nextTick(() => {
      const root = chunqiuRootRef.value
      if (!root) return
      root.addEventListener('wheel', chunqiuHandleWheel, { passive: false })
      const container = root.querySelector('.chunqiu-scroll-container')
      if (container) gsap.set(container, { y: '0vh' })
      const thirdInner = root.querySelector('.chunqiu-third-inner')
      if (thirdInner) thirdInner.scrollTop = 0
      chunqiuFlipActiveIndex.value = 0
      emit('page-change', 0)
      bookOpen.value = false
      bookSpreadIndex.value = 0
    })
  },
  { immediate: true }
)
onBeforeUnmount(() => {
  const root = chunqiuRootRef.value
  if (root) root.removeEventListener('wheel', chunqiuHandleWheel)
})
</script>

<template>
  <div
    ref="chunqiuRootRef"
    class="chunqiu-root"
    :class="{ 'chunqiu-root--fullscreen': chunqiuFlipActiveIndex <= 1 }"
  >
    <button type="button" class="chunqiu-back-float" @click="emit('back')" aria-label="返回">
      <ArrowLeft :size="20" class="chunqiu-back-float__icon" />
      <span>返回</span>
    </button>

    <div
      v-show="dynasty"
      class="chunqiu-fixed-bg"
      :class="{ 'chunqiu-fixed-bg--fade': chunqiuFlipActiveIndex === 2 }"
      aria-hidden="true"
    >
      <img :src="getPhotoUrl(dynasty.heroImage)" :alt="dynasty.name" class="chunqiu-fixed-bg__img" />
    </div>

    <div class="chunqiu-flip-viewport">
      <div class="chunqiu-scroll-container">
        <section class="chunqiu-screen chunqiu-screen-1">
          <div class="chunqiu-curtain__gradient"></div>
          <div class="chunqiu-curtain__center">
            <h2 class="chunqiu-curtain__name">{{ dynasty.name }}</h2>
            <div class="chunqiu-curtain__divider">
              <span class="hero-line"></span>
              <span class="hero-diamond"></span>
              <span class="hero-line"></span>
            </div>
            <p class="chunqiu-curtain__period">{{ dynasty.period }}</p>
          </div>
          <div class="chunqiu-curtain__overview">
            <p class="chunqiu-curtain__overview-text">{{ dynasty.overview }}</p>
          </div>
        </section>

        <section class="chunqiu-screen chunqiu-screen-2">
          <div class="chunqiu-magazine">
            <div class="chunqiu-magazine__col">
              <p class="chunqiu-magazine__p">春秋战国时期诸子百家争鸣，思想活跃，医学也由零散经验走向系统化与理论化。这一时期战争频仍、列国并立，百姓在动荡中更需疗疾养生之道，医家与方士在各国间游走行医、著书立说，《黄帝内经》正是在这一背景下集前人智慧而成，奠定了中医学的理论基石。</p>
              <p class="chunqiu-magazine__p">《黄帝内经》以黄帝与岐伯等臣子问答的形式，系统阐述了阴阳五行、藏象经络、病因病机与治则治法，确立了“整体观念”与“辨证论治”的雏形。书中将人体与天地四时相应，认为“夫邪之生也，或生于阴，或生于阳”，治疗须“治病必求于本”，这些思想影响至今。与此同时，扁鹊等名医活跃于民间，开创望、闻、问、切四诊合参之法，脉学与临床诊断得到长足发展，与《黄帝内经》的理论建构共同构成了这一时期中医发展的双翼。</p>
              <p class="chunqiu-magazine__p">在理论建构之外，春秋战国医家对药物与针灸的运用也日趋成熟。《素问》中已有“毒药攻邪，五谷为养”之论，强调药物与饮食的配合；《灵枢》则详述九针之形与用，奠定了后世针灸取穴与手法的规范。各国宫廷与民间均有医官或游医，他们或为贵族诊疾，或为庶民施治，在反复实践中将经验上升为可传授的学问，为秦汉时期《伤寒杂病论》《神农本草经》的成书创造了条件。</p>
              <p class="chunqiu-magazine__p">综观这一时期，中医完成了从口耳相传、零散验方到体系化理论的飞跃。阴阳五行成为解释人体与疾病的理论框架，藏象学说将脏腑与体表、情志、四时联系起来，经络学说则为针灸与内治提供了统一的基础。后世所称“岐黄之术”，正源于这一时期黄帝与岐伯的对话；而扁鹊“入虢国起太子”“望齐侯之色”等传说，则生动反映了当时诊法的高超与医家的社会地位。春秋战国因而被视为中医学理论体系的奠基时代。</p>
            </div>
            <div class="chunqiu-magazine__divider"></div>
            <div class="chunqiu-magazine__col">
              <p class="chunqiu-magazine__p">扁鹊姓秦名越人，相传得长桑君之传，能“视病尽见五脏症结”，以脉诊与望诊闻名诸侯。他提出“病有六不治”，强调医患配合与早期治疗，并随俗为变：在赵为带下医，在周为耳目痹医，在秦为小儿医，体现了辨证施治、因时因地因人制宜的思想。岐伯在《黄帝内经》中与黄帝论医，代表当时医学的最高智慧，后世以“岐黄”并称，成为中医的代名词。春秋战国时期虽未形成后世那样严密的方剂与本草体系，但理论框架与诊法规范已初步确立，为秦汉时期《伤寒杂病论》《神农本草经》的成书铺平了道路。</p>
              <img :src="getPhotoUrl('黄帝内经横屏.jpg')" alt="黄帝内经" class="chunqiu-magazine__img" @error="($e) => ($e.target.style.display = 'none')" />
            </div>
          </div>
        </section>

        <section class="chunqiu-screen chunqiu-screen-3 chunqiu-figures-dark" :style="{ backgroundImage: `url(${getPhotoUrl('朝代背景3.jpg')})` }">
          <div class="chunqiu-third-inner">
            <div class="chunqiu-figures-row">
              <div class="chunqiu-figure-cell chunqiu-figure-cell--left">
                <img :src="getPhotoUrl('扁鹊.jpg')" alt="扁鹊" class="chunqiu-figure-img" @error="($e) => ($e.target.src = getPhotoUrl(dynasty.heroImage))" />
                <div class="chunqiu-figure-text">
                  <h4 class="chunqiu-figure-title">扁鹊</h4>
                  <p class="chunqiu-figure-desc">脉学与四诊法的集大成者，开创望闻问切。相传得长桑君之传，能视病尽见五脏症结，以脉诊闻名诸侯，随俗为变，在赵为带下医、在周为耳目痹医、在秦为小儿医，被尊为医家之祖。</p>
                </div>
              </div>
              <div class="chunqiu-figures__gap"></div>
              <div class="chunqiu-figure-cell chunqiu-figure-cell--right">
                <img :src="getPhotoUrl('岐博.jpg')" alt="岐伯" class="chunqiu-figure-img" @error="($e) => ($e.target.src = getPhotoUrl(dynasty.heroImage))" />
                <div class="chunqiu-figure-text">
                  <h4 class="chunqiu-figure-title">岐伯</h4>
                  <p class="chunqiu-figure-desc">《黄帝内经》中与黄帝论医的医家，代表当时医学智慧。后世以“岐黄”并称，成为中医代名词。其论阴阳五行、藏象经络、病因病机，奠定了中医学理论框架。</p>
                </div>
              </div>
            </div>
            <div class="chunqiu-book-wrap">
              <div class="chunqiu-book" :class="{ 'chunqiu-book--open': bookOpen }">
                <div v-if="!bookOpen" class="chunqiu-book-cover" @click="openBook">
                  <span class="chunqiu-book-cover__title">《黄帝内经》</span>
                  <span class="chunqiu-book-cover__hint">点击翻阅</span>
                </div>
                <div v-else class="chunqiu-book-spread" @click="onBookClick">
                  <span class="chunqiu-book-spread-hint">点击左侧往前翻，右侧往后翻</span>
                  <div class="chunqiu-book-spread-row">
                    <button type="button" class="chunqiu-book-turn chunqiu-book-turn--prev" :disabled="!canTurnPrev()" @click.stop="turnBookLeft" aria-label="上一页">
                      <ChevronLeft :size="24" />
                    </button>
                    <div class="chunqiu-book-inner">
                      <div class="chunqiu-book-half chunqiu-book-half--left">
                        <template v-if="leftPageContent()">
                          <h5 class="chunqiu-book-page__title">{{ leftPageContent().title }}</h5>
                          <p class="chunqiu-book-page__body">{{ leftPageContent().body }}</p>
                          <p class="chunqiu-book-page__meta">第 {{ bookSpreadIndex * 2 + 1 }} 页</p>
                        </template>
                      </div>
                      <div class="chunqiu-book-spine"></div>
                      <div class="chunqiu-book-half chunqiu-book-half--right">
                        <template v-if="rightPageContent()">
                          <h5 class="chunqiu-book-page__title">{{ rightPageContent().title }}</h5>
                          <p class="chunqiu-book-page__body">{{ rightPageContent().body }}</p>
                          <p class="chunqiu-book-page__meta">第 {{ bookSpreadIndex * 2 + 2 }} 页</p>
                        </template>
                      </div>
                    </div>
                    <button type="button" class="chunqiu-book-turn chunqiu-book-turn--next" :disabled="!canTurnNext()" @click.stop="turnBookRight" aria-label="下一页">
                      <ChevronRight :size="24" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <section class="chunqiu-achievements-bar">
              <div class="chunqiu-achievements-bar__row">
                <div class="chunqiu-achievements-bar__main">
                  <h3 class="chunqiu-achievements-bar__title">主要成就</h3>
                  <div class="chunqiu-achievements-bar__grid">
                    <div v-for="(item, idx) in dynasty.achievements" :key="idx" class="chunqiu-achievement-item">
                      <span class="chunqiu-achievement-item__year">{{ item.year }}</span>
                      <h4 class="chunqiu-achievement-item__title">{{ item.title }}</h4>
                      <p class="chunqiu-achievement-item__desc">{{ item.description }}</p>
                    </div>
                  </div>
                </div>
                <div class="chunqiu-achievements-bar__nav">
                  <button v-if="adjacent.prev" class="chunqiu-nav-btn" @click="emit('go-to-dynasty', adjacent.prev.id)">
                    <ArrowLeft :size="18" />
                    <span>{{ adjacent.prev.name }}</span>
                  </button>
                  <button v-if="adjacent.next" class="chunqiu-nav-btn" @click="emit('go-to-dynasty', adjacent.next.id)">
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
.chunqiu-root {
  height: 100vh;
  overflow: hidden;
  overflow-x: hidden;
  overscroll-behavior: none;
}
.chunqiu-root--fullscreen {
  height: 100vh;
}

.chunqiu-fixed-bg {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  opacity: 1;
  transition: opacity 0.85s ease-out;
}
.chunqiu-fixed-bg--fade {
  opacity: 0;
}
.chunqiu-fixed-bg__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  filter: brightness(0.82) saturate(0.9);
}

.chunqiu-back-float {
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
.chunqiu-back-float:hover {
  background: rgba(28, 24, 22, 0.85);
  transform: translateY(-50%) translateX(-2px);
}
.chunqiu-back-float__icon {
  transform: rotate(180deg);
}

.chunqiu-flip-viewport {
  position: relative;
  z-index: 1;
  height: 100vh;
  overflow: hidden;
  flex-shrink: 0;
}
.chunqiu-scroll-container {
  width: 100%;
  height: 300vh;
  will-change: transform;
  display: flex;
  flex-direction: column;
}
.chunqiu-screen {
  width: 100%;
  flex: 0 0 100vh;
  min-height: 0;
  position: relative;
  overflow: hidden;
}

.chunqiu-screen-1 {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
}
.chunqiu-curtain__gradient {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  height: 100%;
  background: linear-gradient(to top, rgba(28, 24, 22, 0.92) 0%, rgba(45, 38, 35, 0.5) 45%, transparent 100%);
  pointer-events: none;
}
.chunqiu-curtain__center {
  position: absolute;
  left: 50%;
  top: 38vh;
  transform: translate(-50%, -50%);
  text-align: center;
  z-index: 2;
  pointer-events: none;
}
.chunqiu-curtain__name {
  font-size: clamp(2.4rem, 5.5vw, 3.8rem);
  color: #fff;
  letter-spacing: 12px;
  margin: 0;
  text-shadow: 0 2px 24px rgba(0,0,0,0.5);
}
.chunqiu-curtain__divider {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin: 10px 0;
  opacity: 0.85;
}
.chunqiu-curtain__period {
  font-size: 1.05rem;
  color: rgba(255,255,255,0.88);
  letter-spacing: 3px;
  margin: 0;
}
.chunqiu-curtain__overview {
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
.chunqiu-curtain__overview-text {
  font-size: 0.98rem;
  line-height: 1.9;
  color: rgba(255,255,255,0.82);
  margin: 0;
  text-align: center;
  max-width: 720px;
}

.chunqiu-screen-2 {
  background: var(--bg);
}
.chunqiu-magazine {
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

.chunqiu-magazine__col { padding: 0 2.5rem; }
.chunqiu-magazine__p {
  font-size: 0.95rem;
  line-height: 2;
  color: var(--primary-dark);
  margin: 0 0 1.2em;
  text-align: justify;
}
.chunqiu-magazine__p:last-of-type { margin-bottom: 0; }
.chunqiu-magazine__img {
  width: 100%;
  max-width: 100%;
  margin-top: 1em;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.12);
  object-fit: cover;
  display: block;
}
.chunqiu-magazine__divider {
  width: 1px;
  min-height: 120px;
  background: rgba(139, 94, 60, 0.2);
}

.chunqiu-figures-dark {
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
.chunqiu-third-inner {
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 12px 4vw 24px;
  -webkit-overflow-scrolling: touch;
  box-sizing: border-box;
}
.chunqiu-figures-row {
  display: flex;
  align-items: stretch;
  justify-content: center;
  gap: 0;
  width: 100%;
  max-width: 1000px;
  margin: 0 auto 10px;
  flex-shrink: 0;
}
.chunqiu-figures__gap {
  width: clamp(32px, 5vw, 64px);
  flex-shrink: 0;
}
.chunqiu-figure-cell {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  max-width: 320px;
}
.chunqiu-figure-cell--left { align-items: flex-end; }
.chunqiu-figure-cell--right { align-items: flex-start; }
.chunqiu-figure-img {
  width: 100%;
  max-width: 140px;
  aspect-ratio: 3/4;
  object-fit: cover;
  border-radius: 10px;
  box-shadow: 0 8px 28px rgba(0,0,0,0.4);
}
.chunqiu-figure-cell--left .chunqiu-figure-text { margin-left: 0; text-align: right; padding-right: 12px; }
.chunqiu-figure-cell--right .chunqiu-figure-text { margin-right: 0; text-align: left; padding-left: 12px; }
.chunqiu-figure-text {
  margin-top: 10px;
  max-width: 100%;
  padding: 12px 10px;
  border-radius: 8px;
  background: rgba(253, 251, 247, 0.92);
  border: 1px solid rgba(139, 94, 60, 0.12);
}
.chunqiu-figure-title {
  font-size: 1rem;
  font-weight: 600;
  color: #2c2c2c;
  margin: 0 0 6px;
  letter-spacing: 2px;
}
.chunqiu-figure-desc {
  font-size: 0.8rem;
  line-height: 1.65;
  color: #3d3629;
  margin: 0;
}

.chunqiu-book-wrap {
  flex: 1;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px 0;
}
.chunqiu-book {
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
.chunqiu-book-cover {
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
.chunqiu-book-cover:hover {
  transform: scale(1.02);
  box-shadow: 0 20px 56px rgba(0,0,0,0.6);
}
.chunqiu-book-cover__title {
  font-size: clamp(0.9rem, 1.8vw, 1.1rem);
  font-weight: 600;
  color: rgba(255,255,255,0.9);
  letter-spacing: 3px;
}
.chunqiu-book-cover__hint {
  font-size: 0.7rem;
  color: rgba(255,255,255,0.5);
  letter-spacing: 2px;
}
.chunqiu-book-spread {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  height: 100%;
  cursor: pointer;
}
.chunqiu-book-spread-hint {
  font-size: 0.7rem;
  color: rgba(255,255,255,0.5);
  letter-spacing: 1px;
  flex-shrink: 0;
}
.chunqiu-book-spread-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  flex: 1;
  min-height: 0;
  width: 100%;
}
.chunqiu-book-spread-row .chunqiu-book-turn { flex-shrink: 0; }
.chunqiu-book-spread-row .chunqiu-book-inner { flex: 1; min-height: 0; }
.chunqiu-book-turn {
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
.chunqiu-book-turn:hover:not(:disabled) {
  background: rgba(255,255,255,0.18);
}
.chunqiu-book-turn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}
.chunqiu-book-inner {
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
.chunqiu-book-half {
  flex: 1;
  min-width: 0;
  min-height: 280px;
  padding: 16px 14px;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}
.chunqiu-book-spine {
  width: 4px;
  background: linear-gradient(to right, rgba(139, 94, 60, 0.15), rgba(139, 94, 60, 0.35), rgba(139, 94, 60, 0.15));
  flex-shrink: 0;
}
.chunqiu-book-page__title {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--primary-dark);
  margin: 0 0 10px;
  letter-spacing: 1px;
  padding-bottom: 6px;
  border-bottom: 1px solid rgba(139, 94, 60, 0.2);
}
.chunqiu-book-page__body {
  font-size: 0.8rem;
  line-height: 1.9;
  color: var(--primary-dark);
  margin: 0;
  white-space: pre-line;
}
.chunqiu-book-page__meta {
  font-size: 0.7rem;
  color: var(--text-secondary);
  margin-top: 12px;
  text-align: right;
}

.chunqiu-achievements-bar {
  margin-top: 24px;
  padding: 28px 0 24px;
  background: linear-gradient(180deg, rgba(235, 229, 220, 0.92) 0%, rgba(224, 216, 204, 0.95) 100%);
  border-radius: 12px;
  border: 1px solid rgba(139, 94, 60, 0.18);
  flex-shrink: 0;
}
.chunqiu-screen-3 .chunqiu-achievements-bar {
  padding-left: 6vw;
  padding-right: 6vw;
  margin-left: -2vw;
  margin-right: -2vw;
  border-radius: 0;
}
.chunqiu-achievements-bar__row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  max-width: 1000px;
  margin: 0 auto;
}
.chunqiu-achievements-bar__main {
  flex: 1;
  min-width: 0;
}
.chunqiu-achievements-bar__title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--primary-dark);
  margin: 0 0 16px;
  letter-spacing: 2px;
  display: flex;
  align-items: center;
  gap: 10px;
}
.chunqiu-achievements-bar__title::before {
  content: '';
  width: 3px;
  height: 16px;
  background: var(--accent-red);
  border-radius: 2px;
}
.chunqiu-achievements-bar__grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px 24px;
}
.chunqiu-achievement-item {
  padding: 12px 0;
  border-bottom: 1px solid rgba(139, 94, 60, 0.12);
}
.chunqiu-achievement-item__year {
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--accent-red);
  background: rgba(196, 78, 70, 0.1);
  padding: 2px 8px;
  border-radius: 4px;
  margin-bottom: 6px;
  display: inline-block;
}
.chunqiu-achievement-item__title {
  font-size: 0.92rem;
  font-weight: 600;
  color: var(--primary-dark);
  margin: 0 0 4px;
}
.chunqiu-achievement-item__desc {
  font-size: 0.82rem;
  color: var(--text-secondary);
  margin: 0;
  line-height: 1.5;
}
.chunqiu-achievements-bar__nav {
  flex-shrink: 0;
  display: flex;
  gap: 12px;
}
.chunqiu-nav-btn {
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
.chunqiu-nav-btn:hover {
  background: rgba(255, 255, 255, 0.95);
  border-color: var(--primary);
}

@media (max-width: 640px) {
  .chunqiu-curtain__overview { padding: 20px 6vw 36px; }
  .chunqiu-magazine {
    grid-template-columns: 1fr;
    padding: 24px 5vw 32px;
  }
  .chunqiu-magazine .chunqiu-magazine__divider {
    width: 100%;
    height: 1px;
    min-height: 0;
    margin: 8px 0;
  }
  .chunqiu-magazine .chunqiu-magazine__col { padding: 0 0.5rem; }
  .chunqiu-back-float { left: 12px; padding: 8px 12px; font-size: 0.85rem; }
  .chunqiu-figures-row {
    flex-direction: column;
    align-items: center;
    gap: 20px;
  }
  .chunqiu-figures__gap { width: 0; height: 0; }
  .chunqiu-figure-cell { max-width: 100%; align-items: center !important; }
  .chunqiu-figure-cell--left .chunqiu-figure-text,
  .chunqiu-figure-cell--right .chunqiu-figure-text {
    text-align: center;
    padding-left: 8px;
    padding-right: 8px;
  }
  .chunqiu-book { min-height: 240px; max-height: 58vh; }
  .chunqiu-book-cover { height: clamp(220px, 50vw, 280px); }
  .chunqiu-book-inner { min-height: 260px; max-height: 52vh; }
  .chunqiu-book-half { min-height: 220px; }
  .chunqiu-achievements-bar__row { flex-direction: column; }
  .chunqiu-achievements-bar__grid { grid-template-columns: 1fr; }
}
</style>

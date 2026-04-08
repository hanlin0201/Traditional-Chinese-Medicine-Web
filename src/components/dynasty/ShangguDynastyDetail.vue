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

const shangguRootRef = ref(null)
const shangguFlipActiveIndex = ref(0)
const shangguIsAnimating = ref(false)
const SHANGGU_TOTAL_PAGES = 3

// 三页均为严格 100vh，与首页一致：翻页后刚好占满全屏
const VH_PER_PAGE = 100

function shangguMoveTo(index) {
  if (index < 0 || index >= SHANGGU_TOTAL_PAGES) return
  if (shangguIsAnimating.value) return
  shangguIsAnimating.value = true
  const container = shangguRootRef.value?.querySelector('.shanggu-scroll-container')
  if (!container) {
    shangguFlipActiveIndex.value = index
    emit('page-change', index)
    shangguIsAnimating.value = false
    return
  }
  const fromIndex = shangguFlipActiveIndex.value
  shangguFlipActiveIndex.value = index
  emit('page-change', index)

  // 切到第三页时内部从顶部开始；切回第一、二页时也把第三页内部滚动归零
  if (shangguRootRef.value) {
    const thirdInner = shangguRootRef.value.querySelector('.shanggu-third-inner')
    if (thirdInner) thirdInner.scrollTop = 0
  }

  // 位移：0 → -100vh（第二页）→ -200vh（第三页），每页正好一屏
  const yVh = -index * VH_PER_PAGE
  gsap.to(container, {
    y: `${yVh}vh`,
    duration: fromIndex === 0 && index === 1 ? 1 : 0.9,
    ease: 'power2.inOut',
    overwrite: true,
    onComplete: () => { shangguIsAnimating.value = false },
  })
}

function shangguHandleWheel(e) {
  if (!shangguRootRef.value || !props.dynasty || props.dynasty.id !== 'shanggu') return
  const root = shangguRootRef.value
  // 第三页：仅当内部滚到顶且用户向上滚时翻回第二页；其余情况让内部滚动
  if (shangguFlipActiveIndex.value === 2) {
    const thirdInner = root.querySelector('.shanggu-third-inner')
    if (thirdInner) {
      const atTop = thirdInner.scrollTop <= 2
      const atBottom = thirdInner.scrollTop + thirdInner.clientHeight >= thirdInner.scrollHeight - 2
      if (e.deltaY > 0 && !atBottom) return
      if (e.deltaY < 0 && !atTop) return
      if (e.deltaY < 0 && atTop) {
        e.preventDefault()
        if (shangguIsAnimating.value) return
        if (Math.abs(e.deltaY) < 18) return
        shangguMoveTo(1)
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
  if (shangguIsAnimating.value) return
  if (Math.abs(e.deltaY) < 18) return
  if (e.deltaY > 0) {
    if (shangguFlipActiveIndex.value < SHANGGU_TOTAL_PAGES - 1) shangguMoveTo(shangguFlipActiveIndex.value + 1)
  } else {
    shangguMoveTo(shangguFlipActiveIndex.value - 1)
  }
}

// --- 典籍：封面 + 6 内页（左右双页展示，共 3 个 spread）---
const bookOpen = ref(false)
const bookSpreadIndex = ref(0) // 0=(1,2), 1=(3,4), 2=(5,6)
const BOOK_PAGES = [
  { title: '序录·三品', body: '上品一百二十种，主养命以应天，无毒，多服久服不伤人。欲轻身益气、不老延年者，本上经。\n\n中品一百二十种，主养性以应人，无毒有毒，斟酌其宜。欲遏病补羸者，本中经。\n\n下品一百二十五种，主治病以应地，多毒，不可久服。欲除寒热邪气、破积聚、愈疾者，本下经。' },
  { title: '药物总论', body: '药有君臣佐使，以相宣摄。合和宜用一君、二臣、三佐、五使，又可一君、三臣、九佐使也。\n\n药有阴阳配合，子母兄弟，根茎花实，草石骨肉。有单行者，有相须者，有相使者，有相畏者，有相恶者，有相反者，有相杀者。凡此七情，合和视之。\n\n当用相须、相使者良，勿用相恶、相反者。若有毒宜制，可用相畏、相杀者。' },
  { title: '收载与传承', body: '本经共收载药物三百六十五种，以应周天之数。其中植物药二百五十二种，动物药六十七种，矿物药四十六种。\n\n后世陶弘景、孙星衍等皆有辑复与注本，为中药学之渊薮。历代本草多宗其说，至李时珍《本草纲目》仍以本经为纲。' },
  { title: '性味与主治', body: '药有酸、咸、甘、苦、辛五味，又有寒、热、温、凉四气。\n\n凡疗寒以热药，疗热以寒药；饮食不消以吐下药；鬼注蛊毒以毒药；痈肿疮瘤以疮药；风湿以风湿药。各随其所宜。\n\n病在胸膈以上者，先食后服药；病在腹以下者，先服药后食；病在四肢血脉者，宜空腹而在旦；病在骨髓者，宜饱满而在夜。' },
  { title: '采造与制剂', body: '阴干暴干，采造时月生熟，土地所出，真伪陈新，并各有法。\n\n凡药之所用，或取根茎，或取花实，或取皮叶，或取全株，各有其时。\n\n药性有宜丸者，宜散者，宜水煮者，宜酒渍者，宜膏煎者，亦有一物兼宜者，亦有不可入汤酒者，并随药性，不得违越。' },
  { title: '结语', body: '本经为中医药物学之祖，虽托名神农，实集汉以前药学之大成。三品分类、君臣佐使、性味归经等思想，影响至今。\n\n习中医者，当以本经为入门之阶，再及《本草经集注》《新修本草》《证类本草》《本草纲目》诸书，则源流可辨、用药有据。' },
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

// 点击书本左侧/右侧翻页（左半屏往前，右半屏往后）
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
    if (id !== 'shanggu') return
    nextTick(() => {
      const root = shangguRootRef.value
      if (!root) return
      root.addEventListener('wheel', shangguHandleWheel, { passive: false })
      const container = root.querySelector('.shanggu-scroll-container')
      if (container) gsap.set(container, { y: '0vh' })
      const thirdInner = root.querySelector('.shanggu-third-inner')
      if (thirdInner) thirdInner.scrollTop = 0
      shangguFlipActiveIndex.value = 0
      emit('page-change', 0)
      bookOpen.value = false
      bookSpreadIndex.value = 0
    })
  },
  { immediate: true }
)
onBeforeUnmount(() => {
  const root = shangguRootRef.value
  if (root) root.removeEventListener('wheel', shangguHandleWheel)
})
</script>

<template>
  <div
    ref="shangguRootRef"
    class="shanggu-root"
    :class="{ 'shanggu-root--fullscreen': shangguFlipActiveIndex <= 1 }"
  >
    <!-- 悬浮返回：不占顶栏，达成全屏 -->
    <button type="button" class="shanggu-back-float" @click="emit('back')" aria-label="返回">
      <ArrowLeft :size="20" class="shanggu-back-float__icon" />
      <span>返回</span>
    </button>

    <!-- 第一、二页共用：固定全屏背景图；切到第三页时淡出 -->
    <div
      v-show="dynasty"
      class="shanggu-fixed-bg"
      :class="{ 'shanggu-fixed-bg--fade': shangguFlipActiveIndex === 2 }"
      aria-hidden="true"
    >
      <img :src="getPhotoUrl(dynasty.heroImage)" :alt="dynasty.name" class="shanggu-fixed-bg__img" />
    </div>

    <div class="shanggu-flip-viewport">
      <div class="shanggu-scroll-container">
        <!-- 第一页：严格 100vh，标题+简介 -->
        <section class="shanggu-screen shanggu-screen-1">
          <div class="shanggu-curtain__gradient"></div>
          <div class="shanggu-curtain__center">
            <h2 class="shanggu-curtain__name">{{ dynasty.name }}</h2>
            <div class="shanggu-curtain__divider">
              <span class="hero-line"></span>
              <span class="hero-diamond"></span>
              <span class="hero-line"></span>
            </div>
            <p class="shanggu-curtain__period">{{ dynasty.period }}</p>
          </div>
          <div class="shanggu-curtain__overview">
            <p class="shanggu-curtain__overview-text">{{ dynasty.overview }}</p>
          </div>
        </section>

        <!-- 第二页：严格 100vh，杂志区一屏内 -->
        <section class="shanggu-screen shanggu-screen-2">
          <div class="shanggu-magazine">
            <div class="shanggu-magazine__col">
              <p class="shanggu-magazine__p">上古时期是中医药的起源阶段，彼时先民身处洪荒，瘴气弥漫、兽虫侵扰，风寒暑湿等外邪极易侵袭躯体，病痛与伤亡常伴左右。在与自然的长期斗争和求生实践中，先民们逐渐积累了零散却珍贵的用药经验，“神农尝百草”的传说正是这一漫长探索过程的生动缩影，凝聚着先民对生命与健康的敬畏与执着。</p>
              <p class="shanggu-magazine__p">先民在采集果实、捕猎禽兽的日常活动中，不断区分可食之物与有毒之品，慢慢沉淀下“药食同源”的早期经验。传说中神农氏遍历名山大川，亲尝百草滋味、体察草木功效，一日而遇七十毒却始终坚守，这并非虚构的神话，而是先民无数次冒险试错、以身践验的集体记忆凝练，也为后世本草学与中药学的发展奠定了坚实的观念基础。从口尝辨味、鼻嗅辨气，到细致观察动植物对人体的各类作用，早期药物知识没有文字可依托，全靠部落老者口耳相传、代代延续；哪些草木可止血、哪些可退热、哪些误食会致病、哪些能缓解伤痛，都在反复实践、不断总结中沉淀下来，成为后世《神农本草经》等中医药经典的原始源头。这一时期尚未形成系统完整的医学理论，但“一物克一物”“以毒攻毒”等朴素的诊疗观念已经悄然萌芽，为后来中医药的配伍理论与方剂学发展埋下了重要伏笔。</p>
            </div>
            <div class="shanggu-magazine__divider"></div>
            <div class="shanggu-magazine__col">
              <p class="shanggu-magazine__p">与此同时，伏羲观天地、察人体，模拟自然万物形态创制九针，开创了针灸之始，将治疗手段从单纯的内服药物，拓展至外治与经络调理相结合的新阶段。上古时期虽无文字典籍传世，但口耳相传的实践经验与神话传说，已清晰勾勒出中医药起源阶段的大致轮廓。针石、砭石的应用与导引术的出现，说明先民已逐渐认识到体表刺激与身体内部状态之间的密切关联，这种认知与后世经络学说一脉相承、源远流长。神农与伏羲在传说中往往并提，一个代表着本草与农桑的交融，一个代表着针术与自然规律的结合，二者相辅相成，共同构成了上古时期医药文化的双翼。后世成书于汉代的《神农本草经》，虽距上古已远，但其序录中明确将药物分为上、中、下三品，并强调“轻身益气”“延年益寿”等养生观念，这些思想均可追溯至上古时期先民对生命与自然的朴素认知，是上古中医药经验的传承与升华。</p>
              <img :src="getPhotoUrl('伏羲制九针.jpg')" alt="伏羲制九针" class="shanggu-magazine__img" @error="($e) => ($e.target.style.display = 'none')" />
            </div>
          </div>
        </section>

        <!-- 第三页：100vh 视口，内部可二次滚动（人物+典籍+成就），背景为朝代背景1.jpg -->
        <section class="shanggu-screen shanggu-screen-3 shanggu-figures-dark" :style="{ backgroundImage: `url(${getPhotoUrl('朝代背景1.jpg')})` }">
          <div class="shanggu-third-inner">
            <div class="shanggu-figures-row">
              <div class="shanggu-figure-cell shanggu-figure-cell--left">
                <img :src="getPhotoUrl('神农.jpg')" alt="神农" class="shanggu-figure-img" @error="($e) => ($e.target.src = getPhotoUrl(dynasty.heroImage))" />
                <div class="shanggu-figure-text">
                  <h4 class="shanggu-figure-title">神农氏</h4>
                  <p class="shanggu-figure-desc">尝百草，辨药性，奠定中药学基础。传说神农氏为辨明草木性味，亲尝百草，一日而遇七十毒，从而区分可食、可药与有毒之物，被尊为药学与农业之祖。</p>
                </div>
              </div>
              <div class="shanggu-figures__gap"></div>
              <div class="shanggu-figure-cell shanggu-figure-cell--right">
                <img :src="getPhotoUrl('伏羲.jpg')" alt="伏羲" class="shanggu-figure-img" @error="($e) => ($e.target.src = getPhotoUrl(dynasty.heroImage))" />
                <div class="shanggu-figure-text">
                  <h4 class="shanggu-figure-title">伏羲</h4>
                  <p class="shanggu-figure-desc">制九针，创针灸之始。伏羲与神农并称上古医药传说的重要代表，九针为后世针具与针灸理论之滥觞，与神农本草共同构成上古医药的双翼。</p>
                </div>
              </div>
            </div>
            <div class="shanggu-book-wrap">
              <div class="shanggu-book" :class="{ 'shanggu-book--open': bookOpen }">
                <div v-if="!bookOpen" class="shanggu-book-cover" @click="openBook">
                  <span class="shanggu-book-cover__title">《神农本草经》</span>
                  <span class="shanggu-book-cover__hint">点击翻阅</span>
                </div>
                <div v-else class="shanggu-book-spread" @click="onBookClick">
                  <span class="shanggu-book-spread-hint">点击左侧往前翻，右侧往后翻</span>
                  <div class="shanggu-book-spread-row">
                    <button type="button" class="shanggu-book-turn shanggu-book-turn--prev" :disabled="!canTurnPrev()" @click.stop="turnBookLeft" aria-label="上一页">
                      <ChevronLeft :size="24" />
                    </button>
                    <div class="shanggu-book-inner">
                      <div class="shanggu-book-half shanggu-book-half--left">
                        <template v-if="leftPageContent()">
                          <h5 class="shanggu-book-page__title">{{ leftPageContent().title }}</h5>
                          <p class="shanggu-book-page__body">{{ leftPageContent().body }}</p>
                          <p class="shanggu-book-page__meta">第 {{ bookSpreadIndex * 2 + 1 }} 页</p>
                        </template>
                      </div>
                      <div class="shanggu-book-spine"></div>
                      <div class="shanggu-book-half shanggu-book-half--right">
                        <template v-if="rightPageContent()">
                          <h5 class="shanggu-book-page__title">{{ rightPageContent().title }}</h5>
                          <p class="shanggu-book-page__body">{{ rightPageContent().body }}</p>
                          <p class="shanggu-book-page__meta">第 {{ bookSpreadIndex * 2 + 2 }} 页</p>
                        </template>
                      </div>
                    </div>
                    <button type="button" class="shanggu-book-turn shanggu-book-turn--next" :disabled="!canTurnNext()" @click.stop="turnBookRight" aria-label="下一页">
                      <ChevronRight :size="24" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <!-- 成就区放入第三页内部，与人物、典籍一起可滚动 -->
            <section class="shanggu-achievements-bar">
              <div class="shanggu-achievements-bar__row">
                <div class="shanggu-achievements-bar__main">
                  <h3 class="shanggu-achievements-bar__title">主要成就</h3>
                  <div class="shanggu-achievements-bar__grid">
                    <div v-for="(item, idx) in dynasty.achievements" :key="idx" class="shanggu-achievement-item">
                      <span class="shanggu-achievement-item__year">{{ item.year }}</span>
                      <h4 class="shanggu-achievement-item__title">{{ item.title }}</h4>
                      <p class="shanggu-achievement-item__desc">{{ item.description }}</p>
                    </div>
                  </div>
                </div>
                <div class="shanggu-achievements-bar__nav">
                  <button v-if="adjacent.prev" class="shanggu-nav-btn" @click="emit('go-to-dynasty', adjacent.prev.id)">
                    <ArrowLeft :size="18" />
                    <span>{{ adjacent.prev.name }}</span>
                  </button>
                  <button v-if="adjacent.next" class="shanggu-nav-btn" @click="emit('go-to-dynasty', adjacent.next.id)">
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
.shanggu-root {
  height: 100vh;
  overflow: hidden;
  overflow-x: hidden;
  overscroll-behavior: none;
}
.shanggu-root--fullscreen {
  height: 100vh;
}

.shanggu-fixed-bg {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  opacity: 1;
  transition: opacity 0.85s ease-out;
}
.shanggu-fixed-bg--fade {
  opacity: 0;
}
.shanggu-fixed-bg__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  filter: brightness(0.82) saturate(0.9);
}

/* 悬浮返回按钮：不占顶栏，达成全屏 */
.shanggu-back-float {
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
.shanggu-back-float:hover {
  background: rgba(28, 24, 22, 0.85);
  transform: translateY(-50%) translateX(-2px);
}
.shanggu-back-float__icon {
  transform: rotate(180deg);
}

.shanggu-flip-viewport {
  position: relative;
  z-index: 1;
  height: 100vh;
  overflow: hidden;
  flex-shrink: 0;
}
.shanggu-scroll-container {
  width: 100%;
  height: 300vh;
  will-change: transform;
  display: flex;
  flex-direction: column;
}
/* 每页严格 100vh，与首页一致；flex 保证第三页滑入时顶端对齐视口 */
.shanggu-screen {
  width: 100%;
  flex: 0 0 100vh;
  min-height: 0;
  position: relative;
  overflow: hidden;
}

/* 第一页：标题+简介，一屏内 */
.shanggu-screen-1 {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
}
.shanggu-curtain__gradient {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  height: 100%;
  background: linear-gradient(to top, rgba(28, 24, 22, 0.92) 0%, rgba(45, 38, 35, 0.5) 45%, transparent 100%);
  pointer-events: none;
}
.shanggu-curtain__center {
  position: absolute;
  left: 50%;
  top: 38vh;
  transform: translate(-50%, -50%);
  text-align: center;
  z-index: 2;
  pointer-events: none;
}
.shanggu-curtain__name {
  font-size: clamp(2.4rem, 5.5vw, 3.8rem);
  color: #fff;
  letter-spacing: 12px;
  margin: 0;
  text-shadow: 0 2px 24px rgba(0,0,0,0.5);
}
.shanggu-curtain__divider {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin: 10px 0;
  opacity: 0.85;
}
.shanggu-curtain__period {
  font-size: 1.05rem;
  color: rgba(255,255,255,0.88);
  letter-spacing: 3px;
  margin: 0;
}
.shanggu-curtain__overview {
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
.shanggu-curtain__overview-text {
  font-size: 0.98rem;
  line-height: 1.9;
  color: rgba(255,255,255,0.82);
  margin: 0;
  text-align: center;
  max-width: 720px;
  white-space: pre-line;
}

/* 第二页：杂志区严格 100vh，一屏内不二次滚动 */
.shanggu-screen-2 {
  background: var(--bg);
}
.shanggu-magazine {
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

.shanggu-magazine__col { padding: 0 2.5rem; }
.shanggu-magazine__p {
  font-size: 0.95rem;
  line-height: 2;
  color: var(--primary-dark);
  margin: 0 0 1.2em;
  text-align: justify;
}
.shanggu-magazine__p:last-of-type { margin-bottom: 0; }
.shanggu-magazine__img {
  width: 100%;
  max-width: 100%;
  margin-top: 1em;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.12);
  object-fit: cover;
  display: block;
}
.shanggu-magazine__divider {
  width: 1px;
  min-height: 120px;
  background: rgba(139, 94, 60, 0.2);
}

/* 第三页：100vh 视口，内容从顶部开始全屏；内部可二次滚动 */
.shanggu-figures-dark {
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
.shanggu-third-inner {
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 12px 4vw 24px;
  -webkit-overflow-scrolling: touch;
  box-sizing: border-box;
}
.shanggu-figures-row {
  display: flex;
  align-items: stretch;
  justify-content: center;
  gap: 0;
  width: 100%;
  max-width: 1000px;
  margin-bottom: 10px;
  flex-shrink: 0;
}
.shanggu-figures__gap {
  width: clamp(32px, 5vw, 64px);
  flex-shrink: 0;
}
.shanggu-figure-cell {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  max-width: 320px;
}
.shanggu-figure-cell--left { align-items: flex-end; }
.shanggu-figure-cell--right { align-items: flex-start; }
.shanggu-figure-img {
  width: 100%;
  max-width: 140px;
  aspect-ratio: 3/4;
  object-fit: cover;
  border-radius: 10px;
  box-shadow: 0 8px 28px rgba(0,0,0,0.4);
}
.shanggu-figure-cell--left .shanggu-figure-text { margin-left: 0; text-align: right; padding-right: 12px; }
.shanggu-figure-cell--right .shanggu-figure-text { margin-right: 0; text-align: left; padding-left: 12px; }
.shanggu-figure-text {
  margin-top: 10px;
  max-width: 100%;
}
.shanggu-figure-title {
  font-size: 1rem;
  font-weight: 600;
  color: rgba(255,255,255,0.95);
  margin: 0 0 6px;
  letter-spacing: 2px;
}
.shanggu-figure-desc {
  font-size: 0.8rem;
  line-height: 1.65;
  color: rgba(255,255,255,0.72);
  margin: 0;
}

/* 典籍：尽量半屏，左右双页 */
.shanggu-book-wrap {
  flex: 1;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px 0;
}
.shanggu-book {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  max-width: 90vw;
  height: 100%;
  min-height: 200px;
  max-height: 50vh;
}
.shanggu-book-cover {
  cursor: pointer;
  width: clamp(140px, 18vw, 200px);
  height: clamp(200px, 26vw, 280px);
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
.shanggu-book-cover:hover {
  transform: scale(1.02);
  box-shadow: 0 20px 56px rgba(0,0,0,0.6);
}
.shanggu-book-cover__title {
  font-size: clamp(0.9rem, 1.8vw, 1.1rem);
  font-weight: 600;
  color: rgba(255,255,255,0.9);
  letter-spacing: 3px;
}
.shanggu-book-cover__hint {
  font-size: 0.7rem;
  color: rgba(255,255,255,0.5);
  letter-spacing: 2px;
}
.shanggu-book-spread {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  height: 100%;
  cursor: pointer;
}
.shanggu-book-spread-hint {
  font-size: 0.7rem;
  color: rgba(255,255,255,0.5);
  letter-spacing: 1px;
  flex-shrink: 0;
}
.shanggu-book-spread-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  flex: 1;
  min-height: 0;
  width: 100%;
}
.shanggu-book-spread-row .shanggu-book-turn { flex-shrink: 0; }
.shanggu-book-spread-row .shanggu-book-inner { flex: 1; min-height: 0; }
.shanggu-book-turn {
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
.shanggu-book-turn:hover:not(:disabled) {
  background: rgba(255,255,255,0.18);
}
.shanggu-book-turn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}
.shanggu-book-inner {
  display: flex;
  width: 100%;
  max-width: min(90vw, 720px);
  height: 100%;
  min-height: 220px;
  max-height: 48vh;
  background: linear-gradient(145deg, #f5f0e8 0%, #e8e0d5 100%);
  border: 1px solid rgba(139, 94, 60, 0.2);
  border-radius: 8px;
  box-shadow: 0 12px 40px rgba(0,0,0,0.35);
  overflow: hidden;
}
.shanggu-book-half {
  flex: 1;
  min-width: 0;
  padding: 16px 14px;
  overflow-y: auto;
}
.shanggu-book-spine {
  width: 4px;
  background: linear-gradient(to right, rgba(139, 94, 60, 0.15), rgba(139, 94, 60, 0.35), rgba(139, 94, 60, 0.15));
  flex-shrink: 0;
}
.shanggu-book-page__title {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--primary-dark);
  margin: 0 0 10px;
  letter-spacing: 1px;
  padding-bottom: 6px;
  border-bottom: 1px solid rgba(139, 94, 60, 0.2);
}
.shanggu-book-page__body {
  font-size: 0.8rem;
  line-height: 1.9;
  color: var(--primary-dark);
  margin: 0;
  white-space: pre-line;
}
.shanggu-book-page__meta {
  font-size: 0.7rem;
  color: var(--text-secondary);
  margin-top: 12px;
  text-align: right;
}

/* 成就区（在第三页内部，与人物、典籍一起可滚动） */
.shanggu-achievements-bar {
  margin-top: 24px;
  padding: 28px 0 24px;
  background: linear-gradient(180deg, rgba(235, 229, 220, 0.92) 0%, rgba(224, 216, 204, 0.95) 100%);
  border-radius: 12px;
  border: 1px solid rgba(139, 94, 60, 0.18);
  flex-shrink: 0;
}
.shanggu-screen-3 .shanggu-achievements-bar {
  padding-left: 6vw;
  padding-right: 6vw;
  margin-left: -2vw;
  margin-right: -2vw;
  border-radius: 0;
}
.shanggu-achievements-bar__row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  max-width: 1000px;
  margin: 0 auto;
}
.shanggu-achievements-bar__main {
  flex: 1;
  min-width: 0;
}
.shanggu-achievements-bar__title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--primary-dark);
  margin: 0 0 16px;
  letter-spacing: 2px;
  display: flex;
  align-items: center;
  gap: 10px;
}
.shanggu-achievements-bar__title::before {
  content: '';
  width: 3px;
  height: 16px;
  background: var(--accent-red);
  border-radius: 2px;
}
.shanggu-achievements-bar__grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px 24px;
}
.shanggu-achievement-item {
  padding: 12px 0;
  border-bottom: 1px solid rgba(139, 94, 60, 0.12);
}
.shanggu-achievement-item__year {
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--accent-red);
  background: rgba(196, 78, 70, 0.1);
  padding: 2px 8px;
  border-radius: 4px;
  margin-bottom: 6px;
  display: inline-block;
}
.shanggu-achievement-item__title {
  font-size: 0.92rem;
  font-weight: 600;
  color: var(--primary-dark);
  margin: 0 0 4px;
}
.shanggu-achievement-item__desc {
  font-size: 0.82rem;
  color: var(--text-secondary);
  margin: 0;
  line-height: 1.5;
}
.shanggu-achievements-bar__nav {
  flex-shrink: 0;
  display: flex;
  gap: 12px;
}
.shanggu-nav-btn {
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
.shanggu-nav-btn:hover {
  background: rgba(255, 255, 255, 0.95);
  border-color: var(--primary);
}

@media (max-width: 640px) {
  .shanggu-curtain__overview { padding: 20px 6vw 36px; }
  .shanggu-magazine {
    grid-template-columns: 1fr;
    padding: 24px 5vw 32px;
  }
  .shanggu-magazine .shanggu-magazine__divider {
    width: 100%;
    height: 1px;
    min-height: 0;
    margin: 8px 0;
  }
  .shanggu-magazine .shanggu-magazine__col { padding: 0 0.5rem; }
  .shanggu-back-float { left: 12px; padding: 8px 12px; font-size: 0.85rem; }
  .shanggu-figures-row {
    flex-direction: column;
    align-items: center;
    gap: 20px;
  }
  .shanggu-figures__gap { width: 0; height: 0; }
  .shanggu-figure-cell { max-width: 100%; align-items: center !important; }
  .shanggu-figure-cell--left .shanggu-figure-text,
  .shanggu-figure-cell--right .shanggu-figure-text {
    text-align: center;
    padding-left: 8px;
    padding-right: 8px;
  }
  .shanggu-achievements-bar__row { flex-direction: column; }
  .shanggu-achievements-bar__grid { grid-template-columns: 1fr; }
}
</style>

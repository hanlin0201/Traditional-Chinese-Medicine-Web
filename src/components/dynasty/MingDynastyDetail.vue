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

const mingRootRef = ref(null)
const mingFlipActiveIndex = ref(0)
const mingIsAnimating = ref(false)
const MING_TOTAL_PAGES = 3

const VH_PER_PAGE = 100

function mingMoveTo(index) {
  if (index < 0 || index >= MING_TOTAL_PAGES) return
  if (mingIsAnimating.value) return
  mingIsAnimating.value = true
  const container = mingRootRef.value?.querySelector('.ming-scroll-container')
  if (!container) {
    mingFlipActiveIndex.value = index
    emit('page-change', index)
    mingIsAnimating.value = false
    return
  }
  const fromIndex = mingFlipActiveIndex.value
  mingFlipActiveIndex.value = index
  emit('page-change', index)

  if (mingRootRef.value) {
    const thirdInner = mingRootRef.value.querySelector('.ming-third-inner')
    if (thirdInner) thirdInner.scrollTop = 0
  }

  const yVh = -index * VH_PER_PAGE
  gsap.to(container, {
    y: `${yVh}vh`,
    duration: fromIndex === 0 && index === 1 ? 1 : 0.9,
    ease: 'power2.inOut',
    overwrite: true,
    onComplete: () => { mingIsAnimating.value = false },
  })
}

function mingHandleWheel(e) {
  if (!mingRootRef.value || !props.dynasty || props.dynasty.id !== 'ming') return
  const root = mingRootRef.value
  if (mingFlipActiveIndex.value === 2) {
    const thirdInner = root.querySelector('.ming-third-inner')
    if (thirdInner) {
      const atTop = thirdInner.scrollTop <= 2
      const atBottom = thirdInner.scrollTop + thirdInner.clientHeight >= thirdInner.scrollHeight - 2
      if (e.deltaY > 0 && !atBottom) return
      if (e.deltaY < 0 && !atTop) return
      if (e.deltaY < 0 && atTop) {
        e.preventDefault()
        if (mingIsAnimating.value) return
        if (Math.abs(e.deltaY) < 18) return
        mingMoveTo(1)
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
  if (mingIsAnimating.value) return
  if (Math.abs(e.deltaY) < 18) return
  if (e.deltaY > 0) {
    if (mingFlipActiveIndex.value < MING_TOTAL_PAGES - 1) mingMoveTo(mingFlipActiveIndex.value + 1)
  } else {
    mingMoveTo(mingFlipActiveIndex.value - 1)
  }
}

// 典籍：《本草纲目》，6 页，其中第 3 页为图片
const bookOpen = ref(false)
const bookSpreadIndex = ref(0)
const BOOK_PAGES = [
  { title: '本草纲目序', body: '时珍，荆楚鄙人也。幼多羸疾，长好医术。遂渔猎群书，搜罗百氏，凡子史经传、声韵农圃、医卜星相、乐府诸家，稍有得处，辄著数言。\n\n岁历三十稔，书考八百余家，稿凡三易。复者芟之，阙者缉之，讹者绳之。旧本一千五百一十八种，今增药三百七十四种，分为一十六部，著成五十二卷。\n\n虽非集成，亦粗大备，僭名曰《本草纲目》。愿乞一言，以托不朽。' },
  { title: '药物分类与纲目', body: '本书采用"以纲挈目"体例，以部为纲、以类为目，分十六部：水、火、土、金石、草、谷、菜、果、木、器服、虫、鳞、介、禽、兽、人。各部之下再分子目，共计五十二卷。\n\n每药标正名为纲，附释名为目；次以集解、辨疑、正误，详其土产形状；次以气味、主治、附方，著其体用。上自坟典，下及传奇，凡有相关，靡不备采。' },
  { title: '本草纲目图', image: '本草纲目.jpg' },
  { title: '药物考证与主治', body: '李时珍不仅增补新药，更对旧说多所订正。如纠正前人将南星、虎掌混为一物之谬，辨明葳蕤与女萎之异。每药载其气味、主治、发明、附方，务求明其所以然。\n\n书中附方一万一千余首，多经临床验证。所记药物产地、采集时月、炮制方法，至今仍有参考价值。明代印刷术发达，《本草纲目》得以广泛刊行，流传海内外。' },
  { title: '收载与流传', body: '全书收载药物一千八百九十二种，新增三百七十四种。附方一万一千零九十六首，插图一千一百零九幅。\n\n书成之后，初刊于金陵，后屡经翻刻。传至日本、朝鲜及欧洲，达尔文在《物种起源》中曾引用此书，称其为"中国古代的百科全书"。《本草纲目》被誉为"东方药物巨典"，对世界医药学、植物学、动物学均有深远影响。' },
  { title: '结语', body: '李时珍历时二十七年，三易其稿，终成《本草纲目》。此书集明代以前本草学之大成，创药物分类新体系，辨疑正误，考据详实，为中国药学史上之里程碑。\n\n与此同时，明代温病学说兴起，吴有性著《瘟疫论》，阐发戾气致病，开温病辨治之先河，为清代温病学派奠定基础。明代医学承宋启清，本草与温病并进，成就斐然。' },
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
    if (id !== 'ming') return
    nextTick(() => {
      const root = mingRootRef.value
      if (!root) return
      root.addEventListener('wheel', mingHandleWheel, { passive: false })
      const container = root.querySelector('.ming-scroll-container')
      if (container) gsap.set(container, { y: '0vh' })
      const thirdInner = root.querySelector('.ming-third-inner')
      if (thirdInner) thirdInner.scrollTop = 0
      mingFlipActiveIndex.value = 0
      emit('page-change', 0)
      bookOpen.value = false
      bookSpreadIndex.value = 0
    })
  },
  { immediate: true }
)
onBeforeUnmount(() => {
  const root = mingRootRef.value
  if (root) root.removeEventListener('wheel', mingHandleWheel)
})
</script>

<template>
  <div
    ref="mingRootRef"
    class="ming-root"
    :class="{ 'ming-root--fullscreen': mingFlipActiveIndex <= 1 }"
  >
    <button type="button" class="ming-back-float" @click="emit('back')" aria-label="返回">
      <ArrowLeft :size="20" class="ming-back-float__icon" />
      <span>返回</span>
    </button>

    <div
      v-show="dynasty"
      class="ming-fixed-bg"
      :class="{ 'ming-fixed-bg--fade': mingFlipActiveIndex === 2 }"
      aria-hidden="true"
    >
      <img :src="getPhotoUrl(dynasty.heroImage)" :alt="dynasty.name" class="ming-fixed-bg__img" />
    </div>

    <div class="ming-flip-viewport">
      <div class="ming-scroll-container">
        <section class="ming-screen ming-screen-1">
          <div class="ming-curtain__gradient"></div>
          <div class="ming-curtain__center">
            <h2 class="ming-curtain__name">{{ dynasty.name }}</h2>
            <div class="ming-curtain__divider">
              <span class="hero-line"></span>
              <span class="hero-diamond"></span>
              <span class="hero-line"></span>
            </div>
            <p class="ming-curtain__period">{{ dynasty.period }}</p>
          </div>
          <div class="ming-curtain__overview">
            <p class="ming-curtain__overview-text">{{ dynasty.overview }}</p>
          </div>
        </section>

        <section class="ming-screen ming-screen-2">
          <div class="ming-magazine">
            <div class="ming-magazine__col">
              <p class="ming-magazine__p">明代是中医药学的集大成时期。李时珍历时二十七年，三易其稿，著成《本草纲目》五十二卷，收载药物一千八百九十二种、附方一万一千余首，被誉为"东方药物巨典"。此书采用"以纲挈目"体例，创药物分类新体系，对前人本草多所辨疑正误，影响深远。</p>
              <p class="ming-magazine__p">李时珍出身医学世家，曾任楚王府奉祠正、太医院判。因见历代本草"舛谬差讹、遗漏不可枚数"，遂立志重修。他广搜博采，渔猎群书八百余家，足迹遍及湖广、江西、江苏等地，实地考察药物形态与产地，终成一代巨著。《本草纲目》初刊于金陵，后传至日本、朝鲜及欧洲，达尔文曾引用此书，称其为"中国古代的百科全书"。</p>
              <p class="ming-magazine__p">与此同时，明代温病学说兴起。吴有性著《瘟疫论》，提出"戾气"致病说，认为瘟疫非风寒暑湿所致，而由天地间别有一种戾气，从口鼻而入。此说突破《伤寒论》六经辨证之限，开创温病辨治新体系，为清代叶天士、吴鞠通等温病大家奠定基础。明代医学在本草汇编与温病理论两方面均有重要建树。</p>
              <p class="ming-magazine__p">明代印刷术发达，医籍刊行日广。除《本草纲目》外，《普济方》《本草品汇精要》等大型医书亦相继问世。医政方面，太医院承袭前制，地方设有医学、惠民药局。李时珍《本草纲目》与吴有性《瘟疫论》一重药物、一重温病，共同书写明代医学之辉煌篇章。</p>
              <p class="ming-magazine__p">综观明代，本草学登峰造极，温病学初露端倪，医学承宋启清，为后世中药学与温病学之发展奠定坚实基础。</p>
            </div>
            <div class="ming-magazine__divider"></div>
            <div class="ming-magazine__col">
              <p class="ming-magazine__p">李时珍字东璧，号濒湖，蕲州人。幼习儒，后弃举业而专攻医。博极群书，考辨药物，历时二十七载成《本草纲目》。吴有性字又可，著《瘟疫论》，首创戾气致病说，开温病学派之先河，影响直至清代叶天士、吴鞠通。</p>
              <img :src="getPhotoUrl('本草纲目.jpg')" alt="本草纲目" class="ming-magazine__img" @error="($e) => ($e.target.style.display = 'none')" />
            </div>
          </div>
        </section>

        <section class="ming-screen ming-screen-3 ming-figures-dark" :style="{ backgroundImage: `url(${getPhotoUrl('朝代背景8.jpg')})` }">
          <div class="ming-third-inner">
            <div class="ming-figures-row">
              <div class="ming-figure-cell ming-figure-cell--left">
                <img :src="getPhotoUrl('李时珍.jpg')" alt="李时珍" class="ming-figure-img" @error="($e) => ($e.target.src = getPhotoUrl(dynasty.heroImage))" />
                <div class="ming-figure-text">
                  <h4 class="ming-figure-title">李时珍</h4>
                  <p class="ming-figure-desc">历时二十七年著《本草纲目》，收药一千八百九十二种，创药物分类新体系，被誉为"东方药物巨典"、"药圣"。</p>
                </div>
              </div>
              <div class="ming-figures__gap"></div>
              <div class="ming-figure-cell ming-figure-cell--right">
                <img :src="getPhotoUrl('温病学派.jpg')" alt="温病学派" class="ming-figure-img" @error="($e) => ($e.target.src = getPhotoUrl(dynasty.heroImage))" />
                <div class="ming-figure-text">
                  <h4 class="ming-figure-title">温病学派</h4>
                  <p class="ming-figure-desc">吴有性著《瘟疫论》，首创戾气致病说，开温病辨治之先河，为清代叶天士、吴鞠通等温病大家奠定基础。</p>
                </div>
              </div>
            </div>
            <div class="ming-book-wrap">
              <div class="ming-book" :class="{ 'ming-book--open': bookOpen }">
                <div v-if="!bookOpen" class="ming-book-cover" @click="openBook">
                  <span class="ming-book-cover__title">《本草纲目》</span>
                  <span class="ming-book-cover__hint">点击翻阅</span>
                </div>
                <div v-else class="ming-book-spread" @click="onBookClick">
                  <span class="ming-book-spread-hint">点击左侧往前翻，右侧往后翻</span>
                  <div class="ming-book-spread-row">
                    <button type="button" class="ming-book-turn ming-book-turn--prev" :disabled="!canTurnPrev()" @click.stop="turnBookLeft" aria-label="上一页">
                      <ChevronLeft :size="24" />
                    </button>
                    <div class="ming-book-inner">
                      <div class="ming-book-half ming-book-half--left">
                        <template v-if="leftPageContent()">
                          <template v-if="leftPageContent().image">
                            <div class="ming-book-page__img-wrap">
                              <img :src="getPhotoUrl(leftPageContent().image)" :alt="leftPageContent().title" class="ming-book-page__img" @error="($e) => ($e.target.style.display = 'none')" />
                            </div>
                            <p class="ming-book-page__meta">第 {{ bookSpreadIndex * 2 + 1 }} 页</p>
                          </template>
                          <template v-else>
                            <h5 class="ming-book-page__title">{{ leftPageContent().title }}</h5>
                            <p class="ming-book-page__body">{{ leftPageContent().body }}</p>
                            <p class="ming-book-page__meta">第 {{ bookSpreadIndex * 2 + 1 }} 页</p>
                          </template>
                        </template>
                      </div>
                      <div class="ming-book-spine"></div>
                      <div class="ming-book-half ming-book-half--right">
                        <template v-if="rightPageContent()">
                          <template v-if="rightPageContent().image">
                            <div class="ming-book-page__img-wrap">
                              <img :src="getPhotoUrl(rightPageContent().image)" :alt="rightPageContent().title" class="ming-book-page__img" @error="($e) => ($e.target.style.display = 'none')" />
                            </div>
                            <p class="ming-book-page__meta">第 {{ bookSpreadIndex * 2 + 2 }} 页</p>
                          </template>
                          <template v-else>
                            <h5 class="ming-book-page__title">{{ rightPageContent().title }}</h5>
                            <p class="ming-book-page__body">{{ rightPageContent().body }}</p>
                            <p class="ming-book-page__meta">第 {{ bookSpreadIndex * 2 + 2 }} 页</p>
                          </template>
                        </template>
                      </div>
                    </div>
                    <button type="button" class="ming-book-turn ming-book-turn--next" :disabled="!canTurnNext()" @click.stop="turnBookRight" aria-label="下一页">
                      <ChevronRight :size="24" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <section class="ming-achievements-bar">
              <div class="ming-achievements-bar__row">
                <div class="ming-achievements-bar__main">
                  <h3 class="ming-achievements-bar__title">主要成就</h3>
                  <div class="ming-achievements-bar__grid">
                    <div v-for="(item, idx) in dynasty.achievements" :key="idx" class="ming-achievement-item">
                      <span class="ming-achievement-item__year">{{ item.year }}</span>
                      <h4 class="ming-achievement-item__title">{{ item.title }}</h4>
                      <p class="ming-achievement-item__desc">{{ item.description }}</p>
                    </div>
                  </div>
                </div>
                <div class="ming-achievements-bar__nav">
                  <button v-if="adjacent.prev" class="ming-nav-btn" @click="emit('go-to-dynasty', adjacent.prev.id)">
                    <ArrowLeft :size="18" />
                    <span>{{ adjacent.prev.name }}</span>
                  </button>
                  <button v-if="adjacent.next" class="ming-nav-btn" @click="emit('go-to-dynasty', adjacent.next.id)">
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
.ming-root {
  height: 100vh;
  overflow: hidden;
  overflow-x: hidden;
  overscroll-behavior: none;
}
.ming-root--fullscreen {
  height: 100vh;
}

.ming-fixed-bg {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  opacity: 1;
  transition: opacity 0.85s ease-out;
}
.ming-fixed-bg--fade {
  opacity: 0;
}
.ming-fixed-bg__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  filter: brightness(0.82) saturate(0.9);
}

.ming-back-float {
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
.ming-back-float:hover {
  background: rgba(28, 24, 22, 0.85);
  transform: translateY(-50%) translateX(-2px);
}
.ming-back-float__icon {
  transform: rotate(180deg);
}

.ming-flip-viewport {
  position: relative;
  z-index: 1;
  height: 100vh;
  overflow: hidden;
  flex-shrink: 0;
}
.ming-scroll-container {
  width: 100%;
  height: 300vh;
  will-change: transform;
  display: flex;
  flex-direction: column;
}
.ming-screen {
  width: 100%;
  flex: 0 0 100vh;
  min-height: 0;
  position: relative;
  overflow: hidden;
}

.ming-screen-1 {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
}
.ming-curtain__gradient {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  height: 100%;
  background: linear-gradient(to top, rgba(28, 24, 22, 0.92) 0%, rgba(45, 38, 35, 0.5) 45%, transparent 100%);
  pointer-events: none;
}
.ming-curtain__center {
  position: absolute;
  left: 50%;
  top: 38vh;
  transform: translate(-50%, -50%);
  text-align: center;
  z-index: 2;
  pointer-events: none;
}
.ming-curtain__name {
  font-size: clamp(2.4rem, 5.5vw, 3.8rem);
  color: #fff;
  letter-spacing: 12px;
  margin: 0;
  text-shadow: 0 2px 24px rgba(0,0,0,0.5);
}
.ming-curtain__divider {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin: 10px 0;
  opacity: 0.85;
}
.ming-curtain__period {
  font-size: 1.05rem;
  color: rgba(255,255,255,0.88);
  letter-spacing: 3px;
  margin: 0;
}
.ming-curtain__overview {
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
.ming-curtain__overview-text {
  font-size: 0.98rem;
  line-height: 1.9;
  color: rgba(255,255,255,0.82);
  margin: 0;
  text-align: center;
  max-width: 720px;
}

.ming-screen-2 {
  background: var(--bg);
}
.ming-magazine {
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

.ming-magazine__col { padding: 0 2.5rem; }
.ming-magazine__p {
  font-size: 0.95rem;
  line-height: 2;
  color: var(--primary-dark);
  margin: 0 0 1.2em;
  text-align: justify;
}
.ming-magazine__p:last-of-type { margin-bottom: 0; }
.ming-magazine__img {
  width: 100%;
  max-width: 100%;
  margin-top: 1em;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.12);
  object-fit: cover;
  display: block;
}
.ming-magazine__divider {
  width: 1px;
  min-height: 120px;
  background: rgba(139, 94, 60, 0.2);
}

.ming-figures-dark {
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
.ming-third-inner {
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 12px 4vw 24px;
  -webkit-overflow-scrolling: touch;
  box-sizing: border-box;
}
.ming-figures-row {
  display: flex;
  align-items: stretch;
  justify-content: center;
  gap: 0;
  width: 100%;
  max-width: 1000px;
  margin: 0 auto 10px;
  flex-shrink: 0;
}
.ming-figures__gap {
  width: clamp(32px, 5vw, 64px);
  flex-shrink: 0;
}
.ming-figure-cell {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  max-width: 320px;
}
.ming-figure-cell--left { align-items: flex-end; }
.ming-figure-cell--right { align-items: flex-start; }
.ming-figure-img {
  width: 100%;
  max-width: 140px;
  aspect-ratio: 3/4;
  object-fit: cover;
  border-radius: 10px;
  box-shadow: 0 8px 28px rgba(0,0,0,0.4);
}
.ming-figure-cell--left .ming-figure-text { margin-left: 0; text-align: right; padding-right: 12px; }
.ming-figure-cell--right .ming-figure-text { margin-right: 0; text-align: left; padding-left: 12px; }
.ming-figure-text {
  margin-top: 10px;
  max-width: 100%;
  padding: 12px 10px;
  border-radius: 8px;
  background: rgba(253, 251, 247, 0.92);
  border: 1px solid rgba(139, 94, 60, 0.12);
}
.ming-figure-title {
  font-size: 1rem;
  font-weight: 600;
  color: #2c2c2c;
  margin: 0 0 6px;
  letter-spacing: 2px;
}
.ming-figure-desc {
  font-size: 0.8rem;
  line-height: 1.65;
  color: #3d3629;
  margin: 0;
}

.ming-book-wrap {
  flex: 1;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px 0;
}
.ming-book {
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
.ming-book-cover {
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
.ming-book-cover:hover {
  transform: scale(1.02);
  box-shadow: 0 20px 56px rgba(0,0,0,0.6);
}
.ming-book-cover__title {
  font-size: clamp(0.85rem, 1.6vw, 1rem);
  font-weight: 600;
  color: rgba(255,255,255,0.9);
  letter-spacing: 2px;
  text-align: center;
  padding: 0 8px;
}
.ming-book-cover__hint {
  font-size: 0.7rem;
  color: rgba(255,255,255,0.5);
  letter-spacing: 2px;
}
.ming-book-spread {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  height: 100%;
  cursor: pointer;
}
.ming-book-spread-hint {
  font-size: 0.7rem;
  color: rgba(255,255,255,0.5);
  letter-spacing: 1px;
  flex-shrink: 0;
}
.ming-book-spread-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  flex: 1;
  min-height: 0;
  width: 100%;
}
.ming-book-spread-row .ming-book-turn { flex-shrink: 0; }
.ming-book-spread-row .ming-book-inner { flex: 1; min-height: 0; }
.ming-book-turn {
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
.ming-book-turn:hover:not(:disabled) {
  background: rgba(255,255,255,0.18);
}
.ming-book-turn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}
.ming-book-inner {
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
.ming-book-half {
  flex: 1;
  min-width: 0;
  min-height: 280px;
  padding: 16px 14px;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}
.ming-book-page__img-wrap {
  width: 100%;
  height: 100%;
  min-height: 240px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-radius: 4px;
}
.ming-book-page__img {
  max-width: 100%;
  width: auto;
  height: 100%;
  min-height: 240px;
  object-fit: contain;
  display: block;
}
.ming-book-spine {
  width: 4px;
  background: linear-gradient(to right, rgba(139, 94, 60, 0.15), rgba(139, 94, 60, 0.35), rgba(139, 94, 60, 0.15));
  flex-shrink: 0;
}
.ming-book-page__title {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--primary-dark);
  margin: 0 0 10px;
  letter-spacing: 1px;
  padding-bottom: 6px;
  border-bottom: 1px solid rgba(139, 94, 60, 0.2);
}
.ming-book-page__body {
  font-size: 0.8rem;
  line-height: 1.9;
  color: var(--primary-dark);
  margin: 0;
  white-space: pre-line;
}
.ming-book-page__meta {
  font-size: 0.7rem;
  color: var(--text-secondary);
  margin-top: 12px;
  text-align: right;
}

.ming-achievements-bar {
  margin-top: 24px;
  padding: 28px 0 24px;
  background: linear-gradient(180deg, rgba(235, 229, 220, 0.92) 0%, rgba(224, 216, 204, 0.95) 100%);
  border-radius: 12px;
  border: 1px solid rgba(139, 94, 60, 0.18);
  flex-shrink: 0;
}
.ming-screen-3 .ming-achievements-bar {
  padding-left: 6vw;
  padding-right: 6vw;
  margin-left: -2vw;
  margin-right: -2vw;
  border-radius: 0;
}
.ming-achievements-bar__row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  max-width: 1000px;
  margin: 0 auto;
}
.ming-achievements-bar__title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--primary-dark);
  margin: 0 0 16px;
  letter-spacing: 2px;
  display: flex;
  align-items: center;
  gap: 10px;
}
.ming-achievements-bar__title::before {
  content: '';
  width: 3px;
  height: 16px;
  background: var(--accent-red);
  border-radius: 2px;
}
.ming-achievements-bar__grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px 24px;
}
.ming-achievement-item {
  padding: 12px 0;
  border-bottom: 1px solid rgba(139, 94, 60, 0.12);
}
.ming-achievement-item__year {
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--accent-red);
  background: rgba(196, 78, 70, 0.1);
  padding: 2px 8px;
  border-radius: 4px;
  margin-bottom: 6px;
  display: inline-block;
}
.ming-achievement-item__title {
  font-size: 0.92rem;
  font-weight: 600;
  color: var(--primary-dark);
  margin: 0 0 4px;
}
.ming-achievement-item__desc {
  font-size: 0.82rem;
  color: var(--text-secondary);
  margin: 0;
  line-height: 1.5;
}
.ming-achievements-bar__nav {
  flex-shrink: 0;
  display: flex;
  gap: 12px;
}
.ming-nav-btn {
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
.ming-nav-btn:hover {
  background: rgba(255, 255, 255, 0.95);
  border-color: var(--primary);
}

@media (max-width: 640px) {
  .ming-curtain__overview { padding: 20px 6vw 36px; }
  .ming-magazine {
    grid-template-columns: 1fr;
    padding: 24px 5vw 32px;
  }
  .ming-magazine .ming-magazine__divider {
    width: 100%;
    height: 1px;
    min-height: 0;
    margin: 8px 0;
  }
  .ming-magazine .ming-magazine__col { padding: 0 0.5rem; }
  .ming-back-float { left: 12px; padding: 8px 12px; font-size: 0.85rem; }
  .ming-figures-row {
    flex-direction: column;
    align-items: center;
    gap: 20px;
  }
  .ming-figures__gap { width: 0; height: 0; }
  .ming-figure-cell { max-width: 100%; align-items: center !important; }
  .ming-figure-cell--left .ming-figure-text,
  .ming-figure-cell--right .ming-figure-text {
    text-align: center;
    padding-left: 8px;
    padding-right: 8px;
  }
  .ming-book { min-height: 240px; max-height: 58vh; }
  .ming-book-cover { height: clamp(220px, 50vw, 280px); }
  .ming-book-inner { min-height: 260px; max-height: 52vh; }
  .ming-book-half { min-height: 220px; }
  .ming-book-page__img-wrap { min-height: 200px; }
  .ming-book-page__img { min-height: 200px; }
  .ming-achievements-bar__row { flex-direction: column; }
  .ming-achievements-bar__grid { grid-template-columns: 1fr; }
}
</style>

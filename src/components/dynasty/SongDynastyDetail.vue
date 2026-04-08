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

const songRootRef = ref(null)
const songFlipActiveIndex = ref(0)
const songIsAnimating = ref(false)
const SONG_TOTAL_PAGES = 3

const VH_PER_PAGE = 100

function songMoveTo(index) {
  if (index < 0 || index >= SONG_TOTAL_PAGES) return
  if (songIsAnimating.value) return
  songIsAnimating.value = true
  const container = songRootRef.value?.querySelector('.song-scroll-container')
  if (!container) {
    songFlipActiveIndex.value = index
    emit('page-change', index)
    songIsAnimating.value = false
    return
  }
  const fromIndex = songFlipActiveIndex.value
  songFlipActiveIndex.value = index
  emit('page-change', index)

  if (songRootRef.value) {
    const thirdInner = songRootRef.value.querySelector('.song-third-inner')
    if (thirdInner) thirdInner.scrollTop = 0
  }

  const yVh = -index * VH_PER_PAGE
  gsap.to(container, {
    y: `${yVh}vh`,
    duration: fromIndex === 0 && index === 1 ? 1 : 0.9,
    ease: 'power2.inOut',
    overwrite: true,
    onComplete: () => { songIsAnimating.value = false },
  })
}

function songHandleWheel(e) {
  if (!songRootRef.value || !props.dynasty || props.dynasty.id !== 'song') return
  const root = songRootRef.value
  if (songFlipActiveIndex.value === 2) {
    const thirdInner = root.querySelector('.song-third-inner')
    if (thirdInner) {
      const atTop = thirdInner.scrollTop <= 2
      const atBottom = thirdInner.scrollTop + thirdInner.clientHeight >= thirdInner.scrollHeight - 2
      if (e.deltaY > 0 && !atBottom) return
      if (e.deltaY < 0 && !atTop) return
      if (e.deltaY < 0 && atTop) {
        e.preventDefault()
        if (songIsAnimating.value) return
        if (Math.abs(e.deltaY) < 18) return
        songMoveTo(1)
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
  if (songIsAnimating.value) return
  if (Math.abs(e.deltaY) < 18) return
  if (e.deltaY > 0) {
    if (songFlipActiveIndex.value < SONG_TOTAL_PAGES - 1) songMoveTo(songFlipActiveIndex.value + 1)
  } else {
    songMoveTo(songFlipActiveIndex.value - 1)
  }
}

// 典籍：《铜人腧穴针灸图经》，6 页，其中第 3 页为图片
const bookOpen = ref(false)
const bookSpreadIndex = ref(0)
const BOOK_PAGES = [
  { title: '铜人腧穴针灸图经序', body: '臣闻圣人之有天下也，论病以及国，原诊以知政。王泽不流，则姦生于下；序乖舛，则灾起于地。针灸之法，古昔所贵，拯黎元于仁寿，济羸劣以获安。\n\n天圣四年，上以针砭之法传述不同，命尚药奉御王惟一考明堂气穴经络之会，铸铜人为式。内分脏腑，旁注溪谷，井荣所会，孔穴所安，窍而达中，刻题于侧。使观者烂然而有第，疑者涣然而冰释。\n\n又以古经训诂至精，学者封执多失，传心岂如会目，著辞不若案形，复令创铸铜人二，分置医官院及大相国寺。' },
  { title: '腧穴与经络', body: '凡三百六十五穴，统于手足三阴三阳、十二经脉及奇经八脉。手太阴肺经，起于中焦，下络大肠，还循胃口，上膈属肺，从肺系横出腋下。\n\n足阳明胃经，起于鼻之交頞中，旁纳太阳之脉，下循鼻外，入上齿中。诸经各有起止、循行与腧穴定位。\n\n凡孔穴所定，分寸同身。头自前发际至后发际，折作一尺二寸。腹部自脐至横骨，折作五寸。背部自大椎至尾骶，二十一节，折作三尺。' },
  { title: '针灸铜人图', image: '宋代针灸铜人.jpg' },
  { title: '主治与刺法', body: '各穴各有主治。如肺俞主咳逆上气、胸满喘呕；心俞主心痛、烦满；肝俞主肋痛、目眩。刺有浅深，各随其部。\n\n凡刺之理，经脉为始。营其所行，知其度量。内刺五脏，外刺六腑。泻实者，刺其来也；补虚者，刺其去也。\n\n灸法亦有补泻。气盛则泻之，虚则补之。以火补者，毋吹其火，须自灭也；以火泻者，疾吹其火，传其艾，须其火灭也。' },
  { title: '考试与教学', body: '铜人既成，诏以颁行。诸州医学，各置铜人式。试医者，以蜡封其孔穴，俾试者按穴取针刺之，中穴则水出，不中则否。以是别其能否。\n\n太医局学生，皆须通《铜人腧穴针灸图经》，方能应举。针灸之学，由是而规范统一，腧穴定位、主治、刺灸之法，皆有据可查。\n\n后世针灸图经、腧穴著作，多宗此书，影响直至今日。' },
  { title: '结语', body: '《铜人腧穴针灸图经》与针灸铜人相辅而成，为世界上最早的针灸教学模型与配套图经。王惟一主持铸铜人、撰图经，统一腧穴标准，促进针灸学规范化，对针灸教育与临床影响深远。\n\n宋代另有唐慎微《证类本草》，集历代本草之大成，为李时珍《本草纲目》重要蓝本。针灸与本草并进，太医局制度完善，宋代医学承唐启明，成就斐然。' },
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
    if (id !== 'song') return
    nextTick(() => {
      const root = songRootRef.value
      if (!root) return
      root.addEventListener('wheel', songHandleWheel, { passive: false })
      const container = root.querySelector('.song-scroll-container')
      if (container) gsap.set(container, { y: '0vh' })
      const thirdInner = root.querySelector('.song-third-inner')
      if (thirdInner) thirdInner.scrollTop = 0
      songFlipActiveIndex.value = 0
      emit('page-change', 0)
      bookOpen.value = false
      bookSpreadIndex.value = 0
    })
  },
  { immediate: true }
)
onBeforeUnmount(() => {
  const root = songRootRef.value
  if (root) root.removeEventListener('wheel', songHandleWheel)
})
</script>

<template>
  <div
    ref="songRootRef"
    class="song-root"
    :class="{ 'song-root--fullscreen': songFlipActiveIndex <= 1 }"
  >
    <button type="button" class="song-back-float" @click="emit('back')" aria-label="返回">
      <ArrowLeft :size="20" class="song-back-float__icon" />
      <span>返回</span>
    </button>

    <div
      v-show="dynasty"
      class="song-fixed-bg"
      :class="{ 'song-fixed-bg--fade': songFlipActiveIndex === 2 }"
      aria-hidden="true"
    >
      <img :src="getPhotoUrl(dynasty.heroImage)" :alt="dynasty.name" class="song-fixed-bg__img" />
    </div>

    <div class="song-flip-viewport">
      <div class="song-scroll-container">
        <section class="song-screen song-screen-1">
          <div class="song-curtain__gradient"></div>
          <div class="song-curtain__center">
            <h2 class="song-curtain__name">{{ dynasty.name }}</h2>
            <div class="song-curtain__divider">
              <span class="hero-line"></span>
              <span class="hero-diamond"></span>
              <span class="hero-line"></span>
            </div>
            <p class="song-curtain__period">{{ dynasty.period }}</p>
          </div>
          <div class="song-curtain__overview">
            <p class="song-curtain__overview-text">{{ dynasty.overview }}</p>
          </div>
        </section>

        <section class="song-screen song-screen-2">
          <div class="song-magazine">
            <div class="song-magazine__col">
              <p class="song-magazine__p">宋代官方高度重视医学教育与考核。朝廷设太医局，医学分科细致，考核制度完善。王惟一主持铸造针灸铜人用于教学与考试，并撰《铜人腧穴针灸图经》，使腧穴定位与主治得以统一规范，针灸学获得长足发展。</p>
              <p class="song-magazine__p">天圣年间，宋仁宗以针砭之法传述不同、学者封执多失，命尚药奉御王惟一考明堂气穴经络之会，铸铜人为式。铜人内分脏腑、旁注溪谷，孔穴窍而达中，可注水、以蜡封穴，试者按穴针刺，中则水出，不中则否，用以别其能否。此乃世界上最早的针灸教学模型，影响深远。</p>
              <p class="song-magazine__p">太医局下设大方脉、风科、小方脉、眼科、疮肿、口齿咽喉、针灸、金镞书禁等科，学生须通过理论考核与实践考试方能任职。朝廷又设惠民局、和剂局，负责制药施药，并多次校正、刊行《千金要方》《外台秘要》《太平惠民和剂局方》等医学典籍。雕版印刷的普及使医籍得以大量刊行，医学知识传播空前广泛。</p>
              <p class="song-magazine__p">与此同时，唐慎微著《证类本草》，集宋代以前本草之大成，收药一千七百余种，附方三千余首，为李时珍《本草纲目》之重要蓝本。宋代本草学与针灸学并进，太医局培养医官、颁行方书，医学制度与学术均有重要建树。《铜人腧穴针灸图经》不仅在国内颁行诸州，亦东传朝鲜、日本，成为东亚针灸学之共同规范。</p>
              <p class="song-magazine__p">综观宋代，医学在官方制度、针灸规范、本草汇编、医籍刊行诸方面承唐启明，为后世医学教育与实践奠定基础。</p>
            </div>
            <div class="song-magazine__divider"></div>
            <div class="song-magazine__col">
              <p class="song-magazine__p">王惟一任尚药奉御，精通针灸。其所铸铜人二具，一置医官院，一置大相国寺。《铜人腧穴针灸图经》三卷，与铜人配套，详载三百六十五穴之定位、主治与刺灸法。唐慎微蜀人，因母病而习医，广搜博采，撰《经史证类备急本草》，后人简称《证类本草》，为宋代本草学代表作。</p>
              <img :src="getPhotoUrl('证类本草.jpg')" alt="证类本草" class="song-magazine__img" @error="($e) => ($e.target.style.display = 'none')" />
            </div>
          </div>
        </section>

        <section class="song-screen song-screen-3 song-figures-dark" :style="{ backgroundImage: `url(${getPhotoUrl('朝代背景7.jpg')})` }">
          <div class="song-third-inner">
            <div class="song-figures-row">
              <div class="song-figure-cell song-figure-cell--left">
                <img :src="getPhotoUrl('王惟一.jpg')" alt="王惟一" class="song-figure-img" @error="($e) => ($e.target.src = getPhotoUrl(dynasty.heroImage))" />
                <div class="song-figure-text">
                  <h4 class="song-figure-title">王惟一</h4>
                  <p class="song-figure-desc">主持铸造针灸铜人，撰《铜人腧穴针灸图经》，统一腧穴标准，创世界上最早针灸教学模型，用于考试与教学。</p>
                </div>
              </div>
              <div class="song-figures__gap"></div>
              <div class="song-figure-cell song-figure-cell--right">
                <img :src="getPhotoUrl('唐慎微.jpg')" alt="唐慎微" class="song-figure-img" @error="($e) => ($e.target.src = getPhotoUrl(dynasty.heroImage))" />
                <div class="song-figure-text">
                  <h4 class="song-figure-title">唐慎微</h4>
                  <p class="song-figure-desc">著《证类本草》，集宋代以前本草之大成，为《本草纲目》重要蓝本，收药一千七百余种、附方三千余首。</p>
                </div>
              </div>
            </div>
            <div class="song-book-wrap">
              <div class="song-book" :class="{ 'song-book--open': bookOpen }">
                <div v-if="!bookOpen" class="song-book-cover" @click="openBook">
                  <span class="song-book-cover__title">《铜人腧穴针灸图经》</span>
                  <span class="song-book-cover__hint">点击翻阅</span>
                </div>
                <div v-else class="song-book-spread" @click="onBookClick">
                  <span class="song-book-spread-hint">点击左侧往前翻，右侧往后翻</span>
                  <div class="song-book-spread-row">
                    <button type="button" class="song-book-turn song-book-turn--prev" :disabled="!canTurnPrev()" @click.stop="turnBookLeft" aria-label="上一页">
                      <ChevronLeft :size="24" />
                    </button>
                    <div class="song-book-inner">
                      <div class="song-book-half song-book-half--left">
                        <template v-if="leftPageContent()">
                          <template v-if="leftPageContent().image">
                            <div class="song-book-page__img-wrap">
                              <img :src="getPhotoUrl(leftPageContent().image)" :alt="leftPageContent().title" class="song-book-page__img" @error="($e) => ($e.target.style.display = 'none')" />
                            </div>
                            <p class="song-book-page__meta">第 {{ bookSpreadIndex * 2 + 1 }} 页</p>
                          </template>
                          <template v-else>
                            <h5 class="song-book-page__title">{{ leftPageContent().title }}</h5>
                            <p class="song-book-page__body">{{ leftPageContent().body }}</p>
                            <p class="song-book-page__meta">第 {{ bookSpreadIndex * 2 + 1 }} 页</p>
                          </template>
                        </template>
                      </div>
                      <div class="song-book-spine"></div>
                      <div class="song-book-half song-book-half--right">
                        <template v-if="rightPageContent()">
                          <template v-if="rightPageContent().image">
                            <div class="song-book-page__img-wrap">
                              <img :src="getPhotoUrl(rightPageContent().image)" :alt="rightPageContent().title" class="song-book-page__img" @error="($e) => ($e.target.style.display = 'none')" />
                            </div>
                            <p class="song-book-page__meta">第 {{ bookSpreadIndex * 2 + 2 }} 页</p>
                          </template>
                          <template v-else>
                            <h5 class="song-book-page__title">{{ rightPageContent().title }}</h5>
                            <p class="song-book-page__body">{{ rightPageContent().body }}</p>
                            <p class="song-book-page__meta">第 {{ bookSpreadIndex * 2 + 2 }} 页</p>
                          </template>
                        </template>
                      </div>
                    </div>
                    <button type="button" class="song-book-turn song-book-turn--next" :disabled="!canTurnNext()" @click.stop="turnBookRight" aria-label="下一页">
                      <ChevronRight :size="24" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <section class="song-achievements-bar">
              <div class="song-achievements-bar__row">
                <div class="song-achievements-bar__main">
                  <h3 class="song-achievements-bar__title">主要成就</h3>
                  <div class="song-achievements-bar__grid">
                    <div v-for="(item, idx) in dynasty.achievements" :key="idx" class="song-achievement-item">
                      <span class="song-achievement-item__year">{{ item.year }}</span>
                      <h4 class="song-achievement-item__title">{{ item.title }}</h4>
                      <p class="song-achievement-item__desc">{{ item.description }}</p>
                    </div>
                  </div>
                </div>
                <div class="song-achievements-bar__nav">
                  <button v-if="adjacent.prev" class="song-nav-btn" @click="emit('go-to-dynasty', adjacent.prev.id)">
                    <ArrowLeft :size="18" />
                    <span>{{ adjacent.prev.name }}</span>
                  </button>
                  <button v-if="adjacent.next" class="song-nav-btn" @click="emit('go-to-dynasty', adjacent.next.id)">
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
.song-root {
  height: 100vh;
  overflow: hidden;
  overflow-x: hidden;
  overscroll-behavior: none;
}
.song-root--fullscreen {
  height: 100vh;
}

.song-fixed-bg {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  opacity: 1;
  transition: opacity 0.85s ease-out;
}
.song-fixed-bg--fade {
  opacity: 0;
}
.song-fixed-bg__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  filter: brightness(0.82) saturate(0.9);
}

.song-back-float {
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
.song-back-float:hover {
  background: rgba(28, 24, 22, 0.85);
  transform: translateY(-50%) translateX(-2px);
}
.song-back-float__icon {
  transform: rotate(180deg);
}

.song-flip-viewport {
  position: relative;
  z-index: 1;
  height: 100vh;
  overflow: hidden;
  flex-shrink: 0;
}
.song-scroll-container {
  width: 100%;
  height: 300vh;
  will-change: transform;
  display: flex;
  flex-direction: column;
}
.song-screen {
  width: 100%;
  flex: 0 0 100vh;
  min-height: 0;
  position: relative;
  overflow: hidden;
}

.song-screen-1 {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
}
.song-curtain__gradient {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  height: 100%;
  background: linear-gradient(to top, rgba(28, 24, 22, 0.92) 0%, rgba(45, 38, 35, 0.5) 45%, transparent 100%);
  pointer-events: none;
}
.song-curtain__center {
  position: absolute;
  left: 50%;
  top: 38vh;
  transform: translate(-50%, -50%);
  text-align: center;
  z-index: 2;
  pointer-events: none;
}
.song-curtain__name {
  font-size: clamp(2.4rem, 5.5vw, 3.8rem);
  color: #fff;
  letter-spacing: 12px;
  margin: 0;
  text-shadow: 0 2px 24px rgba(0,0,0,0.5);
}
.song-curtain__divider {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin: 10px 0;
  opacity: 0.85;
}
.song-curtain__period {
  font-size: 1.05rem;
  color: rgba(255,255,255,0.88);
  letter-spacing: 3px;
  margin: 0;
}
.song-curtain__overview {
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
.song-curtain__overview-text {
  font-size: 0.98rem;
  line-height: 1.9;
  color: rgba(255,255,255,0.82);
  margin: 0;
  text-align: center;
  max-width: 720px;
  white-space: pre-line;
}

.song-screen-2 {
  background: var(--bg);
}
.song-magazine {
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

.song-magazine__col { padding: 0 2.5rem; }
.song-magazine__p {
  font-size: 0.95rem;
  line-height: 2;
  color: var(--primary-dark);
  margin: 0 0 1.2em;
  text-align: justify;
}
.song-magazine__p:last-of-type { margin-bottom: 0; }
.song-magazine__img {
  width: 100%;
  max-width: 100%;
  margin-top: 1em;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.12);
  object-fit: cover;
  display: block;
}
.song-magazine__divider {
  width: 1px;
  min-height: 120px;
  background: rgba(139, 94, 60, 0.2);
}

.song-figures-dark {
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
.song-third-inner {
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 12px 4vw 24px;
  -webkit-overflow-scrolling: touch;
  box-sizing: border-box;
}
.song-figures-row {
  display: flex;
  align-items: stretch;
  justify-content: center;
  gap: 0;
  width: 100%;
  max-width: 1000px;
  margin: 0 auto 10px;
  flex-shrink: 0;
}
.song-figures__gap {
  width: clamp(32px, 5vw, 64px);
  flex-shrink: 0;
}
.song-figure-cell {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  max-width: 320px;
}
.song-figure-cell--left { align-items: flex-end; }
.song-figure-cell--right { align-items: flex-start; }
.song-figure-img {
  width: 100%;
  max-width: 140px;
  aspect-ratio: 3/4;
  object-fit: cover;
  border-radius: 10px;
  box-shadow: 0 8px 28px rgba(0,0,0,0.4);
}
.song-figure-cell--left .song-figure-text { margin-left: 0; text-align: right; padding-right: 12px; }
.song-figure-cell--right .song-figure-text { margin-right: 0; text-align: left; padding-left: 12px; }
.song-figure-text {
  margin-top: 10px;
  max-width: 100%;
  padding: 12px 10px;
  border-radius: 8px;
  background: rgba(253, 251, 247, 0.92);
  border: 1px solid rgba(139, 94, 60, 0.12);
}
.song-figure-title {
  font-size: 1rem;
  font-weight: 600;
  color: #2c2c2c;
  margin: 0 0 6px;
  letter-spacing: 2px;
}
.song-figure-desc {
  font-size: 0.8rem;
  line-height: 1.65;
  color: #3d3629;
  margin: 0;
}

.song-book-wrap {
  flex: 1;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px 0;
}
.song-book {
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
.song-book-cover {
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
.song-book-cover:hover {
  transform: scale(1.02);
  box-shadow: 0 20px 56px rgba(0,0,0,0.6);
}
.song-book-cover__title {
  font-size: clamp(0.85rem, 1.6vw, 1rem);
  font-weight: 600;
  color: rgba(255,255,255,0.9);
  letter-spacing: 2px;
  text-align: center;
  padding: 0 8px;
}
.song-book-cover__hint {
  font-size: 0.7rem;
  color: rgba(255,255,255,0.5);
  letter-spacing: 2px;
}
.song-book-spread {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  height: 100%;
  cursor: pointer;
}
.song-book-spread-hint {
  font-size: 0.7rem;
  color: rgba(255,255,255,0.5);
  letter-spacing: 1px;
  flex-shrink: 0;
}
.song-book-spread-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  flex: 1;
  min-height: 0;
  width: 100%;
}
.song-book-spread-row .song-book-turn { flex-shrink: 0; }
.song-book-spread-row .song-book-inner { flex: 1; min-height: 0; }
.song-book-turn {
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
.song-book-turn:hover:not(:disabled) {
  background: rgba(255,255,255,0.18);
}
.song-book-turn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}
.song-book-inner {
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
.song-book-half {
  flex: 1;
  min-width: 0;
  min-height: 280px;
  padding: 16px 14px;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}
.song-book-page__img-wrap {
  width: 100%;
  height: 100%;
  min-height: 240px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-radius: 4px;
}
.song-book-page__img {
  max-width: 100%;
  width: auto;
  height: 100%;
  min-height: 240px;
  object-fit: contain;
  display: block;
}
.song-book-spine {
  width: 4px;
  background: linear-gradient(to right, rgba(139, 94, 60, 0.15), rgba(139, 94, 60, 0.35), rgba(139, 94, 60, 0.15));
  flex-shrink: 0;
}
.song-book-page__title {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--primary-dark);
  margin: 0 0 10px;
  letter-spacing: 1px;
  padding-bottom: 6px;
  border-bottom: 1px solid rgba(139, 94, 60, 0.2);
}
.song-book-page__body {
  font-size: 0.8rem;
  line-height: 1.9;
  color: var(--primary-dark);
  margin: 0;
  white-space: pre-line;
}
.song-book-page__meta {
  font-size: 0.7rem;
  color: var(--text-secondary);
  margin-top: 12px;
  text-align: right;
}

.song-achievements-bar {
  margin-top: 24px;
  padding: 28px 0 24px;
  background: linear-gradient(180deg, rgba(235, 229, 220, 0.92) 0%, rgba(224, 216, 204, 0.95) 100%);
  border-radius: 12px;
  border: 1px solid rgba(139, 94, 60, 0.18);
  flex-shrink: 0;
}
.song-screen-3 .song-achievements-bar {
  padding-left: 6vw;
  padding-right: 6vw;
  margin-left: -2vw;
  margin-right: -2vw;
  border-radius: 0;
}
.song-achievements-bar__row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  max-width: 1000px;
  margin: 0 auto;
}
.song-achievements-bar__main {
  flex: 1;
  min-width: 0;
}
.song-achievements-bar__title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--primary-dark);
  margin: 0 0 16px;
  letter-spacing: 2px;
  display: flex;
  align-items: center;
  gap: 10px;
}
.song-achievements-bar__title::before {
  content: '';
  width: 3px;
  height: 16px;
  background: var(--accent-red);
  border-radius: 2px;
}
.song-achievements-bar__grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px 24px;
}
.song-achievement-item {
  padding: 12px 0;
  border-bottom: 1px solid rgba(139, 94, 60, 0.12);
}
.song-achievement-item__year {
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--accent-red);
  background: rgba(196, 78, 70, 0.1);
  padding: 2px 8px;
  border-radius: 4px;
  margin-bottom: 6px;
  display: inline-block;
}
.song-achievement-item__title {
  font-size: 0.92rem;
  font-weight: 600;
  color: var(--primary-dark);
  margin: 0 0 4px;
}
.song-achievement-item__desc {
  font-size: 0.82rem;
  color: var(--text-secondary);
  margin: 0;
  line-height: 1.5;
}
.song-achievements-bar__nav {
  flex-shrink: 0;
  display: flex;
  gap: 12px;
}
.song-nav-btn {
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
.song-nav-btn:hover {
  background: rgba(255, 255, 255, 0.95);
  border-color: var(--primary);
}

@media (max-width: 640px) {
  .song-curtain__overview { padding: 20px 6vw 36px; }
  .song-magazine {
    grid-template-columns: 1fr;
    padding: 24px 5vw 32px;
  }
  .song-magazine .song-magazine__divider {
    width: 100%;
    height: 1px;
    min-height: 0;
    margin: 8px 0;
  }
  .song-magazine .song-magazine__col { padding: 0 0.5rem; }
  .song-back-float { left: 12px; padding: 8px 12px; font-size: 0.85rem; }
  .song-figures-row {
    flex-direction: column;
    align-items: center;
    gap: 20px;
  }
  .song-figures__gap { width: 0; height: 0; }
  .song-figure-cell { max-width: 100%; align-items: center !important; }
  .song-figure-cell--left .song-figure-text,
  .song-figure-cell--right .song-figure-text {
    text-align: center;
    padding-left: 8px;
    padding-right: 8px;
  }
  .song-book { min-height: 240px; max-height: 58vh; }
  .song-book-cover { height: clamp(220px, 50vw, 280px); }
  .song-book-inner { min-height: 260px; max-height: 52vh; }
  .song-book-half { min-height: 220px; }
  .song-book-page__img-wrap { min-height: 200px; }
  .song-book-page__img { min-height: 200px; }
  .song-achievements-bar__row { flex-direction: column; }
  .song-achievements-bar__grid { grid-template-columns: 1fr; }
}
</style>

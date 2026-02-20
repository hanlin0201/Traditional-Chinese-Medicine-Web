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

const qinhanRootRef = ref(null)
const qinhanFlipActiveIndex = ref(0)
const qinhanIsAnimating = ref(false)
const QINHAN_TOTAL_PAGES = 3

const VH_PER_PAGE = 100

function qinhanMoveTo(index) {
  if (index < 0 || index >= QINHAN_TOTAL_PAGES) return
  if (qinhanIsAnimating.value) return
  qinhanIsAnimating.value = true
  const container = qinhanRootRef.value?.querySelector('.qinhan-scroll-container')
  if (!container) {
    qinhanFlipActiveIndex.value = index
    emit('page-change', index)
    qinhanIsAnimating.value = false
    return
  }
  const fromIndex = qinhanFlipActiveIndex.value
  qinhanFlipActiveIndex.value = index
  emit('page-change', index)

  if (qinhanRootRef.value) {
    const thirdInner = qinhanRootRef.value.querySelector('.qinhan-third-inner')
    if (thirdInner) thirdInner.scrollTop = 0
  }

  const yVh = -index * VH_PER_PAGE
  gsap.to(container, {
    y: `${yVh}vh`,
    duration: fromIndex === 0 && index === 1 ? 1 : 0.9,
    ease: 'power2.inOut',
    overwrite: true,
    onComplete: () => { qinhanIsAnimating.value = false },
  })
}

function qinhanHandleWheel(e) {
  if (!qinhanRootRef.value || !props.dynasty || props.dynasty.id !== 'qinhan') return
  const root = qinhanRootRef.value
  if (qinhanFlipActiveIndex.value === 2) {
    const thirdInner = root.querySelector('.qinhan-third-inner')
    if (thirdInner) {
      const atTop = thirdInner.scrollTop <= 2
      const atBottom = thirdInner.scrollTop + thirdInner.clientHeight >= thirdInner.scrollHeight - 2
      if (e.deltaY > 0 && !atBottom) return
      if (e.deltaY < 0 && !atTop) return
      if (e.deltaY < 0 && atTop) {
        e.preventDefault()
        if (qinhanIsAnimating.value) return
        if (Math.abs(e.deltaY) < 18) return
        qinhanMoveTo(1)
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
  if (qinhanIsAnimating.value) return
  if (Math.abs(e.deltaY) < 18) return
  if (e.deltaY > 0) {
    if (qinhanFlipActiveIndex.value < QINHAN_TOTAL_PAGES - 1) qinhanMoveTo(qinhanFlipActiveIndex.value + 1)
  } else {
    qinhanMoveTo(qinhanFlipActiveIndex.value - 1)
  }
}

// 典籍：《伤寒杂病论》封面 + 6 内页
const bookOpen = ref(false)
const bookSpreadIndex = ref(0)
const BOOK_PAGES = [
  { title: '自序', body: '余每览越人入虢之诊，望齐侯之色，未尝不慨然叹其才秀也。怪当今居世之士，曾不留神医药，精究方术，上以疗君亲之疾，下以救贫贱之厄，中以保身长全，以养其生。但竞逐荣势，企踵权豪，孜孜汲汲，惟名利是务；崇饰其末，忽弃其本，华其外而悴其内。皮之不存，毛将安附焉？\n\n感往昔之沦丧，伤横夭之莫救，乃勤求古训，博采众方，撰用《素问》《九卷》《八十一难》《阴阳大论》《胎胪药录》，并平脉辨证，为《伤寒杂病论》合十六卷。虽未能尽愈诸病，庶可以见病知源。若能寻余所集，思过半矣。' },
  { title: '辨太阳病脉证并治', body: '太阳之为病，脉浮，头项强痛而恶寒。\n\n太阳病，发热，汗出，恶风，脉缓者，名为中风。太阳病，或已发热，或未发热，必恶寒，体痛，呕逆，脉阴阳俱紧者，名为伤寒。\n\n太阳病，头痛发热，身疼腰痛，骨节疼痛，恶风，无汗而喘者，麻黄汤主之。太阳病，发热汗出，恶风，脉缓者，桂枝汤主之。\n\n伤寒表不解，心下有水气，干呕发热而咳，或渴，或利，或噎，或小便不利、少腹满，或喘者，小青龙汤主之。' },
  { title: '辨阳明病脉证并治', body: '阳明之为病，胃家实是也。\n\n阳明病，法多汗，反无汗，其身如虫行皮中状者，此以久虚故也。阳明病，初欲食，小便反不利，大便自调，其人骨节疼，翕翕如有热状，奄然发狂，濈然汗出而解者，此水不胜谷气，与汗共并，脉紧则愈。\n\n阳明病，脉迟，虽汗出不恶寒者，其身必重，短气，腹满而喘，有潮热者，此外欲解，可攻里也。手足濈然汗出者，此大便已硬也，大承气汤主之。\n\n阳明病，发潮热，大便溏，小便自可，胸胁满不去者，与小柴胡汤。' },
  { title: '方剂与治法', body: '观其脉证，知犯何逆，随证治之。\n\n病在阳，应以汗解之，反以冷水潠之，若灌之，其热被劫不得去，弥更益烦，肉上粟起，意欲饮水，反不渴者，服文蛤散。若不差者，与五苓散。\n\n伤寒中风，有柴胡证，但见一证便是，不必悉具。凡柴胡汤病证而下之，若柴胡证不罢者，复与柴胡汤，必蒸蒸而振，却复发热汗出而解。\n\n夫诸病在脏，欲攻之，当随其所得而攻之。如渴者，与猪苓汤。余皆仿此。' },
  { title: '杂病与脏腑辨证', body: '问曰：上工治未病，何也？师曰：夫治未病者，见肝之病，知肝传脾，当先实脾。四季脾王不受邪，即勿补之。中工不晓相传，见肝之病，不解实脾，惟治肝也。\n\n夫人禀五常，因风气而生长。风气虽能生万物，亦能害万物。如水能浮舟，亦能覆舟。若五脏元真通畅，人即安和。客气邪风，中人多死。\n\n千般疢难，不越三条：一者，经络受邪，入脏腑，为内所因也；二者，四肢九窍，血脉相传，壅塞不通，为外皮肤所中也；三者，房室、金刃、虫兽所伤。以此详之，病由都尽。' },
  { title: '结语', body: '《伤寒杂病论》创立了六经辨证与脏腑辨证相结合的体系，奠定了辨证论治的基础，被后世尊为“方书之祖”。书中载方剂二百余首，配伍严谨、疗效卓著，至今仍为临床所常用。\n\n张仲景自序云：虽未能尽愈诸病，庶可以见病知源。若能寻余所集，思过半矣。后世医家莫不宗其法、用其方，与《黄帝内经》《神农本草经》并称中医四大经典，影响深远。' },
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
    if (id !== 'qinhan') return
    nextTick(() => {
      const root = qinhanRootRef.value
      if (!root) return
      root.addEventListener('wheel', qinhanHandleWheel, { passive: false })
      const container = root.querySelector('.qinhan-scroll-container')
      if (container) gsap.set(container, { y: '0vh' })
      const thirdInner = root.querySelector('.qinhan-third-inner')
      if (thirdInner) thirdInner.scrollTop = 0
      qinhanFlipActiveIndex.value = 0
      emit('page-change', 0)
      bookOpen.value = false
      bookSpreadIndex.value = 0
    })
  },
  { immediate: true }
)
onBeforeUnmount(() => {
  const root = qinhanRootRef.value
  if (root) root.removeEventListener('wheel', qinhanHandleWheel)
})
</script>

<template>
  <div
    ref="qinhanRootRef"
    class="qinhan-root"
    :class="{ 'qinhan-root--fullscreen': qinhanFlipActiveIndex <= 1 }"
  >
    <button type="button" class="qinhan-back-float" @click="emit('back')" aria-label="返回">
      <ArrowLeft :size="20" class="qinhan-back-float__icon" />
      <span>返回</span>
    </button>

    <div
      v-show="dynasty"
      class="qinhan-fixed-bg"
      :class="{ 'qinhan-fixed-bg--fade': qinhanFlipActiveIndex === 2 }"
      aria-hidden="true"
    >
      <img :src="getPhotoUrl(dynasty.heroImage)" :alt="dynasty.name" class="qinhan-fixed-bg__img" />
    </div>

    <div class="qinhan-flip-viewport">
      <div class="qinhan-scroll-container">
        <section class="qinhan-screen qinhan-screen-1">
          <div class="qinhan-curtain__gradient"></div>
          <div class="qinhan-curtain__center">
            <h2 class="qinhan-curtain__name">{{ dynasty.name }}</h2>
            <div class="qinhan-curtain__divider">
              <span class="hero-line"></span>
              <span class="hero-diamond"></span>
              <span class="hero-line"></span>
            </div>
            <p class="qinhan-curtain__period">{{ dynasty.period }}</p>
          </div>
          <div class="qinhan-curtain__overview">
            <p class="qinhan-curtain__overview-text">{{ dynasty.overview }}</p>
          </div>
        </section>

        <section class="qinhan-screen qinhan-screen-2">
          <div class="qinhan-magazine">
            <div class="qinhan-magazine__col">
              <p class="qinhan-magazine__p">秦汉时期是中医理论体系形成与临床规范确立的关键阶段。秦统一后书同文、车同轨，医学典籍得以更广泛传抄与整理；至汉代，在《黄帝内经》理论框架的基础上，临床医学与方剂学取得突破性进展，张仲景《伤寒杂病论》应运而生，创立六经辨证与辨证论治体系，被后世尊为“方书之祖”“医圣”。</p>
              <p class="qinhan-magazine__p">《伤寒杂病论》将外感热病按太阳、阳明、少阳、太阴、少阴、厥阴六经分证，每经各有提纲与传变规律，并载方二百余首，如麻黄汤、桂枝汤、小青龙汤、大承气汤、小柴胡汤等，至今仍是临床常用名方。书中“观其脉证，知犯何逆，随证治之”的论述，奠定了辨证论治的核心思想；杂病部分则论及脏腑辨证、治未病与病因三条，与《黄帝内经》一脉相承又有所发挥。</p>
              <p class="qinhan-magazine__p">张仲景在自序中感慨“感往昔之沦丧，伤横夭之莫救”，故“勤求古训，博采众方”，撰成是书。东汉末年疫病流行，其族人多有亡于伤寒者，这一时代背景促使他将理论与临床紧密结合，使中医从偏重理论阐述走向“理法方药”一体的临床体系。与此同时，《神农本草经》于汉代成书或定型，收载药物三百六十五种，与《黄帝内经》《伤寒杂病论》共同构成秦汉时期中医理论的三大支柱。</p>
              <p class="qinhan-magazine__p">综观秦汉，中医完成了从理论奠基到临床规范的跨越。六经辨证、方剂配伍、辨证论治成为后世医家必守之法，张仲景与扁鹊等前代医家的诊法经验也在这一时期得到总结与传承。秦汉医学为两晋隋唐的脉学、本草与方剂发展奠定了坚实基础。</p>
            </div>
            <div class="qinhan-magazine__divider"></div>
            <div class="qinhan-magazine__col">
              <p class="qinhan-magazine__p">张仲景名机，南阳人，东汉末年医学家。他博通群经，尤精医道，因见时人轻视医药、追逐名利而致“横夭莫救”，遂立志著书济世。《伤寒杂病论》原书曾散佚，经晋代王叔和整理编次，宋代又分为《伤寒论》与《金匮要略》二书流传至今。书中“见肝之病，知肝传脾，当先实脾”等论述，体现了治未病与脏腑相关的思想；其方剂配伍严谨、药简效宏，被历代奉为圭臬。扁鹊的望闻问切四诊法在汉代得到继承与发扬，与仲景的脉证并治相得益彰，共同推动了诊断与治疗的规范化。</p>
              <img :src="getPhotoUrl('伤寒杂病论横屏.jpg')" alt="伤寒杂病论" class="qinhan-magazine__img" @error="($e) => ($e.target.style.display = 'none')" />
            </div>
          </div>
        </section>

        <section class="qinhan-screen qinhan-screen-3 qinhan-figures-dark" :style="{ backgroundImage: `url(${getPhotoUrl('朝代背景2.jpg')})` }">
          <div class="qinhan-third-inner">
            <div class="qinhan-figures-row">
              <div class="qinhan-figure-cell qinhan-figure-cell--left">
                <img :src="getPhotoUrl('张仲景.jpg')" alt="张仲景" class="qinhan-figure-img" @error="($e) => ($e.target.src = getPhotoUrl(dynasty.heroImage))" />
                <div class="qinhan-figure-text">
                  <h4 class="qinhan-figure-title">张仲景</h4>
                  <p class="qinhan-figure-desc">医圣，著《伤寒杂病论》，创六经辨证与辨证论治体系。感家族横夭于伤寒，勤求古训、博采众方，撰成方书之祖，载方二百余首，影响至今。</p>
                </div>
              </div>
              <div class="qinhan-figures__gap"></div>
              <div class="qinhan-figure-cell qinhan-figure-cell--right">
                <img :src="getPhotoUrl('扁鹊.jpg')" alt="扁鹊" class="qinhan-figure-img" @error="($e) => ($e.target.src = getPhotoUrl(dynasty.heroImage))" />
                <div class="qinhan-figure-text">
                  <h4 class="qinhan-figure-title">扁鹊</h4>
                  <p class="qinhan-figure-desc">望闻问切四诊法的集大成者，其诊法在秦汉时期得到继承与发扬，与仲景脉证并治相得益彰，共同推动诊断规范化。</p>
                </div>
              </div>
            </div>
            <div class="qinhan-book-wrap">
              <div class="qinhan-book" :class="{ 'qinhan-book--open': bookOpen }">
                <div v-if="!bookOpen" class="qinhan-book-cover" @click="openBook">
                  <span class="qinhan-book-cover__title">《伤寒杂病论》</span>
                  <span class="qinhan-book-cover__hint">点击翻阅</span>
                </div>
                <div v-else class="qinhan-book-spread" @click="onBookClick">
                  <span class="qinhan-book-spread-hint">点击左侧往前翻，右侧往后翻</span>
                  <div class="qinhan-book-spread-row">
                    <button type="button" class="qinhan-book-turn qinhan-book-turn--prev" :disabled="!canTurnPrev()" @click.stop="turnBookLeft" aria-label="上一页">
                      <ChevronLeft :size="24" />
                    </button>
                    <div class="qinhan-book-inner">
                      <div class="qinhan-book-half qinhan-book-half--left">
                        <template v-if="leftPageContent()">
                          <h5 class="qinhan-book-page__title">{{ leftPageContent().title }}</h5>
                          <p class="qinhan-book-page__body">{{ leftPageContent().body }}</p>
                          <p class="qinhan-book-page__meta">第 {{ bookSpreadIndex * 2 + 1 }} 页</p>
                        </template>
                      </div>
                      <div class="qinhan-book-spine"></div>
                      <div class="qinhan-book-half qinhan-book-half--right">
                        <template v-if="rightPageContent()">
                          <h5 class="qinhan-book-page__title">{{ rightPageContent().title }}</h5>
                          <p class="qinhan-book-page__body">{{ rightPageContent().body }}</p>
                          <p class="qinhan-book-page__meta">第 {{ bookSpreadIndex * 2 + 2 }} 页</p>
                        </template>
                      </div>
                    </div>
                    <button type="button" class="qinhan-book-turn qinhan-book-turn--next" :disabled="!canTurnNext()" @click.stop="turnBookRight" aria-label="下一页">
                      <ChevronRight :size="24" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <section class="qinhan-achievements-bar">
              <div class="qinhan-achievements-bar__row">
                <div class="qinhan-achievements-bar__main">
                  <h3 class="qinhan-achievements-bar__title">主要成就</h3>
                  <div class="qinhan-achievements-bar__grid">
                    <div v-for="(item, idx) in dynasty.achievements" :key="idx" class="qinhan-achievement-item">
                      <span class="qinhan-achievement-item__year">{{ item.year }}</span>
                      <h4 class="qinhan-achievement-item__title">{{ item.title }}</h4>
                      <p class="qinhan-achievement-item__desc">{{ item.description }}</p>
                    </div>
                  </div>
                </div>
                <div class="qinhan-achievements-bar__nav">
                  <button v-if="adjacent.prev" class="qinhan-nav-btn" @click="emit('go-to-dynasty', adjacent.prev.id)">
                    <ArrowLeft :size="18" />
                    <span>{{ adjacent.prev.name }}</span>
                  </button>
                  <button v-if="adjacent.next" class="qinhan-nav-btn" @click="emit('go-to-dynasty', adjacent.next.id)">
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
.qinhan-root {
  height: 100vh;
  overflow: hidden;
  overflow-x: hidden;
  overscroll-behavior: none;
}
.qinhan-root--fullscreen {
  height: 100vh;
}

.qinhan-fixed-bg {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  opacity: 1;
  transition: opacity 0.85s ease-out;
}
.qinhan-fixed-bg--fade {
  opacity: 0;
}
.qinhan-fixed-bg__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  filter: brightness(0.82) saturate(0.9);
}

.qinhan-back-float {
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
.qinhan-back-float:hover {
  background: rgba(28, 24, 22, 0.85);
  transform: translateY(-50%) translateX(-2px);
}
.qinhan-back-float__icon {
  transform: rotate(180deg);
}

.qinhan-flip-viewport {
  position: relative;
  z-index: 1;
  height: 100vh;
  overflow: hidden;
  flex-shrink: 0;
}
.qinhan-scroll-container {
  width: 100%;
  height: 300vh;
  will-change: transform;
  display: flex;
  flex-direction: column;
}
.qinhan-screen {
  width: 100%;
  flex: 0 0 100vh;
  min-height: 0;
  position: relative;
  overflow: hidden;
}

.qinhan-screen-1 {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
}
.qinhan-curtain__gradient {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  height: 100%;
  background: linear-gradient(to top, rgba(28, 24, 22, 0.92) 0%, rgba(45, 38, 35, 0.5) 45%, transparent 100%);
  pointer-events: none;
}
.qinhan-curtain__center {
  position: absolute;
  left: 50%;
  top: 38vh;
  transform: translate(-50%, -50%);
  text-align: center;
  z-index: 2;
  pointer-events: none;
}
.qinhan-curtain__name {
  font-size: clamp(2.4rem, 5.5vw, 3.8rem);
  color: #fff;
  letter-spacing: 12px;
  margin: 0;
  text-shadow: 0 2px 24px rgba(0,0,0,0.5);
}
.qinhan-curtain__divider {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin: 10px 0;
  opacity: 0.85;
}
.qinhan-curtain__period {
  font-size: 1.05rem;
  color: rgba(255,255,255,0.88);
  letter-spacing: 3px;
  margin: 0;
}
.qinhan-curtain__overview {
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
.qinhan-curtain__overview-text {
  font-size: 0.98rem;
  line-height: 1.9;
  color: rgba(255,255,255,0.82);
  margin: 0;
  text-align: center;
  max-width: 720px;
}

.qinhan-screen-2 {
  background: var(--bg);
}
.qinhan-magazine {
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

.qinhan-magazine__col { padding: 0 2.5rem; }
.qinhan-magazine__p {
  font-size: 0.95rem;
  line-height: 2;
  color: var(--primary-dark);
  margin: 0 0 1.2em;
  text-align: justify;
}
.qinhan-magazine__p:last-of-type { margin-bottom: 0; }
.qinhan-magazine__img {
  width: 100%;
  max-width: 100%;
  margin-top: 1em;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.12);
  object-fit: cover;
  display: block;
}
.qinhan-magazine__divider {
  width: 1px;
  min-height: 120px;
  background: rgba(139, 94, 60, 0.2);
}

.qinhan-figures-dark {
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
.qinhan-third-inner {
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 12px 4vw 24px;
  -webkit-overflow-scrolling: touch;
  box-sizing: border-box;
}
.qinhan-figures-row {
  display: flex;
  align-items: stretch;
  justify-content: center;
  gap: 0;
  width: 100%;
  max-width: 1000px;
  margin: 0 auto 10px;
  flex-shrink: 0;
}
.qinhan-figures__gap {
  width: clamp(32px, 5vw, 64px);
  flex-shrink: 0;
}
.qinhan-figure-cell {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  max-width: 320px;
}
.qinhan-figure-cell--left { align-items: flex-end; }
.qinhan-figure-cell--right { align-items: flex-start; }
.qinhan-figure-img {
  width: 100%;
  max-width: 140px;
  aspect-ratio: 3/4;
  object-fit: cover;
  border-radius: 10px;
  box-shadow: 0 8px 28px rgba(0,0,0,0.4);
}
.qinhan-figure-cell--left .qinhan-figure-text { margin-left: 0; text-align: right; padding-right: 12px; }
.qinhan-figure-cell--right .qinhan-figure-text { margin-right: 0; text-align: left; padding-left: 12px; }
.qinhan-figure-text {
  margin-top: 10px;
  max-width: 100%;
  padding: 12px 10px;
  border-radius: 8px;
  background: rgba(253, 251, 247, 0.92);
  border: 1px solid rgba(139, 94, 60, 0.12);
}
.qinhan-figure-title {
  font-size: 1rem;
  font-weight: 600;
  color: #2c2c2c;
  margin: 0 0 6px;
  letter-spacing: 2px;
}
.qinhan-figure-desc {
  font-size: 0.8rem;
  line-height: 1.65;
  color: #3d3629;
  margin: 0;
}

.qinhan-book-wrap {
  flex: 1;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px 0;
}
.qinhan-book {
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
.qinhan-book-cover {
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
.qinhan-book-cover:hover {
  transform: scale(1.02);
  box-shadow: 0 20px 56px rgba(0,0,0,0.6);
}
.qinhan-book-cover__title {
  font-size: clamp(0.9rem, 1.8vw, 1.1rem);
  font-weight: 600;
  color: rgba(255,255,255,0.9);
  letter-spacing: 3px;
}
.qinhan-book-cover__hint {
  font-size: 0.7rem;
  color: rgba(255,255,255,0.5);
  letter-spacing: 2px;
}
.qinhan-book-spread {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  height: 100%;
  cursor: pointer;
}
.qinhan-book-spread-hint {
  font-size: 0.7rem;
  color: rgba(255,255,255,0.5);
  letter-spacing: 1px;
  flex-shrink: 0;
}
.qinhan-book-spread-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  flex: 1;
  min-height: 0;
  width: 100%;
}
.qinhan-book-spread-row .qinhan-book-turn { flex-shrink: 0; }
.qinhan-book-spread-row .qinhan-book-inner { flex: 1; min-height: 0; }
.qinhan-book-turn {
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
.qinhan-book-turn:hover:not(:disabled) {
  background: rgba(255,255,255,0.18);
}
.qinhan-book-turn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}
.qinhan-book-inner {
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
.qinhan-book-half {
  flex: 1;
  min-width: 0;
  min-height: 280px;
  padding: 16px 14px;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}
.qinhan-book-spine {
  width: 4px;
  background: linear-gradient(to right, rgba(139, 94, 60, 0.15), rgba(139, 94, 60, 0.35), rgba(139, 94, 60, 0.15));
  flex-shrink: 0;
}
.qinhan-book-page__title {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--primary-dark);
  margin: 0 0 10px;
  letter-spacing: 1px;
  padding-bottom: 6px;
  border-bottom: 1px solid rgba(139, 94, 60, 0.2);
}
.qinhan-book-page__body {
  font-size: 0.8rem;
  line-height: 1.9;
  color: var(--primary-dark);
  margin: 0;
  white-space: pre-line;
}
.qinhan-book-page__meta {
  font-size: 0.7rem;
  color: var(--text-secondary);
  margin-top: 12px;
  text-align: right;
}

.qinhan-achievements-bar {
  margin-top: 24px;
  padding: 28px 0 24px;
  background: linear-gradient(180deg, rgba(235, 229, 220, 0.92) 0%, rgba(224, 216, 204, 0.95) 100%);
  border-radius: 12px;
  border: 1px solid rgba(139, 94, 60, 0.18);
  flex-shrink: 0;
}
.qinhan-screen-3 .qinhan-achievements-bar {
  padding-left: 6vw;
  padding-right: 6vw;
  margin-left: -2vw;
  margin-right: -2vw;
  border-radius: 0;
}
.qinhan-achievements-bar__row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  max-width: 1000px;
  margin: 0 auto;
}
.qinhan-achievements-bar__main {
  flex: 1;
  min-width: 0;
}
.qinhan-achievements-bar__title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--primary-dark);
  margin: 0 0 16px;
  letter-spacing: 2px;
  display: flex;
  align-items: center;
  gap: 10px;
}
.qinhan-achievements-bar__title::before {
  content: '';
  width: 3px;
  height: 16px;
  background: var(--accent-red);
  border-radius: 2px;
}
.qinhan-achievements-bar__grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px 24px;
}
.qinhan-achievement-item {
  padding: 12px 0;
  border-bottom: 1px solid rgba(139, 94, 60, 0.12);
}
.qinhan-achievement-item__year {
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--accent-red);
  background: rgba(196, 78, 70, 0.1);
  padding: 2px 8px;
  border-radius: 4px;
  margin-bottom: 6px;
  display: inline-block;
}
.qinhan-achievement-item__title {
  font-size: 0.92rem;
  font-weight: 600;
  color: var(--primary-dark);
  margin: 0 0 4px;
}
.qinhan-achievement-item__desc {
  font-size: 0.82rem;
  color: var(--text-secondary);
  margin: 0;
  line-height: 1.5;
}
.qinhan-achievements-bar__nav {
  flex-shrink: 0;
  display: flex;
  gap: 12px;
}
.qinhan-nav-btn {
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
.qinhan-nav-btn:hover {
  background: rgba(255, 255, 255, 0.95);
  border-color: var(--primary);
}

@media (max-width: 640px) {
  .qinhan-curtain__overview { padding: 20px 6vw 36px; }
  .qinhan-magazine {
    grid-template-columns: 1fr;
    padding: 24px 5vw 32px;
  }
  .qinhan-magazine .qinhan-magazine__divider {
    width: 100%;
    height: 1px;
    min-height: 0;
    margin: 8px 0;
  }
  .qinhan-magazine .qinhan-magazine__col { padding: 0 0.5rem; }
  .qinhan-back-float { left: 12px; padding: 8px 12px; font-size: 0.85rem; }
  .qinhan-figures-row {
    flex-direction: column;
    align-items: center;
    gap: 20px;
  }
  .qinhan-figures__gap { width: 0; height: 0; }
  .qinhan-figure-cell { max-width: 100%; align-items: center !important; }
  .qinhan-figure-cell--left .qinhan-figure-text,
  .qinhan-figure-cell--right .qinhan-figure-text {
    text-align: center;
    padding-left: 8px;
    padding-right: 8px;
  }
  .qinhan-book { min-height: 240px; max-height: 58vh; }
  .qinhan-book-cover { height: clamp(220px, 50vw, 280px); }
  .qinhan-book-inner { min-height: 260px; max-height: 52vh; }
  .qinhan-book-half { min-height: 220px; }
  .qinhan-achievements-bar__row { flex-direction: column; }
  .qinhan-achievements-bar__grid { grid-template-columns: 1fr; }
}
</style>

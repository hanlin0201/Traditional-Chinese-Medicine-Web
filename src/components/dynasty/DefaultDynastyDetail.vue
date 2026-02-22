<script setup>
import { ref } from 'vue'
import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight, User, BookOpen } from 'lucide-vue-next'
import { getPhotoUrl } from '@/constants/dynasties.js'

const props = defineProps({
  dynasty: { type: Object, required: true },
  adjacent: { type: Object, required: true },
})

const emit = defineEmits(['go-back', 'go-to-dynasty'])

const figuresRef = ref(null)
const textsRef = ref(null)
const achievementsRef = ref(null)

function useDragScroll(elRef) {
  let isDown = false
  let startX = 0
  let scrollLeft = 0
  let el = null
  return {
    onMouseDown(e) {
      el = elRef.value
      if (!el) return
      isDown = true
      el.classList.add('is-dragging')
      startX = e.pageX - el.offsetLeft
      scrollLeft = el.scrollLeft
    },
    onMouseLeave() {
      isDown = false
      elRef.value?.classList.remove('is-dragging')
    },
    onMouseUp() {
      isDown = false
      elRef.value?.classList.remove('is-dragging')
    },
    onMouseMove(e) {
      if (!isDown) return
      e.preventDefault()
      el = elRef.value
      if (!el) return
      const x = e.pageX - el.offsetLeft
      const walk = (x - startX) * 1.5
      el.scrollLeft = scrollLeft - walk
    },
  }
}

const figuresDrag = useDragScroll(figuresRef)
const textsDrag = useDragScroll(textsRef)
const achievementsDrag = useDragScroll(achievementsRef)

function scrollContainer(elRef, direction) {
  const el = elRef.value
  if (!el) return
  el.scrollBy({ left: direction * 300, behavior: 'smooth' })
}
</script>

<template>
  <section class="dynasty-hero">
    <img :src="getPhotoUrl(dynasty.heroImage)" :alt="dynasty.name" class="hero-image" />
    <div class="hero-overlay">
      <h2 class="hero-name">{{ dynasty.name }}</h2>
      <div class="hero-divider">
        <span class="hero-line"></span>
        <span class="hero-diamond"></span>
        <span class="hero-line"></span>
      </div>
      <p class="hero-period">{{ dynasty.period }}</p>
    </div>
  </section>
  <main class="dynasty-content">
    <section class="content-card">
      <div class="card-header">
        <span class="accent-bar red"></span>
        <h3 class="card-title red">时代概述</h3>
      </div>
      <p class="overview-text">{{ dynasty.overview }}</p>
    </section>
    <section v-if="dynasty.figures && dynasty.figures.length" class="content-section">
      <div class="section-header">
        <div class="section-title-group">
          <span class="accent-bar red"></span>
          <h3 class="section-title red">代表人物</h3>
        </div>
        <div class="scroll-arrows">
          <button class="scroll-arrow-btn" @click="scrollContainer(figuresRef, -1)"><ChevronLeft :size="18" /></button>
          <button class="scroll-arrow-btn" @click="scrollContainer(figuresRef, 1)"><ChevronRight :size="18" /></button>
        </div>
      </div>
      <div ref="figuresRef" class="scroll-container" v-on="figuresDrag">
        <div v-for="(figure, idx) in dynasty.figures" :key="idx" class="figure-card">
          <div class="figure-avatar"><User :size="32" class="avatar-icon" /></div>
          <h4 class="figure-name">{{ figure.name }}</h4>
          <p class="figure-desc">{{ figure.description }}</p>
        </div>
      </div>
    </section>
    <section v-if="dynasty.texts && dynasty.texts.length" class="content-section">
      <div class="section-header">
        <div class="section-title-group">
          <span class="accent-bar green"></span>
          <h3 class="section-title green">重要典籍</h3>
        </div>
        <div class="scroll-arrows">
          <button class="scroll-arrow-btn" @click="scrollContainer(textsRef, -1)"><ChevronLeft :size="18" /></button>
          <button class="scroll-arrow-btn" @click="scrollContainer(textsRef, 1)"><ChevronRight :size="18" /></button>
        </div>
      </div>
      <div ref="textsRef" class="scroll-container" v-on="textsDrag">
        <div v-for="(text, idx) in dynasty.texts" :key="idx" class="text-card">
          <div class="text-icon-wrap"><BookOpen :size="24" class="text-icon" /></div>
          <div class="text-info">
            <h4 class="text-name">{{ text.name }}</h4>
            <p class="text-desc">{{ text.description }}</p>
          </div>
        </div>
      </div>
    </section>
    <section v-if="dynasty.achievements && dynasty.achievements.length" class="content-section">
      <div class="section-header">
        <div class="section-title-group">
          <span class="accent-bar red"></span>
          <h3 class="section-title red">主要成就</h3>
        </div>
        <div class="scroll-arrows">
          <button class="scroll-arrow-btn" @click="scrollContainer(achievementsRef, -1)"><ChevronLeft :size="18" /></button>
          <button class="scroll-arrow-btn" @click="scrollContainer(achievementsRef, 1)"><ChevronRight :size="18" /></button>
        </div>
      </div>
      <div ref="achievementsRef" class="scroll-container" v-on="achievementsDrag">
        <div v-for="(item, idx) in dynasty.achievements" :key="idx" class="achievement-card">
          <div class="achievement-index">
            <span class="achievement-dot"></span>
            <span v-if="idx < dynasty.achievements.length - 1" class="achievement-line"></span>
          </div>
          <div class="achievement-body">
            <span class="achievement-year">{{ item.year }}</span>
            <h4 class="achievement-title">{{ item.title }}</h4>
            <p class="achievement-desc">{{ item.description }}</p>
          </div>
        </div>
      </div>
    </section>
    <nav class="dynasty-nav">
      <button v-if="adjacent.prev" class="nav-btn nav-prev" @click="emit('go-to-dynasty', adjacent.prev.id)">
        <ArrowLeft :size="16" /><span>{{ adjacent.prev.name }}</span>
      </button>
      <div v-else class="nav-placeholder"></div>
      <button v-if="adjacent.next" class="nav-btn nav-next" @click="emit('go-to-dynasty', adjacent.next.id)">
        <span>{{ adjacent.next.name }}</span><ArrowRight :size="16" />
      </button>
      <div v-else class="nav-placeholder"></div>
    </nav>
  </main>
</template>

<style scoped>
.dynasty-hero {
  position: relative;
  width: 100%;
  height: 38vh;
  min-height: 260px;
  max-height: 420px;
  overflow: hidden;
}
.hero-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  filter: brightness(0.7) saturate(0.85);
}
.hero-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, rgba(45, 30, 20, 0.85) 0%, rgba(45, 30, 20, 0.3) 50%, transparent 100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  padding-bottom: 36px;
}
.hero-name {
  font-size: clamp(2.5rem, 6vw, 4rem);
  color: #fff;
  letter-spacing: 10px;
  margin: 0;
  text-shadow: 0 2px 20px rgba(0,0,0,0.4);
}
.hero-divider {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 10px 0;
  opacity: 0.7;
}
.hero-line { width: 36px; height: 1px; background: rgba(255,255,255,0.6); }
.hero-diamond { width: 6px; height: 6px; background: #C44E46; transform: rotate(45deg); }
.hero-period { font-size: 1rem; color: rgba(255,255,255,0.8); letter-spacing: 2px; margin: 0; }

.dynasty-content {
  position: relative;
  z-index: 1;
  max-width: 960px;
  margin: 0 auto;
  padding: 28px 20px 60px;
  display: flex;
  flex-direction: column;
  gap: 28px;
}
.content-card {
  background: var(--card-bg);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(139, 94, 60, 0.1);
  border-radius: var(--radius);
  padding: 24px;
  box-shadow: 0 2px 12px rgba(139, 94, 60, 0.06);
}
.card-header { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; }
.accent-bar { width: 3px; height: 18px; border-radius: 2px; flex-shrink: 0; }
.accent-bar.red { background: var(--accent-red); }
.accent-bar.green { background: var(--accent-green); }
.card-title { font-size: 1.05rem; font-weight: 600; margin: 0; letter-spacing: 1px; }
.card-title.red { color: var(--accent-red); }
.card-title.green { color: var(--accent-green); }
.overview-text {
  font-size: 0.95rem;
  line-height: 1.85;
  color: var(--primary-dark);
  margin: 0;
  text-align: justify;
}
.content-section { display: flex; flex-direction: column; gap: 14px; }
.section-header { display: flex; align-items: center; justify-content: space-between; padding: 0 4px; }
.section-title-group { display: flex; align-items: center; gap: 10px; }
.section-title { font-size: 1.05rem; font-weight: 600; margin: 0; letter-spacing: 1px; }
.section-title.red { color: var(--accent-red); }
.section-title.green { color: var(--accent-green); }
.scroll-arrows { display: flex; gap: 6px; }
.scroll-arrow-btn {
  display: flex; align-items: center; justify-content: center;
  width: 32px; height: 32px; border-radius: 8px;
  border: 1px solid rgba(139, 94, 60, 0.15);
  background: var(--card-bg); color: var(--primary);
  cursor: pointer; transition: all 0.2s;
}
.scroll-arrow-btn:hover {
  background: rgba(139, 94, 60, 0.1);
  border-color: var(--primary);
  color: var(--primary-dark);
}
.scroll-container {
  display: flex; gap: 16px; overflow-x: auto; overflow-y: visible;
  padding: 8px 4px 16px; scroll-behavior: smooth; cursor: grab;
  -ms-overflow-style: none; scrollbar-width: none;
}
.scroll-container::-webkit-scrollbar { display: none; }
.scroll-container.is-dragging { cursor: grabbing; scroll-behavior: auto; }

.figure-card {
  flex: 0 0 180px;
  background: var(--card-bg);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(139, 94, 60, 0.1);
  border-radius: var(--radius);
  padding: 24px 16px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  transition: all 0.3s ease;
  user-select: none;
}
.figure-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(139, 94, 60, 0.12);
  border-color: rgba(139, 94, 60, 0.2);
}
.figure-avatar {
  width: 64px; height: 64px; border-radius: 50%;
  background: linear-gradient(135deg, #f5ede4, #e8ddd0);
  display: flex; align-items: center; justify-content: center;
  margin-bottom: 14px;
  box-shadow: 0 2px 8px rgba(139, 94, 60, 0.1);
}
.avatar-icon { color: var(--primary); }
.figure-name { font-size: 1rem; font-weight: 600; color: var(--primary-dark); margin: 0 0 8px; letter-spacing: 1px; }
.figure-desc { font-size: 0.8rem; color: var(--text-secondary); margin: 0; line-height: 1.5; }

.text-card {
  flex: 0 0 280px;
  background: var(--card-bg);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(93, 122, 71, 0.12);
  border-radius: var(--radius);
  padding: 20px;
  display: flex; gap: 16px; align-items: flex-start;
  transition: all 0.3s ease;
  user-select: none;
}
.text-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(93, 122, 71, 0.1);
  border-color: rgba(93, 122, 71, 0.25);
}
.text-icon-wrap {
  flex-shrink: 0; width: 48px; height: 48px; border-radius: 12px;
  background: linear-gradient(135deg, #eef4e8, #dce8d2);
  display: flex; align-items: center; justify-content: center;
}
.text-icon { color: var(--accent-green); }
.text-info { flex: 1; min-width: 0; }
.text-name { font-size: 0.95rem; font-weight: 600; color: var(--primary-dark); margin: 0 0 6px; letter-spacing: 0.5px; }
.text-desc { font-size: 0.8rem; color: var(--text-secondary); margin: 0; line-height: 1.5; }

.achievement-card {
  flex: 0 0 240px;
  display: flex; gap: 14px;
  background: var(--card-bg);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(139, 94, 60, 0.1);
  border-radius: var(--radius);
  padding: 20px 18px;
  transition: all 0.3s ease;
  user-select: none;
}
.achievement-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(139, 94, 60, 0.12);
  border-color: rgba(196, 78, 70, 0.2);
}
.achievement-index {
  display: flex; flex-direction: column; align-items: center;
  padding-top: 4px; flex-shrink: 0;
}
.achievement-dot {
  width: 10px; height: 10px; border-radius: 50%;
  background: var(--accent-red);
  box-shadow: 0 0 0 3px rgba(196, 78, 70, 0.15);
  flex-shrink: 0;
}
.achievement-line {
  width: 2px; flex: 1;
  background: linear-gradient(to bottom, var(--accent-red), transparent);
  margin-top: 4px; min-height: 30px;
}
.achievement-body { flex: 1; min-width: 0; }
.achievement-year {
  display: inline-block;
  font-size: 0.72rem; font-weight: 600; color: var(--accent-red);
  background: rgba(196, 78, 70, 0.08);
  padding: 2px 8px; border-radius: 4px; margin-bottom: 8px; letter-spacing: 0.5px;
}
.achievement-title { font-size: 0.95rem; font-weight: 600; color: var(--primary-dark); margin: 0 0 6px; }
.achievement-desc { font-size: 0.8rem; color: var(--text-secondary); margin: 0; line-height: 1.5; }

.dynasty-nav {
  display: flex; justify-content: space-between; align-items: center;
  margin-top: 12px; padding-top: 24px;
  border-top: 1px solid rgba(139, 94, 60, 0.1);
}
.nav-btn {
  display: flex; align-items: center; gap: 8px;
  padding: 12px 24px; border-radius: 12px;
  border: 1px solid rgba(139, 94, 60, 0.15);
  background: var(--card-bg); color: var(--primary-dark);
  font-family: inherit; font-size: 0.95rem; font-weight: 600; letter-spacing: 2px;
  cursor: pointer; transition: all 0.3s ease;
}
.nav-btn:hover {
  background: rgba(139, 94, 60, 0.08);
  border-color: var(--primary);
  box-shadow: 0 4px 16px rgba(139, 94, 60, 0.1);
  transform: translateY(-2px);
}
.nav-placeholder { width: 120px; }

.content-card,
.content-section {
  animation: fadeSlideUp 0.6s ease-out both;
}
.content-card { animation-delay: 0.1s; }
.content-section:nth-child(3) { animation-delay: 0.2s; }
.content-section:nth-child(4) { animation-delay: 0.3s; }
.content-section:nth-child(5) { animation-delay: 0.4s; }
@keyframes fadeSlideUp {
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>

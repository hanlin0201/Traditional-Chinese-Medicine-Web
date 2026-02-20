<script setup>
import { ref, watch, onBeforeUnmount, nextTick } from 'vue'
import gsap from 'gsap'
import { ArrowRight, ArrowLeft } from 'lucide-vue-next'
import { getPhotoUrl } from '@/constants/dynasties.js'

const props = defineProps({
  dynasty: { type: Object, required: true },
  adjacent: { type: Object, required: true },
})

const emit = defineEmits(['go-to-dynasty', 'page-change', 'back'])

const dangxiaRootRef = ref(null)
const dangxiaFlipActiveIndex = ref(0)
const dangxiaIsAnimating = ref(false)
const DANGXIA_TOTAL_PAGES = 2

const VH_PER_PAGE = 100

function dangxiaMoveTo(index) {
  if (index < 0 || index >= DANGXIA_TOTAL_PAGES) return
  if (dangxiaIsAnimating.value) return
  dangxiaIsAnimating.value = true
  const container = dangxiaRootRef.value?.querySelector('.dangxia-scroll-container')
  if (!container) {
    dangxiaFlipActiveIndex.value = index
    emit('page-change', index)
    dangxiaIsAnimating.value = false
    return
  }
  const fromIndex = dangxiaFlipActiveIndex.value
  dangxiaFlipActiveIndex.value = index
  emit('page-change', index)

  const yVh = -index * VH_PER_PAGE
  gsap.to(container, {
    y: `${yVh}vh`,
    duration: 0.9,
    ease: 'power2.inOut',
    overwrite: true,
    onComplete: () => { dangxiaIsAnimating.value = false },
  })
}

function dangxiaHandleWheel(e) {
  if (!dangxiaRootRef.value || !props.dynasty || props.dynasty.id !== 'dangxia') return
  e.preventDefault()
  if (dangxiaIsAnimating.value) return
  if (Math.abs(e.deltaY) < 18) return
  if (e.deltaY > 0) {
    if (dangxiaFlipActiveIndex.value < DANGXIA_TOTAL_PAGES - 1) dangxiaMoveTo(dangxiaFlipActiveIndex.value + 1)
  } else {
    dangxiaMoveTo(dangxiaFlipActiveIndex.value - 1)
  }
}

watch(
  () => props.dynasty?.id,
  (id) => {
    if (id !== 'dangxia') return
    nextTick(() => {
      const root = dangxiaRootRef.value
      if (!root) return
      root.addEventListener('wheel', dangxiaHandleWheel, { passive: false })
      const container = root.querySelector('.dangxia-scroll-container')
      if (container) gsap.set(container, { y: '0vh' })
      dangxiaFlipActiveIndex.value = 0
      emit('page-change', 0)
    })
  },
  { immediate: true }
)
onBeforeUnmount(() => {
  const root = dangxiaRootRef.value
  if (root) root.removeEventListener('wheel', dangxiaHandleWheel)
})
</script>

<template>
  <div
    ref="dangxiaRootRef"
    class="dangxia-root"
    :class="{ 'dangxia-root--fullscreen': dangxiaFlipActiveIndex === 0 }"
  >
    <button type="button" class="dangxia-back-float" @click="emit('back')" aria-label="返回">
      <ArrowLeft :size="20" class="dangxia-back-float__icon" />
      <span>返回</span>
    </button>

    <div
      v-show="dynasty"
      class="dangxia-fixed-bg"
      :class="{ 'dangxia-fixed-bg--fade': dangxiaFlipActiveIndex === 1 }"
      aria-hidden="true"
    >
      <img :src="getPhotoUrl(dynasty.heroImage)" :alt="dynasty.name" class="dangxia-fixed-bg__img" />
    </div>

    <div class="dangxia-flip-viewport">
      <div class="dangxia-scroll-container">
        <section class="dangxia-screen dangxia-screen-1">
          <div class="dangxia-curtain__gradient"></div>
          <div class="dangxia-curtain__center">
            <h2 class="dangxia-curtain__name">{{ dynasty.name }}</h2>
            <div class="dangxia-curtain__divider">
              <span class="hero-line"></span>
              <span class="hero-diamond"></span>
              <span class="hero-line"></span>
            </div>
            <p class="dangxia-curtain__period">{{ dynasty.period }}</p>
          </div>
          <div class="dangxia-curtain__overview">
            <p class="dangxia-curtain__overview-text">{{ dynasty.overview }}</p>
          </div>
        </section>

        <section class="dangxia-screen dangxia-screen-2 dangxia-figures-dark" style="background-color: #6b5d4d;">
          <div class="dangxia-second-inner">
            <section class="dangxia-achievements-bar">
              <div class="dangxia-achievements-bar__row">
                <div class="dangxia-achievements-bar__main">
                  <h3 class="dangxia-achievements-bar__title">主要成就</h3>
                  <div class="dangxia-achievements-bar__grid">
                    <div v-for="(item, idx) in dynasty.achievements" :key="idx" class="dangxia-achievement-item">
                      <span class="dangxia-achievement-item__year">{{ item.year }}</span>
                      <h4 class="dangxia-achievement-item__title">{{ item.title }}</h4>
                      <p class="dangxia-achievement-item__desc">{{ item.description }}</p>
                    </div>
                  </div>
                </div>
                <div class="dangxia-achievements-bar__nav">
                  <button v-if="adjacent.prev" class="dangxia-nav-btn" @click="emit('go-to-dynasty', adjacent.prev.id)">
                    <ArrowLeft :size="18" />
                    <span>{{ adjacent.prev.name }}</span>
                  </button>
                  <button v-if="adjacent.next" class="dangxia-nav-btn" @click="emit('go-to-dynasty', adjacent.next.id)">
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
.dangxia-root {
  height: 100vh;
  overflow: hidden;
  overscroll-behavior: none;
}
.dangxia-root--fullscreen {
  height: 100vh;
}

.dangxia-fixed-bg {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  opacity: 1;
  transition: opacity 0.85s ease-out;
}
.dangxia-fixed-bg--fade {
  opacity: 0;
}
.dangxia-fixed-bg__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  filter: brightness(0.82) saturate(0.9);
}

.dangxia-back-float {
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
.dangxia-back-float:hover {
  background: rgba(28, 24, 22, 0.85);
  transform: translateY(-50%) translateX(-2px);
}
.dangxia-back-float__icon {
  transform: rotate(180deg);
}

.dangxia-flip-viewport {
  position: relative;
  z-index: 1;
  height: 100vh;
  overflow: hidden;
}
.dangxia-scroll-container {
  width: 100%;
  height: 200vh;
  will-change: transform;
  display: flex;
  flex-direction: column;
}
.dangxia-screen {
  width: 100%;
  flex: 0 0 100vh;
  min-height: 0;
  position: relative;
  overflow: hidden;
}

.dangxia-screen-1 {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
}
.dangxia-curtain__gradient {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  height: 100%;
  background: linear-gradient(to top, rgba(28, 24, 22, 0.92) 0%, rgba(45, 38, 35, 0.5) 45%, transparent 100%);
  pointer-events: none;
}
.dangxia-curtain__center {
  position: absolute;
  left: 50%;
  top: 38vh;
  transform: translate(-50%, -50%);
  text-align: center;
  z-index: 2;
}
.dangxia-curtain__name {
  font-size: clamp(2.4rem, 5.5vw, 3.8rem);
  color: #fff;
  letter-spacing: 12px;
  margin: 0;
  text-shadow: 0 2px 24px rgba(0,0,0,0.5);
}
.dangxia-curtain__divider {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin: 10px 0;
  opacity: 0.85;
}
.dangxia-curtain__period {
  font-size: 1.05rem;
  color: rgba(255,255,255,0.88);
  letter-spacing: 3px;
  margin: 0;
}
.dangxia-curtain__overview {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 12vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 10vw;
  z-index: 2;
}
.dangxia-curtain__overview-text {
  font-size: 0.98rem;
  line-height: 1.9;
  color: rgba(255,255,255,0.82);
  margin: 0;
  text-align: center;
  max-width: 720px;
}
.hero-line { width: 36px; height: 1px; background: rgba(255,255,255,0.6); }
.hero-diamond { width: 6px; height: 6px; background: #C44E46; transform: rotate(45deg); }

.dangxia-screen-2 {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}
.dangxia-second-inner {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px 6vw;
  box-sizing: border-box;
}

.dangxia-achievements-bar {
  width: 100%;
  max-width: 900px;
  padding: 28px 32px;
  background: linear-gradient(180deg, rgba(235, 229, 220, 0.92) 0%, rgba(224, 216, 204, 0.95) 100%);
  border-radius: 12px;
  border: 1px solid rgba(139, 94, 60, 0.18);
}
.dangxia-achievements-bar__row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  flex-wrap: wrap;
}
.dangxia-achievements-bar__main {
  flex: 1;
  min-width: 0;
}
.dangxia-achievements-bar__title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--primary-dark);
  margin: 0 0 16px;
  letter-spacing: 2px;
  display: flex;
  align-items: center;
  gap: 10px;
}
.dangxia-achievements-bar__title::before {
  content: '';
  width: 3px;
  height: 16px;
  background: var(--accent-red);
  border-radius: 2px;
}
.dangxia-achievements-bar__grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px 24px;
}
.dangxia-achievement-item {
  padding: 12px 0;
  border-bottom: 1px solid rgba(139, 94, 60, 0.12);
}
.dangxia-achievement-item__year {
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--accent-red);
  background: rgba(196, 78, 70, 0.1);
  padding: 2px 8px;
  border-radius: 4px;
  margin-bottom: 6px;
  display: inline-block;
}
.dangxia-achievement-item__title {
  font-size: 0.92rem;
  font-weight: 600;
  color: var(--primary-dark);
  margin: 0 0 4px;
}
.dangxia-achievement-item__desc {
  font-size: 0.82rem;
  color: var(--text-secondary);
  margin: 0;
  line-height: 1.5;
}
.dangxia-achievements-bar__nav {
  flex-shrink: 0;
  display: flex;
  gap: 12px;
}
.dangxia-nav-btn {
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
.dangxia-nav-btn:hover {
  background: rgba(255, 255, 255, 0.95);
  border-color: var(--primary);
}

@media (max-width: 640px) {
  .dangxia-curtain__overview { padding: 20px 6vw 36px; }
  .dangxia-back-float { left: 12px; padding: 8px 12px; font-size: 0.85rem; }
  .dangxia-achievements-bar__row { flex-direction: column; }
  .dangxia-achievements-bar__grid { grid-template-columns: 1fr; }
  .dangxia-achievements-bar__nav { width: 100%; justify-content: flex-start; }
}
</style>

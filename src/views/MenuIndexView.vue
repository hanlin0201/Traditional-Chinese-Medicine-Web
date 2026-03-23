<script setup>
import { ref, onMounted, onUnmounted, watch, computed, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import gsap from 'gsap'
import { Sun, Soup, ArrowRight, BookOpen, Utensils, ScrollText, ChevronDown, ArrowUp } from 'lucide-vue-next'

import TcmHistorySection from '@/components/TcmHistorySection.vue'
import HerbalPairing from '@/components/home/HerbalPairing.vue'
import MythBuster from '@/components/home/MythBuster.vue'
// 注意：移除了 getNearestSolarTerm 的引入
import { supabase } from '@/supabaseClient'
import { preloadHomeFeaturePages } from '@/composables/usePagePreload'

const router = useRouter()
const route = useRoute()

// --- 数据状态 ---
const currentTermName = ref('')
const termInfo = ref(null)
const seasonalRecipes = ref([])
const loading = ref(true)
const nearestDaysDiff = ref(0)

const todayLabel = (() => {
  const d = new Date()
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
})()

// --- 核心翻页逻辑 ---
const activeIndex = ref(0)
const isAnimating = ref(false)
const totalSections = 5 

// --- 底部指引文案 ---
const nextSectionLabels = [
  { text: '四时之序 · 查看节气', target: 1 },
  { text: '草本智慧 · 药食同源', target: 2 },
  { text: '去伪存真 · 养生避雷', target: 3 },
  { text: '千年医道 · 中医历史', target: 4 },
  { text: '', target: -1 }
]

const currentNextLabel = computed(() => {
  return nextSectionLabels[activeIndex.value] || { text: '', target: -1 }
})

// --- 动画跳转逻辑 ---
const moveTo = (index) => {
  if (index < 0 || index >= totalSections) return
  if (isAnimating.value) return

  isAnimating.value = true
  activeIndex.value = index

  gsap.to('.scroll-container', {
    y: `-${index * 100}%`, 
    duration: 1.0,          
    ease: "power2.out", 
    overwrite: true 
  })

  setTimeout(() => {
    isAnimating.value = false
  }, 800)
}

const handleWheel = (e) => {
  e.preventDefault() 
  if (isAnimating.value) return 
  if (Math.abs(e.deltaY) < 20) return 
  if (e.deltaY > 0) moveTo(activeIndex.value + 1)
  else moveTo(activeIndex.value - 1)
}

let touchStartY = 0
const handleTouchStart = (e) => { touchStartY = e.touches[0].clientY }
const handleTouchEnd = (e) => {
  if (isAnimating.value) return
  const touchEndY = e.changedTouches[0].clientY
  const diff = touchStartY - touchEndY
  if (Math.abs(diff) > 50) {
    if (diff > 0) moveTo(activeIndex.value + 1)
    else moveTo(activeIndex.value - 1)
  }
}

// --- 业务跳转 ---
function goToHistory() { moveTo(4) }
function handleMainPanelClick() { router.push('/acupoints') }
function goToHerbs() { router.push('/herbs') }
function goToRecipes() { router.push('/recipes') }
function goToRecipeDetail(id) { router.push({ path: '/recipes', query: { open_id: id } }) }

// --- UI 控制逻辑（来自 main）---
watch(activeIndex, (newVal) => {
  if (newVal > 0) document.body.classList.add('hide-global-nav')
  else document.body.classList.remove('hide-global-nav')
})

watch(
  () => ({ path: route.path, history: route.query.history }),
  (curr) => {
    if (curr.path === '/' && curr.history === 'open') nextTick(() => moveTo(4))
  },
  { immediate: true }
)

// ==========================================
// 核心修改：增加本地节气计算逻辑，永远指向下一个节气
// ==========================================
const SOLAR_TERMS_LOOKUP = [
  { name: '小寒', month: 1, day: 5 }, { name: '大寒', month: 1, day: 20 },
  { name: '立春', month: 2, day: 3 }, { name: '雨水', month: 2, day: 18 },
  { name: '惊蛰', month: 3, day: 5 }, { name: '春分', month: 3, day: 20 },
  { name: '清明', month: 4, day: 4 }, { name: '谷雨', month: 4, day: 19 },
  { name: '立夏', month: 5, day: 5 }, { name: '小满', month: 5, day: 20 },
  { name: '芒种', month: 6, day: 5 }, { name: '夏至', month: 6, day: 21 },
  { name: '小暑', month: 7, day: 6 }, { name: '大暑', month: 7, day: 22 },
  { name: '立秋', month: 8, day: 7 }, { name: '处暑', month: 8, day: 22 },
  { name: '白露', month: 9, day: 7 }, { name: '秋分', month: 9, day: 22 },
  { name: '寒露', month: 10, day: 8 }, { name: '霜降', month: 10, day: 23 },
  { name: '立冬', month: 11, day: 7 }, { name: '小雪', month: 11, day: 22 },
  { name: '大雪', month: 12, day: 6 }, { name: '冬至', month: 12, day: 21 }
]

const calculateSeasonalState = () => {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  const day = now.getDate()
  
  const sorted = [...SOLAR_TERMS_LOOKUP].sort((a, b) => a.month !== b.month ? a.month - b.month : a.day - b.day)
  
  // 查找当前所处的节气
  let activeTerm = sorted[sorted.length - 1]
  for (let i = sorted.length - 1; i >= 0; i--) {
    if (month > sorted[i].month || (month === sorted[i].month && day >= sorted[i].day)) {
      activeTerm = sorted[i]
      break
    }
  }
  
  // 查找下一个节气并计算倒计时
  let nextTerm = sorted.find(t => t.month > month || (t.month === month && t.day > day))
  let targetYear = year
  if (!nextTerm) {
    nextTerm = sorted[0]
    targetYear += 1
  }

  const todayReset = new Date(year, now.getMonth(), day) 
  const targetDate = new Date(targetYear, nextTerm.month - 1, nextTerm.day)
  const diffDays = Math.ceil((targetDate - todayReset) / (1000 * 60 * 60 * 24))

  nearestDaysDiff.value = diffDays
  return activeTerm.name
}

// --- 数据获取：Supabase ---
const fetchSeasonalData = async () => {
  loading.value = true
  
  // 使用本地计算函数获取节气名称
  const termName = calculateSeasonalState()
  currentTermName.value = termName

  const MOCK_DATA = {
    info: { name: termName, principle: '省酸增甘，以养脾气；疏肝理气，顺应春阳。', recommend_text: '韭菜、香椿、百合', avoid_text: '酸辣食物、生冷海鲜' },
    recipes: [
      { id: 1, name: '春笋炖排骨', image: 'https://images.unsplash.com/photo-1547592180-85f173990554?q=80&w=2070&auto=format&fit=crop' },
      { id: 2, name: '枸杞菊花茶', image: 'https://images.unsplash.com/photo-1623912852230-e374bb36934c?q=80&w=2070&auto=format&fit=crop' },
      { id: 3, name: '香椿炒鸡蛋', image: 'https://plus.unsplash.com/premium_photo-1661775179532-6ae372740922?q=80&w=2070&auto=format&fit=crop' }
    ]
  }

  try {
    const { data: info } = await supabase.from('solar_terms').select('*').eq('name', termName).single()
    termInfo.value = info || MOCK_DATA.info
    const { data: recipes } = await supabase
      .from('recipes')
      .select('id, name, image')
      .eq('solar_term', termName)
      .or('moderation_status.eq.published,moderation_status.is.null')
      .limit(3)
    seasonalRecipes.value = (recipes && recipes.length) ? recipes : MOCK_DATA.recipes
  } catch (e) {
    termInfo.value = MOCK_DATA.info; 
    seasonalRecipes.value = MOCK_DATA.recipes
  } finally { 
    loading.value = false 
  }
}

onMounted(() => { 
  fetchSeasonalData()
  // 用户停留首页时，在空闲时段预加载药材页/食谱页代码与首屏数据
  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    window.requestIdleCallback(() => { preloadHomeFeaturePages() }, { timeout: 2000 })
  } else {
    setTimeout(() => { preloadHomeFeaturePages() }, 300)
  }
  window.addEventListener('wheel', handleWheel, { passive: false })
  window.addEventListener('touchstart', handleTouchStart, { passive: true })
  window.addEventListener('touchend', handleTouchEnd, { passive: true })
})

onUnmounted(() => {
  window.removeEventListener('wheel', handleWheel)
  window.removeEventListener('touchstart', handleTouchStart)
  window.removeEventListener('touchend', handleTouchEnd)
  document.body.classList.remove('hide-global-nav')
})
</script>

<template>
  <div class="viewport">
    
    <div class="scroll-container">
      
      <div class="page-section">
        <section class="tcm-section tcm-hero-section">
          <div class="bg-overlay-noise"></div>
          <div class="hero-container relative z-10">
            <div class="title-group animate-fade-in-down">
              <h1 class="menu-main-title">中医药百科</h1>
              <div class="title-decoration"><span class="line"></span><span class="dot"></span><span class="line"></span></div>
              <p class="menu-sub-title">传承千载医道 · 守护当代安康</p>
            </div>
            <div class="menu-entry-grid animate-fade-in-up delay-100">
              <div class="main-circle-panel" @click="handleMainPanelClick">
                 <div class="pulse-ring"></div><div class="pulse-ring delay-2"></div>
                 <div class="center-content"><span class="icon">📍</span><span class="label">3D 经络交互</span><span class="sub-label">点击启动</span></div>
              </div>
              <div class="action-buttons">
                 <button @click.stop="goToHerbs" class="action-btn">
                    <div class="btn-icon bg-amber-100 text-amber-700"><BookOpen class="w-5 h-5"/></div>
                    <div class="btn-text"><span class="main">药材百科</span><span class="sub">寻草问药</span></div><ArrowRight class="arrow" />
                 </button>
                 <button @click.stop="goToRecipes" class="action-btn">
                    <div class="btn-icon bg-emerald-100 text-emerald-700"><Utensils class="w-5 h-5"/></div>
                    <div class="btn-text"><span class="main">食疗方案</span><span class="sub">膳食养生</span></div><ArrowRight class="arrow" />
                 </button>
                 <button @click.stop="goToHistory" class="action-btn">
                    <div class="btn-icon bg-stone-100 text-stone-700"><ScrollText class="w-5 h-5"/></div>
                    <div class="btn-text"><span class="main">中医历史</span><span class="sub">源远流长</span></div><ArrowRight class="arrow" />
                 </button>
              </div>
            </div>
          </div>
        </section>
      </div>

      <div class="page-section">
        <section class="tcm-section tcm-seasonal-section">
          <div class="section-inner">
            <div class="section-header">
              <h2 class="section-title">四时之序</h2>
              <p class="section-subtitle">顺应天时，调和阴阳</p>
              <div class="seasonal-header-decoration"><span class="line"></span><span class="dot"></span><span class="line"></span></div>
              <p class="today-label"><span class="today-pill">今日：{{ todayLabel }}</span></p>
            </div>
            <div v-if="termInfo" class="seasonal-card seasonal-card-enter">
               <div class="stamp-decoration">节气</div>
               <div class="card-left">
                  <div class="term-countdown">
                    <span class="term-countdown-prefix">距离下一个节气日</span>
                    <span class="term-countdown-days">
  {{ nearestDaysDiff > 0 ? `还有 ${nearestDaysDiff} 天` : '今天就是节气日' }}
                    </span>
                  </div>
                  <h2 class="term-name">{{ termInfo.name }}</h2>
                  <div class="term-principle">{{ termInfo.principle }}</div>
                  <div class="advice-tags">
                      <div class="advice-row"><span class="tag-label good">宜</span><span class="tag-text">{{ termInfo.recommend_text }}</span></div>
                      <div class="advice-row"><span class="tag-label bad">忌</span><span class="tag-text">{{ termInfo.avoid_text }}</span></div>
                  </div>
               </div>
               <div class="card-divider"></div>
               <div class="card-right">
                  <div class="right-title"><Soup class="w-4 h-4 text-primary" /><span>当季甄选</span></div>
                  <div class="mini-recipe-grid">
                      <div v-for="recipe in seasonalRecipes" :key="recipe.id" class="mini-recipe" @click="goToRecipeDetail(recipe.id)">
                         <img :src="recipe.image" class="recipe-thumb" /><div class="recipe-overlay"><span class="recipe-name">{{ recipe.name }}</span></div>
                      </div>
                  </div>
               </div>
            </div>
          </div>
        </section>
      </div>

      <div class="page-section"><HerbalPairing /></div>
      
      <div class="page-section"><MythBuster /></div>
      
      <div class="page-section"><TcmHistorySection /></div>

    </div>
    
    <div class="pagination">
      <div 
        v-for="(n, index) in totalSections" 
        :key="index"
        class="dot-indicator" 
        :class="{ active: activeIndex === index }"
        @click="moveTo(index)"
      ></div>
    </div>

    <transition name="slide-fade">
      <div v-if="activeIndex > 0" class="sidebar-nav">
        <div class="sidebar-btn" @click="moveTo(0)" title="回到顶部">
          <ArrowUp class="w-5 h-5" />
          <span class="btn-text">顶部</span>
        </div>
      </div>
    </transition>

    <transition name="fade">
      <div 
        v-if="currentNextLabel.text" 
        class="next-page-hint" 
        @click="moveTo(currentNextLabel.target)"
      >
        <span class="hint-text">{{ currentNextLabel.text }}</span>
        <ChevronDown class="animate-bounce w-5 h-5" />
      </div>
    </transition>

  </div>
</template>

<style scoped>
/* =========================================
   1. 视口与容器
   ========================================= */
.viewport {
  position: fixed;
  top: 0; left: 0;
  width: 100%; height: 100vh;
  overflow: hidden; 
  overscroll-behavior: none; 
  touch-action: none; 
}

.scroll-container {
  width: 100%; height: 100%;
}

.page-section { width: 100%; height: 100vh; }

/* 侧边导航 */
.pagination { position: fixed; right: 20px; top: 50%; transform: translateY(-50%); display: flex; flex-direction: column; gap: 15px; z-index: 100; }
.dot-indicator { width: 10px; height: 10px; background: rgba(0,0,0,0.2); border-radius: 50%; cursor: pointer; transition: all 0.3s; }
.dot-indicator.active { background: #8B5E3C; transform: scale(1.4); }

/* =========================================
   侧边隐藏式导航条
   ========================================= */
.sidebar-nav {
  position: fixed;
  right: 0;
  top: 70%;
  transform: translateY(-50%) translateX(60%);
  z-index: 999;
  display: flex;
  flex-direction: column;
  gap: 10px;
  opacity: 0.6;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
}

.sidebar-nav:hover {
  opacity: 1;
  transform: translateY(-50%) translateX(0);
}

.sidebar-btn {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(5px);
  padding: 10px 12px 10px 18px;
  border-radius: 30px 0 0 30px;
  box-shadow: -4px 4px 15px rgba(0,0,0,0.1);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--primary);
  border: 1px solid rgba(139, 94, 60, 0.15);
  border-right: none;
  transition: all 0.3s;
}

.sidebar-btn:hover {
  background: var(--primary);
  color: white;
  padding-right: 20px;
}

.sidebar-btn .btn-text {
  font-size: 0.85rem;
  font-weight: bold;
  white-space: nowrap;
}

.slide-fade-enter-active,
.slide-fade-leave-active {
  transition: all 0.5s ease;
}

.slide-fade-enter-from,
.slide-fade-leave-to {
  transform: translateY(-50%) translateX(100%);
  opacity: 0;
}

/* 底部动态指引 */
.next-page-hint {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  z-index: 999;
  cursor: pointer;
  color: var(--primary);
  text-shadow: 0 1px 2px rgba(255, 255, 255, 0.8);
  font-weight: bold;
  background: transparent;
  backdrop-filter: none;
  border: none;
  padding: 0;
  transition: all 0.3s;
  opacity: 0.8;
}

.next-page-hint:hover {
  opacity: 1;
  transform: translateX(-50%) translateY(-5px);
}

.hint-text {
  font-size: 0.95rem;
  letter-spacing: 0.15em;
  font-family: 'Noto Serif SC', serif;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* =========================================
   2. 内容样式
   ========================================= */
.main-scroll-container { --primary: #8B5E3C; --primary-dark: #5D4037; --accent: #C44D36; font-family: 'Noto Serif SC', serif; }
.tcm-section { position: relative; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; }
.tcm-hero-section { background-image: url('https://images.unsplash.com/photo-1517260739337-6799d2df3fe0?q=80&w=2669&auto=format&fit=crop'); background-size: cover; background-position: center; }
.tcm-hero-section::before { content: ''; position: absolute; inset: 0; background: rgba(255, 253, 250, 0.85); }
.hero-container { display: flex; flex-direction: column; align-items: center; gap: 60px; }
.menu-main-title { font-size: clamp(3rem, 5vw, 4.5rem); color: var(--primary-dark); letter-spacing: 0.2em; font-family: 'Ma Shan Zheng', cursive; margin: 0; text-shadow: 2px 2px 0px rgba(0,0,0,0.05); }
.menu-sub-title { font-size: 1.1rem; color: var(--primary); font-weight: 500; letter-spacing: 0.4em; }
.main-circle-panel { width: 240px; height: 240px; border-radius: 50%; background: radial-gradient(circle at 30% 30%, #f5ece2, #dccdbb); box-shadow: 15px 15px 40px #d6cec5, -15px -15px 40px #ffffff; display: flex; align-items: center; justify-content: center; position: relative; cursor: pointer; transition: transform 0.3s; }
.main-circle-panel:active { transform: scale(0.98); }
.center-content { text-align: center; z-index: 2; display: flex; flex-direction: column; align-items: center; }
.center-content .icon { font-size: 3rem; }
.center-content .label { font-size: 1.1rem; font-weight: bold; color: var(--primary-dark); }
.pulse-ring { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 100%; height: 100%; border-radius: 50%; border: 1px solid var(--primary); opacity: 0; animation: pulse-ring 3s infinite; }
.pulse-ring.delay-2 { animation-delay: 1.5s; }
@keyframes pulse-ring { 0% { width: 100%; height: 100%; opacity: 0.5; } 100% { width: 160%; height: 160%; opacity: 0; } }
.menu-entry-grid { display: flex; gap: 60px; align-items: center; }
.action-buttons { display: flex; flex-direction: column; gap: 16px; width: 280px; }
.action-btn { display: flex; align-items: center; gap: 15px; background: white; padding: 16px 24px; border-radius: 16px; border: 1px solid rgba(139, 94, 60, 0.08); box-shadow: 0 4px 12px rgba(0,0,0,0.02); cursor: pointer; transition: all 0.3s; text-align: left; }
.action-btn:hover { transform: translateX(5px); box-shadow: 0 8px 20px rgba(139, 94, 60, 0.12); border-color: var(--primary); }
.btn-icon { width: 42px; height: 42px; border-radius: 10px; display: flex; align-items: center; justify-content: center; }
.btn-text .main { font-size: 1rem; font-weight: bold; color: var(--primary-dark); display: block; }
.btn-text .sub { font-size: 0.75rem; color: #888; }
.arrow { width: 18px; color: #ccc; margin-left: auto; }
.tcm-seasonal-section { background-image: url('https://images.unsplash.com/photo-1445964047600-cdbdb873673d?q=80&w=2584&auto=format&fit=crop'); background-size: cover; background-position: center; }
.tcm-seasonal-section::before { content: ''; position: absolute; inset: 0; background: rgba(0, 0, 0, 0.25); }
.tcm-seasonal-section::after { content: ''; position: absolute; bottom: 0; left: 0; right: 0; height: 30%; background: linear-gradient(to top, rgba(0,0,0,0.1), transparent); pointer-events: none; z-index: 1; }
.section-inner { width: 100%; max-width: 1100px; padding: 0 5%; z-index: 2; }
.section-header { text-align: center; margin-bottom: 40px; color: white; }
.section-title { font-family: 'Ma Shan Zheng', cursive; font-size: 2.5rem; letter-spacing: 0.1em; margin: 0; text-shadow: 0 2px 8px rgba(0,0,0,0.2); }
.section-subtitle { font-size: 1rem; opacity: 0.9; letter-spacing: 0.3em; }
.seasonal-header-decoration { display: flex; align-items: center; justify-content: center; gap: 8px; margin: 10px 0; }
.seasonal-header-decoration .line { width: 30px; height: 1px; background: rgba(255,255,255,0.6); }
.seasonal-header-decoration .dot { width: 4px; height: 4px; border-radius: 50%; background: rgba(255,255,255,0.8); }
.today-label { margin-top: 4px; }
.today-pill { display: inline-block; background: rgba(255,255,255,0.2); padding: 6px 14px; border-radius: 50px; font-size: 0.9rem; letter-spacing: 0.05em; border: 1px solid rgba(255,255,255,0.3); box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
.seasonal-card { width: 100%; background: rgba(255, 255, 255, 0.92); backdrop-filter: blur(20px); border-radius: 20px; padding: 40px; display: flex; gap: 50px; box-shadow: 0 4px 6px rgba(0,0,0,0.07), 0 20px 40px rgba(0,0,0,0.15); border: 1px solid rgba(255,255,255,0.5); position: relative; }
.seasonal-card-enter { animation: seasonal-card-enter 0.6s ease-out; }
@keyframes seasonal-card-enter { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
.stamp-decoration { position: absolute; top: 20px; right: 20px; border: 2px solid var(--accent); color: var(--accent); padding: 5px; font-weight: bold; transform: rotate(15deg); opacity: 0.48; font-size: 0.95rem; }
.term-badge { display: inline-flex; align-items: center; gap: 6px; background: linear-gradient(135deg, var(--primary), var(--accent)); color: white; padding: 4px 12px; border-radius: 50px; font-size: 0.75rem; font-weight: 500; margin-bottom: 12px; box-shadow: 0 2px 8px rgba(139,94,60,0.25); }
.term-countdown { margin-bottom: 6px; font-size: 0.9rem; color: #666; display: flex; flex-wrap: wrap; gap: 4px; align-items: baseline; }
.term-countdown-name,
.term-countdown-days { font-size: 1rem; font-weight: 600; color: #111; }
.term-name { font-size: 3rem; color: var(--primary-dark); font-family: 'Ma Shan Zheng', serif; margin: 0 0 10px 0; text-shadow: 0 1px 3px rgba(0,0,0,0.06); }
.term-principle { color: #666; line-height: 1.6; margin-bottom: 20px; }
.advice-row { display: flex; align-items: center; gap: 10px; background: rgba(245, 240, 230, 0.5); padding: 8px 12px; border-radius: 10px; margin-bottom: 8px; }
.tag-label { padding: 4px 10px; border-radius: 6px; color: white; font-size: 0.75rem; box-shadow: 0 1px 4px rgba(0,0,0,0.12); }
.tag-label.good { background: #558B2F; }
.tag-label.bad { background: #C62828; }
.card-divider { width: 1px; background: linear-gradient(to bottom, rgba(0,0,0,0.06), rgba(0,0,0,0.12), rgba(0,0,0,0.06)); }
.card-right { flex: 1.5; }
.right-title { font-weight: bold; color: var(--primary); margin-bottom: 15px; display: flex; align-items: center; gap: 8px; letter-spacing: 0.5px; }
.mini-recipe-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
.mini-recipe { position: relative; aspect-ratio: 1; border-radius: 12px; overflow: hidden; cursor: pointer; box-shadow: 0 4px 12px rgba(0,0,0,0.08); transition: transform 0.3s, box-shadow 0.3s; }
.recipe-thumb { width: 100%; height: 100%; object-fit: cover; transition: 0.5s; }
.mini-recipe:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(0,0,0,0.15); }
.mini-recipe:hover .recipe-thumb { transform: scale(1.1); }
.recipe-overlay { position: absolute; bottom: 0; width: 100%; background: linear-gradient(transparent, rgba(0,0,0,0.5), rgba(0,0,0,0.75)); padding: 8px; color: white; text-align: center; }
.recipe-name { font-size: 0.85rem; font-weight: 500; }
.bg-overlay-noise { position: absolute; inset: 0; background-image: url("data:image/svg+xml,%3Csvg width='200' height='200' viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.05'/%3E%3C/svg%3E"); z-index: 1; pointer-events: none; }
.title-decoration { display: flex; align-items: center; gap: 10px; margin: 10px 0; opacity: 0.6; }
.title-decoration .line { width: 40px; height: 1px; background: var(--primary); }
.title-decoration .dot { width: 4px; height: 4px; border-radius: 50%; background: var(--accent); }
.animate-fade-in-down { animation: fadeInDown 1s ease-out; }
.animate-fade-in-up { animation: fadeInUp 1s ease-out; }
@keyframes fadeInDown { from { opacity: 0; transform: translateY(-30px); } to { opacity: 1; transform: translateY(0); } }
@keyframes fadeInUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
@media (max-width: 768px) {
  .menu-entry-grid { flex-direction: column; gap: 40px; }
  .section-title { font-size: clamp(1.75rem, 5vw, 2.25rem); }
  .today-pill { padding: 5px 12px; font-size: 0.85rem; }
  .seasonal-card { flex-direction: column; gap: 24px; padding: 24px; }
  .card-divider { display: none; }
  .mini-recipe-grid { grid-template-columns: repeat(2, 1fr); gap: 12px; }
}
</style>
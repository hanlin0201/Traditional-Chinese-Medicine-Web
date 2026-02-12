<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import gsap from 'gsap'
import TcmHistorySection from '@/components/TcmHistorySection.vue'
import { supabase } from '@/supabaseClient'
import HerbalPairing from '@/components/home/HerbalPairing.vue'
import MythBuster from '@/components/home/MythBuster.vue'
import { Sun, Soup, ArrowRight, BookOpen, Utensils, ScrollText, ChevronDown } from 'lucide-vue-next'

const router = useRouter()

// --- 数据状态 ---
const currentTermName = ref('')
const termInfo = ref(null)      
const seasonalRecipes = ref([]) 
const loading = ref(true)

// --- 核心翻页逻辑 (精准防抖版) ---
const activeIndex = ref(0)
const isAnimating = ref(false)
const totalSections = 5 

const moveTo = (index) => {
  if (index < 0 || index >= totalSections) return
  
  // 这里的锁非常重要，防止动画还没做完就触发下一次
  if (isAnimating.value) return

  isAnimating.value = true
  activeIndex.value = index

  // GSAP 动画控制
  gsap.to('.scroll-container', {
    y: `-${index * 100}%`, 
    
    // 视觉动画时长 1.0秒，保持优雅
    duration: 1.0,         
    
    // 强力缓出曲线，起步快，刹车稳
    ease: "power2.out", 
    
    // 允许新动画覆盖旧动画
    overwrite: true 
  })

  // 【核心修改】冷却时间设为 800ms
  // 这个时间足以过滤掉触摸板“划一下”产生的惯性尾巴
  // 意味着：你划一下，页面动；如果你想动第二下，至少要等 0.8秒
  setTimeout(() => {
    isAnimating.value = false
  }, 800)
}

// 鼠标/触摸板 滚轮监听
const handleWheel = (e) => {
  e.preventDefault() 
  
  // 锁定期间，任何信号都忽略
  if (isAnimating.value) return 
  
  // 【核心修改】增加触发阈值到 20
  // 只有比较明显的滑动才会被判定为“翻页”
  // 触摸板惯性滑动的数值通常很小，会被这里过滤掉
  if (Math.abs(e.deltaY) < 20) return 
  
  if (e.deltaY > 0) {
    moveTo(activeIndex.value + 1)
  } else {
    moveTo(activeIndex.value - 1)
  }
}

// 手机触摸屏监听
let touchStartY = 0
const handleTouchStart = (e) => { touchStartY = e.touches[0].clientY }
const handleTouchEnd = (e) => {
  if (isAnimating.value) return
  const touchEndY = e.changedTouches[0].clientY
  const diff = touchStartY - touchEndY
  
  // 【核心修改】手机端阈值设为 50
  // 防止手指只是轻轻碰了一下屏幕就翻页
  if (Math.abs(diff) > 50) {
    if (diff > 0) moveTo(activeIndex.value + 1)
    else moveTo(activeIndex.value - 1)
  }
}

// --- 业务跳转 ---
function goToHistory() { moveTo(4) }
function scrollToSeasonal() { moveTo(1) }
function handleMainPanelClick() { router.push('/acupoints') }
function goToHerbs() { router.push('/herbs') }
function goToRecipes() { router.push('/recipes') }
function goToRecipeDetail(id) { router.push({ path: '/recipes', query: { open_id: id } }) }

// --- 数据获取 (保持不变) ---
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
];
function getTermLocally() {
  const now = new Date();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  const sorted = SOLAR_TERMS_LOOKUP.sort((a, b) => a.month !== b.month ? a.month - b.month : a.day - b.day);
  let current = sorted[sorted.length - 1]; 
  for (let i = sorted.length - 1; i >= 0; i--) {
    if (month > sorted[i].month || (month === sorted[i].month && day >= sorted[i].day)) {
      current = sorted[i]; break;
    }
  }
  return current;
}
const fetchSeasonalData = async () => {
  loading.value = true
  const termBasic = getTermLocally() 
  currentTermName.value = termBasic.name
  const MOCK_DATA = {
    info: { name: termBasic.name, principle: '省酸增甘，以养脾气；疏肝理气，顺应春阳。', recommend_text: '韭菜、香椿、百合', avoid_text: '酸辣食物、生冷海鲜' },
    recipes: [
      { id: 1, name: '春笋炖排骨', image: 'https://images.unsplash.com/photo-1547592180-85f173990554?q=80&w=2070&auto=format&fit=crop' },
      { id: 2, name: '枸杞菊花茶', image: 'https://images.unsplash.com/photo-1623912852230-e374bb36934c?q=80&w=2070&auto=format&fit=crop' },
      { id: 3, name: '香椿炒鸡蛋', image: 'https://plus.unsplash.com/premium_photo-1661775179532-6ae372740922?q=80&w=2070&auto=format&fit=crop' }
    ]
  }
  try {
    const { data: info } = await supabase.from('solar_terms').select('*').eq('name', termBasic.name).single()
    termInfo.value = info || MOCK_DATA.info
    const { data: recipes } = await supabase.from('recipes').select('id, name, image').eq('solar_term', termBasic.name).limit(3)
    seasonalRecipes.value = (recipes && recipes.length) ? recipes : MOCK_DATA.recipes
  } catch (e) {
    termInfo.value = MOCK_DATA.info; seasonalRecipes.value = MOCK_DATA.recipes
  } finally { loading.value = false }
}

onMounted(() => { 
  fetchSeasonalData()
  window.addEventListener('wheel', handleWheel, { passive: false })
  window.addEventListener('touchstart', handleTouchStart, { passive: true })
  window.addEventListener('touchend', handleTouchEnd, { passive: true })
})

onUnmounted(() => {
  window.removeEventListener('wheel', handleWheel)
  window.removeEventListener('touchstart', handleTouchStart)
  window.removeEventListener('touchend', handleTouchEnd)
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
          <div class="scroll-hint" @click="scrollToSeasonal"><span>今日节气</span><ChevronDown class="animate-bounce w-6 h-6" /></div>
        </section>
      </div>

      <div class="page-section">
        <section class="tcm-section tcm-seasonal-section">
          <div class="section-inner">
            <div class="section-header"><h2 class="section-title">四时之序</h2><p class="section-subtitle">顺应天时，调和阴阳</p></div>
            <div v-if="termInfo" class="seasonal-card">
               <div class="stamp-decoration">节气</div>
               <div class="card-left">
                  <div class="term-badge"><Sun class="w-3.5 h-3.5" /><span>今日</span></div>
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
  /* GSAP 接管 transform，无需 CSS transition */
}

.page-section { width: 100%; height: 100vh; }

/* 侧边导航 */
.pagination { position: fixed; right: 20px; top: 50%; transform: translateY(-50%); display: flex; flex-direction: column; gap: 15px; z-index: 100; }
.dot-indicator { width: 10px; height: 10px; background: rgba(0,0,0,0.2); border-radius: 50%; cursor: pointer; transition: all 0.3s; }
.dot-indicator.active { background: #8B5E3C; transform: scale(1.4); }

/* =========================================
   2. 内容样式 (保持原样)
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
.tcm-seasonal-section::before { content: ''; position: absolute; inset: 0; background: rgba(0, 0, 0, 0.2); }
.section-inner { width: 100%; max-width: 1100px; padding: 0 5%; z-index: 2; }
.section-header { text-align: center; margin-bottom: 40px; color: white; }
.section-title { font-family: 'Ma Shan Zheng', cursive; font-size: 2.5rem; letter-spacing: 0.1em; margin: 0; }
.section-subtitle { font-size: 1rem; opacity: 0.9; letter-spacing: 0.3em; }
.seasonal-card { width: 100%; background: rgba(255, 255, 255, 0.92); backdrop-filter: blur(20px); border-radius: 20px; padding: 40px; display: flex; gap: 50px; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2); position: relative; }
.stamp-decoration { position: absolute; top: 20px; right: 20px; border: 2px solid var(--accent); color: var(--accent); padding: 5px; font-weight: bold; transform: rotate(15deg); opacity: 0.3; }
.term-badge { display: inline-flex; align-items: center; gap: 6px; background: linear-gradient(135deg, var(--primary), var(--accent)); color: white; padding: 4px 12px; border-radius: 50px; font-size: 0.75rem; margin-bottom: 12px; }
.term-name { font-size: 3rem; color: var(--primary-dark); font-family: 'Ma Shan Zheng', serif; margin: 0 0 10px 0; }
.term-principle { color: #666; line-height: 1.6; margin-bottom: 20px; }
.advice-row { display: flex; align-items: center; gap: 10px; background: rgba(245, 240, 230, 0.5); padding: 8px 12px; border-radius: 8px; margin-bottom: 8px; }
.tag-label { padding: 2px 6px; border-radius: 4px; color: white; font-size: 0.75rem; }
.tag-label.good { background: #558B2F; }
.tag-label.bad { background: #C62828; }
.card-divider { width: 1px; background: rgba(0,0,0,0.1); }
.card-right { flex: 1.5; }
.right-title { font-weight: bold; color: var(--primary); margin-bottom: 15px; display: flex; align-items: center; gap: 8px; }
.mini-recipe-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
.mini-recipe { position: relative; aspect-ratio: 1; border-radius: 12px; overflow: hidden; cursor: pointer; }
.recipe-thumb { width: 100%; height: 100%; object-fit: cover; transition: 0.5s; }
.mini-recipe:hover .recipe-thumb { transform: scale(1.1); }
.recipe-overlay { position: absolute; bottom: 0; width: 100%; background: linear-gradient(transparent, rgba(0,0,0,0.7)); padding: 8px; color: white; text-align: center; font-size: 0.8rem; }
.bg-overlay-noise { position: absolute; inset: 0; background-image: url("data:image/svg+xml,%3Csvg width='200' height='200' viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.05'/%3E%3C/svg%3E"); z-index: 1; pointer-events: none; }
.scroll-hint { position: absolute; bottom: 30px; left: 50%; transform: translateX(-50%); display: flex; flex-direction: column; align-items: center; color: var(--primary); cursor: pointer; opacity: 0.6; }
.title-decoration { display: flex; align-items: center; gap: 10px; margin: 10px 0; opacity: 0.6; }
.title-decoration .line { width: 40px; height: 1px; background: var(--primary); }
.title-decoration .dot { width: 4px; height: 4px; border-radius: 50%; background: var(--accent); }
.animate-fade-in-down { animation: fadeInDown 1s ease-out; }
.animate-fade-in-up { animation: fadeInUp 1s ease-out; }
@keyframes fadeInDown { from { opacity: 0; transform: translateY(-30px); } to { opacity: 1; transform: translateY(0); } }
@keyframes fadeInUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
@media (max-width: 768px) {
  .menu-entry-grid { flex-direction: column; gap: 40px; }
  .seasonal-card { flex-direction: column; gap: 20px; padding: 20px; }
  .card-divider { display: none; }
}
</style>
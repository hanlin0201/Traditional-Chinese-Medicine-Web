<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import TcmHistorySection from '@/components/TcmHistorySection.vue'
import { supabase } from '@/supabaseClient'
import HerbalPairing from '@/components/home/HerbalPairing.vue'
import MythBuster from '@/components/home/MythBuster.vue'
// 图标库
import { Sun, CloudRain, Wind, Snowflake, Soup, ArrowRight, BookOpen, Utensils, ScrollText } from 'lucide-vue-next'

const router = useRouter()

// --- 状态 ---
const currentTermName = ref('')
const termInfo = ref(null)      
const seasonalRecipes = ref([]) 
const loading = ref(true)

// --- 交互逻辑 ---
function handleMainPanelClick() { console.log('连接3D模块...') }
function goToHerbs() { router.push('/herbs') }
function goToRecipes() { router.push('/recipes') }
function goToHistory() { document.getElementById('tcm-history')?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }
function goToRecipeDetail(id) { router.push({ path: '/recipes', query: { open_id: id } }) }

// --- 节气计算逻辑 (内置) ---
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
  
  const sorted = SOLAR_TERMS_LOOKUP.sort((a, b) => {
    if (a.month !== b.month) return a.month - b.month;
    return a.day - b.day;
  });

  let current = sorted[sorted.length - 1]; 
  for (let i = sorted.length - 1; i >= 0; i--) {
    const term = sorted[i];
    if (month > term.month || (month === term.month && day >= term.day)) {
      current = term;
      break;
    }
  }
  return current;
}

// --- 获取数据 ---
const fetchSeasonalData = async () => {
  loading.value = true
  const termBasic = getTermLocally() 
  currentTermName.value = termBasic.name

  // 演示数据
  const MOCK_DATA = {
    info: {
      name: termBasic.name,
      principle: '演示模式：省酸增甘，以养脾气；疏肝理气，顺应春阳。',
      recommend_text: '韭菜、香椿、百合',
      avoid_text: '酸辣食物、生冷海鲜'
    },
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
    termInfo.value = MOCK_DATA.info
    seasonalRecipes.value = MOCK_DATA.recipes
  } finally {
    loading.value = false
  }
}

onMounted(() => { fetchSeasonalData() })
</script>

<template>
  <div class="menu-index min-h-screen">
    
    <div class="bg-layer"></div>
    <div class="bg-overlay"></div>

    <main class="menu-container relative z-10">
      <section class="menu-portal-hero">
        <div class="menu-hero-content">
          
          <div class="title-group animate-fade-in-down">
            <h1 class="menu-main-title">中医药百科</h1>
            <div class="title-decoration">
              <span class="line"></span>
              <span class="dot"></span>
              <span class="line"></span>
            </div>
            <p class="menu-sub-title">传承千载医道 · 守护当代安康</p>
          </div>

          <div v-if="termInfo" class="seasonal-card animate-fade-in-up">
             <div class="stamp-decoration">节气</div>

             <div class="card-left">
                <div class="term-badge">
                   <Sun class="w-3.5 h-3.5" /> 
                   <span>今日</span>
                </div>
                <h2 class="term-name">{{ termInfo.name }}</h2>
                <div class="term-principle">{{ termInfo.principle }}</div>
                
                <div class="advice-tags">
                   <div class="advice-row">
                      <span class="tag-label good">宜</span>
                      <span class="tag-text">{{ termInfo.recommend_text }}</span>
                   </div>
                   <div class="advice-row">
                      <span class="tag-label bad">忌</span>
                      <span class="tag-text">{{ termInfo.avoid_text }}</span>
                   </div>
                </div>
             </div>

             <div class="card-divider"></div>

             <div class="card-right">
                <div class="right-title">
                   <Soup class="w-4 h-4 text-primary" /> 
                   <span>当季甄选</span>
                </div>
                <div class="mini-recipe-grid">
                   <div 
                     v-for="recipe in seasonalRecipes" 
                     :key="recipe.id" 
                     class="mini-recipe"
                     @click="goToRecipeDetail(recipe.id)"
                   >
                      <img :src="recipe.image" class="recipe-thumb" />
                      <div class="recipe-overlay">
                        <span class="recipe-name">{{ recipe.name }}</span>
                      </div>
                   </div>
                </div>
             </div>
          </div>

          <div class="menu-entry-grid animate-fade-in-up delay-100">
            
            <div class="main-circle-panel" @click="handleMainPanelClick">
               <div class="pulse-ring"></div>
               <div class="pulse-ring delay-2"></div>
               <div class="center-content">
                  <span class="icon">📍</span>
                  <span class="label">3D 经络交互</span>
                  <span class="sub-label">点击启动</span>
               </div>
            </div>

            <div class="action-buttons">
               <button @click.stop="goToHerbs" class="action-btn">
                  <div class="btn-icon bg-amber-100 text-amber-700"><BookOpen class="w-5 h-5"/></div>
                  <div class="btn-text">
                    <span class="main">药材百科</span>
                    <span class="sub">寻草问药</span>
                  </div>
                  <ArrowRight class="arrow" />
               </button>

               <button @click.stop="goToRecipes" class="action-btn">
                  <div class="btn-icon bg-emerald-100 text-emerald-700"><Utensils class="w-5 h-5"/></div>
                  <div class="btn-text">
                    <span class="main">食疗方案</span>
                    <span class="sub">膳食养生</span>
                  </div>
                  <ArrowRight class="arrow" />
               </button>

               <button @click.stop="goToHistory" class="action-btn">
                  <div class="btn-icon bg-stone-100 text-stone-700"><ScrollText class="w-5 h-5"/></div>
                  <div class="btn-text">
                    <span class="main">中医历史</span>
                    <span class="sub">源远流长</span>
                  </div>
                  <ArrowRight class="arrow" />
               </button>
            </div>

          </div>
        </div>
      </section>
  <div class="animate-fade-in-up delay-200">
    <HerbalPairing />
    <MythBuster />
      </div>
      <TcmHistorySection />
    </main>
  </div>
</template>

<style scoped>
/* 引入谷歌字体 */
@import url('https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400;700&display=swap');

.menu-index {
  --primary: #8B5E3C;       
  --primary-dark: #5D4037;  
  --accent: #C44D36;        
  --bg-color: #Fdfbf8;      
  --text-main: #2c2c2c;     
  font-family: 'Noto Serif SC', serif; 
  overflow-x: hidden;
}

/* 背景层 */
.bg-layer {
  position: fixed;
  top: 0; left: 0; width: 100%; height: 100%;
  background-image: url('https://images.unsplash.com/photo-1517260739337-6799d2df3fe0?q=80&w=2669&auto=format&fit=crop');
  background-size: cover;
  background-position: center;
  opacity: 0.15; 
  z-index: 0;
  filter: grayscale(80%) sepia(20%); 
}
.bg-overlay {
  position: fixed;
  top: 0; left: 0; width: 100%; height: 100%;
  background-image: url("data:image/svg+xml,%3Csvg width='200' height='200' viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.05'/%3E%3C/svg%3E");
  z-index: 1;
  pointer-events: none;
}

.menu-portal-hero {
  display: flex; flex-direction: column; align-items: center;
  padding: 60px 5%; min-height: 100vh; box-sizing: border-box;
}
.menu-hero-content { width: 100%; max-width: 1000px; display: flex; flex-direction: column; align-items: center; }

/* 标题设计 */
.title-group { text-align: center; margin-bottom: 50px; }
.menu-main-title { 
  font-size: 3.5rem; 
  color: var(--primary-dark); 
  letter-spacing: 8px; 
  margin: 0;
  text-shadow: 2px 2px 0px rgba(0,0,0,0.1);
}
.title-decoration {
  display: flex; align-items: center; justify-content: center; gap: 10px; margin: 10px 0; opacity: 0.6;
}
.line { width: 40px; height: 1px; background: var(--primary); }
.dot { width: 4px; height: 4px; border-radius: 50%; background: var(--accent); }
.menu-sub-title { font-size: 1.1rem; color: var(--primary); font-weight: 500; letter-spacing: 2px; }

/* 时令卡片 */
.seasonal-card {
  width: 100%;
  background: rgba(255, 255, 255, 0.85); 
  backdrop-filter: blur(15px);
  border: 1px solid rgba(255, 255, 255, 0.6);
  border-radius: 20px;
  padding: 30px;
  margin-bottom: 50px;
  display: flex;
  gap: 40px;
  box-shadow: 
    0 4px 6px -1px rgba(0, 0, 0, 0.05), 
    0 20px 40px -5px rgba(139, 94, 60, 0.15),
    inset 0 0 0 1px rgba(255,255,255,0.8);
  position: relative;
  overflow: hidden;
}

.stamp-decoration {
  position: absolute;
  top: 20px; right: 20px;
  width: 40px; height: 40px;
  border: 2px solid var(--accent);
  color: var(--accent);
  font-size: 12px;
  display: flex; align-items: center; justify-content: center;
  border-radius: 4px;
  font-weight: bold;
  opacity: 0.3;
  transform: rotate(15deg);
  pointer-events: none;
}

.card-left { flex: 1.1; display: flex; flex-direction: column; align-items: flex-start; }
.term-badge { 
  display: inline-flex; align-items: center; gap: 6px; 
  background: linear-gradient(135deg, var(--primary), var(--accent)); 
  color: white; 
  padding: 4px 12px; border-radius: 50px; 
  font-size: 0.75rem; font-weight: bold; margin-bottom: 12px; 
  box-shadow: 0 2px 5px rgba(196, 77, 54, 0.3);
}
.term-name { 
  font-size: 3rem; 
  color: var(--primary-dark); 
  margin-bottom: 10px; 
  line-height: 1;
  background: linear-gradient(to bottom, #5D4037, #8B5E3C);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
.term-principle { font-size: 1rem; color: #666; margin-bottom: 20px; line-height: 1.6; text-align: left; }

.advice-tags { width: 100%; display: flex; flex-direction: column; gap: 10px; }
.advice-row { display: flex; align-items: center; gap: 10px; background: rgba(255,255,255,0.5); padding: 6px 10px; border-radius: 8px; }
.tag-label { font-size: 0.75rem; font-weight: bold; padding: 2px 6px; border-radius: 4px; color: white; flex-shrink: 0; }
.tag-label.good { background-color: #558B2F; }
.tag-label.bad { background-color: #C62828; }
.tag-text { font-size: 0.9rem; color: var(--primary-dark); }

.card-divider { width: 1px; background: linear-gradient(to bottom, transparent, rgba(139, 94, 60, 0.2), transparent); }

.card-right { flex: 1.5; display: flex; flex-direction: column; }
.right-title { font-size: 0.9rem; font-weight: bold; color: var(--primary); margin-bottom: 15px; display: flex; align-items: center; gap: 8px; border-bottom: 1px solid rgba(139,94,60,0.1); padding-bottom: 8px; width: 100%; }
.mini-recipe-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
.mini-recipe { 
  position: relative; aspect-ratio: 1; border-radius: 12px; overflow: hidden; cursor: pointer; 
  box-shadow: 0 4px 10px rgba(0,0,0,0.05); transition: all 0.3s ease;
}
.mini-recipe:hover { transform: translateY(-3px); box-shadow: 0 8px 15px rgba(0,0,0,0.1); }
.recipe-thumb { width: 100%; height: 100%; object-fit: cover; transition: transform 0.5s ease; }
.mini-recipe:hover .recipe-thumb { transform: scale(1.1); }
.recipe-overlay { 
  position: absolute; bottom: 0; left: 0; width: 100%; 
  background: linear-gradient(to top, rgba(0,0,0,0.7), transparent); 
  padding: 20px 8px 8px; color: white; font-size: 0.8rem; font-weight: bold; text-align: center;
}

/* 下方入口布局 */
.menu-entry-grid {
  display: flex; gap: 40px; align-items: center; width: 100%; justify-content: center;
}

/* 3D 核心圆盘 */
.main-circle-panel {
  width: 260px; height: 260px;
  border-radius: 50%;
  background: radial-gradient(circle at 30% 30%, #eee4d8, #d7c9b8);
  box-shadow: 20px 20px 60px #d1c7b9, -20px -20px 60px #ffffff;
  display: flex; justify-content: center; align-items: center;
  position: relative; cursor: pointer; transition: transform 0.3s ease;
}
.main-circle-panel:active { transform: scale(0.98); }
.center-content { text-align: center; display: flex; flex-direction: column; align-items: center; z-index: 2; }
.center-content .icon { font-size: 3rem; margin-bottom: 5px; }
.center-content .label { font-size: 1.2rem; font-weight: bold; color: var(--primary-dark); }
.center-content .sub-label { font-size: 0.8rem; color: var(--primary); opacity: 0.7; margin-top: 2px; }

/* 脉冲光环 */
.pulse-ring {
  position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
  width: 100%; height: 100%; border-radius: 50%;
  border: 1px solid var(--primary); opacity: 0;
  animation: pulse-ring 3s infinite;
}
.pulse-ring.delay-2 { animation-delay: 1.5s; }

@keyframes pulse-ring {
  0% { width: 100%; height: 100%; opacity: 0.5; }
  100% { width: 160%; height: 160%; opacity: 0; }
}

/* 右侧按钮组 */
.action-buttons { display: flex; flex-direction: column; gap: 15px; width: 280px; }
.action-btn {
  display: flex; align-items: center; gap: 15px;
  background: white; padding: 15px 20px;
  border-radius: 16px; border: 1px solid rgba(0,0,0,0.03);
  box-shadow: 0 4px 10px rgba(0,0,0,0.03);
  cursor: pointer; transition: all 0.3s ease;
  text-align: left;
}
.action-btn:hover {
  transform: translateX(5px);
  box-shadow: 0 8px 20px rgba(139, 94, 60, 0.1);
  border-color: rgba(139, 94, 60, 0.2);
}

/* 🌟 核心修正点：这里不再用 items-center */
.btn-icon { 
  width: 40px; height: 40px; border-radius: 10px; 
  display: flex; align-items: center; justify-content: center; 
  font-size: 1.2rem; 
}

.btn-text { flex: 1; display: flex; flex-direction: column; }
.btn-text .main { font-size: 1rem; font-weight: bold; color: var(--primary-dark); }
.btn-text .sub { font-size: 0.75rem; color: #999; }
.arrow { width: 18px; height: 18px; color: #ccc; transition: color 0.3s; }
.action-btn:hover .arrow { color: var(--primary); }

/* 动画工具类 */
.animate-fade-in-down { animation: fadeInDown 1s ease-out; }
.animate-fade-in-up { animation: fadeInUp 1s ease-out; }
.delay-100 { animation-delay: 0.2s; animation-fill-mode: both; }

@keyframes fadeInDown { from { opacity: 0; transform: translateY(-20px); } to { opacity: 1; transform: translateY(0); } }
@keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }

/* 响应式 */
@media (max-width: 768px) {
  .seasonal-card { flex-direction: column; gap: 20px; padding: 20px; }
  .card-divider { display: none; }
  .menu-entry-grid { flex-direction: column; gap: 30px; }
  .menu-main-title { font-size: 2.5rem; }
  .action-buttons { width: 100%; }
}
</style>
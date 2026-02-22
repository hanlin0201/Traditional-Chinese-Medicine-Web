】<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Link, AlertTriangle, Compass, ArrowRight } from 'lucide-vue-next'
import { supabase } from '@/supabaseClient'

const router = useRouter()
const pairs = ref([])
const loading = ref(false)

// --- 背景图设置 ---
const bgImage = "https://img95.699pic.com/video_cover/46/24/21/a_awADQHKSEUjU1630462421.jpg!/fw/820"

// --- 1. 罗盘刷新逻辑 ---
const fetchRandomPairings = async () => {
  loading.value = true
  try {
    const { data, error } = await supabase
      .from('herbal_pairings')
      .select('*')
      .limit(30)
    
    if (error) throw error
    
    const shuffled = [...data].sort(() => Math.random() - 0.5)
    pairs.value = shuffled.slice(0, 15).map(item => ({ 
      ...item,
      isOpen: false
    }))
  } catch (e) {
    console.error('获取失败:', e)
    // 演示数据
    pairs.value = [
      { id: 1, type: 'good', left_herb: '枸杞', right_herb: '菊花', effect: '清肝明目', description: '枸杞滋补肝肾，菊花清热解毒。二者搭配，补而不腻，常用于目赤肿痛或视力减退。', isOpen: false },
      { id: 2, type: 'bad',  left_herb: '甘草', right_herb: '甘遂', effect: '十八反', description: '药性相反，同用产生剧烈毒性，损伤元气，属于十八反禁忌。', isOpen: false },
      { id: 3, type: 'good', left_herb: '黄芪', right_herb: '当归', effect: '气血双补', description: '当归补血活血，黄芪补气生血。气旺则血生，是补血汤的经典配伍。', isOpen: false },
      { id: 4, type: 'good', left_herb: '陈皮', right_herb: '半夏', effect: '燥湿化痰', description: '陈皮理气，半夏化痰。二药相须为用，大大增强化痰功效。', isOpen: false },
      { id: 5, type: 'good', left_herb: '人参', right_herb: '莱菔子', effect: '补气消食', description: '虽有人参恶莱菔子之说，但临床上二者同用可防补气太过导致的腹胀。', isOpen: false }
    ]
  } finally {
    setTimeout(() => { loading.value = false }, 800)
  }
}

// --- 2. 交互逻辑 ---
const toggleFlip = (item) => {
  item.isOpen = !item.isOpen
}

const navToHerb = (e, name) => {
  e.stopPropagation() 
  router.push(`/herb/${name}`)
}

onMounted(() => {
  fetchRandomPairings()
})
</script>

<template>
  <div class="herbal-match-section" :style="{ backgroundImage: `url(${bgImage})` }">
    
    <div class="bg-overlay"></div>

    <div class="content-layer">
      
      <div class="match-header">
        <div class="title-area">
          <h2 class="main-title">百子柜 · 药对配伍</h2>
          <p class="sub-title">Herbal Pairing Dictionary</p>
        </div>

        <div class="refresh-control" @click="fetchRandomPairings">
          <div class="compass-box" :class="{ 'is-loading': loading }">
            <Compass :size="28" />
          </div>
          <div class="label-group">
            <span class="action-text">换一批</span>
          </div>
        </div>
      </div>

      <div class="cabinet-container">
        <div class="cabinet-inner">
          
          <div 
            v-for="item in pairs" 
            :key="item.id" 
            class="grid-cell"
            @click="toggleFlip(item)"
          >
            <div class="flip-inner" :class="{ 'is-flipped': item.isOpen }">
              
              <div class="card-face card-front" :class="item.type">
                <div class="brass-ring"></div>
                
                <div class="herb-names">
                  <span class="herb-text">{{ item.left_herb }}</span>
                  <div class="icon-wrap" :class="item.type">
                    <Link v-if="item.type === 'good'" size="10" />
                    <AlertTriangle v-else size="10" />
                  </div>
                  <span class="herb-text">{{ item.right_herb }}</span>
                </div>

                <div class="drawer-label">{{ item.effect }}</div>
                <div class="click-hint">点击翻转</div>
              </div>

              <div class="card-face card-back" :class="item.type">
                <div class="back-header">
                  <span class="back-tag" :class="item.type">
                    {{ item.type === 'good' ? '宜' : '忌' }}
                  </span>
                  <span class="back-effect">{{ item.effect }}</span>
                </div>

                <div class="back-content">
                  <p class="back-desc">{{ item.description }}</p>
                </div>

                <div class="back-footer">
                  <span class="link-pill" @click="(e) => navToHerb(e, item.left_herb)">
                    {{ item.left_herb }} 
                  </span>
                  <span class="link-pill" @click="(e) => navToHerb(e, item.right_herb)">
                    {{ item.right_herb }} 
                  </span>
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>
    </div>

  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400;700&display=swap');

.herbal-match-section {
  position: relative;
  width: 100%;
  min-height: 100vh;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  /* filter: brightness(0.9); 这个滤镜可以去掉了，我们用遮罩层来实现 */
  font-family: 'Noto Serif SC', serif;
  box-sizing: border-box;
}

/* 【修复点 2】恢复并修正遮罩层样式 */
.bg-overlay {
  position: absolute;
  top: 0; left: 0; width: 100%; height: 100%;
  /* 使用黑色半透明背景，0.4 表示 40% 的不透明度，数字越大越暗 */
  background-color: rgba(0, 0, 0, 0.4); 
  z-index: 0;
  /* pointer-events: none; 确保点击事件能穿透遮罩层，不过在这里 z-index 已经处理了 */
}

.content-layer {
  position: relative;
  z-index: 1;
  width: 100%;
  height: 100%;
  padding: 100px 20px 30px; 
}

/* --- 下面是之前调整过的紧凑版样式 (保持不变) --- */

.match-header {
  display: flex; justify-content: space-between; align-items: flex-end;
  max-width: 1000px; margin: 0 auto 20px;
  border-bottom: 2px solid #D7CCC8; padding-bottom: 10px;
}
.main-title { font-size: 1.8rem; color: #3E2723; margin: 0; letter-spacing: 2px; }
.sub-title { font-size: 0.8rem; color: #8D6E63; text-transform: uppercase; letter-spacing: 1px; }

.refresh-control { display: flex; align-items: center; gap: 8px; cursor: pointer; }
.compass-box { color: #5D4037; transition: transform 0.3s; }
.compass-box.is-loading { animation: spin 0.8s linear infinite; }
@keyframes spin { 100% { transform: rotate(360deg); } }
.action-text { font-weight: bold; color: #3E2723; font-size: 0.9rem; }

.cabinet-container {
  max-width: 1000px; margin: 0 auto;
  background: #5D4037;
  padding: 15px;
  border-radius: 6px;
  box-shadow: inset 0 0 20px rgba(0,0,0,0.5), 0 15px 30px rgba(0,0,0,0.2);
  border: 3px solid #4E342E;
}

.cabinet-inner {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
  gap: 10px;
}

.grid-cell {
  background-color: transparent;
  height: 170px; 
  perspective: 800px; 
  cursor: pointer;
}

.flip-inner {
  position: relative; width: 100%; height: 100%; text-align: center;
  transition: transform 0.5s cubic-bezier(0.4, 0.2, 0.2, 1);
  transform-style: preserve-3d;
}
.flip-inner.is-flipped { transform: rotateY(180deg); }

.card-face {
  position: absolute; width: 100%; height: 100%;
  -webkit-backface-visibility: hidden; backface-visibility: hidden;
  border-radius: 4px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  overflow: hidden;
}

.card-front {
  background: #FDFBF7;
  border: 1px solid #D7CCC8;
  border-bottom: 3px solid #A1887F;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  color: #3E2723;
  z-index: 2;
}
.grid-cell:hover .card-front { background: #fff; box-shadow: 0 4px 8px rgba(0,0,0,0.15); }
.card-front.bad { background: #FFF5F5; border-color: #EF9A9A; border-bottom-color: #E57373; }

.brass-ring { width: 24px; height: 4px; background: #8D6E63; border-radius: 2px; margin-bottom: 15px; opacity: 0.6; }
.herb-names { display: flex; align-items: center; gap: 6px; margin-bottom: 12px; }
.herb-text { font-size: 1.05rem; font-weight: bold; color: #3E2723; }
.icon-wrap { width: 18px; height: 18px; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
.icon-wrap.good { background: #E8F5E9; color: #2E7D32; }
.icon-wrap.bad { background: #FFEBEE; color: #C62828; }
.drawer-label { font-size: 0.8rem; background: #EFEBE9; color: #5D4037; padding: 2px 8px; border-radius: 3px; font-weight: bold; }
.click-hint { font-size: 0.6rem; color: #BCAAA4; margin-top: 10px; opacity: 0; transition: opacity 0.2s; }
.grid-cell:hover .click-hint { opacity: 0.8; }

.card-back {
  background: #fff;
  transform: rotateY(180deg);
  border: 1px solid #EFEBE9;
  display: flex; flex-direction: column;
  padding: 10px;
  text-align: left;
}
.card-back.good { border-top: 3px solid #66BB6A; }
.card-back.bad { border-top: 3px solid #EF5350; }

.back-header {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 6px; border-bottom: 1px dashed #EEE; padding-bottom: 4px;
}
.back-tag { font-size: 0.65rem; font-weight: bold; color: #fff; padding: 2px 6px; border-radius: 4px; }
.back-tag.good { background: #66BB6A; }
.back-tag.bad { background: #EF5350; }
.back-effect { font-size: 0.9rem; font-weight: bold; color: #5D4037; }

.back-content { flex: 1; overflow: hidden; display: flex; }
.back-desc {
  font-size: 0.8rem; color: #4E342E; line-height: 1.4; margin: 0;
  overflow-y: auto; scrollbar-width: none;
}
.back-desc::-webkit-scrollbar { display: none; }

.back-footer {
  margin-top: 6px; padding-top: 4px; border-top: 1px solid #F5F5F5;
  display: flex; gap: 5px;
}
.link-pill {
  font-size: 0.65rem; background: #F5F5F5; color: #795548;
  padding: 2px 6px; border-radius: 3px; cursor: pointer;
  display: flex; align-items: center; gap: 2px;
  transition: all 0.2s;
}
.link-pill:hover { background: #5D4037; color: white; }
</style>
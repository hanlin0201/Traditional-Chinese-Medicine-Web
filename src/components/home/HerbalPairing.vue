<script setup>
import { ref } from 'vue'
import { Link, AlertOctagon } from 'lucide-vue-next'

// 这里的数据后续也可以放入 Supabase，目前先写死演示效果
const pairs = [
  { 
    id: 1, 
    type: 'good', 
    left: '枸杞', 
    right: '菊花', 
    effect: '清肝明目', 
    desc: '枸杞滋补肝肾，菊花清热解毒，二者搭配，补而不腻。' 
  },
  { 
    id: 2, 
    type: 'good', 
    left: '生姜', 
    right: '红枣', 
    effect: '温中散寒', 
    desc: '生姜发散风寒，红枣补中益气，冬日暖身神仙水。' 
  },
  { 
    id: 3, 
    type: 'bad', 
    left: '甘草', 
    right: '甘遂', 
    effect: '十八反', 
    desc: '药性相反，同用会产生剧烈毒副作用，切勿混用！' 
  }
]

const activeCard = ref(null)
</script>

<template>
  <div class="pairing-section">
    <div class="section-header">
      <h3 class="title">药食同源 · 趣味配伍</h3>
      <span class="subtitle">黄金搭档与禁忌组合</span>
    </div>

    <div class="cards-container">
      <div 
        v-for="item in pairs" 
        :key="item.id" 
        class="flip-card"
        @mouseenter="activeCard = item.id"
        @mouseleave="activeCard = null"
      >
        <div class="flip-inner" :class="{ 'is-flipped': activeCard === item.id }">
          
          <div class="card-front" :class="item.type">
            <div class="herb-name">{{ item.left }}</div>
            <div class="center-icon">
              <Link v-if="item.type === 'good'" class="w-5 h-5" />
              <AlertOctagon v-else class="w-5 h-5" />
            </div>
            <div class="herb-name">{{ item.right }}</div>
            <div class="effect-tag">{{ item.effect }}</div>
          </div>

          <div class="card-back" :class="item.type">
            <p class="desc">{{ item.desc }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.pairing-section {
  width: 100%; max-width: 1000px; margin: 40px auto; padding: 0 20px;
}
.section-header { text-align: center; margin-bottom: 25px; }
.title { font-size: 1.8rem; color: #5D4037; font-weight: bold; margin-bottom: 5px; font-family: 'Noto Serif SC', serif; }
.subtitle { font-size: 0.9rem; color: #8B5E3C; letter-spacing: 2px; opacity: 0.8; }

.cards-container {
  display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px;
}

/* 翻转卡片核心样式 */
.flip-card {
  background-color: transparent; height: 140px; perspective: 1000px; cursor: pointer;
}
.flip-inner {
  position: relative; width: 100%; height: 100%; text-align: center;
  transition: transform 0.6s; transform-style: preserve-3d;
}
.flip-inner.is-flipped { transform: rotateY(180deg); }

.card-front, .card-back {
  position: absolute; width: 100%; height: 100%;
  backface-visibility: hidden; border-radius: 16px;
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 4px 15px rgba(139, 94, 60, 0.1);
}

/* 正面样式 */
.card-front {
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(139, 94, 60, 0.2);
  gap: 15px; position: relative;
}
.card-front.good { border-bottom: 3px solid #81C784; }
.card-front.bad { border-bottom: 3px solid #E57373; }

.herb-name { font-size: 1.3rem; font-weight: bold; color: #5D4037; font-family: serif; }
.center-icon { 
  width: 32px; height: 32px; border-radius: 50%; background: #F8F3ED; 
  display: flex; align-items: center; justify-content: center; color: #8B5E3C;
}
.effect-tag {
  position: absolute; top: 10px; right: 10px;
  font-size: 0.7rem; padding: 2px 8px; border-radius: 10px;
  background: #F8F3ED; color: #8B5E3C;
}

/* 背面样式 */
.card-back {
  transform: rotateY(180deg); padding: 20px;
}
.card-back.good { background: linear-gradient(135deg, #A5D6A7, #81C784); color: white; }
.card-back.bad { background: linear-gradient(135deg, #EF9A9A, #E57373); color: white; }
.desc { font-size: 0.95rem; line-height: 1.5; font-weight: 500; text-align: left; }
</style>
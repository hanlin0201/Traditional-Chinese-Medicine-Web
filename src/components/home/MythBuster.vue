<script setup>
import { ref } from 'vue'
import { HelpCircle, CheckCircle2, XCircle } from 'lucide-vue-next'

const myths = [
  {
    id: 1,
    question: "感冒了就要立刻喝姜汤捂汗？",
    answer: "错！",
    detail: "姜汤只适用于【风寒感冒】（怕冷、流清涕）。若是【风热感冒】（喉咙痛、流黄涕），喝姜汤如同火上浇油。",
    isCorrect: false
  },
  {
    id: 2,
    question: "晚上吃姜，真的等于吃砒霜？",
    answer: "片面。",
    detail: "中医认为夜间主收敛，姜主发散，晚上吃姜会影响睡眠，伤阴，但绝无砒霜之毒。依然是‘过犹不及’。",
    isCorrect: false
  },
  {
    id: 3,
    question: "只有肾虚的人才需要吃黑芝麻？",
    answer: "非也。",
    detail: "黑芝麻补肝肾、润五脏。除了补肾，还能润肠通便、乌发美容，普通人日常食疗也非常合适。",
    isCorrect: false // 这里其实是破除谣言，所以原话是错的
  }
]

const expandedId = ref(null)
function toggle(id) {
  expandedId.value = expandedId.value === id ? null : id
}
</script>

<template>
  <div class="myth-section">
    <div class="section-header">
      <h3 class="title">养生避雷针</h3>
      <span class="subtitle">粉碎谣言 · 正本清源</span>
    </div>

    <div class="myth-list">
      <div 
        v-for="item in myths" 
        :key="item.id" 
        class="myth-item"
        :class="{ 'is-expanded': expandedId === item.id }"
        @click="toggle(item.id)"
      >
        <div class="myth-question">
          <HelpCircle class="icon-q" />
          <span>{{ item.question }}</span>
          <span class="indicator">{{ expandedId === item.id ? '收起' : '揭秘' }}</span>
        </div>

        <div v-show="expandedId === item.id" class="myth-answer animate-slide-down">
          <div class="answer-badge">
            <XCircle class="w-5 h-5 text-red-500" />
            <span class="font-bold text-red-600">{{ item.answer }}</span>
          </div>
          <p class="detail">{{ item.detail }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.myth-section {
  width: 100%; max-width: 1000px; margin: 20px auto 60px; padding: 0 20px;
}
.section-header { text-align: center; margin-bottom: 25px; }
.title { font-size: 1.8rem; color: #5D4037; font-weight: bold; margin-bottom: 5px; font-family: 'Noto Serif SC', serif; }
.subtitle { font-size: 0.9rem; color: #C44D36; letter-spacing: 2px; opacity: 0.8; }

.myth-list { display: flex; flex-direction: column; gap: 15px; }

.myth-item {
  background: white; border-radius: 12px; overflow: hidden;
  box-shadow: 0 4px 10px rgba(0,0,0,0.03); border: 1px solid rgba(0,0,0,0.05);
  transition: all 0.3s ease; cursor: pointer;
}
.myth-item:hover { transform: translateX(5px); border-color: #C44D36; }

.myth-question {
  padding: 18px 20px; display: flex; align-items: center; gap: 12px;
  font-size: 1.05rem; color: #2c2c2c; font-weight: 500;
}
.icon-q { color: #8B5E3C; width: 20px; height: 20px; }
.indicator { margin-left: auto; font-size: 0.8rem; color: #999; border: 1px solid #eee; padding: 2px 8px; border-radius: 10px; }

.myth-answer {
  background: #FFF8F6; padding: 15px 20px 20px 52px; /* 左padding对齐文字 */
  border-top: 1px dashed rgba(196, 77, 54, 0.1);
}
.answer-badge { display: flex; align-items: center; gap: 6px; margin-bottom: 8px; }
.detail { font-size: 0.95rem; color: #5D4037; line-height: 1.6; }

/* 动画 */
.animate-slide-down { animation: slideDown 0.3s ease-out; }
@keyframes slideDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
</style>
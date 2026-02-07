<script setup>
import { useRouter } from 'vue-router'
import TcmHistorySection from '@/components/TcmHistorySection.vue'

// 使用 Vue Router 进行页面跳转
const router = useRouter()

// 点击中央大面板的交互逻辑
function handleMainPanelClick() {
  console.log('正在连接3D人体交互模型模块...')
  // 如果未来你想让点击整个面板直接跳转到穴位或某个页面，可以在这里写：
  // router.push('/acupoints')
}

// 专门处理“进入药材”按钮点击
function goToHerbs() {
  router.push('/herbs')
}

// 专门处理“进入食谱”按钮点击 (新增功能)
function goToRecipes() {
  router.push('/recipes')
}

// 滚动到中医历史模块
function goToHistory() {
  document.getElementById('tcm-history')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
</script>

<template>
  <div class="menu-index min-h-screen bg-menu">

    <main class="menu-container">
      <section class="menu-portal-hero">
        <div class="menu-hero-content">
          <h1 class="menu-main-title">中医药百科</h1>
          <p class="menu-sub-title">传承中医文化，守护个人健康</p>

          <div class="menu-main-panel" @click="handleMainPanelClick">
            <div class="menu-interactive-area">
              <div class="menu-placeholder-text">
                <span class="menu-pulse-icon">📍</span>
                <p class="mb-6">[ 3D 交互 / 核心功能区 ]</p>

                <div class="flex gap-4 justify-center">

                  <button
                    @click.stop="goToHerbs"
                    class="menu-enter-btn"
                  >
                    📖 药材百科
                  </button>

                  <button
                    @click.stop="goToRecipes"
                    class="menu-enter-btn menu-recipe-btn"
                  >
                    🍲 食疗方案
                  </button>

                  <button
                    @click.stop="goToHistory"
                    class="menu-enter-btn menu-history-btn"
                  >
                    📜 中医历史
                  </button>

                </div>

              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- 中医药历史模块：全屏，滚动至此撑满视口 -->
      <TcmHistorySection />
    </main>
  </div>
</template>

<style scoped>
/* 定义变量：保持你原有的配色 */
.menu-index {
  --menu-bg: #F8F3ED;
  --menu-primary: #8B5E3C;
  --menu-accent: #A67C52;
  --menu-recipe: #4d7c5b;
  --menu-history: #6b5b4f; /* 中医历史按钮 */
  --menu-text: #5D4037;
}

.bg-menu {
  background-color: var(--menu-bg);
  color: var(--menu-text);
}

/* 容器样式 */
.menu-container {
  max-width: 100%;
}

.menu-portal-hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 5%;
  min-height: 100vh; /* 上方模块全屏 */
  box-sizing: border-box;
}

.menu-hero-content {
  width: 100%;
  max-width: 900px;
}

.menu-main-title {
  font-size: 2.8rem;
  margin-bottom: 10px;
  letter-spacing: 4px;
  color: var(--menu-primary);
  text-align: center;
}

.menu-sub-title {
  font-size: 1.2rem;
  margin-bottom: 40px;
  opacity: 0.8;
  text-align: center;
}

/* 中央面板样式 (保持不变) */
.menu-main-panel {
  width: 100%;
  max-width: 900px;
  height: 450px;
  margin: 0 auto;
  background: linear-gradient(145deg, #eee4d8, #d7c9b8);
  border-radius: 40px;
  box-shadow: 20px 20px 60px #e0dbd4, -20px -20px 60px #ffffff;
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
  cursor: pointer;
  transition: transform 0.4s ease;
}

.menu-main-panel:hover {
  transform: scale(1.02);
}

.menu-interactive-area {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
}

.menu-placeholder-text {
  text-align: center;
}

.menu-pulse-icon {
  font-size: 3rem;
  display: block;
  margin-bottom: 15px;
  animation: menu-pulse 2s infinite;
}

@keyframes menu-pulse {
  0% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.2); opacity: 0.7; }
  100% { transform: scale(1); opacity: 1; }
}

/* 按钮通用样式 */
.menu-enter-btn {
  display: inline-flex; /* 让按钮可以并排 */
  align-items: center;
  justify-content: center;
  padding: 12px 30px;
  background-color: var(--menu-primary);
  color: white;
  text-decoration: none;
  border-radius: 20px;
  cursor: pointer;
  font-size: 1rem;
  border: none; /* 移除默认边框 */
  transition: all 0.3s;
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
}

.menu-enter-btn:hover {
  background-color: var(--menu-accent);
  transform: translateY(-2px);
}

/* 新增：食谱按钮的特殊样式（绿色系） */
.menu-recipe-btn {
  background-color: var(--menu-recipe);
}
.menu-recipe-btn:hover {
  background-color: #3a6345;
}

.menu-history-btn {
  background-color: var(--menu-history);
}
.menu-history-btn:hover {
  background-color: #5a4a3f;
  transform: translateY(-2px);
}

/* 这里的 navbar 样式已经被删除，因为移到了 App.vue */
</style>

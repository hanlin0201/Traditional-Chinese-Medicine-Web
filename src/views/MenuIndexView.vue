<script setup>
import { useRoute } from 'vue-router'

const route = useRoute()

function handleMainPanelClick() {
  // 中央面板点击反馈（可后续接入 3D 模块）
  console.log('正在连接3D人体交互模型模块...')
}
</script>

<template>
  <div class="menu-index min-h-screen bg-menu">
    <nav class="menu-navbar">
      <div class="menu-logo">🌿 药材百科</div>
      <ul class="menu-nav-links">
        <li>
          <RouterLink to="/" :class="['menu-nav-link', { active: route.path === '/' }]">
            历史记录
          </RouterLink>
        </li>
        <li>
          <a href="/herbs" target="_blank" rel="noopener noreferrer" class="menu-nav-link">
            药材介绍
          </a>
        </li>
        <li><a href="#" class="menu-nav-link">食谱推荐</a></li>
        <li><a href="#" class="menu-nav-link">穴位网站</a></li>
      </ul>
      <div class="menu-user-profile">个人档案 / 登录</div>
    </nav>

    <main class="menu-container">
      <section class="menu-portal-hero">
        <div class="menu-hero-content">
          <h1 class="menu-main-title">中医药百科</h1>
          <p class="menu-sub-title">传承中医文化，守护个人健康</p>

          <div class="menu-main-panel" @click="handleMainPanelClick">
            <div class="menu-interactive-area">
              <div class="menu-placeholder-text">
                <span class="menu-pulse-icon">📍</span>
                <p>[ 动画区域 ]</p>
                <a href="/herbs" target="_blank" rel="noopener noreferrer" class="menu-enter-btn" @click.stop>
                  进入药材介绍
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<style scoped>
.menu-index {
  --menu-bg: #F8F3ED;
  --menu-primary: #8B5E3C;
  --menu-accent: #A67C52;
  --menu-text: #5D4037;
}

.bg-menu {
  background-color: var(--menu-bg);
  color: var(--menu-text);
}

.menu-navbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem 8%;
  background: rgba(255, 255, 255, 0.5);
  backdrop-filter: blur(15px);
  position: sticky;
  top: 0;
  z-index: 100;
}

.menu-logo {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--menu-primary);
}

.menu-nav-links {
  list-style: none;
  display: flex;
  gap: 40px;
  margin: 0;
  padding: 0;
}

.menu-nav-link {
  text-decoration: none;
  color: var(--menu-text);
  font-weight: 500;
  font-size: 1.1rem;
  transition: 0.3s;
}

.menu-nav-link:hover,
.menu-nav-link.active {
  color: var(--menu-primary);
}

.menu-user-profile {
  font-size: 0.9rem;
  opacity: 0.85;
}

.menu-container {
  max-width: 100%;
}

.menu-portal-hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 60px 5%;
  min-height: 80vh;
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

.menu-enter-btn {
  display: inline-block;
  margin-top: 20px;
  padding: 10px 30px;
  background-color: var(--menu-primary);
  color: white;
  text-decoration: none;
  border-radius: 20px;
  cursor: pointer;
  font-size: 1rem;
  transition: background 0.3s;
}

.menu-enter-btn:hover {
  background-color: var(--menu-accent);
}
</style>

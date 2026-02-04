<script setup>
import { useRouter } from 'vue-router'
import { User } from 'lucide-vue-next'
import { useAuth } from '@/composables/useAuth'

const router = useRouter()
const { user } = useAuth()

function enterHerbs() {
  router.push('/herbs')
}

function goToProfile() {
  if (user.value) {
    router.push('/profile')
  } else {
    window.dispatchEvent(new CustomEvent('request-login'))
  }
}
</script>

<template>
  <div class="portal-page">
    <!-- 门户页面自带导航栏 -->
    <nav class="portal-navbar">
      <div class="logo">🌿 药材百科</div>
      <ul class="nav-links">
        <li><a class="active">首页</a></li>
        <li><a @click="enterHerbs">药材介绍</a></li>
        <li><a @click="goToProfile">食谱推荐</a></li>
        <li><a class="disabled">穴位网站 <span class="soon-tag">即将上线</span></a></li>
      </ul>
      <div class="user-profile" @click="goToProfile">
        <User class="user-icon" />
        <span>{{ user ? '个人中心' : '登录' }}</span>
      </div>
    </nav>
    <!-- 门户主区域 -->
    <section class="portal-hero">
      <div class="hero-content">
        <h1 class="main-title">中医药百科·数字养生</h1>
        <p class="sub-title">传承中医文化，守护个人健康</p>
        
        <div class="main-panel" @click="enterHerbs">
          <div class="interactive-area">
            <div class="placeholder-text">
              <span class="pulse-icon">🌿</span>
              <p class="panel-hint">点击进入药材百科</p>
              <button class="enter-btn">开始探索</button>
            </div>
          </div>
        </div>

        <!-- 快捷入口 -->
        <div class="quick-links">
          <router-link to="/herbs" class="link-item">
            <span class="link-icon">📚</span>
            <span>药材介绍</span>
          </router-link>
          <router-link to="/profile" class="link-item">
            <span class="link-icon">🍵</span>
            <span>食谱推荐</span>
          </router-link>
          <div class="link-item coming-soon">
            <span class="link-icon">📍</span>
            <span>穴位网站</span>
            <span class="badge">即将上线</span>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.portal-page {
  min-height: 100vh;
  background-color: #F8F3ED;
}

/* 门户导航栏 */
.portal-navbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.2rem 8%;
  background: rgba(255, 255, 255, 0.5);
  backdrop-filter: blur(15px);
  position: sticky;
  top: 0;
  z-index: 100;
}

.logo {
  font-size: 1.3rem;
  font-weight: bold;
  color: #8B5E3C;
}

.nav-links {
  list-style: none;
  display: flex;
  gap: 40px;
  margin: 0;
  padding: 0;
}

.nav-links a {
  text-decoration: none;
  color: #5D4037;
  font-weight: 500;
  font-size: 1rem;
  transition: 0.3s;
  cursor: pointer;
}

.nav-links a:hover,
.nav-links a.active {
  color: #8B5E3C;
}

.nav-links a.disabled {
  color: #aaa;
  cursor: not-allowed;
}

.soon-tag {
  font-size: 0.6rem;
  background: #E57373;
  color: white;
  padding: 2px 6px;
  border-radius: 8px;
  margin-left: 5px;
}

.user-profile {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #5D4037;
  cursor: pointer;
  padding: 8px 16px;
  border-radius: 20px;
  transition: all 0.3s;
  font-weight: 500;
}

.user-profile:hover {
  background: rgba(139, 94, 60, 0.1);
  color: #8B5E3C;
}

.user-icon {
  width: 20px;
  height: 20px;
}

/* 门户核心区域 */
.portal-hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 80px 5% 60px;
  min-height: calc(100vh - 80px);
}

.hero-content {
  text-align: center;
}

.main-title {
  font-size: 2.8rem;
  margin-bottom: 10px;
  letter-spacing: 4px;
  color: #8B5E3C;
  font-weight: bold;
}

.sub-title {
  font-size: 1.2rem;
  margin-bottom: 40px;
  opacity: 0.8;
  color: #5D4037;
}

/* 核心面板样式 */
.main-panel {
  width: 100%;
  max-width: 900px;
  height: 400px;
  background: linear-gradient(145deg, #eee4d8, #d7c9b8);
  border-radius: 40px;
  box-shadow: 20px 20px 60px #e0dbd4, -20px -20px 60px #ffffff;
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
  cursor: pointer;
  transition: transform 0.4s ease, box-shadow 0.4s ease;
  margin: 0 auto;
}

.main-panel:hover {
  transform: scale(1.02);
  box-shadow: 25px 25px 70px #d8d3cc, -25px -25px 70px #ffffff;
}

.interactive-area {
  text-align: center;
}

.placeholder-text {
  text-align: center;
}

.pulse-icon {
  font-size: 4rem;
  display: block;
  margin-bottom: 20px;
  animation: pulse 2s infinite;
}

.panel-hint {
  font-size: 1.1rem;
  color: #5D4037;
  margin-bottom: 20px;
  opacity: 0.8;
}

@keyframes pulse {
  0% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.15); opacity: 0.7; }
  100% { transform: scale(1); opacity: 1; }
}

.enter-btn {
  padding: 12px 40px;
  background-color: #8B5E3C;
  color: white;
  border: none;
  border-radius: 25px;
  cursor: pointer;
  font-size: 1rem;
  font-weight: 500;
  transition: all 0.3s ease;
}

.enter-btn:hover {
  background-color: #A67C52;
  transform: translateY(-2px);
}

/* 快捷入口 */
.quick-links {
  margin-top: 50px;
  display: flex;
  gap: 25px;
  justify-content: center;
  flex-wrap: wrap;
}

.link-item {
  background: white;
  padding: 20px 35px;
  border-radius: 20px;
  font-weight: 500;
  box-shadow: 0 4px 15px rgba(0,0,0,0.05);
  cursor: pointer;
  transition: all 0.3s ease;
  text-decoration: none;
  color: #5D4037;
  display: flex;
  align-items: center;
  gap: 10px;
  position: relative;
}

.link-item:hover {
  background: #8B5E3C;
  color: white;
  transform: translateY(-3px);
  box-shadow: 0 8px 25px rgba(139, 94, 60, 0.3);
}

.link-icon {
  font-size: 1.3rem;
}

.coming-soon {
  opacity: 0.7;
  cursor: default;
}

.coming-soon:hover {
  background: white;
  color: #5D4037;
  transform: none;
  box-shadow: 0 4px 15px rgba(0,0,0,0.05);
}

.badge {
  position: absolute;
  top: -8px;
  right: -8px;
  background: #E57373;
  color: white;
  font-size: 0.65rem;
  padding: 3px 8px;
  border-radius: 10px;
}

/* 响应式 */
@media (max-width: 768px) {
  .main-title {
    font-size: 2rem;
    letter-spacing: 2px;
  }
  
  .main-panel {
    height: 300px;
    border-radius: 30px;
  }
  
  .quick-links {
    flex-direction: column;
    align-items: center;
  }
  
  .link-item {
    width: 200px;
    justify-content: center;
  }
}
</style>

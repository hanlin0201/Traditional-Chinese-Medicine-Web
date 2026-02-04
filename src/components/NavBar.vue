<script setup>
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { User } from 'lucide-vue-next'
import { useAuth } from '@/composables/useAuth'

const router = useRouter()
const route = useRoute()
const { user, gatePassed } = useAuth()

const navItems = [
  { name: '首页', path: '/portal' },
  { name: '药材介绍', path: '/herbs' },
  { name: '食谱推荐', path: '/profile', requiresAuth: true },
  { name: '穴位网站', path: '/acupoints', disabled: true },
]

function isActive(path) {
  return route.path === path || (path === '/herbs' && route.path.startsWith('/herb/'))
}

function handleNavClick(item) {
  if (item.disabled) return
  if (item.requiresAuth && !user.value) {
    // 如果需要登录但未登录，触发登录
    window.dispatchEvent(new CustomEvent('request-login'))
    return
  }
  router.push(item.path)
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
  <nav class="navbar" v-if="gatePassed">
    <router-link to="/portal" class="logo">
      🌿 药材百科
    </router-link>
    
    <ul class="nav-links">
      <li v-for="item in navItems" :key="item.path">
        <a
          :class="{ 
            active: isActive(item.path), 
            disabled: item.disabled 
          }"
          @click="handleNavClick(item)"
        >
          {{ item.name }}
          <span v-if="item.disabled" class="soon-tag">即将上线</span>
        </a>
      </li>
    </ul>
    
    <div class="user-profile" @click="goToProfile">
      <User class="user-icon" />
      <span>{{ user ? '个人中心' : '登录' }}</span>
    </div>
  </nav>
</template>

<style scoped>
.navbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 5%;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(15px);
  position: sticky;
  top: 0;
  z-index: 1000;
  border-bottom: 1px solid rgba(139, 94, 60, 0.1);
}

.logo {
  font-size: 1.3rem;
  font-weight: bold;
  color: #8B5E3C;
  text-decoration: none;
  transition: opacity 0.3s;
}

.logo:hover {
  opacity: 0.8;
}

.nav-links {
  list-style: none;
  display: flex;
  gap: 35px;
  margin: 0;
  padding: 0;
}

.nav-links a {
  text-decoration: none;
  color: #5D4037;
  font-weight: 500;
  font-size: 1rem;
  transition: color 0.3s;
  cursor: pointer;
  position: relative;
  padding: 5px 0;
}

.nav-links a:hover,
.nav-links a.active {
  color: #8B5E3C;
}

.nav-links a.active::after {
  content: '';
  position: absolute;
  bottom: -2px;
  left: 0;
  right: 0;
  height: 2px;
  background: #8B5E3C;
  border-radius: 1px;
}

.nav-links a.disabled {
  color: #aaa;
  cursor: not-allowed;
}

.nav-links a.disabled:hover {
  color: #aaa;
}

.soon-tag {
  font-size: 0.6rem;
  background: #E57373;
  color: white;
  padding: 2px 6px;
  border-radius: 8px;
  margin-left: 5px;
  vertical-align: middle;
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

/* 响应式 */
@media (max-width: 768px) {
  .navbar {
    padding: 1rem 3%;
  }
  
  .nav-links {
    gap: 15px;
  }
  
  .nav-links a {
    font-size: 0.9rem;
  }
  
  .user-profile span {
    display: none;
  }
}
</style>

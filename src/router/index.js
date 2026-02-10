import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'MenuIndex',
    component: () => import('@/views/MenuIndexView.vue'),
    meta: { title: '中医药百科' },
  },
  {
    path: '/herbs',
    name: 'HerbIntro',
    component: () => import('@/views/HomeView.vue'),
    meta: { title: '药材介绍' },
  },
  {
    path: '/herb/:name',
    name: 'HerbDetail',
    component: () => import('@/views/HerbDetailView.vue'),
    meta: { title: '药材详情' },
  },
  {
    path: '/acupoints',
    name: 'Acupoints',
    component: () => import('@/views/AcupointView.vue'),
    meta: { title: '经络穴位导航' },
  },
  {
    path: '/dynasty/:id',
    name: 'DynastyDetail',
    component: () => import('@/views/DynastyDetailView.vue'),
    meta: { title: '朝代详情' },
  },
  {
    path: '/profile',
    name: 'Profile',
    component: () => import('@/views/ProfileView.vue'),
    meta: { title: '个人中心', requiresAuth: true },
  },
  {
    path: '/recipes', 
    name: 'RecipeMarket',
    component: () => import('@/views/RecipeMarket.vue') // 使用 @ 符号更稳妥
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.afterEach((to) => {
  const t = to.meta?.title
  if (t) document.title = `${t} · 中药材百科`
})

export default router

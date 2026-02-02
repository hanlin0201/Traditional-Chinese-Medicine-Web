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
    path: '/herb/:id',
    name: 'HerbDetail',
    component: () => import('@/views/HerbDetailView.vue'),
    meta: { title: '药材详情' },
  },
  {
    path: '/profile',
    name: 'Profile',
    component: () => import('@/views/ProfileView.vue'),
    meta: { title: '个人中心', requiresAuth: true },
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

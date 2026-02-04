import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    redirect: '/portal',
  },
  {
    path: '/portal',
    name: 'Portal',
    component: () => import('@/views/PortalView.vue'),
    meta: { title: '首页' },
  },
  {
    path: '/herbs',
    name: 'Herbs',
    component: () => import('@/views/HomeView.vue'),
    meta: { title: '药材百科' },
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
  {
    path: '/acupoints',
    name: 'Acupoints',
    component: () => import('@/views/PortalView.vue'), // 暂时使用门户页面占位
    meta: { title: '穴位网站' },
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

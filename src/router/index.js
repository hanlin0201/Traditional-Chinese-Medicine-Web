import { createRouter, createWebHistory } from 'vue-router'
import { SITE_SHORT_NAME, SITE_TITLE_SUFFIX } from '@/constants/branding'

const routes = [
  {
    path: '/',
    name: 'MenuIndex',
    component: () => import('@/views/MenuIndexView.vue'),
    meta: { title: SITE_SHORT_NAME },
  },
  {
    path: '/herbs',
    name: 'HerbIntro',
    component: () => import('@/views/HomeView.vue'),
    meta: { title: '药材百科' },
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
    meta: { title: '穴位导航' },
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
    path: '/profile/work/:id',
    name: 'WorkDetail',
    component: () => import('@/views/WorkDetailView.vue'),
    meta: { title: '作业详情', requiresAuth: true },
  },
  {
    path: '/profile/edit',
    name: 'ProfileEdit',
    component: () => import('@/views/ProfileEditView.vue'),
    meta: { title: '编辑资料', requiresAuth: true },
  },
  {
    path: '/recipes', 
    name: 'RecipeMarket',
    component: () => import('@/views/RecipeMarket.vue'),
    meta: { title: '食谱推荐' },
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.afterEach((to) => {
  const t = to.meta?.title
  if (t) document.title = `${t} · ${SITE_TITLE_SUFFIX}`
})

export default router

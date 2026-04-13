import { createApp } from 'vue'
import App from './App.vue'
import router from '@/router'
import './styles/index.css'
// 入场动画（泡泡汇聚）已按产品需求关闭。恢复时取消下一行与下方注释块、introAnimation 相关 import 的注释
// import './styles/intro-animation.css'
import { initAuth } from '@/composables/useAuth'
import { kickoffWarmProfile } from '@/composables/usePagePreload'
import { removeIntroOverlay } from '@/introAnimation'

;(async () => {
  removeIntroOverlay()

  await initAuth()
  // 登录用户：立即在后台预热个人中心缓存，不阻塞渲染；无用户时 warmProfile 内部直接 return
  kickoffWarmProfile()

  const app = createApp(App).use(router)
  app.mount('#app')

  // 原逻辑：首次访问播放 introAnimation.js，否则仅移除静态 #intro-overlay
  // if (shouldRunIntro()) {
  //   await runIntroAnimation()
  //   app.mount('#app')
  // } else {
  //   app.mount('#app')
  //   removeIntroOverlay()
  // }
})()

import { createApp } from 'vue'
import App from './App.vue'
import router from '@/router'
import './styles/index.css'
import './styles/intro-animation.css'
import { initAuth } from '@/composables/useAuth'
import { shouldRunIntro, runIntroAnimation, removeIntroOverlay } from '@/introAnimation'

;(async () => {
  await initAuth()

  const app = createApp(App).use(router)

  // 入场动画：首次访问播放泡泡汇聚 + 白屏；非首次直接显示首页
  if (shouldRunIntro()) {
    await runIntroAnimation()
    app.mount('#app')
  } else {
    app.mount('#app')
    removeIntroOverlay()
  }
})()

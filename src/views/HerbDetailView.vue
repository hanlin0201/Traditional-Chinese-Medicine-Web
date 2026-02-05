<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft } from 'lucide-vue-next'
// 3D 核心组件与控制器
import { TresCanvas } from '@tresjs/core'
import { OrbitControls } from '@tresjs/cientos'
// 引入你的 3D 模型子组件
import Herb3DScene from '@/components/Herb3DScene.vue'
// 引入 Supabase 客户端
import { supabase } from '@/supabaseClient' 

const route = useRoute()
const router = useRouter()

// 定义状态
const herb = ref(null)
const loading = ref(true)
const error = ref(null)

/**
 * 核心功能 1：文本美化
 * 将枯燥的文本段落转化为带高亮序号的列表
 */
function formatNumberedText(text) {
  if (!text) return '暂无'
  
  // HTML 转义防 XSS
  let formatted = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  
  // 1. 圆圈数字换行 (①②...)
  formatted = formatted.replace(/([①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳])/g, '<br/><span class="text-cinnabar font-medium">$1</span>')
  
  // 2. 括号数字换行 (⑴⑵...)
  formatted = formatted.replace(/([⑴⑵⑶⑷⑸⑹⑺⑻⑼⑽])/g, '<br/><span class="text-cinnabar font-medium">$1</span>')
  
  // 3. 书名号引用换行 (《本草纲目》：)
  formatted = formatted.replace(/(《[^》]+》[：:]\s*)/g, '<br/><span class="text-bamboo">$1</span>')
  
  // 移除首行多余的换行
  formatted = formatted.replace(/^(<br\/>)+/, '')
  
  return formatted
}

/**
 * 核心功能 2：高性能数据获取
 * 包含：预加载(秒开) + 静默更新 + 错误处理
 */
const fetchHerbByName = async () => {
  const herbName = route.params.name
  if (!herbName) return

  // A. 【秒开逻辑】检查路由是否携带了预加载数据
  const preloadData = history.state.preloadHerb

  if (preloadData && preloadData.name === herbName) {
    // 命中缓存：直接渲染，无需等待
    herb.value = preloadData
    loading.value = false 
    
    // B. 【静默更新】后台悄悄核对最新数据
    try {
      const { data } = await supabase
        .from('herbs')
        .select('*')
        .eq('name', herbName)
        .single()
      
      if (data) {
        herb.value = data // 更新为最新全量数据
      }
    } catch (e) {
      console.warn('后台更新数据失败，但不影响展示', e)
    }
    return 
  }

  // C. 【常规逻辑】无预加载数据时，显示 Loading 并请求
  try {
    loading.value = true
    error.value = null

    const { data, error: err } = await supabase
      .from('herbs')
      .select('*')
      .eq('name', herbName)
      .single()

    if (err) throw err
    herb.value = data
  } catch (err) {
    console.error('查询药材失败:', err)
    error.value = err
  } finally {
    loading.value = false
  }
}

// 首次挂载
onMounted(() => {
  fetchHerbByName()
})

// 监听路由变化 (解决同页面切换药材不刷新的问题)
watch(() => route.params.name, (newName) => {
  if (newName) fetchHerbByName()
})

function goBack() {
  if (window.history.length > 1) {
    router.back()
  } else {
    router.push('/herbs') // 默认回列表页
  }
}
</script>

<template>
  <div class="min-h-screen pb-24 flex flex-col bg-[#FDFBF7]">
    <header class="sticky top-0 z-10 glass-search wood-overlay px-4 py-2 flex items-center gap-3 border-b border-sandalwood/10">
      <button
        type="button"
        class="p-1.5 rounded-lg text-sandalwood hover:bg-sandalwood/10 transition-colors"
        aria-label="返回"
        @click="goBack"
      >
        <ArrowLeft class="w-5 h-5" />
      </button>
      <h1 class="font-serif font-semibold text-sandalwood truncate text-lg">
        {{ herb?.name || '药材详情' }}
      </h1>
    </header>

    <template v-if="loading">
      <div class="flex-1 flex flex-col items-center justify-center text-sandalwood/60 gap-3 min-h-[50vh]">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-sandalwood"></div>
        <span class="text-sm font-serif">正在翻阅本草纲目...</span>
      </div>
    </template>

    <template v-else-if="error || !herb">
      <div class="flex-1 flex flex-col items-center justify-center text-cinnabar gap-2 min-h-[50vh]">
        <span class="text-3xl">🍂</span>
        <span class="font-serif">未找到【{{ route.params.name }}】的记录</span>
        <button @click="goBack" class="text-sm underline text-sandalwood mt-2">返回上一页</button>
      </div>
    </template>

    <template v-else>
      <div class="w-full h-[42vh] min-h-[300px] bg-paper/90 border-b border-sandalwood/10 relative">
        <TresCanvas clear-color="#FDFBF7" alpha>
          <TresPerspectiveCamera :position="[3, 3, 3]" :look-at="[0, 0, 0]" />
          <OrbitControls :enable-zoom="false" :auto-rotate="false" /> 
          <Herb3DScene />
          <TresAmbientLight :intensity="1.5" />
          <TresDirectionalLight :position="[5, 5, 5]" :intensity="1" />
        </TresCanvas>
        
        <div class="absolute bottom-2 right-4 text-xs text-sandalwood/40 font-serif pointer-events-none">
          ⟲ 拖动旋转查看
        </div>
      </div>

      <main class="flex-1 px-4 py-6 max-w-2xl mx-auto w-full space-y-5 animate-fade-in-up">
        
        <div class="rounded-xl bg-paper-card shadow-paper p-5 border border-sandalwood/10">
          <h2 class="text-cinnabar font-serif font-semibold text-base mb-3 flex items-center gap-2">
            <span class="w-1 h-4 bg-cinnabar rounded" /> 基本信息
          </h2>
          <div class="space-y-2 text-sm">
            <div class="flex" v-if="herb.classification">
              <span class="text-sandalwood/60 w-20 shrink-0">药材类别</span>
              <span class="text-sandalwood/90">{{ herb.classification }}</span>
            </div>
            <div class="flex" v-if="herb.alias">
              <span class="text-sandalwood/60 w-20 shrink-0">别名</span>
              <span class="text-sandalwood/90">{{ herb.alias }}</span>
            </div>
          </div>
        </div>

        <div class="rounded-xl bg-paper-card shadow-paper p-5 border border-sandalwood/10">
          <h2 class="text-cinnabar font-serif font-semibold text-base mb-2 flex items-center gap-2">
            <span class="w-1 h-4 bg-cinnabar rounded" /> 性味归经
          </h2>
          <p class="text-sandalwood/90 text-sm leading-relaxed text-justify">
            {{ herb.nature }}；{{ herb.channel }}
            {{ herb.taste ? '；' + herb.taste : '' }}
          </p>
        </div>

        <div class="rounded-xl bg-paper-card shadow-paper p-5 border border-sandalwood/10">
          <h2 class="text-cinnabar font-serif font-semibold text-base mb-2 flex items-center gap-2">
            <span class="w-1 h-4 bg-cinnabar rounded" /> 功效与作用
          </h2>
          <p v-if="herb.efficacy" class="text-sandalwood/90 text-sm leading-relaxed text-justify mb-2 font-medium">
            {{ herb.efficacy }}
          </p>
          <div 
            v-if="herb.effect"
            class="text-sandalwood/90 text-sm leading-relaxed text-justify formatted-content"
            v-html="formatNumberedText(herb.effect)"
          ></div>
        </div>

        <div class="rounded-xl bg-paper-card shadow-paper p-5 border border-sandalwood/10">
          <h2 class="text-bamboo font-serif font-semibold text-base mb-2 flex items-center gap-2">
            <span class="w-1 h-4 bg-bamboo rounded" /> 用法用量
          </h2>
          <div 
            class="text-sandalwood/90 text-sm leading-relaxed text-justify formatted-content"
            v-html="formatNumberedText(herb.usage)"
          ></div>
        </div>

        <div class="rounded-xl bg-paper-card shadow-paper p-5 border border-sandalwood/10">
          <h2 class="text-cinnabar font-serif font-semibold text-base mb-2 flex items-center gap-2">
            <span class="w-1 h-4 bg-cinnabar rounded" /> 使用禁忌
          </h2>
           <div 
            class="text-sandalwood/90 text-sm leading-relaxed text-justify formatted-content"
            v-html="formatNumberedText(herb.taboo || herb.tips)"
          ></div>
        </div>

      </main>
    </template>
  </div>
</template>

<style scoped>
/* 核心样式：让 v-html 渲染出的换行生效 */
.formatted-content :deep(br) {
  content: '';
  display: block;
  margin-top: 0.5rem; /* 控制列表项之间的间距 */
}

/* 隐藏第一个多余的换行（如果有） */
.formatted-content :deep(br:first-child) {
  display: none;
}
</style>
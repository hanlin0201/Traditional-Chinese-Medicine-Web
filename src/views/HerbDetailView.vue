<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
// 1. 引入 Heart 图标
import { ArrowLeft, Heart } from 'lucide-vue-next'
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

// --- 新增：收藏相关状态 ---
const isFavorite = ref(false) // 是否已收藏
const isToggling = ref(false) // 是否正在交互中(防止连点)
const currentUser = ref(null) // 当前登录用户

/**
 * 核心功能 1：文本美化
 */
function formatNumberedText(text) {
  if (!text) return '暂无'
  let formatted = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  formatted = formatted.replace(/([①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳])/g, '<br/><span class="text-cinnabar font-medium">$1</span>')
  formatted = formatted.replace(/([⑴⑵⑶⑷⑸⑹⑺⑻⑼⑽])/g, '<br/><span class="text-cinnabar font-medium">$1</span>')
  formatted = formatted.replace(/(《[^》]+》[：:]\s*)/g, '<br/><span class="text-bamboo">$1</span>')
  formatted = formatted.replace(/^(<br\/>)+/, '')
  return formatted
}

/**
 * 核心功能 2：高性能数据获取
 */
const fetchHerbByName = async () => {
  const herbName = route.params.name
  if (!herbName) return

  const preloadData = history.state.preloadHerb

  if (preloadData && preloadData.name === herbName) {
    herb.value = preloadData
    loading.value = false 
    
    try {
      const { data } = await supabase
        .from('herbs')
        .select('*')
        .eq('name', herbName)
        .single()
      
      if (data) {
        herb.value = data
      }
    } catch (e) {
      console.warn('后台更新数据失败，但不影响展示', e)
    }
    return 
  }

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

// --- 新增：检查收藏状态 ---
const checkFavoriteStatus = async () => {
  // 必须要有用户且有药材数据才查
  if (!currentUser.value || !herb.value) return

  try {
    const { data, error } = await supabase
      .from('favorite_herbs')
      .select('id')
      .eq('user_id', currentUser.value.id)
      .eq('herb_id', herb.value.id)
      .maybeSingle() // 用 maybeSingle 防止查不到报错

    if (data) {
      isFavorite.value = true
    } else {
      isFavorite.value = false
    }
  } catch (e) {
    console.error('检查收藏状态失败', e)
  }
}

// --- 新增：切换收藏/取消收藏 ---
const toggleFavorite = async () => {
  // 1. 检查登录
  if (!currentUser.value) {
    alert('请先登录后再收藏药材')
    return
  }
  
  if (isToggling.value) return // 防止连点
  isToggling.value = true

  try {
    if (isFavorite.value) {
      // --- 执行取消收藏 ---
      const { error } = await supabase
        .from('favorite_herbs')
        .delete()
        .eq('user_id', currentUser.value.id)
        .eq('herb_id', herb.value.id)
      
      if (error) throw error
      isFavorite.value = false // 更新 UI
    } else {
      // --- 执行收藏 ---
      const { error } = await supabase
        .from('favorite_herbs')
        .insert({
          user_id: currentUser.value.id,
          herb_id: herb.value.id
        })
      
      if (error) throw error
      isFavorite.value = true // 更新 UI
    }
  } catch (e) {
    console.error('操作失败', e)
    alert('操作失败，请重试')
  } finally {
    isToggling.value = false
  }
}

// 首次挂载
onMounted(async () => {
  // 1. 先获取当前用户信息
  const { data: { user } } = await supabase.auth.getUser()
  currentUser.value = user

  // 2. 获取药材数据
  fetchHerbByName()
})

// --- 新增：监听器 ---
// 当 herb 数据加载完成，或者路由变化时，重新检查收藏状态
watch(() => [herb.value, currentUser.value], ([newHerb, newUser]) => {
  if (newHerb && newUser) {
    checkFavoriteStatus()
  }
})

// 监听路由变化
watch(() => route.params.name, (newName) => {
  if (newName) {
    herb.value = null // 清空旧数据
    isFavorite.value = false // 重置收藏状态
    fetchHerbByName()
  }
})

function goBack() {
  if (window.history.length > 1) {
    router.back()
  } else {
    router.push('/herbs') 
  }
}
</script>

<template>
  <div class="min-h-screen pb-24 flex flex-col bg-[#FDFBF7]">
    <header class="sticky top-0 z-10 glass-search wood-overlay px-4 py-2 flex items-center justify-between border-b border-sandalwood/10">
      
      <div class="flex items-center gap-3 overflow-hidden">
        <button
          type="button"
          class="p-1.5 rounded-lg text-sandalwood hover:bg-sandalwood/10 transition-colors shrink-0"
          aria-label="返回"
          @click="goBack"
        >
          <ArrowLeft class="w-5 h-5" />
        </button>
        <h1 class="font-serif font-semibold text-sandalwood truncate text-lg">
          {{ herb?.name || '药材详情' }}
        </h1>
      </div>

      <button 
        v-if="!loading && herb"
        @click="toggleFavorite"
        :disabled="isToggling"
        class="p-2 rounded-full transition-all active:scale-90 hover:bg-red-50"
      >
        <Heart 
          :size="24" 
          :class="isFavorite ? 'fill-red-500 text-red-500' : 'text-sandalwood/60'"
        />
      </button>
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
.formatted-content :deep(br) {
  content: '';
  display: block;
  margin-top: 0.5rem; 
}

.formatted-content :deep(br:first-child) {
  display: none;
}
</style>
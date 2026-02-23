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
const herbEasy = ref(null) // 通俗版数据，来自 herbseasy 表
const loading = ref(true)
const error = ref(null)
const detailMode = ref('professional') // 'professional' | 'easy' 专业 / 简单易懂

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
    herbEasy.value = null
    loading.value = false
    try {
      const [resHerb, resEasy] = await Promise.all([
        supabase.from('herbs').select('*').eq('name', herbName).single(),
        supabase.from('herbseasy').select('*').eq('name', herbName).maybeSingle(),
      ])
      if (resHerb.data) herb.value = resHerb.data
      if (resEasy.data) herbEasy.value = resEasy.data
    } catch (e) {
      console.warn('后台更新数据失败，但不影响展示', e)
    }
    return
  }

  try {
    loading.value = true
    error.value = null
    herbEasy.value = null

    const [resHerb, resEasy] = await Promise.all([
      supabase.from('herbs').select('*').eq('name', herbName).single(),
      supabase.from('herbseasy').select('*').eq('name', herbName).maybeSingle(),
    ])

    if (resHerb.error) throw resHerb.error
    herb.value = resHerb.data
    if (resEasy.data) herbEasy.value = resEasy.data
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
    herb.value = null
    herbEasy.value = null
    isFavorite.value = false
    detailMode.value = 'professional'
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

      <div v-if="!loading && herb" class="flex items-center gap-2">
        <button
          @click="toggleFavorite"
          :disabled="isToggling"
          class="p-2 rounded-full transition-all active:scale-90 hover:bg-red-50"
        >
          <Heart 
            :size="24" 
            :class="isFavorite ? 'fill-red-500 text-red-500' : 'text-sandalwood/60'"
          />
        </button>
      </div>
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
        
        <div class="flex justify-center mb-2">
          <div class="flex p-1 rounded-xl bg-sandalwood/5 border border-sandalwood/10 w-full max-w-xs shadow-inner">
            <button
              type="button"
              :class="[
                'flex-1 py-2.5 rounded-lg text-sm font-medium font-serif transition-all duration-300',
                detailMode === 'easy'
                  ? 'bg-white text-sandalwood shadow-sm ring-1 ring-black/5 scale-100'
                  : 'text-sandalwood/50 hover:text-sandalwood scale-95'
              ]"
              @click="detailMode = 'easy'"
            >
              通俗解说
            </button>
            <button
              type="button"
              :class="[
                'flex-1 py-2.5 rounded-lg text-sm font-medium font-serif transition-all duration-300',
                detailMode === 'professional'
                  ? 'bg-white text-sandalwood shadow-sm ring-1 ring-black/5 scale-100'
                  : 'text-sandalwood/50 hover:text-sandalwood scale-95'
              ]"
              @click="detailMode = 'professional'"
            >
              专业典籍
            </button>
          </div>
        </div>
          
        <!-- 专业模式：原有 herbs 表内容 -->
        <template v-if="detailMode === 'professional'">
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
        </template>

        <!-- 简单易懂模式：herbseasy 表内容 -->
       <template v-else-if="detailMode === 'easy'">
          <div v-if="!herbEasy" class="rounded-xl bg-paper-card shadow-paper p-8 border border-sandalwood/10 text-center text-sandalwood/60 text-sm font-serif">
            暂无该药材的通俗版介绍，请切换至「专业」模式查看。
          </div>
          <template v-else>
            <div v-if="herbEasy.identity_tag" class="rounded-xl bg-paper-card shadow-paper p-5 border border-sandalwood/10">
              <h2 class="text-cinnabar font-serif font-semibold text-base mb-2 flex items-center gap-2">
                <span class="w-1 h-4 bg-cinnabar rounded" /> 功效概括
              </h2>
              <p class="text-sandalwood/90 text-sm leading-relaxed text-justify">{{ herbEasy.identity_tag }}</p>
            </div>

            <div v-if="herbEasy.modern_scene != null && (Array.isArray(herbEasy.modern_scene) ? herbEasy.modern_scene.length : true)" class="rounded-xl bg-paper-card shadow-paper p-5 border border-sandalwood/10">
              <h2 class="text-bamboo font-serif font-semibold text-base mb-2 flex items-center gap-2">
                <span class="w-1 h-4 bg-bamboo rounded" /> 日常应用场景
              </h2>
              <p v-if="Array.isArray(herbEasy.modern_scene)" class="text-sandalwood/90 text-sm leading-relaxed text-justify">
                {{ herbEasy.modern_scene.join('；') }}
              </p>
              <p v-else-if="typeof herbEasy.modern_scene === 'string'" class="text-sandalwood/90 text-sm leading-relaxed text-justify">
                {{ herbEasy.modern_scene }}
              </p>
              <p v-else class="text-sandalwood/90 text-sm leading-relaxed text-justify">
                {{ JSON.stringify(herbEasy.modern_scene) }}
              </p>
            </div>

            <div v-if="herbEasy.friendly_explanation" class="rounded-xl bg-paper-card shadow-paper p-5 border border-sandalwood/10">
              <h2 class="text-cinnabar font-serif font-semibold text-base mb-2 flex items-center gap-2">
                <span class="w-1 h-4 bg-cinnabar rounded" /> 作用通俗解说
              </h2>
              <p class="text-sandalwood/90 text-sm leading-relaxed text-justify">{{ herbEasy.friendly_explanation }}</p>
            </div>

            <div v-if="herbEasy.nature_logic" class="rounded-xl bg-paper-card shadow-paper p-5 border border-sandalwood/10">
              <h2 class="text-bamboo font-serif font-semibold text-base mb-2 flex items-center gap-2">
                <span class="w-1 h-4 bg-bamboo rounded" /> 性味原理解析
              </h2>
              <p class="text-sandalwood/90 text-sm leading-relaxed text-justify">{{ herbEasy.nature_logic }}</p>
            </div>

            <div v-if="herbEasy.easy_usage" class="rounded-xl bg-paper-card shadow-paper p-5 border border-sandalwood/10">
              <h2 class="text-bamboo font-serif font-semibold text-base mb-2 flex items-center gap-2">
                <span class="w-1 h-4 bg-bamboo rounded" /> 实用搭配指南
              </h2>
              <p class="text-sandalwood/90 text-sm leading-relaxed text-justify">{{ herbEasy.easy_usage }}</p>
            </div>

            <div v-if="herbEasy.safety_alarm || herbEasy.is_safe_for_pregnant !== null" class="rounded-xl bg-paper-card shadow-paper p-5 border border-sandalwood/10 space-y-3">
              <h2 class="text-cinnabar font-serif font-semibold text-base flex items-center gap-2">
                <span class="w-1 h-4 bg-cinnabar rounded" /> 注意事项与禁忌
              </h2>
              
              <p v-if="herbEasy.safety_alarm" class="text-sandalwood/90 text-sm leading-relaxed text-justify">
                {{ herbEasy.safety_alarm }}
              </p>
              
              <div v-if="herbEasy.is_safe_for_pregnant !== null" :class="{'pt-3 border-t border-sandalwood/10': herbEasy.safety_alarm}" class="flex items-center gap-2">
                <span class="text-sandalwood/60 text-sm shrink-0">孕产妇说明：</span>
                <span :class="herbEasy.is_safe_for_pregnant ? 'text-green-600' : 'text-cinnabar'" class="text-sm font-medium">
                  {{ herbEasy.is_safe_for_pregnant ? '安全可用' : '慎用或禁用' }}
                </span>
              </div>
            </div>
          </template>
        </template>
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
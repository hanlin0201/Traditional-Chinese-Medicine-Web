<script setup>
import { ref, onMounted, watch, computed } from 'vue'
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
import { useAuth } from '@/composables/useAuth'
import { getHerbTagDisplayByName } from '@/composables/useHerbTags'
// 入药部位对应的顶部背景图（放在项目根目录的 png）
import partRootImg from '../../根茎类.png'
import partFruitSeedImg from '../../果实种子类.png'
import partWholeHerbImg from '../../全草类.png'
import partFlowerImg from '../../花类.png'
import partVineImg from '../../藤木类.png'
import partAnimalImg from '../../动物类.png'
import partBranchBarkImg from '../../枝叶树皮类.png'
import partFungiAlgaeImg from '../../菌藻类.png'
import partMineralImg from '../../矿物类.png'
import partOtherImg from '../../其它.png'

const route = useRoute()
const router = useRouter()
const { user: currentUser } = useAuth()

// 定义状态
const herb = ref(null)
const herbEasy = ref(null) // 通俗版数据，来自 herbseasy 表
const loading = ref(true)
const error = ref(null)
const detailMode = ref('professional') // 'professional' | 'easy' 专业 / 简单易懂

// --- 新增：收藏相关状态 ---
const isFavorite = ref(false) // 是否已收藏
const isToggling = ref(false) // 是否正在交互中(防止连点)

// 药材多维标签（基于 CSV）
const herbTagInfo = computed(() => {
  if (!herb.value || !herb.value.name) return null
  return getHerbTagDisplayByName(herb.value.name) || null
})

// 入药部位 → 背景图映射（用普通对象，避免类型标注报错）
const PART_BG_MAP = {
  '根茎类': partRootImg,
  '果实/种子类': partFruitSeedImg,
  '全草类': partWholeHerbImg,
  '花类': partFlowerImg,
  '藤木类': partVineImg,
  '动物类': partAnimalImg,
  '枝叶/树皮类': partBranchBarkImg,
  '菌藻类': partFungiAlgaeImg,
  '矿物类': partMineralImg,
  '其他': partOtherImg,
}

// 计算当前药材对应的入药部位背景图
const herbPartBg = computed(() => {
  const part = herbTagInfo.value?.part
  if (!part) return null
  // 直接用 includes 兼容 “根茎”“根茎类”等写法
  for (const key of Object.keys(PART_BG_MAP)) {
    if (part.includes(key.replace('类', ''))) {
      return PART_BG_MAP[key]
    }
  }
  return null
})

// 根据药性文本返回颜色样式：凉→蓝，平→绿，温→橙
const getNatureTagClass = (text) => {
  if (!text) return ''
  if (text.includes('凉') || text.includes('寒')) {
    return 'border-sky-200 bg-sky-50 text-sky-700'
  }
  if (text.includes('平')) {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700'
  }
  if (text.includes('温') || text.includes('热')) {
    return 'border-amber-200 bg-amber-50 text-amber-700'
  }
  return 'border-sandalwood/20 bg-sandalwood/5 text-sandalwood/90'
}

// 根据入药部位分类返回颜色样式
const getPartTagClass = (text) => {
  if (!text) return ''
  if (text.includes('根茎')) return 'border-sandalwood/20 bg-sandalwood/10 text-sandalwood/90'
  if (text.includes('果实') || text.includes('种子')) return 'border-amber-200 bg-amber-50 text-amber-800'
  if (text.includes('全草')) return 'border-bamboo/25 bg-bamboo/10 text-bamboo'
  if (text.includes('花')) return 'border-rose-200 bg-rose-50 text-rose-700'
  if (text.includes('枝叶') || text.includes('树皮')) return 'border-emerald-200 bg-emerald-50 text-emerald-700'
  if (text.includes('动物')) return 'border-cinnabar/20 bg-cinnabar/5 text-cinnabar'
  if (text.includes('矿物')) return 'border-slate-200 bg-slate-50 text-slate-700'
  if (text.includes('菌藻')) return 'border-sky-200 bg-sky-50 text-sky-700'
  if (text.includes('其他')) return 'border-sandalwood/15 bg-paper text-sandalwood'
  return 'border-sandalwood/20 bg-sandalwood/5 text-sandalwood/90'
}

// 具体功效标签颜色（以 CSV“具体功效”内容为准）
const DETAIL_EFFECT_CLASS_MAP = {
  // 清热系
  清热解毒: 'border-sky-200 bg-sky-50 text-sky-700',
  利水渗湿: 'border-sky-200 bg-sky-50 text-sky-700',
  泻下通便: 'border-sky-200 bg-sky-50 text-sky-700',

  // 补益/扶正
  扶正补虚: 'border-emerald-200 bg-emerald-50 text-emerald-700',

  // 痰咳
  化痰止咳: 'border-emerald-200 bg-emerald-50 text-emerald-700',

  // 理气
  疏肝理气: 'border-bamboo/25 bg-bamboo/10 text-bamboo',

  // 活血/风湿
  活血化瘀: 'border-cinnabar/20 bg-cinnabar/5 text-cinnabar',
  祛风湿痛: 'border-cinnabar/20 bg-cinnabar/5 text-cinnabar',

  // 温散解表
  温阳散寒: 'border-amber-200 bg-amber-50 text-amber-800',
  发散表邪: 'border-amber-200 bg-amber-50 text-amber-800',
  消食导滞: 'border-amber-200 bg-amber-50 text-amber-800',

  // 安神
  宁心安神: 'border-violet-200 bg-violet-50 text-violet-700',

  // 止血/收涩
  宁血止血: 'border-rose-200 bg-rose-50 text-rose-700',
  收敛固涩: 'border-slate-300 bg-slate-50 text-slate-700',

  // 杀虫
  驱虫杀虫: 'border-slate-300 bg-slate-50 text-slate-700',
}

const getDetailEffectClass = (text) => {
  if (!text) return ''
  if (DETAIL_EFFECT_CLASS_MAP[text]) return DETAIL_EFFECT_CLASS_MAP[text]

  // 兜底：少量关键词匹配，避免新表偶尔出现的新标签全变成默认色
  if (text.includes('清热') || text.includes('解毒') || text.includes('利水') || text.includes('泻下')) {
    return 'border-sky-200 bg-sky-50 text-sky-700'
  }
  if (text.includes('补虚') || text.includes('扶正')) {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700'
  }
  if (text.includes('化痰') || text.includes('止咳')) {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700'
  }
  if (text.includes('理气') || text.includes('疏肝')) {
    return 'border-bamboo/25 bg-bamboo/10 text-bamboo'
  }
  if (text.includes('活血') || text.includes('化瘀') || text.includes('风湿') || text.includes('止痛')) {
    return 'border-cinnabar/20 bg-cinnabar/5 text-cinnabar'
  }
  if (text.includes('温阳') || text.includes('散寒') || text.includes('解表') || text.includes('消食')) {
    return 'border-amber-200 bg-amber-50 text-amber-800'
  }
  if (text.includes('安神')) {
    return 'border-violet-200 bg-violet-50 text-violet-700'
  }
  if (text.includes('止血')) {
    return 'border-rose-200 bg-rose-50 text-rose-700'
  }
  if (text.includes('收敛') || text.includes('固涩') || text.includes('驱虫') || text.includes('杀虫')) {
    return 'border-slate-300 bg-slate-50 text-slate-700'
  }
  return 'border-sandalwood/20 bg-paper text-sandalwood/90'
}

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
    alert('请先登录')
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
onMounted(() => {
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
      <!-- 顶部封面区域：统一纸张渐变 + 分类底图 -->
      <div class="w-full h-[220px] sm:h-[260px] md:h-[300px] bg-gradient-to-b from-[#F8F1E6] to-[#F1E4D1] border-b border-sandalwood/10 relative overflow-hidden">
        <!-- 分类背景图：根据入药部位切换 -->
        <img
          v-if="herbPartBg"
          :src="herbPartBg"
          alt=""
          class="absolute inset-0 w-full h-full object-cover object-[center_70%] opacity-70 mix-blend-multiply"
        />
        <!-- 顶部/底部轻微光晕，保证信息卡片与文字对比度 -->
        <div class="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-[#FDFBF7] via-[#FDFBF7]/40 to-transparent pointer-events-none" />
        <div class="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[#FDFBF7] via-[#FDFBF7]/40 to-transparent pointer-events-none" />
      </div>

      <!-- 主体区域：悬浮信息卡片 + 模式切换 + 目录 + 详细内容 -->
      <main class="flex-1 px-4 pb-10 -mt-10 sm:-mt-16 relative z-0">
        <!-- 悬浮信息卡片 -->
        <section class="max-w-4xl mx-auto">
          <div
            class="bg-paper-card shadow-paper rounded-2xl border border-sandalwood/15 px-4 sm:px-6 py-4 sm:py-5 flex flex-col sm:flex-row gap-4 sm:gap-6 items-start sm:items-center"
          >
            <!-- 药材缩略图 -->
            <div
              v-if="herb?.image_url"
              class="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden border border-sandalwood/15 bg-paper flex-shrink-0"
            >
              <img
                :src="herb.image_url"
                :alt="herb?.name || '药材图片'"
                class="w-full h-full object-cover"
              />
            </div>
            <div v-else class="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl border border-dashed border-sandalwood/20 bg-paper/70 flex items-center justify-center text-[11px] text-sandalwood/50 flex-shrink-0">
              无图片
            </div>

            <!-- 基本信息文案 -->
            <div class="flex-1 space-y-2">
              <div class="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <h1 class="font-serif font-semibold text-sandalwood text-xl sm:text-2xl">
                  {{ herb?.name || '药材详情' }}
                </h1>
                <p v-if="herb?.pinyin || herb?.latin_name" class="text-xs sm:text-sm text-sandalwood/60">
                  {{ herb?.pinyin }}<span v-if="herb?.pinyin && herb?.latin_name"> · </span>{{ herb?.latin_name }}
                </p>
              </div>
              <p v-if="herb?.alias" class="text-xs sm:text-sm text-sandalwood/60">
                别名：{{ herb.alias }}
              </p>

              <!-- 功效与属性标签：紧跟在别名下方 -->
              <div v-if="herbTagInfo" class="space-y-1.5 pt-1">
                <div class="flex flex-wrap gap-1.5 text-[11px] sm:text-xs">
                  <span
                    v-if="herbTagInfo.efficacyCategory"
                    class="px-2.5 py-1 rounded-full border bg-paper text-sandalwood/90 border-sandalwood/30 font-semibold"
                  >
                    {{ herbTagInfo.efficacyCategory }}
                  </span>
                  <span
                    v-if="herbTagInfo.nature"
                    :class="['px-2.5 py-1 rounded-full border font-semibold', getNatureTagClass(herbTagInfo.nature)]"
                  >
                    {{ herbTagInfo.nature }}
                  </span>
                  <span
                    v-if="herbTagInfo.taste"
                    class="px-2.5 py-1 rounded-full border border-amber-100 bg-amber-50 text-amber-700 font-semibold"
                  >
                    {{ herbTagInfo.taste }}
                  </span>
                  <span
                    v-if="herbTagInfo.part"
                    :class="['px-2.5 py-1 rounded-full border font-semibold', getPartTagClass(herbTagInfo.part)]"
                  >
                    {{ herbTagInfo.part }}
                  </span>
                  <span
                    v-if="herbTagInfo.meridian"
                    class="px-2.5 py-1 rounded-full border border-cinnabar/15 bg-cinnabar/5 text-cinnabar font-semibold"
                  >
                    {{ herbTagInfo.meridian }}
                  </span>
                </div>

                <!-- 具体功效标签 -->
                <div
                  v-if="herbTagInfo.detailEffects && herbTagInfo.detailEffects.length"
                  class="flex flex-wrap gap-1.5 pt-0.5 text-[10px] sm:text-[11px]"
                >
                  <span
                    v-for="effect in herbTagInfo.detailEffects"
                    :key="effect"
                    :class="['px-2 py-0.5 rounded-full border font-medium', getDetailEffectClass(effect)]"
                  >
                    {{ effect }}
                  </span>
                </div>
              </div>

              <!-- 关键属性一行展示（不再重复“某某类”） -->
              <div class="flex flex-wrap gap-1.5 mt-1 text-[11px] sm:text-xs">
              </div>
            </div>
          </div>
        </section>

        <!-- 模式切换与目录 -->
        <section class="max-w-4xl mx-auto mt-5 space-y-4">
          <!-- 模式切换 -->
          <div class="flex justify-center">
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
        </section>

        <!-- 下方标签区与锚点已合并进顶部信息卡片，这里留白以便内容“呼吸” -->
        <section class="max-w-4xl mx-auto mt-4" />
        
        <!-- 专业模式：原有 herbs 表内容 -->
        <template v-if="detailMode === 'professional'">
          <section id="section-basic" class="rounded-xl bg-paper-card shadow-paper p-5 border border-sandalwood/10">
            <h2 class="text-cinnabar font-serif font-semibold text-base mb-3 flex items-center gap-2">
              <span class="w-1 h-4 bg-cinnabar rounded" /> 基本信息
            </h2>
            <div class="space-y-2 text-sm">
              <div class="flex" v-if="herb.alias">
                <span class="text-sandalwood/60 w-20 shrink-0">别名</span>
                <span class="text-sandalwood/90">{{ herb.alias }}</span>
              </div>
            </div>
          </section>

          <section id="section-taste-meridian" class="rounded-xl bg-paper-card shadow-paper p-5 border border-sandalwood/10">
            <h2 class="text-cinnabar font-serif font-semibold text-base mb-2 flex items-center gap-2">
              <span class="w-1 h-4 bg-cinnabar rounded" /> 性味归经
            </h2>
            <p class="text-sandalwood/90 text-sm leading-relaxed text-justify">
              {{ herb.nature }}；{{ herb.channel }}
              {{ herb.taste ? '；' + herb.taste : '' }}
            </p>
          </section>

          <section id="section-function" class="rounded-xl bg-paper-card shadow-paper p-5 border border-sandalwood/10">
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
          </section>

          <section id="section-usage" class="rounded-xl bg-paper-card shadow-paper p-5 border border-sandalwood/10">
            <h2 class="text-bamboo font-serif font-semibold text-base mb-2 flex items-center gap-2">
              <span class="w-1 h-4 bg-bamboo rounded" /> 用法用量
            </h2>
            <div 
              class="text-sandalwood/90 text-sm leading-relaxed text-justify formatted-content"
              v-html="formatNumberedText(herb.usage)"
            ></div>
          </section>

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
            <div class="space-y-4">
              
              <div v-if="herbEasy.identity_tag" class="rounded-xl bg-sandalwood/5 border border-sandalwood/10 p-5 relative overflow-hidden">
                <div class="absolute top-0 left-0 w-1 h-full bg-cinnabar"></div>
                <h2 class="text-cinnabar font-serif font-semibold text-base mb-2">
                  核心概括
                </h2>
                <p class="text-sandalwood/90 text-base font-medium leading-relaxed text-justify">{{ herbEasy.identity_tag }}</p>
              </div>

              <div class="rounded-xl bg-paper-card shadow-paper border border-sandalwood/10 divide-y divide-sandalwood/10">
                
                <div v-if="herbEasy.friendly_explanation" class="p-5">
                  <h2 class="text-cinnabar font-serif font-semibold text-base mb-2 flex items-center gap-2">
                    <span class="w-1 h-4 bg-cinnabar rounded" /> 作用效果
                  </h2>
                  <p class="text-sandalwood/90 text-sm leading-relaxed text-justify">{{ herbEasy.friendly_explanation }}</p>
                </div>

                <div v-if="herbEasy.modern_scene != null && (Array.isArray(herbEasy.modern_scene) ? herbEasy.modern_scene.length : true)" class="p-5">
                  <h2 class="text-bamboo font-serif font-semibold text-base mb-2 flex items-center gap-2">
                    <span class="w-1 h-4 bg-bamboo rounded" /> 应用场景
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

                <div v-if="herbEasy.nature_logic" class="p-5">
                  <h2 class="text-bamboo font-serif font-semibold text-base mb-2 flex items-center gap-2">
                    <span class="w-1 h-4 bg-bamboo rounded" /> 性味原理
                  </h2>
                  <p class="text-sandalwood/90 text-sm leading-relaxed text-justify">{{ herbEasy.nature_logic }}</p>
                </div>

                <div v-if="herbEasy.easy_usage" class="p-5">
                  <h2 class="text-bamboo font-serif font-semibold text-base mb-2 flex items-center gap-2">
                    <span class="w-1 h-4 bg-bamboo rounded" /> 实用搭配
                  </h2>
                  <p class="text-sandalwood/90 text-sm leading-relaxed text-justify">{{ herbEasy.easy_usage }}</p>
                </div>

              </div>

              <section id="section-caution" v-if="herbEasy.safety_alarm || herbEasy.is_safe_for_pregnant !== null" class="rounded-xl bg-red-50/40 shadow-paper p-5 border border-red-100 space-y-3">
                <h2 class="text-cinnabar font-serif font-semibold text-base flex items-center gap-2">
                  <span class="w-1 h-4 bg-cinnabar rounded" /> 注意事项
                </h2>
                
                <p v-if="herbEasy.safety_alarm" class="text-sandalwood/90 text-sm leading-relaxed text-justify">
                  {{ herbEasy.safety_alarm }}
                </p>
                
                <div v-if="herbEasy.is_safe_for_pregnant !== null" :class="{'pt-3 border-t border-red-100': herbEasy.safety_alarm}" class="flex items-center gap-2">
                  <span class="text-sandalwood/70 text-sm shrink-0 font-medium">孕产妇说明：</span>
                  <span :class="herbEasy.is_safe_for_pregnant ? 'text-green-600' : 'text-cinnabar'" class="text-sm font-semibold">
                    {{ herbEasy.is_safe_for_pregnant ? '安全可用' : '慎用或禁用' }}
                  </span>
                </div>
              </section>

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
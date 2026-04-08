<script setup>
defineOptions({ name: 'RecipeMarket' })

import { ref, onMounted, onActivated, onDeactivated, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { 
  Clock, UserCheck, Sparkles, Leaf, X, Soup, ListOrdered,
  Star, Heart, Camera, Send, Loader2, Image as ImageIcon, Star as StarIcon,
  MessageCircle, ThumbsUp, Tag, ChevronLeft, MoreHorizontal,
  Search, Filter, ChevronDown, Trash2
} from 'lucide-vue-next'
import { supabase } from '@/supabaseClient'
import { useAuth } from '@/composables/useAuth'
import { SOLAR_TERMS_LOOKUP } from '@/constants/solarTerms'
import { BODY_TYPES, EFFICACY_OPTIONS, TIME_RANGES, parseTimeToMinutes } from '@/constants/recipeFilters'
import { getRecipeMarketCachedData, setRecipeMarketCachedData, interactionsCache, onInteractionsLoaded } from '@/composables/usePagePreload'
import { getUserDisplayInfo, DEFAULT_USER_DISPLAY_NAME } from '@/utils/userDisplay'
import { FEATURE_COPY } from '@/constants/branding'

const router = useRouter()
const route = useRoute()
const { user: currentUser, profile: currentUserProfile } = useAuth()

// --- 状态定义 ---
const recipes = ref([])
const loading = ref(true)
const selectedRecipe = ref(null)

// --- 搜索与筛选 ---
const searchKeyword = ref('')
const bodyTypeFilter = ref('')
const solarTermFilter = ref('')
const efficacyFilters = ref([])   // 多选：选中的功效标签
const timeRangeFilter = ref('')
const showFilterPanel = ref(false)

function applySearchKeywordFromQuery() {
  const q = String(route.query.q || '').trim()
  if (q) searchKeyword.value = q
}

// 节气选项（筛选用）
const solarTermOptions = [{ value: '', label: '全部节气' }, ...SOLAR_TERMS_LOOKUP.map(t => ({ value: t.name, label: t.name }))]

/** 关键词综合匹配：名称 / 功效任一项 / 食材名称任一项 包含关键词 */
function matchKeyword(recipe, kw) {
  if (!kw || !kw.trim()) return true
  const k = kw.trim().toLowerCase()
  const nameMatch = recipe.name && String(recipe.name).toLowerCase().includes(k)
  const efficacyMatch = Array.isArray(recipe.efficacy) && recipe.efficacy.some(e => String(e).toLowerCase().includes(k))
  const ingredientMatch = Array.isArray(recipe.ingredients) && recipe.ingredients.some(i => i && String(i.name || '').toLowerCase().includes(k))
  return nameMatch || efficacyMatch || ingredientMatch
}

/** 功效多选：食谱需包含任意一个选中的功效 */
function matchEfficacy(recipe, selected) {
  if (!selected || selected.length === 0) return true
  const eff = recipe.efficacy || []
  return selected.some(s => eff.some(e => String(e).includes(s) || e === s))
}

/** 烹饪时间区间：解析 time 后与 timeRangeFilter 比较 */
function matchTimeRange(recipe, rangeValue) {
  if (!rangeValue) return true
  const mins = parseTimeToMinutes(recipe.time)
  if (mins == null) return true
  const v = parseInt(rangeValue, 10)
  if (v === 121) return mins > 120
  return mins <= v
}

const filteredRecipes = computed(() => {
  let list = recipes.value
  const kw = searchKeyword.value
  const body = bodyTypeFilter.value
  const term = solarTermFilter.value
  const eff = efficacyFilters.value
  const timeRange = timeRangeFilter.value

  list = list.filter(r => matchKeyword(r, kw))
  if (body) list = list.filter(r => (r.body_type || r.bodyType) === body)
  if (term) list = list.filter(r => r.solar_term === term)
  list = list.filter(r => matchEfficacy(r, eff))
  list = list.filter(r => matchTimeRange(r, timeRange))
  return list
})

function toggleEfficacy(eff) {
  const i = efficacyFilters.value.indexOf(eff)
  if (i === -1) efficacyFilters.value = [...efficacyFilters.value, eff]
  else efficacyFilters.value = efficacyFilters.value.filter((_, j) => j !== i)
}

function hasActiveFilters() {
  return searchKeyword.value.trim() ||
    bodyTypeFilter.value ||
    solarTermFilter.value ||
    efficacyFilters.value.length > 0 ||
    timeRangeFilter.value
}

function clearAllFilters() {
  searchKeyword.value = ''
  bodyTypeFilter.value = ''
  solarTermFilter.value = ''
  efficacyFilters.value = []
  timeRangeFilter.value = ''
}

function buildProfilesMap(rows = []) {
  return Object.fromEntries((rows || []).map(row => [row.id, row]))
}

async function fetchProfilesMap(userIds = []) {
  const uniqIds = [...new Set((userIds || []).filter(Boolean).map(id => String(id).trim()))]
  if (!uniqIds.length) return {}
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, avatar_url')
    .in('id', uniqIds)
  if (error) {
    console.warn('加载用户信息失败', error)
    return {}
  }
  return buildProfilesMap(data || [])
}

function getCurrentUserDisplayName() {
  const display = getUserDisplayInfo({
    profile: currentUserProfile.value,
    fallbackName: currentUser.value?.user_metadata?.full_name,
    email: currentUser.value?.email,
    defaultName: DEFAULT_USER_DISPLAY_NAME,
  })
  return display.name
}

function getHomeworkDisplayInfo(hw, profilesById = {}) {
  return getUserDisplayInfo({
    profile: hw?.user_id ? profilesById[hw.user_id] : null,
    fallbackName: hw?.user_name,
    defaultName: DEFAULT_USER_DISPLAY_NAME,
  })
}

function goToUserProfile(userId, e) {
  e?.stopPropagation?.()
  if (!userId) return
  router.push({ name: 'Profile', query: { uid: userId } })
}

// 互动数据
const comments = ref([]) 
const homeworks = ref([])
const newComment = ref('')
const isSubmitting = ref(false)

// 发布弹窗
const showUploadModal = ref(false)
const uploadFile = ref(null)
const uploadPreview = ref('')
const uploadContent = ref('') 
const uploadTags = ref('')   

// 🌟 作业详情弹窗状态
const selectedHomework = ref(null) 
const showHomeworkPage = ref(false)
const homeworkComments = ref([]) 
const newHomeworkComment = ref('') 
const homeworkIsLiked = ref(false) 

function normalizeRecipe(item, myFavorites = [], profilesById = {}) {
  const isUserSubmission = !!(item.author_user_id != null && String(item.author_user_id).length > 0)
  const authorProfile = item.author_user_id ? profilesById[item.author_user_id] : null
  const authorDisplay = getUserDisplayInfo({
    profile: authorProfile,
    fallbackName: item.author_name,
    fallbackAvatar: item.author_avatar_url,
    defaultName: DEFAULT_USER_DISPLAY_NAME,
  })
  return {
    ...item,
    bodyType: item.body_type,
    efficacy: item.efficacy || [],
    ingredients: item.ingredients || [],
    steps: item.steps || [],
    rating: item.rating || (8.5 + Math.random()).toFixed(1),
    cooked_count: item.cooked_count || 0,
    is_favorite: myFavorites.includes(item.id),
    is_user_submission: isUserSubmission,
    author_display_name: authorDisplay.name,
    author_display_avatar: authorDisplay.avatar,
  }
}

// --- 1. 获取基础食谱数据 ---
const fetchRecipes = async () => {
  if (recipes.value.length > 0) return

  const cached = getRecipeMarketCachedData()
  const hasCachedData = Array.isArray(cached) && cached.length > 0
  if (hasCachedData) {
    recipes.value = cached.map(r => ({ ...r, favorites_count: r.favorites_count || 0 }))
    loading.value = false
    syncCookedCounts()
  }

  try {
    if (!hasCachedData) loading.value = true
    const uid = currentUser.value?.id

    const [recipesRes, myFavsRes, favCountsRes] = await Promise.all([
      supabase.from('recipes').select('*').or('moderation_status.eq.published,moderation_status.is.null').order('id'),
      uid ? supabase.from('favorite_recipes').select('recipe_id').eq('user_id', uid) : Promise.resolve({ data: [] }),
      supabase.from('favorite_recipes').select('recipe_id'),
    ])

    const { data, error } = recipesRes
    if (error) throw error

    const myFavorites = (myFavsRes.data || []).map(f => f.recipe_id)
    const favCountMap = {}
    ;(favCountsRes.data || []).forEach(f => { favCountMap[f.recipe_id] = (favCountMap[f.recipe_id] || 0) + 1 })

    if (data) {
      const authorIds = data.map(item => item.author_user_id).filter(Boolean)
      const profilesById = await fetchProfilesMap(authorIds)
      const normalized = data.map(item => ({ ...normalizeRecipe(item, myFavorites, profilesById), favorites_count: favCountMap[item.id] || 0 }))
      recipes.value = normalized
      syncCookedCounts()
      setRecipeMarketCachedData([...recipes.value])
    }
  } catch (error) {
    console.error('获取食谱失败:', error)
  } finally {
    loading.value = false
  }
}

const syncCookedCounts = () => {
  if (!interactionsCache.loaded) return
  for (const recipe of recipes.value) {
    const hws = interactionsCache.homeworks[recipe.id]
    if (hws !== undefined) recipe.cooked_count = hws.length
  }
}

// 缓存先于食谱列表就绪时，等食谱加载完再同步；同步后写回 localStorage，下次打开直接正确
onInteractionsLoaded(() => {
  syncCookedCounts()
  if (recipes.value.length > 0) setRecipeMarketCachedData([...recipes.value])
})

// --- 2. 获取互动数据 ---
const applyInteractions = (recipeId) => {
  comments.value = interactionsCache.comments[recipeId] || []
  homeworks.value = interactionsCache.homeworks[recipeId] || []
  const count = homeworks.value.length
  const recipeInList = recipes.value.find(r => r.id === recipeId)
  if (recipeInList) recipeInList.cooked_count = count
  if (selectedRecipe.value?.id === recipeId) selectedRecipe.value.cooked_count = count
  const pendingHomeworkId = route.query.homework_id
  if (pendingHomeworkId) {
    const targetHomework = homeworks.value.find(h => String(h.id) === String(pendingHomeworkId))
    if (targetHomework) openHomeworkPage(targetHomework)
  }
}

const fetchInteractions = async (recipeId) => {
  // 缓存命中：直接渲染，无需网络请求
  if (interactionsCache.loaded) {
    applyInteractions(recipeId)
    return
  }

  // 缓存尚未就绪（极少情况）：走网络请求
  const [{ data: cData }, { data: hData }] = await Promise.all([
    supabase.from('comments').select('*').eq('recipe_id', recipeId).order('created_at', { ascending: false }),
    supabase.from('homeworks').select('*').eq('recipe_id', recipeId).order('created_at', { ascending: false }),
  ])

  // 竞态保护：若用户已切换到其他食谱，丢弃本次结果
  if (selectedRecipe.value?.id !== recipeId) return

  comments.value = cData || []

  const rawHomeworks = hData || []
  const profilesById = await fetchProfilesMap(rawHomeworks.map(hw => hw.user_id))

  // 获取 profiles 期间用户可能再次切换，再次校验
  if (selectedRecipe.value?.id !== recipeId) return

  homeworks.value = rawHomeworks.map(hw => {
    const display = getHomeworkDisplayInfo(hw, profilesById)
    return {
      ...hw,
      user_display_name: display.name,
      user_display_avatar: display.avatar,
    }
  })

  const count = homeworks.value.length
  const recipeInList = recipes.value.find(r => r.id === recipeId)
  if (recipeInList) recipeInList.cooked_count = count
  if (selectedRecipe.value?.id === recipeId) selectedRecipe.value.cooked_count = count

  const pendingHomeworkId = route.query.homework_id
  if (pendingHomeworkId) {
    const targetHomework = homeworks.value.find(h => String(h.id) === String(pendingHomeworkId))
    if (targetHomework) openHomeworkPage(targetHomework)
  }
}

// --- 3. 提交评论 ---
const submitComment = async () => {
  if (!newComment.value.trim()) return
  if (!currentUser.value) return alert('请先登录')

  isSubmitting.value = true
  const { error } = await supabase.from('comments').insert({
    recipe_id: selectedRecipe.value.id,
    content: newComment.value,
    user_name: getCurrentUserDisplayName(),
    user_id: currentUser.value.id
  })

  if (!error) {
    newComment.value = ''
    fetchInteractions(selectedRecipe.value.id)
  }
  isSubmitting.value = false
}

// --- 4. 收藏/取消收藏 ---
const toggleFavorite = async (e, recipe) => {
  e?.stopPropagation()
  if (!currentUser.value) return alert('请先登录')
  
  const originalState = recipe.is_favorite
  recipe.is_favorite = !originalState
  recipe.favorites_count = Math.max(0, (recipe.favorites_count || 0) + (originalState ? -1 : 1))

  try {
    if (!originalState) {
      await supabase.from('favorite_recipes').insert({ user_id: currentUser.value.id, recipe_id: recipe.id })
    } else {
      await supabase.from('favorite_recipes').delete().eq('user_id', currentUser.value.id).eq('recipe_id', recipe.id)
    }
  } catch (error) {
    recipe.is_favorite = originalState
    recipe.favorites_count = (recipe.favorites_count || 0) + (originalState ? 1 : -1)
    console.error(error)
  }
}

// --- 5. 发布作业 ---
const triggerSelectImage = () => document.getElementById('hidden-file-input').click()

const onFileSelected = (event) => {
  const file = event.target.files[0]
  if (!file) return
  uploadFile.value = file
  uploadPreview.value = URL.createObjectURL(file)
  showUploadModal.value = true
  event.target.value = ''
}

const closeUploadModal = () => {
  showUploadModal.value = false
  uploadFile.value = null
  uploadPreview.value = ''
  uploadContent.value = ''
  uploadTags.value = ''
}

const submitHomework = async () => {
  if (!uploadFile.value) return
  if (!currentUser.value) return alert('请先登录')

  isSubmitting.value = true
  try {
    const fileExt = uploadFile.value.name.split('.').pop()
    const fileName = `homework/${Date.now()}_${Math.floor(Math.random() * 1000)}.${fileExt}`

    const { error: uploadError } = await supabase.storage.from('image').upload(fileName, uploadFile.value)
    if (uploadError) throw new Error('图片上传失败')

    const { data: publicUrlData } = supabase.storage.from('image').getPublicUrl(fileName)
    
    // 处理标签
    const tagsArray = uploadTags.value.split(/[,，\s]+/).filter(t => t.trim())

    const { data: inserted, error: dbError } = await supabase.from('homeworks').insert({
      recipe_id: selectedRecipe.value.id,
      user_id: currentUser.value.id,
      image_url: publicUrlData.publicUrl,
      content: uploadContent.value || '打卡成功！',
      tags: tagsArray, 
      user_name: getCurrentUserDisplayName()
    }).select().single()

    if (dbError) throw dbError

    alert('作业发布成功！')
    
    // 手动 +1（本地 + 数据库）
    selectedRecipe.value.cooked_count = (selectedRecipe.value.cooked_count || 0) + 1
    await supabase
      .from('recipes')
      .update({ cooked_count: selectedRecipe.value.cooked_count })
      .eq('id', selectedRecipe.value.id)
    
    closeUploadModal()
    // 优先把新作业插入到本地列表顶部，避免等待网络
    if (inserted) {
      homeworks.value = [inserted, ...homeworks.value]
    }
    fetchInteractions(selectedRecipe.value.id)
    
  } catch (e) {
    alert(`发布失败: ${e.message}`)
  } finally {
    isSubmitting.value = false
  }
}

// --- 6. 全屏作业详情 ---
const openHomeworkPage = async (homework) => {
  selectedHomework.value = homework
  showHomeworkPage.value = true
  // 同步路由参数，便于从个人中心跳转/分享
  router.replace({
    query: {
      ...route.query,
      homework_id: homework.id,
    },
  })
  
  const { data: comments } = await supabase.from('homework_comments').select('*').eq('homework_id', homework.id).order('created_at', { ascending: true })
  homeworkComments.value = comments || []

  if (currentUser.value) {
    const { data } = await supabase.from('homework_likes').select('id').eq('user_id', currentUser.value.id).eq('homework_id', homework.id).single()
    homeworkIsLiked.value = !!data
  }
}

const closeHomeworkPage = () => {
  showHomeworkPage.value = false
  selectedHomework.value = null
  router.replace({
    query: {
      ...route.query,
      homework_id: undefined,
    },
  })
}

// 删除当前查看的作业（仅作者本人可见）
const deleteSelectedHomework = async () => {
  if (!currentUser.value || !selectedHomework.value) return
  if (currentUser.value.id !== selectedHomework.value.user_id) return
  if (!confirm('确定要删除这条作业吗？')) return

  try {
    const { error } = await supabase
      .from('homeworks')
      .delete()
      .eq('id', selectedHomework.value.id)
      .eq('user_id', currentUser.value.id)

    if (error) throw error

    homeworks.value = homeworks.value.filter(h => h.id !== selectedHomework.value.id)
    if (selectedRecipe.value) {
      const nextCount = Math.max(0, (selectedRecipe.value.cooked_count || 0) - 1)
      selectedRecipe.value.cooked_count = nextCount
      await supabase
        .from('recipes')
        .update({ cooked_count: nextCount })
        .eq('id', selectedRecipe.value.id)
    }
    closeHomeworkPage()
  } catch (e) {
    console.error(e)
    alert('删除失败，请稍后重试')
  }
}

const toggleHomeworkLike = async () => {
  if (!currentUser.value) return alert('请先登录')
  if (!selectedHomework.value) return

  const originalState = homeworkIsLiked.value
  homeworkIsLiked.value = !originalState
  selectedHomework.value.likes_count = (selectedHomework.value.likes_count || 0) + (originalState ? -1 : 1)

  try {
    if (originalState) {
      await supabase.from('homework_likes').delete().eq('user_id', currentUser.value.id).eq('homework_id', selectedHomework.value.id)
    } else {
      await supabase.from('homework_likes').insert({ user_id: currentUser.value.id, homework_id: selectedHomework.value.id })
    }
  } catch (e) {
    homeworkIsLiked.value = originalState
  }
}

const submitHomeworkComment = async () => {
  if (!newHomeworkComment.value.trim()) return
  if (!currentUser.value) return alert('请先登录')

  const { data, error } = await supabase.from('homework_comments').insert({
    homework_id: selectedHomework.value.id,
    user_id: currentUser.value.id,
    content: newHomeworkComment.value,
    user_name: getCurrentUserDisplayName()
  }).select().single()

  if (!error && data) {
    homeworkComments.value.push(data)
    newHomeworkComment.value = ''
  }
}

// --- 辅助 ---
const formatDate = (isoStr) => {
  if(!isoStr) return ''
  const date = new Date(isoStr)
  return `${date.getMonth()+1}月${date.getDate()}日`
}

const openRecipe = (recipe) => {
  selectedRecipe.value = recipe;
  comments.value = [];
  homeworks.value = [];
  router.replace({ query: { ...route.query, open_id: recipe.id } })
  fetchInteractions(recipe.id)
};

const closeRecipe = () => {
  selectedRecipe.value = null;
  router.replace({ query: { ...route.query, open_id: undefined } })
};

const handleHerbClick = (item) => {
  if (item.isHerb) router.push({ name: 'HerbDetail', params: { name: item.name } })
};

onMounted(() => {
  applySearchKeywordFromQuery()
  fetchRecipes()
})

onActivated(() => {
  applySearchKeywordFromQuery()
  const pendingId = route.query.open_id
  if (pendingId) {
    if (!selectedRecipe.value || selectedRecipe.value.id != pendingId) {
      const target = recipes.value.find(r => r.id == pendingId)
      if (target) {
        selectedRecipe.value = target
        fetchInteractions(target.id)
      }
    } else if (selectedRecipe.value) {
      // 已经有选中的食谱，但可能需要根据新路由参数重新加载互动数据
      fetchInteractions(selectedRecipe.value.id)
    }
  }
})

onDeactivated(() => {
  showHomeworkPage.value = false
  selectedHomework.value = null
})
</script>

<template>
  <div class="recipe-market-page min-h-screen text-stone-800">
    <!-- 前景单独叠层，避免固定背景与整页滚动高度联动导致 cover 被「拉高」发糊 -->
    <div class="recipe-market-foreground min-h-screen p-6 pb-24 relative z-[1]">
    <header class="mb-6">
      <h1 class="text-[1.65rem] sm:text-3xl font-['Ma_Shan_Zheng',cursive] text-stone-900 mb-2 tracking-[0.08em] leading-tight">
        {{ FEATURE_COPY.recipes.title }} · 养生膳食广场
      </h1>
      <p class="text-stone-500 font-['Ma_Shan_Zheng',cursive]">{{ FEATURE_COPY.recipes.motto }} · 结合体质与节气推荐食疗方案</p>
    </header>

    <!-- 搜索条：用户自主输入，综合匹配名称/功效/食材 -->
    <div class="mb-4 flex flex-col sm:flex-row gap-3">
      <div class="relative flex-1">
        <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" />
        <input
          v-model="searchKeyword"
          type="search"
          placeholder="输入食谱名、食材或功效…"
          class="w-full pl-10 pr-10 py-2.5 rounded-xl border border-stone-200 bg-white text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-300 transition"
        />
        <button
          v-if="searchKeyword"
          type="button"
          @click="searchKeyword = ''"
          class="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-stone-100 text-stone-400 hover:text-stone-600"
          aria-label="清空"
        >
          <X class="w-4 h-4" />
        </button>
      </div>
      <button
        type="button"
        @click="showFilterPanel = !showFilterPanel"
        class="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-stone-200 bg-white text-stone-700 hover:bg-stone-50 transition shrink-0"
        :class="{ 'ring-2 ring-emerald-200 border-emerald-300': showFilterPanel }"
      >
        <Filter class="w-4 h-4" />
        <span>筛选</span>
        <ChevronDown class="w-4 h-4 transition-transform" :class="{ 'rotate-180': showFilterPanel }" />
      </button>
    </div>

    <!-- 可折叠筛选区 -->
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0 -translate-y-2"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 -translate-y-2"
    >
      <div v-show="showFilterPanel" class="mb-6 p-4 rounded-2xl border border-stone-100 bg-white shadow-sm space-y-4">
        <div class="flex flex-wrap items-center gap-2">
          <span class="text-sm font-medium text-stone-500 shrink-0">体质</span>
          <select
            v-model="bodyTypeFilter"
            class="rounded-lg border border-stone-200 px-3 py-1.5 text-sm text-stone-700 bg-white focus:ring-2 focus:ring-emerald-100 focus:border-emerald-300"
          >
            <option v-for="opt in BODY_TYPES" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <span class="text-sm font-medium text-stone-500 shrink-0">节气</span>
          <select
            v-model="solarTermFilter"
            class="rounded-lg border border-stone-200 px-3 py-1.5 text-sm text-stone-700 bg-white focus:ring-2 focus:ring-emerald-100 focus:border-emerald-300"
          >
            <option v-for="opt in solarTermOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <span class="text-sm font-medium text-stone-500 shrink-0">功效</span>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="eff in EFFICACY_OPTIONS"
              :key="eff"
              type="button"
              @click="toggleEfficacy(eff)"
              class="px-3 py-1 rounded-full text-sm transition"
              :class="efficacyFilters.includes(eff)
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                : 'bg-stone-50 text-stone-600 border border-stone-150 hover:bg-stone-100'"
            >
              {{ eff }}
            </button>
          </div>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <span class="text-sm font-medium text-stone-500 shrink-0">时长</span>
          <select
            v-model="timeRangeFilter"
            class="rounded-lg border border-stone-200 px-3 py-1.5 text-sm text-stone-700 bg-white focus:ring-2 focus:ring-emerald-100 focus:border-emerald-300"
          >
            <option v-for="opt in TIME_RANGES" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
        </div>
        <div v-if="hasActiveFilters()" class="pt-2 border-t border-stone-100">
          <button
            type="button"
            @click="clearAllFilters()"
            class="text-sm text-stone-500 hover:text-emerald-600 transition"
          >
            清空条件
          </button>
        </div>
      </div>
    </Transition>

    <div v-if="loading" class="text-center py-20 text-stone-500">⏳ 正在获取食谱...</div>
    <template v-else>
      <div v-if="filteredRecipes.length === 0" class="text-center py-16 px-4">
        <p class="text-stone-500 mb-4">未找到符合条件的食谱</p>
        <button
          v-if="hasActiveFilters()"
          type="button"
          @click="clearAllFilters(); showFilterPanel = true"
          class="text-emerald-600 hover:text-emerald-700 font-medium"
        >
          清空条件后重试
        </button>
      </div>
      <div v-else class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        <div v-for="recipe in filteredRecipes" :key="recipe.id" @click="openRecipe(recipe)"
        class="group bg-white rounded-xl shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer overflow-hidden border border-stone-100 flex flex-col relative">
        <div class="relative h-36 overflow-hidden">
          <img :src="recipe.image" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500">
          <div class="absolute bottom-1.5 left-1.5 flex gap-1.5">
            <span class="bg-black/60 backdrop-blur-sm text-white text-[10px] px-1.5 py-0.5 rounded-md flex items-center gap-1">
              <Clock :size="10" /> {{ recipe.time }}
            </span>
          </div>
          <button @click="(e) => toggleFavorite(e, recipe)" class="absolute top-1.5 right-1.5 bg-white/90 px-1.5 py-0.5 rounded-full shadow-sm hover:scale-110 transition z-10 flex items-center gap-1">
            <StarIcon :size="13" :class="recipe.is_favorite ? 'fill-yellow-400 text-yellow-400' : 'text-stone-400'" />
            <span class="text-[10px] text-stone-500 leading-none">{{ recipe.favorites_count || 0 }}</span>
          </button>
        </div>
        <div class="p-3 flex-1 flex flex-col">
          <h3 class="text-sm font-bold text-stone-800 mb-1 line-clamp-1">{{ recipe.name }}</h3>
          <div
            v-if="recipe.is_user_submission"
            class="flex items-center gap-1.5 mb-1.5 cursor-pointer w-fit rounded-lg px-1 -mx-1 hover:bg-stone-50"
            @click.stop="goToUserProfile(recipe.author_user_id, $event)"
          >
            <img
              v-if="recipe.author_display_avatar"
              :src="recipe.author_display_avatar"
              class="w-5 h-5 rounded-full object-cover border border-stone-200"
              alt="作者头像"
            />
            <div
              v-else
              class="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-[9px] font-bold"
            >{{ recipe.author_display_name?.[0] }}</div>
            <span class="text-[10px] text-stone-500 truncate max-w-[6rem]">{{ recipe.author_display_name }}</span>
            <span class="text-[9px] px-1 py-0 rounded border border-amber-200 bg-amber-50 text-amber-900 shrink-0">用户投稿</span>
          </div>
          <p class="text-[10px] text-stone-400 mb-2">{{ recipe.cooked_count }} 人做过</p>
          <div class="flex flex-wrap gap-1.5 mt-auto">
            <span class="text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded border border-emerald-100">{{ recipe.bodyType }}</span>
          </div>
        </div>
      </div>
    </div>
    </template>

    <Transition
      enter-active-class="transition duration-300 ease-out"
      enter-from-class="opacity-0 translate-y-4"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition duration-200 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 translate-y-4"
    >
      <Teleport to="body">
        <div v-if="selectedRecipe" class="fixed inset-0 z-[900] flex items-center justify-center p-4 sm:p-6 bg-black/40 backdrop-blur-[2px]">
          <div class="absolute inset-0" @click="closeRecipe"></div>
          <div class="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl h-[90vh] flex flex-col overflow-hidden z-10">
            
            <button @click="closeRecipe" class="absolute top-4 right-4 z-20 bg-black/20 backdrop-blur-md text-white p-2 rounded-full hover:bg-black/40 transition">
              <X :size="20" />
            </button>

            <div class="flex-1 overflow-y-auto custom-scrollbar bg-white pb-20">
              <div class="h-72 w-full shrink-0 relative">
                 <img :src="selectedRecipe.image" class="w-full h-full object-cover">
                 <div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-white to-transparent h-24"></div>
              </div>

              <div class="p-6 sm:p-8 -mt-6 relative z-10">
                <h2 class="text-3xl font-bold text-stone-900 mb-2">{{ selectedRecipe.name }}</h2>

                <div
                  v-if="selectedRecipe.is_user_submission"
                  class="flex items-center gap-3 mb-6 p-3 rounded-xl bg-amber-50/60 border border-amber-100 cursor-pointer hover:bg-amber-50/90"
                  @click="goToUserProfile(selectedRecipe.author_user_id, $event)"
                >
                  <img
                    v-if="selectedRecipe.author_display_avatar"
                    :src="selectedRecipe.author_display_avatar"
                    class="w-10 h-10 rounded-full object-cover border border-amber-200 shrink-0"
                    alt="作者头像"
                  />
                  <div
                    v-else
                    class="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-sm font-bold shrink-0"
                  >{{ selectedRecipe.author_display_name?.[0] }}</div>
                  <div class="min-w-0">
                    <div class="text-[10px] text-amber-800/80">发布者</div>
                    <div class="font-semibold text-stone-800 truncate">{{ selectedRecipe.author_display_name }}</div>
                  </div>
                  <span class="ml-auto text-[10px] px-2 py-0.5 rounded-full border border-amber-200 bg-white text-amber-900 shrink-0">用户实名投稿</span>
                </div>
                
                <div class="flex items-center gap-4 mb-8 bg-stone-50 p-4 rounded-xl border border-stone-100">
                   <div class="text-center px-4 border-r border-stone-200">
                      <div class="text-3xl font-bold text-amber-500">{{ selectedRecipe.rating }}</div>
                      <div class="text-[10px] text-stone-400">综合评分</div>
                   </div>
                   <div class="flex-1 pl-2">
                      <div class="text-sm text-stone-600 mb-2">
                        <span class="font-bold text-emerald-600">{{ selectedRecipe.cooked_count }}</span> 人已交作业
                      </div>
                      <div class="flex -space-x-2 overflow-hidden py-1">
                        <div v-for="(hw, i) in homeworks.slice(0, 5)" :key="i" class="w-8 h-8 rounded-full border-2 border-white bg-stone-200 overflow-hidden">
                          <img :src="hw.image_url" class="w-full h-full object-cover">
                        </div>
                      </div>
                   </div>
                </div>

                <div class="grid grid-cols-2 gap-4 mb-6">
                   <div class="bg-stone-50 p-3 rounded-xl border border-stone-100">
                      <span class="text-xs text-stone-400 block mb-1">适宜体质</span>
                      <span class="font-medium text-emerald-700 flex items-center gap-1"><UserCheck :size="14"/> {{ selectedRecipe.bodyType }}</span>
                   </div>
                   <div class="bg-stone-50 p-3 rounded-xl border border-stone-100">
                      <span class="text-xs text-stone-400 block mb-1">主要功效</span>
                      <span class="font-medium text-amber-700 flex items-center gap-1"><Sparkles :size="14"/> {{ selectedRecipe.efficacy.join('/') }}</span>
                   </div>
                </div>

                <div class="mb-8">
                  <h3 class="text-lg font-bold mb-4 flex items-center gap-2"><Soup :size="20" /> 所需食材</h3>
                  <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div v-for="(ing, idx) in selectedRecipe.ingredients" :key="idx"
                      class="flex items-center justify-between p-2 rounded-lg border transition-colors relative overflow-hidden"
                      :class="ing.isHerb ? 'bg-amber-50 border-amber-200 cursor-pointer hover:bg-amber-100 group' : 'bg-white border-stone-100'"
                      @click="ing.isHerb ? handleHerbClick(ing) : null"
                    >
                      <span :class="ing.isHerb ? 'text-amber-900 font-medium' : 'text-stone-600'">{{ ing.name }} <Leaf v-if="ing.isHerb" :size="12" class="inline ml-1 text-amber-500"/></span>
                      <span class="text-xs text-stone-400">{{ ing.amount }}</span>
                    </div>
                  </div>
                </div>

                <div class="mb-10">
                  <h3 class="text-lg font-bold mb-4 flex items-center gap-2"><ListOrdered :size="20" /> 烹饪步骤</h3>
                  <div class="space-y-6">
                    <div v-for="(step, idx) in selectedRecipe.steps" :key="idx" class="flex gap-4">
                      <div class="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-sm font-bold mt-0.5">{{ idx + 1 }}</div>
                      <p class="text-stone-600 leading-relaxed">{{ step }}</p>
                    </div>
                  </div>
                </div>

                <div class="mb-8">
                  <div class="flex items-center justify-between mb-4">
                    <h3 class="text-lg font-bold">大家的作品 ({{ homeworks.length }})</h3>
                    <button @click="triggerSelectImage" class="text-sm text-emerald-600 font-bold flex items-center gap-1">
                       <Camera :size="16" /> 我交作业
                    </button>
                  </div>
                  
                  <div class="space-y-4">
                    <div v-if="!homeworks.length" class="text-center py-6 bg-stone-50 rounded-xl text-stone-400 text-sm">暂无作业，快来抢沙发</div>
                    
                    <div v-for="hw in homeworks" :key="hw.id" 
                         @click="openHomeworkPage(hw)"
                         class="bg-white p-3 rounded-xl border border-stone-100 shadow-sm flex gap-4 cursor-pointer hover:border-emerald-200 transition">
                       
                       <div class="flex-1 min-w-0 flex flex-col">
                          <div class="flex items-center gap-2 mb-2">
                             <img
                               v-if="hw.user_display_avatar"
                               :src="hw.user_display_avatar"
                               class="w-6 h-6 rounded-full object-cover border border-stone-200 cursor-pointer"
                               alt="用户头像"
                               @click.stop="goToUserProfile(hw.user_id, $event)"
                             />
                             <div
                               v-else
                               class="w-6 h-6 rounded-full bg-stone-200 flex items-center justify-center text-[10px] text-stone-500 font-bold cursor-pointer"
                               @click.stop="goToUserProfile(hw.user_id, $event)"
                             >{{ hw.user_display_name?.[0] }}</div>
                             <span
                               class="text-xs text-stone-500 font-medium truncate cursor-pointer hover:text-emerald-700"
                               @click.stop="goToUserProfile(hw.user_id, $event)"
                             >{{ hw.user_display_name }}</span>
                             <span class="text-[10px] text-stone-300 ml-auto">{{ formatDate(hw.created_at) }}</span>
                          </div>
                          <p class="text-sm text-stone-800 line-clamp-2 mb-2">{{ hw.content }}</p>
                          <div class="flex flex-wrap gap-1 mt-auto">
                             <span v-for="tag in (hw.tags || [])" :key="tag" class="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">#{{ tag }}</span>
                          </div>
                       </div>
                       
                       <div class="w-24 h-24 rounded-lg bg-stone-100 overflow-hidden flex-shrink-0 relative">
                          <img :src="hw.image_url" class="w-full h-full object-cover">
                          <div v-if="hw.likes_count > 0" class="absolute bottom-1 right-1 bg-black/40 text-white text-[10px] px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                             <Heart :size="8" fill="white"/> {{ hw.likes_count }}
                          </div>
                       </div>
                    </div>
                  </div>
                </div>

                <div class="mb-4">
                  <h3 class="text-lg font-bold mb-4">评论 ({{ comments.length }})</h3>
                  <div class="space-y-4">
                    <div v-for="c in comments" :key="c.id" class="flex gap-3">
                      <div class="w-8 h-8 rounded-full bg-stone-200 flex items-center justify-center text-xs font-bold text-stone-500">{{ c.user_name?.[0] || '友' }}</div>
                      <div>
                        <div class="text-xs text-stone-400 mb-1">{{ c.user_name }}</div>
                        <p class="text-sm text-stone-700 bg-stone-50 p-2 rounded-r-lg rounded-bl-lg">{{ c.content }}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div class="bg-white border-t border-stone-100 p-3 px-6 flex items-center justify-between shrink-0 z-30 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
               <div class="flex items-center gap-2 bg-stone-100 rounded-full px-4 py-2 flex-1 mr-4">
                  <input v-model="newComment" @keyup.enter="submitComment" type="text" placeholder="说点什么..." class="bg-transparent text-sm w-full outline-none">
                  <button @click="submitComment" :disabled="isSubmitting" class="text-emerald-600"><Send :size="16" /></button>
               </div>
               
               <div class="flex items-center gap-4">
                   <div class="flex items-center gap-1.5 cursor-pointer hover:scale-105 transition" @click="(e) => toggleFavorite(e, selectedRecipe)">
                      <StarIcon :size="24" :class="selectedRecipe.is_favorite ? 'fill-yellow-400 text-yellow-400' : 'text-stone-400'" />
                      <span class="text-sm text-stone-500">{{ selectedRecipe.favorites_count || 0 }}</span>
                   </div>
                   <button @click="triggerSelectImage" class="bg-emerald-600 text-white px-5 py-2 rounded-full font-bold flex items-center gap-1 shadow-lg shadow-emerald-200 hover:bg-emerald-700 active:scale-95 transition cursor-pointer text-sm">
                      <Camera :size="16" /> 交作业
                   </button>
               </div>
               <input id="hidden-file-input" type="file" accept="image/*" class="hidden" @change="onFileSelected">
            </div>
          </div>
        </div>
      </Teleport>
    </Transition>

    <Transition
      enter-active-class="transition duration-300 ease-out"
      enter-from-class="opacity-0 translate-x-full"
      enter-to-class="opacity-100 translate-x-0"
      leave-active-class="transition duration-300 ease-in"
      leave-from-class="opacity-100 translate-x-0"
      leave-to-class="opacity-0 translate-x-full"
    >
      <Teleport to="body">
        <div v-if="showHomeworkPage && selectedHomework" class="fixed inset-0 z-[1000] bg-white flex flex-col overflow-hidden">
           
           <div class="h-14 border-b border-stone-100 flex items-center justify-between px-4 bg-white shrink-0 z-10">
              <button @click="closeHomeworkPage" class="p-2 -ml-2 text-stone-800 hover:bg-stone-50 rounded-full">
                 <ChevronLeft :size="24" />
              </button>
              <div class="font-bold text-base flex items-center gap-2">
                 <img
                   v-if="selectedHomework.user_display_avatar"
                   :src="selectedHomework.user_display_avatar"
                   class="w-6 h-6 rounded-full object-cover border border-stone-200 cursor-pointer"
                   alt="用户头像"
                   @click.stop="goToUserProfile(selectedHomework.user_id, $event)"
                 />
                 <div
                   v-else
                   class="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center text-[10px] font-bold text-emerald-700 cursor-pointer"
                   @click.stop="goToUserProfile(selectedHomework.user_id, $event)"
                 >{{ selectedHomework.user_display_name?.[0] }}</div>
                 <span
                   class="cursor-pointer hover:text-emerald-700"
                   @click.stop="goToUserProfile(selectedHomework.user_id, $event)"
                 >{{ selectedHomework.user_display_name }}</span>
              </div>
              <button class="p-2 -mr-2 text-stone-800"><MoreHorizontal :size="24" /></button>
           </div>

           <div class="flex-1 overflow-y-auto custom-scrollbar">
              <div class="w-full bg-stone-50">
                 <img :src="selectedHomework.image_url" class="w-full h-auto max-h-[70vh] object-contain mx-auto" />
              </div>

              <div class="p-5 pb-20 max-w-2xl mx-auto">
                 <h1 class="text-xl font-bold text-stone-900 mb-3 leading-relaxed">{{ selectedHomework.content }}</h1>
                 
                 <div class="flex flex-wrap gap-2 mb-6">
                    <span v-for="tag in (selectedHomework.tags || [])" :key="tag" class="text-sm text-blue-600">#{{ tag }}</span>
                    <span class="text-sm text-stone-400 ml-auto">{{ formatDate(selectedHomework.created_at) }}</span>
                 </div>

                 <div class="border-t border-stone-100 my-6"></div>

                 <h3 class="font-bold text-base mb-4">评论 ({{ homeworkComments.length }})</h3>
                 <div class="space-y-6">
                    <div v-if="!homeworkComments.length" class="text-center text-stone-400 py-4 text-sm">还没有人评论，快来抢沙发～</div>
                    <div v-for="comment in homeworkComments" :key="comment.id" class="flex gap-3">
                       <div class="w-8 h-8 rounded-full bg-stone-100 flex-shrink-0 flex items-center justify-center text-xs font-bold">{{ comment.user_name?.[0] }}</div>
                       <div class="flex-1">
                          <div class="flex items-center justify-between">
                             <span class="text-xs text-stone-500 font-bold">{{ comment.user_name }}</span>
                          </div>
                          <p class="text-sm text-stone-800 mt-1 leading-relaxed">{{ comment.content }}</p>
                       </div>
                    </div>
                 </div>
              </div>
           </div>

           <div class="h-14 border-t border-stone-100 px-4 flex items-center gap-4 bg-white shrink-0 max-w-2xl mx-auto w-full">
              <div class="flex-1 bg-stone-100 rounded-full h-9 flex items-center px-4 gap-2">
                 <input v-model="newHomeworkComment" @keyup.enter="submitHomeworkComment" type="text" placeholder="说点好听的..." class="bg-transparent text-sm w-full outline-none">
              </div>
              
              <button @click="toggleHomeworkLike" class="flex flex-col items-center gap-0.5 min-w-[32px]">
                 <Heart :size="22" :class="homeworkIsLiked ? 'fill-red-500 text-red-500' : 'text-stone-800'" />
                 <span class="text-[10px] text-stone-500">{{ selectedHomework.likes_count || '赞' }}</span>
              </button>

              <button
                v-if="currentUser && selectedHomework && currentUser.id === selectedHomework.user_id"
                @click="deleteSelectedHomework"
                class="flex items-center gap-1 text-xs text-red-500 px-3 py-1.5 rounded-full border border-red-200 hover:bg-red-50"
              >
                <Trash2 :size="14" />
                删除作业
              </button>

              </div>
        </div>
      </Teleport>
    </Transition>

    <Transition
      enter-active-class="transition duration-300 ease-out"
      enter-from-class="opacity-0 scale-95"
      enter-to-class="opacity-100 scale-100"
      leave-active-class="transition duration-200 ease-in"
      leave-from-class="opacity-100 scale-100"
      leave-to-class="opacity-0 scale-95"
    >
      <Teleport to="body">
        <div v-if="showUploadModal" class="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
           <div class="bg-white w-full max-w-md rounded-2xl overflow-hidden flex flex-col max-h-[90vh]">
              <div class="flex items-center justify-between px-4 py-3 border-b border-stone-100">
                 <button @click="closeUploadModal" class="p-2 -ml-2 text-stone-400 hover:text-stone-600"><X :size="24"/></button>
                 <h3 class="font-bold text-lg">发布作业</h3>
                 <button @click="submitHomework" :disabled="isSubmitting" class="bg-emerald-600 text-white px-4 py-1.5 rounded-full text-sm font-bold disabled:opacity-50 flex items-center gap-1">
                    <Loader2 v-if="isSubmitting" :size="14" class="animate-spin" /> {{ isSubmitting ? '发布中' : '发布' }}
                 </button>
              </div>
              <div class="flex-1 overflow-y-auto p-4">
                 <div class="aspect-square bg-stone-100 rounded-xl overflow-hidden mb-4 relative shadow-inner border border-stone-200">
                    <img v-if="uploadPreview" :src="uploadPreview" class="w-full h-full object-cover" />
                    <button @click="triggerSelectImage" class="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-3 py-1.5 rounded-full backdrop-blur hover:bg-black/70 transition">更换图片</button>
                 </div>
                 <div class="space-y-4">
                    <div><textarea v-model="uploadContent" placeholder="填写您的制作心得，分享给更多人吧..." rows="4" class="w-full p-3 bg-stone-50 rounded-xl border-none resize-none focus:ring-2 focus:ring-emerald-100 placeholder:text-stone-400 text-sm"></textarea></div>
                    <div class="flex items-center gap-2 border-t border-stone-100 pt-4">
                       <Tag :size="16" class="text-stone-400" />
                       <input v-model="uploadTags" type="text" placeholder="添加标签 (如：养生 早餐，用空格分隔)" class="flex-1 outline-none text-sm text-stone-600 placeholder:text-stone-300">
                    </div>
                 </div>
              </div>
           </div>
        </div>
      </Teleport>
    </Transition>

    </div>
  </div>
</template>

<style scoped>
/* 背景仅用视口尺寸做 cover：若伪元素跟整页一起变高，cover 会按「超长」画布放大竖边，加载后明显变糊 */
.recipe-market-page {
  position: relative;
  background-color: #f0ebe3;
}

.recipe-market-page::before {
  content: "";
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background-color: #f0ebe3;
  background-image: url("/photo/shipu_background.jpg");
  background-repeat: no-repeat;
  background-position: center;
  background-size: cover;
}

::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background-color: #d6d3d1; border-radius: 20px; }
</style>

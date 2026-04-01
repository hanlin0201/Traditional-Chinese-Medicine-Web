import { supabase } from '@/supabaseClient'

const TTL_MS = 5 * 60 * 1000
const HERB_CACHE_KEY_PAGE1 = 'herb_list_page_1'
const RECIPE_CACHE_KEY = 'recipe_market_cache_v2'

function setCache(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }))
  } catch (e) {
    console.warn('preload setCache failed', e)
  }
}

function getCache(key) {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const { data, timestamp } = JSON.parse(raw)
    if (Date.now() - timestamp > TTL_MS) return null
    return data
  } catch {
    return null
  }
}

function normalizeRecipe(item) {
  return {
    ...item,
    bodyType: item.body_type,
    efficacy: item.efficacy || [],
    ingredients: item.ingredients || [],
    steps: item.steps || [],
    rating: item.rating || (8.5 + Math.random()).toFixed(1),
    cooked_count: item.cooked_count || 0,
    // 预加载阶段无法确定用户收藏，进入页面后会再校正
    is_favorite: false,
  }
}

let preloadPromise = null

export function getRecipeMarketCachedData() {
  return getCache(RECIPE_CACHE_KEY)
}

export function setRecipeMarketCachedData(data) {
  setCache(RECIPE_CACHE_KEY, data)
}

/** 食谱广场数据有更新（审核/删除）时调用，避免读到旧缓存 */
export function clearRecipeMarketCache() {
  try {
    localStorage.removeItem(RECIPE_CACHE_KEY)
  } catch (e) {
    console.warn('clearRecipeMarketCache failed', e)
  }
}

// 个人中心会话级缓存，供 ProfileView 和预加载共享
export const profileCache = { userId: null, payload: null }

// 食谱互动缓存：按 recipe_id 分组的评论和作业，供 RecipeMarket 秒开
export const interactionsCache = {
  comments: {},  // { [recipe_id]: Comment[] }
  homeworks: {}, // { [recipe_id]: HomeworkWithDisplay[] }
  loaded: false,
}

const _interactionsLoadedCallbacks = []
export function onInteractionsLoaded(cb) {
  if (interactionsCache.loaded) { cb(); return }
  _interactionsLoadedCallbacks.push(cb)
}

async function warmInteractions() {
  if (interactionsCache.loaded) return

  const [{ data: allComments }, { data: allHomeworks }] = await Promise.all([
    supabase.from('comments').select('*').order('created_at', { ascending: false }),
    supabase.from('homeworks').select('*').order('created_at', { ascending: false }),
  ])

  // 批量拉取所有作业作者的 profile
  const allHomeworksArr = allHomeworks || []
  const userIds = [...new Set(allHomeworksArr.map(hw => hw.user_id).filter(Boolean))]
  let profilesById = {}
  if (userIds.length) {
    const { data: profileRows } = await supabase
      .from('profiles')
      .select('id, username, avatar_url')
      .in('id', userIds)
    profilesById = Object.fromEntries((profileRows || []).map(p => [String(p.id), p]))
  }

  // 评论按 recipe_id 分组
  for (const c of (allComments || [])) {
    const key = c.recipe_id
    if (!interactionsCache.comments[key]) interactionsCache.comments[key] = []
    interactionsCache.comments[key].push(c)
  }

  // 作业按 recipe_id 分组，同时附上用户展示信息
  for (const hw of allHomeworksArr) {
    const key = hw.recipe_id
    if (!interactionsCache.homeworks[key]) interactionsCache.homeworks[key] = []
    const profile = hw.user_id ? profilesById[String(hw.user_id)] : null
    interactionsCache.homeworks[key].push({
      ...hw,
      user_display_name: profile?.username || hw.user_name || '养生达人',
      user_display_avatar: profile?.avatar_url || null,
    })
  }

  interactionsCache.loaded = true
  _interactionsLoadedCallbacks.forEach(cb => cb())
  _interactionsLoadedCallbacks.length = 0
}

async function warmProfile() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  const uid = user.id
  if (profileCache.userId === uid && profileCache.payload) return

  const [
    { data: profileData },
    { data: herbsData },
    { data: favRecsLinkData },
    { data: worksData },
    { data: dbRecipesData },
  ] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', uid).single(),
    supabase.from('favorite_herbs').select('*, herb:herbs(*)').eq('user_id', uid).order('created_at', { ascending: false }),
    supabase.from('favorite_recipes').select('id, recipe_id, created_at').eq('user_id', uid).order('created_at', { ascending: false }),
    supabase.from('homeworks').select('*').eq('user_id', uid).order('created_at', { ascending: false }),
    supabase.from('recipes').select('*').eq('author_user_id', uid).order('created_at', { ascending: false }),
  ])

  if (!profileData) return

  // 收藏药材
  const favoriteHerbs = (herbsData || []).map((item) => ({
    ...item.herb,
    favorite_id: item.id,
    saved_at: item.created_at,
  }))

  // 广场收藏食谱
  let marketRecipes = []
  if (favRecsLinkData && favRecsLinkData.length > 0) {
    const recipeIds = favRecsLinkData.map((f) => f.recipe_id)
    const { data: recipeDetails } = await supabase.from('recipes').select('*').in('id', recipeIds)
    if (recipeDetails) {
      const recipeMap = Object.fromEntries(recipeDetails.map((r) => [r.id, r]))
      marketRecipes = favRecsLinkData
        .filter((f) => recipeMap[f.recipe_id])
        .map((f) => ({
          ...recipeMap[f.recipe_id],
          favorite_id: f.id,
          saved_at: f.created_at,
          is_ai: false,
          tags: recipeMap[f.recipe_id].tags || ['广场精选'],
        }))
    }
  }

  // AI 保存食谱
  const aiRecipes = (profileData.saved_recipes && Array.isArray(profileData.saved_recipes))
    ? profileData.saved_recipes.map((r) => ({
        ...r,
        id: r.id || `ai-${Date.now()}-${Math.random()}`,
        is_ai: true,
        saved_at: r.saved_at || new Date().toISOString(),
        ingredients: r.ingredients || [],
        steps: r.steps || [],
        tags: r.tags || ['AI推荐'],
      }))
    : []

  profileCache.userId = uid
  profileCache.payload = {
    profile: profileData,
    username: profileData.username || '',
    avatar_url: profileData.avatar_url || '',
    bio: profileData.bio || '',
    privacySettings: {
      plans: profileData.is_plans_private ?? true,
      recipes: profileData.is_saved_private ?? false,
      herbs: profileData.is_herbs_private ?? false,
    },
    carePlans: (profileData.care_plans || []).sort((a, b) => new Date(b.saved_at) - new Date(a.saved_at)),
    favoriteHerbs,
    savedRecipes: [...marketRecipes, ...aiRecipes].sort((a, b) => new Date(b.saved_at) - new Date(a.saved_at)),
    myWorks: worksData || [],
    myRecipes: (profileData.my_recipes && Array.isArray(profileData.my_recipes)) ? profileData.my_recipes : [],
    dbMyRecipes: dbRecipesData || [],
  }
}

export async function preloadHomeFeaturePages() {
  if (preloadPromise) return preloadPromise

  preloadPromise = (async () => {
    // 1) 预热路由懒加载 chunk，减少首次点击导航时的 JS 下载等待
    const warmChunks = Promise.allSettled([
      import('@/views/HomeView.vue'),
      import('@/views/RecipeMarket.vue'),
      import('@/views/ProfileView.vue'),
    ])

    // 2) 首页药材列表首屏数据预加载（与 useHerbData 缓存 key 对齐）
    const warmHerbs = (async () => {
      if (getCache(HERB_CACHE_KEY_PAGE1)) return
      const { data, error } = await supabase
        .from('herbs')
        .select('*')
        .order('id', { ascending: true })
        .range(0, 19)
      if (!error && data) setCache(HERB_CACHE_KEY_PAGE1, data)
    })()

    // 3) 食谱列表数据预加载（供 RecipeMarket 首屏秒开）
    const warmRecipes = (async () => {
      if (getCache(RECIPE_CACHE_KEY)) return
      const { data, error } = await supabase
        .from('recipes')
        .select('*')
        .or('moderation_status.eq.published,moderation_status.is.null')
        .order('id')
      if (!error && data) {
        setCache(RECIPE_CACHE_KEY, data.map(normalizeRecipe))
      }
    })()

    // 4) 个人中心数据预加载（供 ProfileView 首屏秒开）
    const warmProfileData = warmProfile()

    // 5) 食谱互动数据预加载（供 RecipeMarket 点进食谱秒开评论/作业）
    const warmInteractionsData = warmInteractions()

    await Promise.allSettled([warmChunks, warmHerbs, warmRecipes, warmProfileData, warmInteractionsData])
  })()

  return preloadPromise
}

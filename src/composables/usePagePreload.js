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
  comments: {},      // { [recipe_id]: Comment[] }
  homeworks: {},     // { [recipe_id]: HomeworkWithDisplay[] }
  homeworksById: {}, // { [hw_id]: homework } 平铺索引，供 WorkDetailView 秒开
  profilesById: {},  // { [user_id]: profile }  作业作者 profile 快查
  loaded: false,
}

// WorkDetail 详情缓存：{ homework, authorProfile, recipe }
export const homeworkDetailCache = new Map()

// 药材详情缓存：{ [name]: herbData }（供 HerbDetailView 秒开）
export const herbDetailCache = new Map()

export function getHerbDetailCache(name) {
  return herbDetailCache.get(name) ?? null
}

// 通俗版药材缓存：{ [name]: herbEasyData }（供 HerbDetailView identity_tag 秒显）
export const herbEasyCache = new Map()

export function getHerbEasyCache(name) {
  return herbEasyCache.get(name) ?? null
}

export function setHerbEasyCache(name, data) {
  if (name && data) herbEasyCache.set(name, data)
}

// 穴位详情缓存：{ [name]: { name, position, disease } }
export const acupointCache = new Map()

export function getAcupointCache(name) {
  return acupointCache.get(name) ?? null
}

export function setAcupointCache(name, data) {
  acupointCache.set(name, data)
}

export function getHomeworkDetailCache(id) {
  return homeworkDetailCache.get(String(id)) ?? null
}

/** 在用户触摸/悬停作业卡片时调用，提前把详情数据装进缓存 */
export async function prefetchHomeworkDetail(id) {
  if (!id) return
  const key = String(id)
  if (homeworkDetailCache.has(key)) return

  const hw = interactionsCache.homeworksById[key]
  if (!hw) return

  const profile = hw.user_id ? interactionsCache.profilesById[String(hw.user_id)] : null
  let recipe = null

  if (hw.recipe_id) {
    const cachedRecipes = getCache(RECIPE_CACHE_KEY)
    recipe = cachedRecipes?.find(r => String(r.id) === String(hw.recipe_id)) ?? null
    if (!recipe) {
      try {
        const { data } = await supabase
          .from('recipes')
          .select('id, name, image, time, body_type, efficacy')
          .eq('id', hw.recipe_id)
          .single()
        recipe = data ?? null
      } catch {}
    }
  }

  homeworkDetailCache.set(key, { homework: hw, authorProfile: profile ?? null, recipe })
}

const _interactionsLoadedCallbacks = []
export function onInteractionsLoaded(cb) {
  if (interactionsCache.loaded) { cb(); return }
  _interactionsLoadedCallbacks.push(cb)
}

async function warmInteractions() {
  if (interactionsCache.loaded) return

  // 重试前清空，防止上次部分写入导致数据累加重复
  interactionsCache.comments = {}
  interactionsCache.homeworks = {}
  interactionsCache.homeworksById = {}

  try {
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
    interactionsCache.profilesById = profilesById

    // 评论按 recipe_id 分组
    for (const c of (allComments || [])) {
      const key = c.recipe_id
      if (!interactionsCache.comments[key]) interactionsCache.comments[key] = []
      interactionsCache.comments[key].push(c)
    }

    // 作业按 recipe_id 分组，同时附上用户展示信息；同时建平铺 id 索引
    for (const hw of allHomeworksArr) {
      const profile = hw.user_id ? profilesById[String(hw.user_id)] : null
      const enriched = {
        ...hw,
        user_display_name: profile?.username || hw.user_name || '养生达人',
        user_display_avatar: profile?.avatar_url || null,
      }
      const recipeKey = hw.recipe_id
      if (!interactionsCache.homeworks[recipeKey]) interactionsCache.homeworks[recipeKey] = []
      interactionsCache.homeworks[recipeKey].push(enriched)
      interactionsCache.homeworksById[String(hw.id)] = enriched
    }

    interactionsCache.loaded = true
  } catch (e) {
    console.warn('warmInteractions failed, will retry on next preload', e)
  } finally {
    _interactionsLoadedCallbacks.forEach(cb => cb())
    _interactionsLoadedCallbacks.length = 0
  }
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

  // 收藏药材（同时并行拉 identity_tag，避免 ProfileView 初始显示回退文字）
  const rawHerbs = (herbsData || []).map((item) => ({
    ...item.herb,
    favorite_id: item.id,
    saved_at: item.created_at,
  }))
  const herbNames = rawHerbs.map(h => h.name).filter(Boolean)
  let identityTagMap = {}
  if (herbNames.length) {
    const { data: easyData } = await supabase.from('herbseasy').select('*').in('name', herbNames)
    if (easyData) {
      easyData.forEach(e => { if (e.name) herbEasyCache.set(e.name, e) })
      identityTagMap = Object.fromEntries(easyData.map(e => [e.name, e.identity_tag]))
    }
  }
  const favoriteHerbs = rawHerbs.map(h => ({ ...h, identity_tag: identityTagMap[h.name] ?? null }))
  // 填充药材详情缓存，供 HerbDetailView 秒开
  favoriteHerbs.forEach(h => { if (h?.name) herbDetailCache.set(h.name, h) })

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
    let failed = false
    // 1) 预热路由懒加载 chunk，减少首次点击导航时的 JS 下载等待
    const warmChunks = Promise.allSettled([
      import('@/views/HomeView.vue'),
      import('@/views/RecipeMarket.vue'),
      import('@/views/ProfileView.vue'),
    ])

    // 2) 首页药材列表首屏数据预加载（与 useHerbData 缓存 key 对齐）
    const warmHerbs = (async () => {
      let herbNames = null
      const cached = getCache(HERB_CACHE_KEY_PAGE1)
      if (cached) {
        herbNames = cached.map(h => h.name).filter(Boolean)
      } else {
        const { data, error } = await supabase
          .from('herbs')
          .select('*')
          .order('id', { ascending: true })
          .range(0, 19)
        if (!error && data) {
          setCache(HERB_CACHE_KEY_PAGE1, data)
          herbNames = data.map(h => h.name).filter(Boolean)
        }
      }
      // 顺带预热首屏药材的通俗版数据，供点击后立刻显示
      if (herbNames && herbNames.length && herbEasyCache.size === 0) {
        const { data: easyData } = await supabase
          .from('herbseasy')
          .select('*')
          .in('name', herbNames)
        if (easyData) easyData.forEach(e => { if (e.name) herbEasyCache.set(e.name, e) })
      }
    })()

    // 3) 食谱列表数据预加载（供 RecipeMarket 首屏秒开）
    const warmRecipes = (async () => {
      if (getCache(RECIPE_CACHE_KEY)) return
      const [{ data, error }, { data: favCounts }] = await Promise.all([
        supabase.from('recipes').select('*').or('moderation_status.eq.published,moderation_status.is.null').order('id'),
        supabase.from('favorite_recipes').select('recipe_id'),
      ])
      if (!error && data) {
        const favCountMap = {}
        if (favCounts) favCounts.forEach(f => { favCountMap[f.recipe_id] = (favCountMap[f.recipe_id] || 0) + 1 })
        setCache(RECIPE_CACHE_KEY, data.map(item => ({ ...normalizeRecipe(item), favorites_count: favCountMap[item.id] || 0 })))
      }
    })()

    // 4) 个人中心数据预加载（供 ProfileView 首屏秒开）
    const warmProfileData = warmProfile()

    // 5) 食谱互动数据预加载（供 RecipeMarket 点进食谱秒开评论/作业）
    const warmInteractionsData = warmInteractions()

    // 6) 穴位全表预加载（供 AcupointView 点击秒开详情）
    const warmAcupoints = (async () => {
      if (acupointCache.size > 0) return
      const { data } = await supabase.from('acupoint').select('name, position, disease')
      if (data) data.forEach(item => acupointCache.set(item.name, item))
    })()

    await Promise.allSettled([warmChunks, warmHerbs, warmRecipes, warmProfileData, warmInteractionsData, warmAcupoints])
    // 子任务内部用 if(!error&&data) 吞掉了异常，永远不会 reject。
    // 所以改为直接检查关键缓存是否真的写入成功，任一缺失则重置，允许下次重跑。
    const herbsOk = getCache(HERB_CACHE_KEY_PAGE1) !== null
    const recipesOk = getCache(RECIPE_CACHE_KEY) !== null
    const acupointsOk = acupointCache.size > 0
    const interactionsOk = interactionsCache.loaded
    if (!herbsOk || !recipesOk || !acupointsOk || !interactionsOk) preloadPromise = null
  })()

  return preloadPromise
}

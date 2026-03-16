import { supabase } from '@/supabaseClient'

const TTL_MS = 5 * 60 * 1000
const HERB_CACHE_KEY_PAGE1 = 'herb_list_page_1'
const RECIPE_CACHE_KEY = 'recipe_market_cache_v1'

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

export async function preloadHomeFeaturePages() {
  if (preloadPromise) return preloadPromise

  preloadPromise = (async () => {
    // 1) 预热路由懒加载 chunk，减少首次点击导航时的 JS 下载等待
    const warmChunks = Promise.allSettled([
      import('@/views/HomeView.vue'),
      import('@/views/RecipeMarket.vue'),
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
      const { data, error } = await supabase.from('recipes').select('*').order('id')
      if (!error && data) {
        setCache(RECIPE_CACHE_KEY, data.map(normalizeRecipe))
      }
    })()

    await Promise.allSettled([warmChunks, warmHerbs, warmRecipes])
  })()

  return preloadPromise
}

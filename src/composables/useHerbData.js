/**
 * useHerbData - 药材数据组合式（Supabase + LocalStorage + 分页）
 * useHerbList: 分页 + 首页 Stale-While-Revalidate
 * useHerbDetail: 详情优先 localStorage，否则 Supabase
 *
 * 若 herbs 表用 created_at 等排序，可将 .order('id', …) 改为 .order('created_at', { ascending: true })
 */

import { ref } from 'vue'
import { supabase } from '@/supabaseClient'

const TTL_MS = 5 * 60 * 1000
const PAGE_SIZE = 20
const CACHE_KEY_PAGE1 = 'herb_list_page_1'
const HERB_DETAIL_PREFIX = 'herb_detail_'

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

function setCache(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }))
  } catch (e) {
    console.warn('useHerbData: setCache failed', e)
  }
}

function normalizeTags(tags) {
  if (Array.isArray(tags)) return tags
  if (typeof tags === 'string' && tags) return tags.split(',').map(s => s.trim()).filter(Boolean)
  return []
}

function normalizeHerbs(arr) {
  return (arr || []).map(h => ({ ...h, tags: normalizeTags(h.tags) }))
}

/**
 * 药材列表：分页 + 首页 SWR
 * @returns {{ herbs, loading, error, load, loadMore, hasMore, loadingMore }}
 */
export function useHerbList() {
  const herbs = ref([])
  const loading = ref(false)
  const error = ref(null)
  const hasMore = ref(true)
  const loadingMore = ref(false)
  let nextOffset = PAGE_SIZE

  async function load() {
    // 清除旧缓存，确保获取最新数据
    localStorage.removeItem(CACHE_KEY_PAGE1)
    
    loading.value = true
    error.value = null
    try {
      // 加载药材，按ID降序（新数据在前）
      const { data, error: e } = await supabase
        .from('herbs')
        .select('*')
        .order('id', { ascending: false })
        .range(0, PAGE_SIZE - 1)
      if (e) throw e
      
      const norm = normalizeHerbs(data || [])
      
      // 调试：打印前3条数据的image_url
      console.log('=== 调试：加载的药材数据 ===')
      norm.slice(0, 3).forEach(h => {
        console.log(`${h.name} (ID:${h.id}): image_url = ${h.image_url}`)
      })
      
      herbs.value = norm
      setCache(CACHE_KEY_PAGE1, norm)
      nextOffset = PAGE_SIZE
      hasMore.value = norm.length >= PAGE_SIZE
    } catch (e) {
      error.value = e
      herbs.value = []
    } finally {
      loading.value = false
    }
  }

  async function loadMore() {
    if (loadingMore.value || !hasMore.value) return
    loadingMore.value = true
    try {
      const { data, error: e } = await supabase
        .from('herbs')
        .select('*')
        .order('id', { ascending: false })
        .range(nextOffset, nextOffset + PAGE_SIZE - 1)
      if (e) return
      const norm = normalizeHerbs(data || [])
      herbs.value = [...herbs.value, ...norm]
      nextOffset += PAGE_SIZE
      hasMore.value = norm.length >= PAGE_SIZE
    } finally {
      loadingMore.value = false
    }
  }

  return { herbs, loading, error, load, loadMore, hasMore, loadingMore }
}

/**
 * 药材详情：优先 localStorage，否则 Supabase
 * @param {Ref<number|string>|number|string} id
 */
export function useHerbDetail(id) {
  const herb = ref(null)
  const loading = ref(false)
  const error = ref(null)

  function cacheKey(v) {
    return `${HERB_DETAIL_PREFIX}${v}`
  }

  async function load(idVal) {
    const v = idVal ?? (typeof id === 'object' && id?.value != null ? id.value : id)
    if (v == null || v === '') {
      herb.value = null
      return
    }
    const cached = getCache(cacheKey(v))
    if (cached) {
      herb.value = { ...cached, tags: normalizeTags(cached.tags) }
      return
    }
    loading.value = true
    error.value = null
    try {
      const idParam = /^\d+$/.test(String(v)) ? Number(v) : v
      const { data, error: e } = await supabase
        .from('herbs')
        .select('*')
        .eq('id', idParam)
        .single()
      if (e) throw e
      herb.value = data ? { ...data, tags: normalizeTags(data.tags) } : null
      if (data) setCache(cacheKey(v), data)
    } catch (e) {
      error.value = e
      herb.value = null
    } finally {
      loading.value = false
    }
  }

  return { herb, loading, error, load }
}

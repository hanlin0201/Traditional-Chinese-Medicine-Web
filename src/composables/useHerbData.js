/**
 * useHerbData - 药材数据组合式（Supabase + LocalStorage + 分页）
 * useHerbList: 分页 + 首页 Stale-While-Revalidate
 * useHerbDetail: 详情优先 localStorage，否则 Supabase
 *
 * 若 herbs 表用 created_at 等排序，可将 .order('id', …) 改为 .order('created_at', { ascending: true })
 */

import { ref, shallowRef } from 'vue'
import { pinyin } from 'pinyin-pro'
import { supabase } from '@/supabaseClient'
import { getHerbDetailEffectsByName } from '@/composables/useHerbTags'

function getFirstLetter(name) {
  if (!name) return '#'
  const firstChar = name.charAt(0)
  if (/[A-Za-z]/.test(firstChar)) return firstChar.toUpperCase()
  const py = pinyin(firstChar, { toneType: 'none', type: 'array' })
  if (py && py[0]) return py[0].charAt(0).toUpperCase()
  return '#'
}

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
  return (arr || []).map(h => ({
    ...h,
    tags: normalizeTags(h.tags),
    detailEffects: getHerbDetailEffectsByName(h.name),
    firstLetter: h.firstLetter != null ? h.firstLetter : getFirstLetter(h.name),
  }))
}

/**
 * 药材列表：分页 + 首页 SWR
 * @returns {{ herbs, loading, error, load, loadMore, hasMore, loadingMore }}
 */
export function useHerbList() {
  const herbs = shallowRef([])
  const loading = ref(false)
  const error = ref(null)
  const hasMore = ref(true)
  const loadingMore = ref(false)
  let nextOffset = PAGE_SIZE

  const TIMEOUT_MS = 5000
  const RETRY_DELAYS = [800, 2000] // 自动重试 2 次，失败间隔递增
  const makeTimeout = () => new Promise((_, reject) =>
    setTimeout(() => reject(new Error('timeout')), TIMEOUT_MS)
  )
  const fetchPage1 = () => Promise.race([
    supabase.from('herbs').select('*').order('id', { ascending: true }).range(0, PAGE_SIZE - 1),
    makeTimeout(),
  ])

  async function load() {
    const cached = getCache(CACHE_KEY_PAGE1)
    if (cached && Array.isArray(cached)) {
      // 有缓存：立即展示，后台静默重试刷新
      herbs.value = normalizeHerbs(cached)
      loading.value = false
      nextOffset = PAGE_SIZE
      hasMore.value = cached.length >= PAGE_SIZE
      for (let i = 0; i <= RETRY_DELAYS.length; i++) {
        try {
          const { data, error: e } = await fetchPage1()
          if (!e && data) {
            const norm = normalizeHerbs(data)
            herbs.value = norm
            setCache(CACHE_KEY_PAGE1, norm)
            hasMore.value = norm.length >= PAGE_SIZE
          }
          return
        } catch {
          if (i < RETRY_DELAYS.length) await new Promise(r => setTimeout(r, RETRY_DELAYS[i]))
        }
      }
      return
    }

    // 无缓存：用户看到转圈，后台自动重试，全失败才报错
    loading.value = true
    error.value = null
    let lastErr = null
    for (let i = 0; i <= RETRY_DELAYS.length; i++) {
      try {
        const { data, error: e } = await fetchPage1()
        if (e) throw e
        const norm = normalizeHerbs(data || [])
        herbs.value = norm
        setCache(CACHE_KEY_PAGE1, norm)
        nextOffset = PAGE_SIZE
        hasMore.value = norm.length >= PAGE_SIZE
        loading.value = false
        return
      } catch (e) {
        lastErr = e
        if (i < RETRY_DELAYS.length) await new Promise(r => setTimeout(r, RETRY_DELAYS[i]))
      }
    }
    error.value = lastErr
    herbs.value = []
    loading.value = false
  }

  async function loadMore() {
    if (loadingMore.value || !hasMore.value) return
    loadingMore.value = true
    try {
      const { data, error: e } = await Promise.race([
        supabase.from('herbs').select('*').order('id', { ascending: true }).range(nextOffset, nextOffset + PAGE_SIZE - 1),
        makeTimeout(),
      ])
      if (e) return
      const norm = normalizeHerbs(data || [])
      herbs.value = [...herbs.value, ...norm]
      nextOffset += PAGE_SIZE
      hasMore.value = norm.length >= PAGE_SIZE
    } catch {} finally {
      loadingMore.value = false
    }
  }

  // 全量加载标记
  let allLoaded = false

  /**
   * 一次性加载全部药材数据（用于 A-Z 过滤 / 搜索场景）
   * 如果已经加载过全量数据则直接返回，不重复请求
   */
  async function loadAll() {
    if (allLoaded) return
    loadingMore.value = true
    try {
      const { data, error: e } = await Promise.race([
        supabase.from('herbs').select('*').order('id', { ascending: true }),
        makeTimeout(),
      ])
      if (e) return
      herbs.value = normalizeHerbs(data || [])
      hasMore.value = false
      allLoaded = true
    } catch {} finally {
      loadingMore.value = false
    }
  }

  return { herbs, loading, error, load, loadMore, hasMore, loadingMore, loadAll }
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

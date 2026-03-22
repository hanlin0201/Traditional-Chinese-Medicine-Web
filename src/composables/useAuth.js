/**
 * 门禁、会话与个人资料（useAuth）
 * - user / profile 状态
 * - 登录 / 注册 / 登出 / 游客 / profiles 读写
 * - 刷新恢复：Supabase 会话 + localStorage 游客标记
 */

import { ref, computed } from 'vue'
import { supabase } from '@/supabaseClient'
import * as auth from '@/auth'
import { ADMIN_LOGIN_EMAIL } from '@/utils/loginEmail'

const GUEST_KEY = 'herb_guest'

const user = ref(null)
const profile = ref(null)
const isGuest = ref(false)

async function _fetchProfile() {
  if (!user.value?.id) return
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.value.id)
    .maybeSingle()
  if (error && error.code !== 'PGRST116') {
    console.warn('profiles 读取失败', error)
  }
  profile.value = data
    ? {
        username: data.username ?? '',
        bio: data.bio ?? '',
        avatar_url: data.avatar_url ?? '',
        location: data.location ?? '',
        is_admin: !!data.is_admin,
      }
    : { username: '', bio: '', avatar_url: '', location: '', is_admin: false }
}

/** 清除游客标记，避免刷新后被误判为游客 */
function _clearGuestKey() {
  if (typeof localStorage !== 'undefined') localStorage.removeItem(GUEST_KEY)
}

/** 应用内同步：根据 session 更新 user/profile/isGuest（供 onAuthStateChange 与 initAuth 共用） */
async function _syncFromSession(session) {
  if (session?.user) {
    user.value = session.user
    isGuest.value = false
    _clearGuestKey()
    await _fetchProfile()
  } else {
    user.value = null
    profile.value = null
    isGuest.value = true
  }
}

let _authListenerRemoved = false

/** 应用启动时调用：恢复登录会话或游客状态，并订阅后续认证变化以持久保持登录状态 */
export async function initAuth() {
  // 1. 先根据当前 session 恢复状态（刷新后能记住已登录用户）
  const { data: { session } } = await supabase.auth.getSession()
  await _syncFromSession(session)

  // 2. 若没有 session，尝试使用 getUser 做一次兜底校验（防止本地存储异常但服务端仍有会话）
  if (!session?.user) {
    const { data: userResult } = await supabase.auth.getUser()
    if (userResult?.user) {
      await _syncFromSession({ user: userResult.user })
    }
  }

  // 3. 若依然没有登录用户，根据游客标记显示游客状态
  if (!user.value && typeof localStorage !== 'undefined' && localStorage.getItem(GUEST_KEY) === '1') {
    isGuest.value = true
  }

  // 2. 订阅认证状态变化，确保登录/登出/刷新 token 后状态一致，刷新页面也能正确恢复
  if (!_authListenerRemoved) {
    supabase.auth.onAuthStateChange(async (event, nextSession) => {
      if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        await _syncFromSession(nextSession)
      } else if (event === 'SIGNED_OUT') {
        user.value = null
        profile.value = null
        isGuest.value = true
        if (typeof localStorage !== 'undefined') localStorage.setItem(GUEST_KEY, '1')
      }
    })
  }
}

export function useAuth() {
  const gatePassed = computed(() => isGuest.value || !!user.value)

  /** 管理员：固定测试账号邮箱 或 profiles.is_admin */
  const isAdmin = computed(() => {
    if (!user.value) return false
    if (user.value.email === ADMIN_LOGIN_EMAIL) return true
    return !!profile.value?.is_admin
  })

  async function handleLogin(email, password) {
    const res = await auth.handleLogin(email, password)
    if (res.ok && res.user) {
      user.value = res.user
      isGuest.value = false
      _clearGuestKey()
      await _fetchProfile()
    }
    return res
  }

  async function handleRegister(email, password) {
    const res = await auth.handleRegister(email, password)
    if (res.ok && res.user && !res.needsEmailConfirmation) {
      user.value = res.user
      isGuest.value = false
      _clearGuestKey()
      await _fetchProfile()
    }
    return res
  }

  async function sendLoginOtp(email) {
    return auth.sendLoginOtp(email)
  }

  async function verifyLoginOtp(email, token) {
    const res = await auth.verifyLoginOtp(email, token)
    if (res.ok && res.user) {
      user.value = res.user
      isGuest.value = false
      _clearGuestKey()
      await _fetchProfile()
    }
    return res
  }

  async function fetchProfile() {
    await _fetchProfile()
  }

  async function updateProfile(updates) {
    if (!user.value?.id) return { ok: false }
    const { error } = await supabase
      .from('profiles')
      .upsert({ id: user.value.id, ...updates }, { onConflict: 'id' })
    if (error) return { ok: false, error }
    await fetchProfile()
    return { ok: true }
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    user.value = null
    profile.value = null
    isGuest.value = true
    if (typeof localStorage !== 'undefined') localStorage.setItem(GUEST_KEY, '1')
  }

  function setGuestMode() {
    user.value = null
    profile.value = null
    isGuest.value = true
    if (typeof localStorage !== 'undefined') localStorage.setItem(GUEST_KEY, '1')
  }

  function logUserHistory(content) {
    if (!user.value?.id) return
    auth.logUserHistory(user.value.id, content)
  }

  return {
    user,
    profile,
    isGuest,
    gatePassed,
    isAdmin,
    handleLogin,
    handleRegister,
    sendLoginOtp,
    verifyLoginOtp,
    fetchProfile,
    updateProfile,
    handleLogout,
    setGuestMode,
    logUserHistory,
  }
}

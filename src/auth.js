/**
 * 认证与用户历史埋点模块（auth.js）
 * - 登录 / 注册 / 验证码登录逻辑
 * - user_history 静默写入（仅已登录用户）
 * 注意：user / profile / 门禁状态在 useAuth 中维护，此处仅纯逻辑。
 */

import { supabase } from '@/supabaseClient'

/** 将 Supabase 认证错误转为中文提示，便于登录/注册界面展示 */
export function getAuthErrorMessage(error) {
  if (!error) return ''
  const msg = (error.message || '').toLowerCase()
  if (msg.includes('invalid login credentials') || msg.includes('invalid_credentials')) return '邮箱或密码错误，请重试'
  if (msg.includes('email not confirmed') || msg.includes('email_not_confirmed')) return '请先到邮箱中确认账号后再登录'
  if (msg.includes('user already registered') || msg.includes('already registered') || msg.includes('already been registered')) return '该邮箱已注册，请直接登录'
  if (msg.includes('signup_disabled')) return '暂未开放注册'
  if (msg.includes('weak password') || msg.includes('password')) return '密码强度不足，请使用至少 6 位字符'
  if (msg.includes('otp') || msg.includes('token has expired') || msg.includes('otp_expired')) return '验证码错误或已过期，请重试'
  return error.message || ''
}

/**
 * 先尝试登录，失败则尝试注册（兼容旧用法）
 * @param {string} email
 * @param {string} password
 * @returns {{ ok: boolean, user?: object, error?: import('@supabase/supabase-js').AuthError }}
 */
export async function loginOrRegister(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (!error) return { ok: true, user: data.user }
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({ email, password })
  if (!signUpError) return { ok: true, user: signUpData.user }
  return { ok: false, error: signUpError }
}

/** 登录 */
export async function handleLogin(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  return { ok: !error, user: data?.user, error }
}

/** 注册 */
export async function handleRegister(email, password, username = '') {
  const { data, error } = await supabase.auth.signUp({ email, password })
  if (error) return { ok: false, user: null, error, needsEmailConfirmation: false }
  const user = data?.user || null
  if (!user) {
    return {
      ok: false,
      user: null,
      error: { message: '注册失败，请重试' },
      needsEmailConfirmation: false,
    }
  }
  // Supabase 开启防用户枚举时，已注册邮箱可能返回“匿名 user 且 identities 为空”
  if (Array.isArray(user.identities) && user.identities.length === 0) {
    return {
      ok: false,
      user: null,
      error: { message: 'User already registered' },
      needsEmailConfirmation: false,
    }
  }
  const ok = true
  const session = data?.session
  const needsEmailConfirmation = !!(user && !session)
  if (ok && user?.id && username?.trim()) {
    await supabase
      .from('profiles')
      .upsert(
        {
          id: user.id,
          username: username.trim(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' },
      )
  }
  return { ok, user, error, needsEmailConfirmation }
}


/**
 * 发送登录验证码（邮箱 OTP）
 * - shouldCreateUser: true 时，未注册邮箱也会创建账号，实现“验证码即注册+登录”
 */
export async function sendLoginOtp(email) {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
    },
  })
  return { ok: !error, error }
}

/**
 * 校验登录验证码并完成登录
 * 需要在 Supabase 邮件模板中使用 {{ .Token }} 以发送 6 位验证码
 */
export async function verifyLoginOtp(email, token) {
  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: 'email',
  })
  const user = data?.user || data?.session?.user || null
  return { ok: !error && !!user, user, error }
}

/**
 * 隐形埋点：将用户提问写入 user_history（仅当 user 存在时调用）
 * 需在 Supabase 建表，例如：
 *   create table user_history (
 *     id uuid primary key default gen_random_uuid(),
 *     user_id uuid references auth.users(id) not null,
 *     content text not null,
 *     created_at timestamptz default now()
 *   );
 * 并配置 RLS：允许用户 insert 自己的行。
 *
 * @param {string} userId - auth.users.id
 * @param {string} content - 用户发送的消息内容
 */
export async function logUserHistory(userId, content) {
  if (!userId || !content?.trim()) return
  const { error } = await supabase.from('user_history').insert({
    user_id: userId,
    content: content.trim(),
  })
  if (error) {
    // 静默失败，不影响聊天流程（如表不存在或 RLS 拒绝）
  }
}

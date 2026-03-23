/**
 * Supabase Auth 使用 email 登录；纯数字「账号」自动补全为邮箱域名，便于测试管理员 123456 → 123456@tcm.local
 */
export const DEFAULT_LOGIN_EMAIL_DOMAIN = 'tcm.local'

export function normalizeLoginEmail(input) {
  const s = String(input ?? '').trim()
  if (!s) return ''
  if (s.includes('@')) return s
  return `${s}@${DEFAULT_LOGIN_EMAIL_DOMAIN}`
}

/** 与 normalizeLoginEmail('123456') 一致，用于管理员身份判断 */
export const ADMIN_LOGIN_EMAIL = normalizeLoginEmail('123456')

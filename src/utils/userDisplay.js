export const DEFAULT_USER_DISPLAY_NAME = '养生达人'

function pickText(...values) {
  for (const value of values) {
    const text = String(value ?? '').trim()
    if (text) return text
  }
  return ''
}

export function getUserDisplayInfo({
  profile = null,
  fallbackName = '',
  fallbackAvatar = '',
  email = '',
  defaultName = DEFAULT_USER_DISPLAY_NAME,
} = {}) {
  const name = pickText(
    profile?.username,
    fallbackName,
    email ? String(email).split('@')[0] : '',
    defaultName,
  )
  const avatar = pickText(profile?.avatar_url, fallbackAvatar)
  return { name, avatar }
}

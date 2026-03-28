/** 全站品牌与功能对外文案（单一数据源） */

export const SITE_SHORT_NAME = '智卉-膳谱'
/** 平台副标题（不含短名，用于首页等与主标题并列展示） */
export const SITE_PLATFORM_TAGLINE = '基于网页交互的中医药智慧食养平台'
export const SITE_FULL_NAME = `${SITE_SHORT_NAME}——${SITE_PLATFORM_TAGLINE}`
/** 浏览器标签 title 后缀，避免过长 */
export const SITE_TITLE_SUFFIX = SITE_SHORT_NAME

export const FEATURE_COPY = {
  herbs: { title: '药材百科', motto: '杏林春满，橘井泉香' },
  acupoints: { title: '穴位导航', motto: '智通经脉，慧识人体' },
  recipes: { title: '食谱推荐', motto: '药食同源，膳食有方' },
  history: { title: '中医药历史', motto: '杏林长卷，路启千秋' },
  seasonal: { title: '四时之序', motto: '顺应天时，调节阴阳' },
  pairing: { title: '药材配伍', motto: '草本智慧，配伍有理' },
  mythBuster: { title: '养生避雷针', motto: '粉碎谣言，正本清源' },
}

/** AI 助手对外名称（与 AiCompanion 文案一致） */
export const AI_TUTOR_LABEL = 'AI 养生导师'
/** 与其它模块「对联式」副标题格式统一 */
export const AI_TUTOR_MOTTO = '随问随答，辨证施膳'

/**
 * 首页底部「下一屏」提示：主名 · 对联前四字（可读性）
 * @param {'pairing'|'mythBuster'|'history'} key
 */
export function homeNextHintText(key) {
  const f = FEATURE_COPY[key]
  if (!f) return ''
  const short = f.motto.includes('，') ? f.motto.split('，')[0] : f.motto.slice(0, 4)
  return `${f.title} · ${short}`
}

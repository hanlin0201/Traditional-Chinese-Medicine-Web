// 解析「中药材分类多维标签表.csv」，按药材名称提供标签信息
// 文件相对路径：项目根目录下「中药材数据/中药材分类标签列表/中药材分类多维标签表.csv」

import rawCsv from '../../中药材数据/中药材分类标签列表/中药材分类多维标签表.csv?raw'

/**
 * 解析 CSV 为 Map，key 为药材名称
 */
const herbTagMap = (() => {
  if (!rawCsv) return new Map()

  const lines = rawCsv
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0)

  // 第一行为表头，略过
  const map = new Map()
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]
    // 简单按逗号切分（当前数据中未出现逗号嵌套的字段）
    const parts = line.split(',')
    if (parts.length < 7) continue

    const [name, efficacyCategoryRaw, rawNature, rawTaste, rawPart, rawMeridian, detailEffectsRaw] =
      parts.map((s) => s.trim())
    if (!name) continue

    // 将「未能自动归类」统一显示为「其他」
    const efficacyCategory =
      efficacyCategoryRaw === '未能自动归类' ? '其他' : efficacyCategoryRaw

    const detailEffects =
      detailEffectsRaw && detailEffectsRaw.length > 0
        ? detailEffectsRaw.split('、').map((s) => s.trim()).filter(Boolean)
        : []

    map.set(name, {
      efficacyCategory,
      rawNature,
      rawTaste,
      rawPart,
      rawMeridian,
      detailEffects,
    })
  }

  return map
})()

// 全部「详细功效（21 类）」标签集合
export const ALL_DETAIL_EFFECTS = (() => {
  const set = new Set()
  for (const row of herbTagMap.values()) {
    if (Array.isArray(row.detailEffects)) {
      row.detailEffects.forEach((e) => {
        if (e) set.add(e)
      })
    }
  }
  return Array.from(set)
})()

// 仅获取某个药材的详细功效数组
export function getHerbDetailEffectsByName(name) {
  if (!name) return []
  const row = herbTagMap.get(name)
  if (!row || !Array.isArray(row.detailEffects)) return []
  return row.detailEffects
}

/**
 * 将原始字段整理成前端展示用的 5 个标签
 * - 功效分类
 * - 药性（四气）：前缀“性”
 * - 五味：前缀“味”
 * - 入药部位：后缀“类”
 * - 归经：前缀“入”
 */
export function getHerbTagDisplayByName(name) {
  if (!name) return null
  const row = herbTagMap.get(name)
  if (!row) return null

  const { efficacyCategory, rawNature, rawTaste, rawPart, rawMeridian, detailEffects } = row

  const nature =
    rawNature && rawNature.length > 0
      ? rawNature.startsWith('性')
        ? rawNature
        : `性${rawNature}`
      : null

  const taste =
    rawTaste && rawTaste.length > 0
      ? rawTaste.startsWith('味')
        ? rawTaste
        : `味${rawTaste}`
      : null

  const part =
    rawPart && rawPart.length > 0
      ? rawPart.endsWith('类')
        ? rawPart
        : `${rawPart}类`
      : null

  const meridian =
    rawMeridian && rawMeridian.length > 0
      ? rawMeridian.startsWith('入')
        ? rawMeridian
        : `入${rawMeridian}`
      : null

  return {
    efficacyCategory: efficacyCategory || null,
    nature,
    taste,
    part,
    meridian,
    detailEffects: Array.isArray(detailEffects) ? detailEffects : [],
  }
}


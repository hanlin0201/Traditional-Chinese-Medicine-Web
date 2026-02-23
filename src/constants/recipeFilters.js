/**
 * 养生食谱筛选选项：体质、功效、烹饪时间
 * 与 Supabase recipes 表字段 body_type、efficacy、time 对应
 */

// 体质（与食谱 body_type 一致）
export const BODY_TYPES = [
  { value: '', label: '全部体质' },
  { value: '气虚', label: '气虚' },
  { value: '阴虚', label: '阴虚' },
  { value: '阳虚', label: '阳虚' },
  { value: '血虚', label: '血虚' },
  { value: '痰湿', label: '痰湿' },
  { value: '平和', label: '平和' }
]

// 功效多选标签（与食谱 efficacy 数组项匹配）
export const EFFICACY_OPTIONS = [
  '健脾养胃', '补气养血', '滋阴润燥', '养肝明目', '清热降火',
  '养心安神', '润肺止咳', '滋阴养颜', '补气固表', '健脾升阳',
  '增强免疫', '温经养血', '散寒止痛', '补虚暖身', '利水渗湿',
  '宁心安神', '疏肝理气', '活血化瘀'
]

// 烹饪时间区间（分钟上限），用于前端解析 time 字符串后过滤
export const TIME_RANGES = [
  { value: '', label: '全部时长' },
  { value: '15', label: '15 分钟内' },
  { value: '30', label: '30 分钟内' },
  { value: '60', label: '1 小时内' },
  { value: '120', label: '2 小时内' },
  { value: '121', label: '超过 2 小时' }
]

/**
 * 从 time 字符串解析出分钟数，如 "约15分钟" -> 15，"约2小时" -> 120
 */
export function parseTimeToMinutes(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return null
  const match = timeStr.match(/约?(\d+)\s*(分钟|小时)/)
  if (!match) return null
  const num = parseInt(match[1], 10)
  return match[2] === '小时' ? num * 60 : num
}

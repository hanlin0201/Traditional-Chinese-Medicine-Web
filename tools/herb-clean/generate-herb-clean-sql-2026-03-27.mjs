import fs from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://htrtcaswqydnfvgwernh.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0cnRjYXN3cXlkbmZ2Z3dlcm5oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2MDYyNDgsImV4cCI6MjA4NTE4MjI0OH0.N9NEwFKZHtiEITimRsaMEQ4hS-rZ2XdR2pLWSG4GC68'
)

function normalizeSpaces(s) {
  return s
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function stripSiteNotice(s) {
  if (!s) return s
  return s
    .replace(/（?本文由中医药网整理或引用[^）)]*[）)]?/g, '')
    .replace(/（?内容仅供参考[^）)]*[）)]?/g, '')
    .replace(/（?转载请注明出处[^）)]*[）)]?/g, '')
    .replace(/谢谢合作[。！!]?/g, '')
}

function convertEffectNumberingToParen(s) {
  if (!s) return s
  let out = s
  const circledMap = {
    '①': '(1)', '②': '(2)', '③': '(3)', '④': '(4)', '⑤': '(5)',
    '⑥': '(6)', '⑦': '(7)', '⑧': '(8)', '⑨': '(9)', '⑩': '(10)',
    '⑪': '(11)', '⑫': '(12)', '⑬': '(13)', '⑭': '(14)', '⑮': '(15)',
    '⑯': '(16)', '⑰': '(17)', '⑱': '(18)', '⑲': '(19)', '⑳': '(20)',
    '⑴': '(1)', '⑵': '(2)', '⑶': '(3)', '⑷': '(4)', '⑸': '(5)',
    '⑹': '(6)', '⑺': '(7)', '⑻': '(8)', '⑼': '(9)', '⑽': '(10)',
    '⑾': '(11)', '⑿': '(12)', '⒀': '(13)', '⒁': '(14)', '⒂': '(15)',
    '⒃': '(16)', '⒄': '(17)', '⒅': '(18)', '⒆': '(19)', '⒇': '(20)',
  }
  out = out.replace(/[①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳⑴⑵⑶⑷⑸⑹⑺⑻⑼⑽⑾⑿⒀⒁⒂⒃⒄⒅⒆⒇]/g, (m) => circledMap[m] || m)

  // 全角括号数字 -> 半角括号数字
  out = out.replace(/（\s*(\d{1,2})\s*）/g, '($1)')

  // 阿拉伯数字列表（仅在句首/分隔符后）-> (n)
  out = out.replace(/(^|[^0-9A-Za-z])(\d{1,2})[\.．、]\s+/g, '$1($2)')

  // 去重清理 "(n)(n)" 场景
  out = out.replace(/\((\d{1,2})\)\s*\((\1)\)/g, '($1)')
  return out
}

function stripCitationTailFromAlias(s) {
  if (!s) return s
  // 别名里保留纯别名项，去掉“（《xxx》）”这类来源尾巴
  return s
    .replace(/（《[^》]+》）/g, '')
    .replace(/\(《[^》]+》\)/g, '')
    .replace(/（广州空军《[^》]+》）/g, '')
    .replace(/\(广州空军《[^》]+》\)/g, '')
}

function stripCitationLinesFromTasteOrChannel(s) {
  if (!s) return s
  // 规则：保留第一句总述，移除“①《...》：...”等文献分条
  const first = s
    .replace(/^\s+|\s+$/g, '')
    .split(/(?:\s+[①②③④⑤⑥⑦⑧⑨⑩]|\s+\d+[\.、])/)[0]
    .trim()
  return first || s
}

function stripShiLineFromTips(s) {
  if (!s) return s
  // 删除含“为之使”的子句或分条
  return s
    .replace(/[①②③④⑤⑥⑦⑧⑨⑩]?\s*《[^》]+》：[^。；]*为之使[^。；]*[。；]?/g, '')
    .replace(/[^。；]*为之使[^。；]*[。；]?/g, '')
}

/** 去掉紧挨着的完全重复句，如「慎用。 慎用。」 */
function dedupeConsecutiveSentences(s) {
  if (!s) return s
  let out = s
  let prev = ''
  while (out !== prev) {
    prev = out
    out = out.replace(/([^。；]+[。；])\s*\1+/g, '$1')
  }
  return out.trim()
}

/** 功效正文里残留的维基/编辑脚注 [1] */
function stripEffectFootnotes(s) {
  if (!s) return s
  return s.replace(/\[\d+\]/g, '')
}

function fixUsageLooksLikeTips(usage, tips) {
  if (!usage) return { usage, tips, moved: false }
  if (!/注意事项|慎用|禁用|忌服|忌用/.test(usage)) return { usage, tips, moved: false }
  const cleanedUsage = usage
    .replace(/【?注意事项】?[:：]?\s*/g, '')
    .trim()
  const mergedTips = tips && tips.trim()
    ? `${tips.trim()} ${cleanedUsage}`.trim()
    : cleanedUsage
  return { usage: '', tips: mergedTips, moved: true }
}

function fixTipsLooksLikeEffect(tips) {
  if (!tips) return tips
  // 禁忌栏误放功效时，先移除“功效与作用”提示头，避免误导
  return tips
    .replace(/【[^】]*功效与作用】[:：]?\s*/g, '')
    .trim()
}

function escapeSql(str) {
  return str.replace(/'/g, "''")
}

function cleanRow(row) {
  let alias = row.alias || ''
  let taste = row.taste || ''
  let channel = row.channel || ''
  let effect = row.effect || ''
  let usage = row.usage || ''
  let tips = row.tips || ''

  const before = { alias, taste, channel, effect, usage, tips }

  alias = normalizeSpaces(stripCitationTailFromAlias(alias))
  taste = normalizeSpaces(stripCitationLinesFromTasteOrChannel(taste))
  channel = normalizeSpaces(stripCitationLinesFromTasteOrChannel(channel))
  effect = normalizeSpaces(stripSiteNotice(effect))
  effect = normalizeSpaces(convertEffectNumberingToParen(effect))
  effect = normalizeSpaces(stripEffectFootnotes(effect))
  tips = normalizeSpaces(stripShiLineFromTips(tips))
  tips = normalizeSpaces(fixTipsLooksLikeEffect(tips))
  const moved = fixUsageLooksLikeTips(usage, tips)
  usage = normalizeSpaces(moved.usage)
  tips = normalizeSpaces(stripShiLineFromTips(moved.tips))
  tips = normalizeSpaces(dedupeConsecutiveSentences(tips))

  const after = { alias, taste, channel, effect, usage, tips }
  const changedFields = Object.keys(after).filter(k => (before[k] || '') !== (after[k] || ''))

  return { before, after, changedFields }
}

const { data, error } = await supabase
  .from('herbs')
  .select('id,name,alias,taste,channel,effect,usage,tips')
  .order('id', { ascending: true })

if (error) {
  console.error('读取 herbs 失败:', error.message)
  process.exit(1)
}

const updates = []
const byFieldCount = {
  alias: 0,
  taste: 0,
  channel: 0,
  effect: 0,
  usage: 0,
  tips: 0,
}

for (const row of data) {
  const { after, changedFields } = cleanRow(row)
  if (!changedFields.length) continue
  changedFields.forEach((f) => { byFieldCount[f] += 1 })
  updates.push({ id: row.id, name: row.name, after, changedFields })
}

const sqlLines = []
sqlLines.push('-- 药材数据清洗 SQL（自动生成）')
sqlLines.push('-- 生成时间: 2026-03-27')
sqlLines.push('-- 注意: 执行前请在 Supabase 先备份 herbs 表')
sqlLines.push('begin;')

for (const u of updates) {
  const sets = []
  for (const f of u.changedFields) {
    const val = u.after[f] || ''
    sets.push(`${f}='${escapeSql(val)}'`)
  }
  sqlLines.push(`update herbs set ${sets.join(', ')} where id=${u.id}; -- ${u.name}`)
}

sqlLines.push('commit;')
sqlLines.push('')

const reportLines = []
reportLines.push('# 药材数据清洗预览（自动生成）')
reportLines.push('')
reportLines.push(`总记录数：${data.length}`)
reportLines.push(`命中清洗记录：${updates.length}`)
reportLines.push('')
reportLines.push('## 按字段变更数量')
reportLines.push('')
for (const [k, v] of Object.entries(byFieldCount)) {
  reportLines.push(`- ${k}: ${v}`)
}
reportLines.push('')
reportLines.push('## 前 80 条变更样例（药材名 + 变更字段）')
reportLines.push('')
updates.slice(0, 80).forEach((u) => {
  reportLines.push(`- ${u.name}: ${u.changedFields.join('、')}`)
})

const backupTable = 'herbs_backup_20260327_clean_v2'
const safeApplyLines = []
safeApplyLines.push('-- 全量清洗执行脚本（带回滚备份）v2')
safeApplyLines.push('-- 生成日期：2026-03-27')
safeApplyLines.push("do $$ begin")
safeApplyLines.push(`  if exists (select 1 from pg_tables where schemaname = 'public' and tablename = '${backupTable}') then`)
safeApplyLines.push(`    raise exception '备份表 ${backupTable} 已存在，请先确认是否需要回滚或更换版本';`)
safeApplyLines.push('  end if;')
safeApplyLines.push('end $$;')
safeApplyLines.push('')
safeApplyLines.push(`create table public.${backupTable} as select * from public.herbs;`)
safeApplyLines.push('')
safeApplyLines.push(...sqlLines)

const rollbackLines = []
rollbackLines.push('-- 全量清洗回滚脚本 v2')
rollbackLines.push('begin;')
rollbackLines.push('update public.herbs as h')
rollbackLines.push('set')
rollbackLines.push('  created_at = b.created_at,')
rollbackLines.push('  name = b.name,')
rollbackLines.push('  alias = b.alias,')
rollbackLines.push('  classification = b.classification,')
rollbackLines.push('  taste = b.taste,')
rollbackLines.push('  channel = b.channel,')
rollbackLines.push('  usage = b.usage,')
rollbackLines.push('  tips = b.tips,')
rollbackLines.push('  effect = b.effect,')
rollbackLines.push('  image_url = b.image_url')
rollbackLines.push(`from public.${backupTable} as b`)
rollbackLines.push('where h.id = b.id;')
rollbackLines.push('commit;')

const runbookLines = []
runbookLines.push('# Supabase 执行与回滚说明（v2）')
runbookLines.push('')
runbookLines.push('## 1) 执行清洗（可回滚）')
runbookLines.push('')
runbookLines.push('- 在 Supabase SQL Editor 执行：`tools/herb-clean-apply-safe-2026-03-27-v2.sql`')
runbookLines.push(`- 脚本会先创建备份表：\`${backupTable}\`，再全量更新`)
runbookLines.push('')
runbookLines.push('## 2) 验收重点')
runbookLines.push('')
runbookLines.push('- 功效与作用分点是否统一为 `(1)(2)...`')
runbookLines.push('- 分点标红、换行是否符合预期')
runbookLines.push('- 你点名药材（如阿胶、半春莲、布狗尾、败酱草等）是否修正')
runbookLines.push('')
runbookLines.push('## 3) 不符合预期时回滚')
runbookLines.push('')
runbookLines.push('- 在 Supabase SQL Editor 执行：`tools/herb-clean-rollback-2026-03-27-v2.sql`')
runbookLines.push(`- 回滚会用 \`${backupTable}\` 全量恢复 herbs 表`)

fs.writeFileSync('tools/herb-clean-updates-2026-03-27.sql', sqlLines.join('\n'), 'utf8')
fs.writeFileSync('tools/herb-clean-preview-2026-03-27.md', reportLines.join('\n'), 'utf8')
fs.writeFileSync('tools/herb-clean-apply-safe-2026-03-27-v2.sql', safeApplyLines.join('\n'), 'utf8')
fs.writeFileSync('tools/herb-clean-rollback-2026-03-27-v2.sql', rollbackLines.join('\n'), 'utf8')
fs.writeFileSync('tools/herb-clean-runbook-2026-03-27-v2.md', runbookLines.join('\n'), 'utf8')

console.log(`总记录: ${data.length}`)
console.log(`需更新: ${updates.length}`)
console.log('字段变更统计:', byFieldCount)
console.log('已生成 tools/herb-clean-updates-2026-03-27.sql')
console.log('已生成 tools/herb-clean-preview-2026-03-27.md')
console.log('已生成 tools/herb-clean-apply-safe-2026-03-27-v2.sql')
console.log('已生成 tools/herb-clean-rollback-2026-03-27-v2.sql')
console.log('已生成 tools/herb-clean-runbook-2026-03-27-v2.md')

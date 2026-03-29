/**
 * 全库药材文本质量扫描：连续重复句、空药性导致的前导分号风险、功效中的脚注 [n] 等
 * 用法：node tools/herb-audit-quality.mjs
 */
import fs from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://htrtcaswqydnfvgwernh.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0cnRjYXN3cXlkbmZ2Z3dlcm5oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2MDYyNDgsImV4cCI6MjA4NTE4MjI0OH0.N9NEwFKZHtiEITimRsaMEQ4hS-rZ2XdR2pLWSG4GC68'
)

/** 按句号/分号切句后，检测与上一句完全相同的连续重复 */
function findConsecutiveDuplicateSentences(text) {
  if (!text || typeof text !== 'string') return []
  const normalized = text.replace(/\s+/g, ' ').trim()
  if (!normalized) return []
  const chunks = normalized.split(/(?<=[。；])\s*/).map((c) => c.trim()).filter(Boolean)
  const dups = []
  for (let i = 1; i < chunks.length; i++) {
    if (chunks[i] === chunks[i - 1]) dups.push(chunks[i])
  }
  return dups
}

/** 整段中是否存在「同一句连续出现两次」（用句号切分） */
function hasDoubleSentence(text) {
  return findConsecutiveDuplicateSentences(text).length > 0
}

function countFootnoteRefs(text) {
  if (!text) return 0
  const m = text.match(/\[\d+\]/g)
  return m ? m.length : 0
}

// herbs 表当前字段（无 nature/taboo 列；详情页仍引用 herb.nature/herb.taboo，见前端拼接修复）
const { data, error } = await supabase
  .from('herbs')
  .select('id,name,channel,taste,alias,effect,usage,tips')
  .order('id', { ascending: true })

if (error) {
  console.error('读取失败:', error.message)
  process.exit(1)
}

const issues = {
  /** 禁忌/提示：连续完全重复的句子 */
  tipsDuplicateSentence: [],
  tabooDuplicateSentence: [],
  /** 功效里残留 [1] 类脚注 */
  effectFootnotes: [],
  /** 用法里连续重复 */
  usageDuplicateSentence: [],
  /** effect 里连续重复（少见） */
  effectDuplicateSentence: [],
}

for (const row of data) {
  const name = row.name || `id=${row.id}`
  if (hasDoubleSentence(row.tips || '')) {
    issues.tipsDuplicateSentence.push({
      id: row.id,
      name,
      sample: findConsecutiveDuplicateSentences(row.tips)[0]?.slice(0, 80),
    })
  }
  const fn = countFootnoteRefs(row.effect || '')
  if (fn > 0) {
    issues.effectFootnotes.push({ id: row.id, name, count: fn })
  }

  if (hasDoubleSentence(row.usage || '')) {
    issues.usageDuplicateSentence.push({ id: row.id, name })
  }
  if (hasDoubleSentence(row.effect || '')) {
    issues.effectDuplicateSentence.push({ id: row.id, name })
  }
}

const lines = []
lines.push('# 药材数据质量扫描（全库）')
lines.push('')
lines.push(`- 扫描记录数：**${data.length}**`)
lines.push(`- 扫描时间：自动生成`)
lines.push('')
lines.push('## 1. 使用禁忌 / tips：连续重复句（同一句出现两次紧挨着）')
lines.push('')
lines.push(`- 命中 **${issues.tipsDuplicateSentence.length}** 条（字段 \`tips\`）`)
if (issues.tipsDuplicateSentence.length) {
  issues.tipsDuplicateSentence.forEach((x) => {
    lines.push(`  - **${x.name}**（id=${x.id}）重复片段：${x.sample || '…'}…`)
  })
} else {
  lines.push('  - 无')
}
lines.push('')
lines.push(`- 命中 **${issues.tabooDuplicateSentence.length}** 条（字段 \`taboo\`，若表中有）`)
if (issues.tabooDuplicateSentence.length) {
  issues.tabooDuplicateSentence.forEach((x) => {
    lines.push(`  - **${x.name}**（id=${x.id}）`)
  })
}
lines.push('')
lines.push('## 2. 性味归经首字「；」问题（说明）')
lines.push('')
lines.push('- 当前 Supabase `herbs` 表**无** `nature`（药性）字段，详情页若写 `herb.nature + \'；\' + channel`，会整站出现「**；**归经…」开头。')
lines.push('- **处理方式**：改前端为「只拼接非空字段」即可（见 `HerbDetailView` 修复），一般**不必**逐条改库。')
lines.push('')
lines.push('')
lines.push('## 3. 功效与作用：`effect` 中含 `[数字]` 脚注残留')
lines.push('')
lines.push(`- 命中 **${issues.effectFootnotes.length}** 条`)
if (issues.effectFootnotes.length) {
  issues.effectFootnotes.slice(0, 50).forEach((x) => {
    lines.push(`  - **${x.name}**（id=${x.id}）约 ${x.count} 处`)
  })
  if (issues.effectFootnotes.length > 50) {
    lines.push(`  - … 另有 ${issues.effectFootnotes.length - 50} 条`)
  }
}
lines.push('')
lines.push('## 4. 用法用量：连续重复句')
lines.push('')
lines.push(`- 命中 **${issues.usageDuplicateSentence.length}** 条`)
if (issues.usageDuplicateSentence.length) {
  issues.usageDuplicateSentence.forEach((x) => {
    lines.push(`  - **${x.name}**（id=${x.id}）`)
  })
}
lines.push('')
lines.push('## 5. 功效与作用：连续重复句（整段级）')
lines.push('')
lines.push(`- 命中 **${issues.effectDuplicateSentence.length}** 条`)
if (issues.effectDuplicateSentence.length) {
  issues.effectDuplicateSentence.slice(0, 30).forEach((x) => {
    lines.push(`  - **${x.name}**（id=${x.id}）`)
  })
}

const outPath = 'tools/herb-audit-quality-2026-03-27.md'
fs.writeFileSync(outPath, lines.join('\n'), 'utf8')

const jsonPath = 'tools/herb-audit-quality-2026-03-27.json'
fs.writeFileSync(
  jsonPath,
  JSON.stringify(
    {
      counts: {
        tipsDuplicateSentence: issues.tipsDuplicateSentence.length,
        tabooDuplicateSentence: issues.tabooDuplicateSentence.length,
        effectFootnotes: issues.effectFootnotes.length,
        usageDuplicateSentence: issues.usageDuplicateSentence.length,
        effectDuplicateSentence: issues.effectDuplicateSentence.length,
      },
      issues,
    },
    null,
    2
  ),
  'utf8'
)

console.log('已写入', outPath, jsonPath)
console.log('统计:', {
  tipsDuplicateSentence: issues.tipsDuplicateSentence.length,
  effectFootnotes: issues.effectFootnotes.length,
  usageDuplicateSentence: issues.usageDuplicateSentence.length,
})

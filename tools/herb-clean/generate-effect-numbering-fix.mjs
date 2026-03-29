/**
 * 扫描 herbs.effect / herbs.usage 中「(1)(2)…」类分点编号：
 * - 重复编号（如两个 (16)，常源于 ⒃ 与 ⒃ 同源错误）
 * - 跳号（如 1 后直接 3）
 * - 起号非 1
 * 将按出现顺序重排为连续 (1)…(n)，并生成 SQL 与 JSON 报告。
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const supabase = createClient(
  'https://htrtcaswqydnfvgwernh.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0cnRjYXN3cXlkbmZ2Z3dlcm5oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2MDYyNDgsImV4cCI6MjA4NTE4MjI0OH0.N9NEwFKZHtiEITimRsaMEQ4hS-rZ2XdR2pLWSG4GC68'
)

function normalizeSpaces(s) {
  if (!s) return ''
  return s
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
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
  out = out.replace(/（\s*(\d{1,2})\s*）/g, '($1)')
  out = out.replace(/(^|[^0-9A-Za-z])(\d{1,2})[\.．、]\s+/g, '$1($2)')
  out = out.replace(/\((\d{1,2})\)\s*\((\1)\)/g, '($1)')
  return out
}

/** 提取半角 (n) 分点：行首或空白后的 (数字)；括号后可有任意空格再接正文（兼容「(8) 治…」） */
function extractParenNumberedSegments(text) {
  const normalized = normalizeSpaces(convertEffectNumberingToParen(text || ''))
  if (!normalized) return { segments: [], normalized: '' }

  const re = /(?:^|\s)(\(\d{1,3}\))\s*/g
  const matches = []
  let m
  while ((m = re.exec(normalized)) !== null) {
    const leadingSpace = m[0][0] === ' '
    const pos = m.index + (leadingSpace ? 1 : 0)
    const label = m[1]
    const num = parseInt(label.slice(1, -1), 10)
    matches.push({ pos, num })
  }

  if (matches.length === 0) {
    return { segments: [], normalized }
  }

  const segments = []
  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].pos
    const end = i + 1 < matches.length ? matches[i + 1].pos : normalized.length
    const chunk = normalized.slice(start, end)
    const body = chunk.replace(/^\(\d{1,3}\)\s*/, '')
    segments.push({ oldNum: matches[i].num, body })
  }
  return { segments, normalized }
}

function needsRenumber(segments) {
  if (segments.length === 0) return false
  return segments.some((seg, i) => seg.oldNum !== i + 1)
}

function buildRenumbered(normalized, segments) {
  const parts = segments.map((seg, i) => `(${i + 1})${seg.body.trimEnd()}`)
  return parts.join(' ').trim()
}

function previewChanges(segments) {
  const pairs = []
  for (let i = 0; i < segments.length; i++) {
    const o = segments[i].oldNum
    const n = i + 1
    if (o !== n) pairs.push(`${o}→${n}`)
  }
  return pairs.length > 8
    ? `${pairs.slice(0, 6).join(', ')}, …`
    : pairs.join(', ')
}

function escapeSql(str) {
  return str.replace(/'/g, "''")
}

/**
 * 自动重排后个别条目仍有误切分（如正文中的「2．」被当成新分点），在此做极小范围修正。
 */
function applyManualEffectPatches(herbId, text) {
  if (!text) return text
  if (herbId === 2086) {
    return text
      .replace(/\(18\)治恶血牙痛 \(19\)川五灵脂/, '(18)治恶血牙痛：川五灵脂')
      .replace(/（《直指方》灵脂醋）\(2\)五灵脂50克/, '（《直指方》灵脂醋） (19)五灵脂50克')
  }
  if (herbId === 2100) {
    return text.replace(
      /和生由酒服。（《本草汇言》） \(4\)治单腹胀：旋复、鲤鱼。将鱼肠去净，药入鱼肚内，煎服。小便利，肿胀即消。 \(5\)治风火牙痛：旋复花为末，搽牙根上，良久，去其痰涎，疼止。 11、治乳岩、乳痈：旋复花二钱，蒲公英一钱，甘草节八分，白芷一钱，青皮一钱。水酒为引，水煎服。（\(9\)方以下出《滇南本草》） 12、治月蚀耳疮：旋复花烧研，羊脂和涂之。（《濒湖集简方》/,
      '和生由酒服。（《本草汇言》） (9)治单腹胀：旋复、鲤鱼。将鱼肠去净，药入鱼肚内，煎服。小便利，肿胀即消。 (10)治风火牙痛：旋复花为末，搽牙根上，良久，去其痰涎，疼止。 (11)治乳岩、乳痈：旋复花二钱，蒲公英一钱，甘草节八分，白芷一钱，青皮一钱。水酒为引，水煎服。（以下诸条出《滇南本草》） (12)治月蚀耳疮：旋复花烧研，羊脂和涂之。（《濒湖集简方》'
    )
  }
  return text
}

const APPLY = process.argv.includes('--apply')

const FIELDS = ['effect', 'usage']

const { data, error } = await supabase
  .from('herbs')
  .select(`id,name,${FIELDS.join(',')}`)
  .order('id', { ascending: true })

if (error) {
  console.error('读取失败:', error.message)
  process.exit(1)
}

const report = []
const rowUpdates = []

for (const row of data) {
  const after = { ...row }
  let rowChangeCount = 0
  const previews = []

  for (const field of FIELDS) {
    const raw = row[field] || ''
    const { segments, normalized } = extractParenNumberedSegments(raw)
    if (!needsRenumber(segments)) continue

    let fixed = buildRenumbered(normalized, segments)
    if (field === 'effect') fixed = applyManualEffectPatches(row.id, fixed)
    after[field] = fixed
    rowChangeCount += 1
    previews.push(`${field}: ${previewChanges(segments)}`)
  }

  if (rowChangeCount > 0) {
    report.push({
      id: row.id,
      name: row.name,
      fields: previews,
      changeCount: rowChangeCount,
    })
    rowUpdates.push({ id: row.id, name: row.name, after })
  }
}

const stamp = new Date().toISOString().slice(0, 10)
const sqlPath = path.join(__dirname, `effect-numbering-fix-${stamp}.sql`)
const jsonPath = path.join(__dirname, 'effect-numbering-report.json')

const sqlLines = []
sqlLines.push('-- 修复 herbs 中功效/用法里「(n)」分点：重复号、跳号、起号非 1 → 连续编号')
sqlLines.push(`-- 生成时间: ${new Date().toISOString()}`)
sqlLines.push(`-- 命中记录: ${rowUpdates.length} / ${data.length}`)
sqlLines.push('begin;')

for (const u of rowUpdates) {
  const orig = data.find((r) => r.id === u.id)
  const sets = []
  for (const field of FIELDS) {
    if ((u.after[field] || '') !== (orig?.[field] || '')) {
      sets.push(`${field}='${escapeSql(u.after[field] || '')}'`)
    }
  }
  if (sets.length) {
    sqlLines.push(`update herbs set ${sets.join(', ')} where id=${u.id}; -- ${u.name}`)
  }
}

sqlLines.push('commit;')
sqlLines.push('')

fs.writeFileSync(sqlPath, sqlLines.join('\n'), 'utf8')
fs.writeFileSync(
  jsonPath,
  JSON.stringify(
    {
      totalRows: data.length,
      fixed: rowUpdates.length,
      report: report.map((r) => ({
        id: r.id,
        name: r.name,
        changeCount: r.changeCount,
        preview: r.fields.join(' | '),
      })),
    },
    null,
    2
  ),
  'utf8'
)

console.log(`总记录: ${data.length}`)
console.log(`需修复编号: ${rowUpdates.length} 条`)
if (rowUpdates.length) {
  console.log('样例:', report.slice(0, 5).map((r) => `${r.name}(id=${r.id})`).join(', '))
}
console.log('已写入:', sqlPath)
console.log('已写入:', jsonPath)

if (APPLY) {
  if (!rowUpdates.length) {
    console.log('--apply：无待更新行，跳过')
  } else {
    let ok = 0
    let fail = 0
    for (const u of rowUpdates) {
      const orig = data.find((r) => r.id === u.id)
      const patch = {}
      for (const field of FIELDS) {
        if ((u.after[field] || '') !== (orig?.[field] || '')) patch[field] = u.after[field]
      }
      if (!Object.keys(patch).length) continue
      const { data: rows, error: upErr } = await supabase.from('herbs').update(patch).eq('id', u.id).select('id')
      if (upErr) {
        console.error(`更新失败 id=${u.id} ${u.name}:`, upErr.message)
        fail += 1
      } else if (!rows?.length) {
        console.error(`更新未生效 id=${u.id} ${u.name}（可能 RLS 禁止 anon 写库，请改用 Supabase SQL Editor 执行生成的 .sql）`)
        fail += 1
      } else {
        ok += 1
      }
    }
    console.log(`--apply 完成：成功 ${ok}，失败 ${fail}`)
    if (fail > 0 && ok === 0) {
      console.log('提示：请在 Supabase Dashboard → SQL Editor 中执行 tools/herb-clean/effect-numbering-fix-*.sql（需有写 herbs 的权限）')
    }
  }
}

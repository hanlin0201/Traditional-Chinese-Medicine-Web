/**
 * 将 herbal_pairings、myths 扩充至各至少 TARGET 条（不足则插入种子中尚未存在的行）。
 *
 * 用法：
 *   node scripts/seed-pairings-and-myths.js
 *
 * 依赖 .env：SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 * 种子：data/seeds/herbal_pairings.json  data/seeds/myths.json
 */
import 'dotenv/config'
import { readFile } from 'fs/promises'
import { createClient } from '@supabase/supabase-js'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

const TARGET = 100
const BATCH = 40

async function loadJson(rel) {
  const raw = await readFile(join(ROOT, rel), 'utf8')
  return JSON.parse(raw)
}

function pairKey(a, b) {
  return `${String(a).trim()}|${String(b).trim()}`
}

async function countRows(supabase, table) {
  const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true })
  if (error) throw new Error(`${table} count: ${error.message}`)
  return count ?? 0
}

async function fetchExistingPairKeys(supabase) {
  const keys = new Set()
  const pageSize = 1000
  let from = 0
  for (;;) {
    const { data, error } = await supabase
      .from('herbal_pairings')
      .select('left_herb, right_herb')
      .range(from, from + pageSize - 1)
    if (error) throw new Error(`herbal_pairings keys: ${error.message}`)
    if (!data?.length) break
    for (const r of data) keys.add(pairKey(r.left_herb, r.right_herb))
    if (data.length < pageSize) break
    from += pageSize
  }
  return keys
}

/**
 * 取表中当前最大 id。用于在序列与真实数据不同步（曾手动导入 id）时避免 insert 撞主键。
 */
async function getMaxId(supabase, table) {
  const { data, error } = await supabase.from(table).select('id').order('id', { ascending: false }).limit(1).maybeSingle()
  if (error) throw new Error(`${table} max id: ${error.message}`)
  if (!data || data.id == null) return 0
  const n = Number(data.id)
  return Number.isFinite(n) ? n : 0
}

async function fetchExistingMythQuestions(supabase) {
  const set = new Set()
  const pageSize = 1000
  let from = 0
  for (;;) {
    const { data, error } = await supabase
      .from('myths')
      .select('question')
      .range(from, from + pageSize - 1)
    if (error) throw new Error(`myths questions: ${error.message}`)
    if (!data?.length) break
    for (const r of data) {
      if (r.question) set.add(String(r.question).trim())
    }
    if (data.length < pageSize) break
    from += pageSize
  }
  return set
}

async function insertBatches(supabase, table, rows) {
  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH)
    const { error } = await supabase.from(table).insert(chunk)
    if (error) throw new Error(`${table} insert: ${error.message}`)
  }
}

async function main() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    console.error('请在 .env 中配置 SUPABASE_URL 和 SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }

  const supabase = createClient(url, key)

  const [pairSeed, mythSeed] = await Promise.all([
    loadJson('data/seeds/herbal_pairings.json'),
    loadJson('data/seeds/myths.json'),
  ])

  // --- herbal_pairings ---
  let nPairs = await countRows(supabase, 'herbal_pairings')
  const existingPairKeys = await fetchExistingPairKeys(supabase)
  const pairCandidates = pairSeed.filter((r) => !existingPairKeys.has(pairKey(r.left_herb, r.right_herb)))
  const needPairs = Math.max(0, TARGET - nPairs)
  const toInsertPairs = pairCandidates.slice(0, needPairs)

  if (toInsertPairs.length) {
    let nextPairId = await getMaxId(supabase, 'herbal_pairings')
    const rowsWithIds = toInsertPairs.map((row) => {
      nextPairId += 1
      return { id: nextPairId, ...row }
    })
    await insertBatches(supabase, 'herbal_pairings', rowsWithIds)
    console.log(`herbal_pairings: 已插入 ${rowsWithIds.length} 条（目标补足至 ${TARGET}，此前 ${nPairs} 条）`)
  } else if (nPairs >= TARGET) {
    console.log(`herbal_pairings: 已有 ${nPairs} 条，已达目标 ${TARGET}，跳过`)
  } else {
    console.warn(
      `herbal_pairings: 当前 ${nPairs} 条，需 ${needPairs} 条但种子中无更多不重复配伍，请补充 data/seeds/herbal_pairings.json`,
    )
  }

  // --- myths ---
  let nMyths = await countRows(supabase, 'myths')
  const existingQs = await fetchExistingMythQuestions(supabase)
  const mythCandidates = mythSeed.filter((r) => r.question && !existingQs.has(String(r.question).trim()))
  const needMyths = Math.max(0, TARGET - nMyths)
  const toInsertMyths = mythCandidates.slice(0, needMyths).map(({ emoji, question, answer_text, detail, type }) => ({
    emoji,
    question,
    answer_text,
    detail,
    type,
  }))

  if (toInsertMyths.length) {
    let nextMythId = await getMaxId(supabase, 'myths')
    const mythsWithIds = toInsertMyths.map((row) => {
      nextMythId += 1
      return { id: nextMythId, ...row }
    })
    await insertBatches(supabase, 'myths', mythsWithIds)
    console.log(`myths: 已插入 ${mythsWithIds.length} 条（目标补足至 ${TARGET}，此前 ${nMyths} 条）`)
  } else if (nMyths >= TARGET) {
    console.log(`myths: 已有 ${nMyths} 条，已达目标 ${TARGET}，跳过`)
  } else {
    console.warn(
      `myths: 当前 ${nMyths} 条，需 ${needMyths} 条但种子中无更多不重复问题，请补充 data/seeds/myths.json`,
    )
  }

  const finalPairs = await countRows(supabase, 'herbal_pairings')
  const finalMyths = await countRows(supabase, 'myths')
  console.log(`完成：herbal_pairings=${finalPairs}，myths=${finalMyths}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

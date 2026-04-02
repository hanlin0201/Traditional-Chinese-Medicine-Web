/**
 * 将前端有而 Supabase acupoint 表无的穴位补录入库（依赖 scripts/acupointMissingSeedData.mjs）。
 *
 * 用法：node scripts/seed-missing-acupoints.js
 * 依赖：.env 中 SUPABASE_URL、SUPABASE_SERVICE_ROLE_KEY
 */
import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import { MERIDIAN_GROUPS } from '../src/constants/acupoints.js'
import { ACUPOINT_MISSING_SEED } from './acupointMissingSeedData.mjs'

const PAGE = 1000
const BATCH = 30

async function fetchAllAcupointNames(supabase) {
  const names = new Set()
  let from = 0
  for (;;) {
    const { data, error } = await supabase
      .from('acupoint')
      .select('name')
      .range(from, from + PAGE - 1)
    if (error) throw new Error(error.message)
    if (!data?.length) break
    for (const r of data) {
      if (r.name != null && String(r.name).trim()) names.add(String(r.name).trim())
    }
    if (data.length < PAGE) break
    from += PAGE
  }
  return names
}

function allUiPointNames() {
  const set = new Set()
  for (const m of MERIDIAN_GROUPS) {
    for (const p of m.points) set.add(String(p).trim())
  }
  return set
}

async function getMaxId(supabase) {
  const { data, error } = await supabase
    .from('acupoint')
    .select('id')
    .order('id', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw new Error(`acupoint max id: ${error.message}`)
  if (!data || data.id == null) return 0
  const n = Number(data.id)
  return Number.isFinite(n) ? n : 0
}

async function main() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    console.error('请在 .env 中配置 SUPABASE_URL 和 SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }

  const supabase = createClient(url, key)
  const dbNames = await fetchAllAcupointNames(supabase)
  const uiNames = allUiPointNames()

  const missingNames = [...uiNames].filter((n) => !dbNames.has(n)).sort()

  const rows = []
  const noSeed = []
  for (const name of missingNames) {
    const seed = ACUPOINT_MISSING_SEED[name]
    if (!seed) {
      noSeed.push(name)
      continue
    }
    rows.push({
      name,
      position: seed.position,
      disease: seed.disease,
    })
  }

  if (noSeed.length) {
    console.warn(
      `以下 ${noSeed.length} 个穴在前端缺失于库中，但本脚本未提供文案，已跳过：\n${noSeed.join('、')}\n`,
    )
  }

  if (!rows.length) {
    console.log('没有需要插入的穴位（或均已存在于库中）。')
    return
  }

  let nextId = await getMaxId(supabase)
  const withIds = rows.map((r) => {
    nextId += 1
    return { id: nextId, ...r }
  })

  for (let i = 0; i < withIds.length; i += BATCH) {
    const chunk = withIds.slice(i, i + BATCH)
    const { error } = await supabase.from('acupoint').insert(chunk)
    if (error) throw new Error(`acupoint insert: ${error.message}`)
  }

  console.log(`已插入 ${withIds.length} 条穴位：`)
  console.log(withIds.map((r) => r.name).join('、'))
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

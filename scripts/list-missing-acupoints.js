/**
 * 列出「穴位导航」里在前端列出、但 Supabase acupoint 表无对应 name 的穴位。
 *
 * 用法：node scripts/list-missing-acupoints.js
 * 依赖：.env 中 SUPABASE_URL、SUPABASE_SERVICE_ROLE_KEY
 */
import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import { MERIDIAN_GROUPS } from '../src/constants/acupoints.js'

const PAGE = 1000

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

function allUiPoints() {
  const list = []
  for (const m of MERIDIAN_GROUPS) {
    for (const p of m.points) {
      list.push({
        point: String(p).trim(),
        meridianId: m.id,
        meridianName: m.name,
        category: m.category,
      })
    }
  }
  return list
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
  const ui = allUiPoints()

  const missing = ui.filter((row) => !dbNames.has(row.point))

  console.log(`前端穴位条目: ${ui.length}`)
  console.log(`数据库 acupoint.name 去重: ${dbNames.size}`)
  console.log(`未录入（无匹配 name）: ${missing.length}\n`)

  if (!missing.length) {
    console.log('全部穴位在库中均有条目。')
    return
  }

  // 按经脉分组输出
  const byMeridian = new Map()
  for (const row of missing) {
    const keyM = `${row.category} · ${row.meridianName}`
    if (!byMeridian.has(keyM)) byMeridian.set(keyM, [])
    byMeridian.get(keyM).push(row.point)
  }

  for (const [label, points] of [...byMeridian.entries()].sort()) {
    console.log(`--- ${label} (${points.length}) ---`)
    console.log(points.join('、'))
    console.log('')
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

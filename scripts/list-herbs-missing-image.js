/**
 * 列出当前 herbs 表中「没有封面图」的药材
 * 判定条件：image_url 为空、null 或全空格
 *
 * 用法：
 *   node scripts/list-herbs-missing-image.js
 *
 * 依赖 .env：SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */
import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

async function main() {
  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('请在 .env 中配置 SUPABASE_URL 和 SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  const { data, error } = await supabase
    .from('herbs')
    .select('id, name, image_url')
    .order('name', { ascending: true })

  if (error) {
    console.error('查询 herbs 失败:', error.message)
    process.exit(1)
  }

  const missing = (data || []).filter((h) => {
    if (h.image_url == null) return true
    if (typeof h.image_url !== 'string') return true
    return h.image_url.trim() === ''
  })

  console.log(`总计药材: ${data.length}，其中无图片: ${missing.length}`)
  if (!missing.length) {
    console.log('所有药材均已配置 image_url。')
    return
  }

  console.log('\n以下药材当前没有 image_url：')
  missing.forEach((h) => {
    console.log(`- ${h.name} (id=${h.id})`)
  })
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})


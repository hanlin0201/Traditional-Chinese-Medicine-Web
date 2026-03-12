/**
 * 批量为 herbs 表设置封面图：
 * 从 CSV 读取「药材名 + 远程图片 URL」，依次下载、上传到 Supabase Storage，
 * 然后更新 herbs.image_url 为 Storage 的公开地址。
 *
 * CSV 格式（UTF-8，无 BOM）：
 *   name,image_url
 *   半春莲,https://example.com/a.jpg
 *   布狗尾,https://example.com/b.png
 *
 * 用法：
 *   node scripts/batch-set-herb-images-from-url.js scripts/herb_images_to_import.csv
 *
 * 依赖 .env：SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */
import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'
import path from 'node:path'

async function main() {
  const [,, csvPathArg] = process.argv

  if (!csvPathArg) {
    console.error('用法: node scripts/batch-set-herb-images-from-url.js <csv路径>')
    process.exit(1)
  }

  const resolvedCsvPath = path.resolve(csvPathArg)
  if (!fs.existsSync(resolvedCsvPath)) {
    console.error(`找不到 CSV 文件: ${resolvedCsvPath}`)
    process.exit(1)
  }

  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('请在 .env 中配置 SUPABASE_URL 和 SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  const raw = fs.readFileSync(resolvedCsvPath, 'utf8')

  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'))

  if (!lines.length) {
    console.error('CSV 文件为空')
    process.exit(1)
  }

  const header = lines[0].split(',').map((h) => h.trim())
  const nameIdx = header.indexOf('name')
  const urlIdx = header.indexOf('image_url')

  if (nameIdx === -1 || urlIdx === -1) {
    console.error('CSV 需要包含表头: name,image_url')
    process.exit(1)
  }

  const rows = lines.slice(1).map((line, index) => {
    const cols = line.split(',')
    return {
      lineNumber: index + 2,
      name: (cols[nameIdx] || '').trim(),
      imageUrl: (cols[urlIdx] || '').trim(),
    }
  }).filter((r) => r.name && r.imageUrl)

  console.log(`即将处理 ${rows.length} 条记录 (来自 ${resolvedCsvPath})`)

  for (const row of rows) {
    console.log('\n----------------------------------------')
    console.log(`第 ${row.lineNumber} 行: ${row.name}`)

    try {
      // 1. 查 herb 记录
      const { data: herb, error: herbError } = await supabase
        .from('herbs')
        .select('id, name')
        .eq('name', row.name)
        .maybeSingle()

      if (herbError) {
        console.error(`查询 "${row.name}" 失败:`, herbError.message)
        continue
      }
      if (!herb) {
        console.error(`未找到名称为「${row.name}」的药材，跳过。`)
        continue
      }

      console.log(`目标药材: ${herb.name} (id=${herb.id})`)

      // 2. 下载远程图片
      console.log('开始下载图片...')
      const resp = await fetch(row.imageUrl)
      if (!resp.ok) {
        console.error('下载图片失败:', resp.status, resp.statusText)
        continue
      }
      const contentType = resp.headers.get('content-type') || 'image/jpeg'
      const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg'
      const buffer = Buffer.from(await resp.arrayBuffer())

      // 3. 上传到 Supabase Storage
      const storagePath = `herbs/${herb.id}.${ext}`
      console.log('上传到 Storage 路径:', storagePath)

      const { error: uploadError } = await supabase
        .storage
        .from('image')
        .upload(storagePath, buffer, {
          contentType,
          upsert: true,
        })

      if (uploadError) {
        console.error('上传图片失败:', uploadError.message)
        continue
      }

      const { data: urlData } = supabase.storage.from('image').getPublicUrl(storagePath)
      const publicUrl = urlData.publicUrl
      console.log('新图片 URL:', publicUrl)

      // 4. 更新 herbs.image_url
      const { error: updateError } = await supabase
        .from('herbs')
        .update({ image_url: publicUrl })
        .eq('id', herb.id)

      if (updateError) {
        console.error('更新 herbs.image_url 失败:', updateError.message)
        continue
      }

      console.log('已更新 herbs.image_url 成功。')
    } catch (e) {
      console.error(`处理 "${row.name}" 发生异常:`, e)
      continue
    }
  }

  console.log('\n批量处理完成。')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})


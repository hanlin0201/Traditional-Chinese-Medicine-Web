/**
 * 从远程图片 URL 下载单张图片，上传到 Supabase Storage，并更新 herbs.image_url
 *
 * 用法（示例：半春莲）：
 *   node scripts/set-herb-image-from-url.js "半春莲" "https://xxx/your-image.jpg"
 *
 * 依赖 .env：SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */
import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

async function main() {
  const [,, herbName, imageUrl] = process.argv

  if (!herbName || !imageUrl) {
    console.error('用法: node scripts/set-herb-image-from-url.js "<药材名>" "<图片URL>"')
    process.exit(1)
  }

  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('请在 .env 中配置 SUPABASE_URL 和 SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  // 1. 查 herb 记录
  const { data: herb, error: herbError } = await supabase
    .from('herbs')
    .select('id, name')
    .eq('name', herbName)
    .maybeSingle()

  if (herbError) {
    console.error('查询 herbs 失败:', herbError.message)
    process.exit(1)
  }
  if (!herb) {
    console.error(`未找到名称为「${herbName}」的药材`)
    process.exit(1)
  }

  console.log(`目标药材: ${herb.name} (id=${herb.id})`)

  // 2. 下载远程图片
  console.log('开始下载图片...')
  const resp = await fetch(imageUrl)
  if (!resp.ok) {
    console.error('下载图片失败:', resp.status, resp.statusText)
    process.exit(1)
  }
  const contentType = resp.headers.get('content-type') || 'image/jpeg'
  const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg'
  const buffer = Buffer.from(await resp.arrayBuffer())

  // 3. 上传到 Supabase Storage
  const path = `herbs/${herb.id}.${ext}`
  console.log('上传到 Storage 路径:', path)
  const { error: uploadError } = await supabase
    .storage
    .from('image')
    .upload(path, buffer, {
      contentType,
      upsert: true,
    })

  if (uploadError) {
    console.error('上传图片失败:', uploadError.message)
    process.exit(1)
  }

  const { data: urlData } = supabase.storage.from('image').getPublicUrl(path)
  const publicUrl = urlData.publicUrl
  console.log('新图片 URL:', publicUrl)

  // 4. 更新 herbs.image_url
  const { error: updateError } = await supabase
    .from('herbs')
    .update({ image_url: publicUrl })
    .eq('id', herb.id)

  if (updateError) {
    console.error('更新 herbs.image_url 失败:', updateError.message)
    process.exit(1)
  }

  console.log('已更新 herbs.image_url 成功。')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})


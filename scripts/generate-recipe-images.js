/**
 * 方案 B：本地批量生成食谱封面图并覆盖 Supabase recipes.image
 * 流程：读食谱 → LLM 生成 prompt → 图像模型生成图 → 上传 Storage → 更新 DB
 *
 * 支持两种后端（二选一，通过 .env 配置）：
 *   - OpenAI：OPENAI_API_KEY → GPT-4o-mini + DALL·E 3
 *   - 智谱AI：ZHIPU_API_KEY → GLM-4 + CogView-4 / GLM-Image
 *
 * 用法：
 *   node scripts/generate-recipe-images.js --style "中国风工笔，温暖食物摄影"
 *   node scripts/generate-recipe-images.js --style "..." --only-placeholders
 *   node scripts/generate-recipe-images.js --style "..." --limit 2
 *
 * 依赖 .env：SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY，以及 OPENAI_API_KEY 或 ZHIPU_API_KEY 其一
 */
import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'
import { parseArgs } from 'util'

const PLACEHOLDER_DOMAINS = ['unsplash.com', 'images.unsplash.com', 'plus.unsplash.com']
const STORAGE_PATH_PREFIX = 'recipe-covers'
const DELAY_MS = 2000

const ZHIPU_CHAT_URL = 'https://open.bigmodel.cn/api/paas/v4/chat/completions'
const ZHIPU_IMAGE_URL = 'https://open.bigmodel.cn/api/paas/v4/images/generations'
const ZHIPU_CHAT_MODEL = 'glm-4-flash'
const ZHIPU_IMAGE_MODEL = 'cogview-4'
const ZHIPU_IMAGE_SIZE = '1024x1024'

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

function parseCli() {
  const { values } = parseArgs({
    options: {
      style: { type: 'string', short: 's' },
      'only-placeholders': { type: 'boolean', default: false },
      limit: { type: 'string', short: 'n' },
    },
    strict: true,
  })
  return {
    style:
      values.style ||
      process.env.RECIPE_IMAGE_STYLE ||
      '高质量写实风格的中式家常养生菜肴美食摄影，真实灯光与质感，细节清晰，接近实拍照片，无文字，无插画风',
    onlyPlaceholders: values['only-placeholders'],
    limit: values.limit ? parseInt(values.limit, 10) : null,
  }
}

function isPlaceholder(url) {
  if (!url || typeof url !== 'string') return true
  const u = url.trim()
  if (!u) return true
  try {
    const host = new URL(u).hostname.toLowerCase()
    return PLACEHOLDER_DOMAINS.some((d) => host === d || host.endsWith('.' + d))
  } catch {
    return false
  }
}

async function getPromptForRecipe(openai, recipeName, style, useZhipu) {
  if (useZhipu) {
    const apiKey = process.env.ZHIPU_API_KEY
    const res = await fetch(ZHIPU_CHAT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: ZHIPU_CHAT_MODEL,
        messages: [
          {
            role: 'system',
            content:
              '你只输出一句用于生成食物图片的文本描述，不要解释、不要换行。描述一道真实存在的中式养生菜肴的成菜外观，可直接给图像模型使用。',
          },
          {
            role: 'user',
            content: `食谱名称：${recipeName}。风格要求：${style}。请只输出这一句描述。`,
          },
        ],
        max_tokens: 120,
      }),
    })
    const data = await res.json()
    const text = data.choices?.[0]?.message?.content?.trim()
    if (!text) throw new Error('智谱 未返回 prompt: ' + (data.error?.message || JSON.stringify(data)))
    return text
  }

  const { choices } = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content:
          '你只输出一句用于生成食物图片的英文 prompt，不要解释、不要换行。描述一道真实存在的中式养生菜肴的成菜外观，适合给图像模型 DALL·E 使用。',
      },
      {
        role: 'user',
        content: `食谱名称：${recipeName}。风格要求：${style}。请只输出这一句英文 prompt。`,
      },
    ],
    max_tokens: 120,
  })
  const text = choices?.[0]?.message?.content?.trim()
  if (!text) throw new Error('LLM 未返回 prompt')
  return text
}

async function generateImage(openai, prompt, useZhipu) {
  if (useZhipu) {
    const apiKey = process.env.ZHIPU_API_KEY
    const res = await fetch(ZHIPU_IMAGE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: ZHIPU_IMAGE_MODEL,
        prompt,
        size: ZHIPU_IMAGE_SIZE,
        quality: 'standard',
        watermark_enabled: true,
      }),
    })
    const data = await res.json()
    const url = data.data?.[0]?.url
    if (!url) throw new Error('智谱 未返回图片: ' + (data.error?.message || JSON.stringify(data)))
    const resp = await fetch(url)
    if (!resp.ok) throw new Error(`拉取图片失败: ${resp.status}`)
    return Buffer.from(await resp.arrayBuffer())
  }

  const res = await openai.images.generate({
    model: 'dall-e-3',
    prompt,
    n: 1,
    size: '1024x1024',
    response_format: 'url',
    quality: 'standard',
  })
  const url = res.data?.[0]?.url
  if (!url) throw new Error('DALL·E 未返回图片 URL')
  const resp = await fetch(url)
  if (!resp.ok) throw new Error(`拉取图片失败: ${resp.status}`)
  return Buffer.from(await resp.arrayBuffer())
}

async function uploadAndUpdate(supabase, recipeId, buffer) {
  const path = `${STORAGE_PATH_PREFIX}/${recipeId}.png`
  const { error: uploadError } = await supabase.storage.from('image').upload(path, buffer, {
    contentType: 'image/png',
    upsert: true,
  })
  if (uploadError) throw uploadError
  const { data: urlData } = supabase.storage.from('image').getPublicUrl(path)
  const { error: updateError } = await supabase.from('recipes').update({ image: urlData.publicUrl }).eq('id', recipeId)
  if (updateError) throw updateError
  return urlData.publicUrl
}

async function main() {
  const { style, onlyPlaceholders, limit } = parseCli()

  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const openaiKey = process.env.OPENAI_API_KEY
  const zhipuKey = process.env.ZHIPU_API_KEY
  const useZhipu = !!zhipuKey && !openaiKey

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('请设置 .env 中的 SUPABASE_URL 和 SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }
  if (!useZhipu && !openaiKey) {
    console.error('请设置 .env 中的 OPENAI_API_KEY 或 ZHIPU_API_KEY（二选一）')
    process.exit(1)
  }
  if (useZhipu) console.log('使用智谱AI（GLM + CogView-4）\n')

  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  const openai = openaiKey ? new OpenAI({ apiKey: openaiKey }) : null

  let { data: recipes, error } = await supabase.from('recipes').select('id, name, image').order('id')
  if (error) {
    console.error('获取食谱失败:', error.message)
    process.exit(1)
  }

  if (onlyPlaceholders) {
    recipes = recipes.filter((r) => isPlaceholder(r.image))
    console.log(`仅处理占位图：共 ${recipes.length} 条`)
  }
  if (limit && limit > 0) {
    recipes = recipes.slice(0, limit)
    console.log(`限制条数：${limit}`)
  }

  if (!recipes.length) {
    console.log('没有需要处理的食谱，退出')
    process.exit(0)
  }

  console.log(`风格: ${style}`)
  console.log(`待处理: ${recipes.length} 条\n`)

  const failed = []
  for (let i = 0; i < recipes.length; i++) {
    const r = recipes[i]
    console.log(`[${i + 1}/${recipes.length}] ${r.name} (id=${r.id})`)
    try {
      const prompt = await getPromptForRecipe(openai, r.name, style, useZhipu)
      console.log(`  prompt: ${prompt.slice(0, 60)}...`)
      const buffer = await generateImage(openai, prompt, useZhipu)
      const url = await uploadAndUpdate(supabase, r.id, buffer)
      console.log(`  ok -> ${url}`)
    } catch (e) {
      console.error(`  失败: ${e.message}`)
      failed.push({ id: r.id, name: r.name, error: e.message })
    }
    if (i < recipes.length - 1) await sleep(DELAY_MS)
  }

  if (failed.length) {
    console.log('\n失败列表:')
    failed.forEach((f) => console.log(`  ${f.name} (id=${f.id}): ${f.error}`))
  }
  console.log(`\n完成。成功 ${recipes.length - failed.length}，失败 ${failed.length}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

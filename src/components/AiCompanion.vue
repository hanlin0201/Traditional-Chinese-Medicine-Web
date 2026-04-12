<script setup>
import { ref, nextTick, watch, onMounted, onUnmounted } from 'vue'
import { ScrollText, Send, X, ChevronDown, Heart, PlusCircle, Loader2, BookOpen, Coffee, Soup, Pill, MessageCircle, Check, History, Trash2, Edit2 } from 'lucide-vue-next'
import { supabase } from '@/supabaseClient'
import { useAuth } from '@/composables/useAuth'
import { AI_TUTOR_LABEL } from '@/constants/branding'

const { user, logUserHistory } = useAuth()
const open = ref(false)
const input = ref('')
const loadingStatus = ref('') 
const messagesContainer = ref(null)
const panelShellRef = ref(null)
const favorited = ref(new Set())   
const foldedStates = ref({})       

/*const userTurnCount = ref(0)*/
const pendingPrescription = ref(null)
const prescriptionLoading = ref(false)
const prescriptionLoadingSessionId = ref(null)
const isGenerating = ref(false)

// 👇 Supabase Edge Function 地址（API Key 安全存储在服务端，前端无需暴露）
const TCM_CHAT_URL = 'https://htrtcaswqydnfvgwernh.supabase.co/functions/v1/tcm-chat'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0cnRjYXN3cXlkbmZ2Z3dlcm5oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2MDYyNDgsImV4cCI6MjA4NTE4MjI0OH0.N9NEwFKZHtiEITimRsaMEQ4hS-rZ2XdR2pLWSG4GC68'

const CONFIRM_KEYWORDS = ['没有了', '确认', '就这些', '可以开方', '没了', '开方吧', '可以了', '没有其他', '请开方', '没有其他症状', '没有其他症状了', '无其他症状', '直接开方', '帮我开方', '帮我开个方']

// 知识类/日常问题关键词：用户问这些时直接回答，不追问症状
const GENERAL_QUESTION_PATTERNS = ['是什么', '为什么', '什么原因', '怎么引起的', '作用', '功效', '怎么用', '怎么吃', '能吃吗', '适合', '禁忌', '注意事项', '你好', '您好', '嗨', '哈喽', '早上好', '下午好', '晚上好', '你是谁', '你能做什么', '你会什么']

// 用户表示一切良好：停止追问，简短祝福即可
const ALL_FINE_KEYWORDS = ['好多了', '谢谢', '没什么不舒服', '一切都挺好', '没什么问题', '挺好的', '谢谢诊断', '好多了谢谢', '没什么了', '都挺好', '没问题了', '已经好了']

// 模糊表述：需多轮追问才能开方（累、没劲、不舒服等）
const VAGUE_SYMPTOM_PATTERNS = ['累', '没劲', '没精神', '浑身无力', '不舒服', '说不清', '总觉得', '不太舒服', '有点虚', '乏力', '疲倦', '疲惫']
function isVagueSymptomText(text = '') {
  return VAGUE_SYMPTOM_PATTERNS.some(k => text.includes(k))
}

// 用户明确请求调理/食疗方案
const PLAN_REQUEST_PATTERNS = ['调理方案', '食疗方案', '食疗', '治疗方案', '开方', '开个方', '给个方子', '帮我调理', '帮我开', '生成方案', '帮我生成']
function isPlanRequestText(text = '') {
  return PLAN_REQUEST_PATTERNS.some(k => text.includes(k))
}

const SYSTEM_PROMPT = `你是一位经验丰富的中医专家（AI TCM Tutor），像一位和蔼的老中医和用户自然对话。

【简单 vs 模糊 问题区分】
- **简单明确问题**（如痘痘、白头发、嘴唇干、失眠）：可 1-2 轮了解后给出方案。
- **模糊表述**（如「我很累」「浑身没劲」「总觉得不舒服」）：**必须**从睡眠、饮食、情绪、二便、舌苔、怕冷怕热等多维度追问，至少 3-4 轮后再给方案，不要急于开方。

【食疗定位与安全红线】
- **本平台只做食疗食谱推荐**，讲究食补，不推荐成药、丸剂、散剂等需购买服用的中成药（如金匮肾气丸、附子理中丸等）。
- **严禁使用有毒药材**：附子、乌头、马钱子、砒霜、生半夏、生南星等一律禁止。食疗方仅使用药食同源、常见食材及温和药材。
- recipes 三类含义：tea=茶饮（红枣、枸杞、菊花、陈皮等安全食材）；meal=食疗汤粥/家常菜；classic=可在家制作的经典食疗方，**禁止**成药或含毒药材的方剂。

【非问诊输入识别】
当用户输入的内容与身体症状、健康问题**完全无关**时（如打招呼、闲聊、测试文字、无意义输入、表达情绪等），**禁止**触发问诊流程，**禁止**附带 inquiry 卡片。直接用一两句自然语言友好回应即可，例如"您好！有什么身体不适或中医问题可以告诉我，我来帮您。"。只有当用户明确描述症状、身体不适或主动询问中医健康相关内容时，才进入问诊流程。

【核心规则】
1. **绝对服从问诊节奏**
  我会通过对话末尾的【系统提示】告诉你当前该”继续追问”还是”出具处方”。请你必须严格遵从提示的指令。如果提示不允许开方，绝对不能输出处方 JSON。

2. **开方前必须了解舌苔**
  在出具处方之前，必须至少询问过用户的舌苔情况（舌色、舌苔厚薄、润燥等）。如果对话中从未问过舌苔，无论轮数多少，都必须先补问舌苔，再开方。用户主动要求”直接开方”时可例外。

3. **开方时先写诊断分析，再给卡片**
  当【系统提示】允许出具处方时，**禁止**直接输出 JSON 卡片。必须先用 2-3 句自然语言写出诊断分析（如”根据你描述的症状，结合舌苔情况，初步判断你属于……，建议从……方向调理”），再紧接着输出处方 JSON 卡片。

4. **处方卡片 JSON 格式要求**
  当【系统提示】允许你出具处方时，你的回复必须包含 \`\`\`json 代码块，且其中必须有 type: “prescription” 的完整 JSON。格式必须包含：warm_words、diagnosis_result、summary、recipes（至少 tea/meal/classic 三类）、acupoints（无则写[{“name”:”无”,”location”:”无”,”method”:”无”}]）、lifestyle。

5. **追问选项卡片 JSON 格式要求**
  当【系统提示】要求你继续追问时，每次回复末尾**必须**附带 type: “inquiry” 的 JSON 选项卡片，让用户点击。options 需包含 4-6 个相关选项 + 「以上都不是」 + 「无其他症状，请开方」。

6. **症状矛盾时必须追问，不得强行判断**
  如果用户提供的症状之间存在辨证矛盾（例如：嗓子痛+发热指向风热，但舌苔薄白指向风寒），**禁止**按"多数症状"直接拍板。必须先向用户指出矛盾所在，说明"你的某些症状指向不同方向"，然后针对矛盾点进一步追问澄清（如怕冷还是怕热、有没有出汗等），直到矛盾消除再给出诊断。用户主动要求"直接开方"时可例外。

7. **分点作答时每点换行**
  当回复涉及 1、2、3 点或分条说明时，每条单独成行，不要挤在一行。

【inquiry 格式】追问时在末尾附带：
\`\`\`json
{ "type": "inquiry", "text": "你的问诊问题", "options":[{"label": "选项1", "value": "v1"}, {"label": "选项2", "value": "v2"}, {"label": "以上都不是", "value": "none"}, {"label": "无其他症状，请开方", "value": "finish"}] }
\`\`\`

【prescription 格式】给调理方案时输出：
\`\`\`json
{
  "type": "prescription",
  "warm_words": "暖心过渡语",
  "diagnosis_result": "辩证结果",
  "summary": "简要总结",
  "recipes":[
    { "category": "tea", "name": "方剂名", "tags": ["标签"], "ingredients": ["药材1", "药材2"], "steps": ["步骤1"], "rationale": "医理依据" },
    { "category": "meal", "name": "食疗方", "tags": ["标签"], "ingredients": ["食材1"], "steps": ["步骤1"], "rationale": "医理依据" },
    { "category": "classic", "name": "经典方剂", "tags":["标签"], "ingredients": ["药材1"], "steps": ["用法"], "rationale": "医理依据" }
  ],
  "acupoints":[{ "name": "穴位名", "location": "位置", "method": "按揉方法" }],
  "lifestyle":["禁忌1", "禁忌2"]
}
\`\`\`
recipes 需含 tea、meal、classic 三类。acupoints 无合适时可写[{"name": "无", "location": "无", "method": "无"}]。lifestyle 需包含必要的慎用提醒（如孕妇、儿童、过敏体质慎用等）。
`

const WELCOME_MSG = { role: 'assistant', type: 'text', content: '您好，我是 AI 养生导师。请告诉我您哪里不舒服，或者有什么中医药知识问题都可以咨询我。' }
const messages = ref([{ ...WELCOME_MSG }])

// ── 会话管理 ──────────────────────────────────────────
// key 按用户 ID 隔离，未登录用 'guest'
function getSessionsKey() {
  return `tcm_chat_sessions_${user.value?.id || 'guest'}`
}
const sessions = ref([])
const activeSessionId = ref(null)
const showSessionList = ref(false)
const editingSessionId = ref(null)
const editingTitle = ref('')

function serializeMessages(msgs) {
  // 过滤掉未完成的流式消息，其余全部保存
  return msgs.filter(m => m.type !== 'streaming').map(m => ({ ...m }))
}

function persistSessions() {
  try { localStorage.setItem(getSessionsKey(), JSON.stringify(sessions.value)) } catch {}
}

function saveActiveSession() {
  const idx = sessions.value.findIndex(s => s.id === activeSessionId.value)
  if (idx === -1) return
  const serialized = serializeMessages(messages.value)
  sessions.value[idx].messages = serialized
  sessions.value[idx].updatedAt = new Date().toISOString()
  // 用第一条用户消息自动生成标题
  if (!sessions.value[idx].manualTitle && sessions.value[idx].title === '新对话') {
    const firstUser = serialized.find(m => m.role === 'user')
    if (firstUser) {
      const t = firstUser.content || ''
      sessions.value[idx].title = t.length > 18 ? t.slice(0, 18) + '…' : t
    }
  }
  persistSessions()
}

function createNewSession() {
  if (isGenerating.value) return
  saveActiveSession()
  const id = String(Date.now())
  sessions.value.unshift({
    id,
    title: '新对话',
    manualTitle: false,
    messages: [{ ...WELCOME_MSG }],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })
  activeSessionId.value = id
  messages.value = [{ ...WELCOME_MSG }]
  showSessionList.value = false
  persistSessions()
  nextTick(() => scrollToBottom())
}

function switchToSession(id) {
  if (isGenerating.value) return
  if (id === activeSessionId.value) { showSessionList.value = false; return }
  saveActiveSession()
  cancelRenameSession()
  activeSessionId.value = id
  const s = sessions.value.find(s => s.id === id)
  messages.value = s?.messages?.length ? [...s.messages] : [{ ...WELCOME_MSG }]
  showSessionList.value = false
  nextTick(() => scrollToBottom())
}

function startRenameSession(session, e) {
  e?.stopPropagation()
  editingSessionId.value = session.id
  editingTitle.value = session.title || ''
}

function cancelRenameSession(e) {
  e?.stopPropagation()
  editingSessionId.value = null
  editingTitle.value = ''
}

function commitRenameSession(id, e) {
  e?.stopPropagation()
  const idx = sessions.value.findIndex(s => s.id === id)
  if (idx === -1) {
    cancelRenameSession()
    return
  }

  const nextTitle = String(editingTitle.value || '').trim()
  if (nextTitle) {
    sessions.value[idx].title = nextTitle.slice(0, 30)
    sessions.value[idx].manualTitle = true
    sessions.value[idx].updatedAt = new Date().toISOString()
    persistSessions()
  }

  cancelRenameSession()
}

function deleteSession(id, e) {
  e?.stopPropagation()
  sessions.value = sessions.value.filter(s => s.id !== id)
  if (activeSessionId.value === id) {
    if (sessions.value.length) {
      activeSessionId.value = sessions.value[0].id
      messages.value = sessions.value[0].messages?.length ? [...sessions.value[0].messages] : [{ ...WELCOME_MSG }]
    } else {
      // 全部删完则自动新建一个
      const newId = String(Date.now())
      sessions.value.push({ id: newId, title: '新对话', manualTitle: false, messages: [{ ...WELCOME_MSG }], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
      activeSessionId.value = newId
      messages.value = [{ ...WELCOME_MSG }]
    }
  }
  if (editingSessionId.value === id) cancelRenameSession()
  persistSessions()
}

function formatSessionDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const now = new Date()
  const diffDays = Math.floor((now - d) / 86400000)
  if (diffDays === 0) return '今天'
  if (diffDays === 1) return '昨天'
  return `${d.getMonth() + 1}月${d.getDate()}日`
}

function loadSessions() {
  try {
    const raw = localStorage.getItem(getSessionsKey())
    if (raw) {
      const parsed = JSON.parse(raw)
      sessions.value = Array.isArray(parsed)
        ? parsed.map(s => ({ ...s, manualTitle: !!s.manualTitle }))
        : []
    }
  } catch {}
  if (sessions.value.length) {
    activeSessionId.value = sessions.value[0].id
    messages.value = sessions.value[0].messages?.length ? [...sessions.value[0].messages] : [{ ...WELCOME_MSG }]
  } else {
    const id = String(Date.now())
    sessions.value = [{ id, title: '新对话', manualTitle: false, messages: [{ ...WELCOME_MSG }], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }]
    activeSessionId.value = id
    persistSessions()
  }
}
// ─────────────────────────────────────────────────────

function toggle() { open.value = !open.value; if(open.value) scrollToBottom() }
function scrollToBottom() { nextTick(() => { if (messagesContainer.value) messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight }) }
watch(messages, scrollToBottom, { deep: true })
// 消息变化时自动保存（跳过流式中间状态）
watch(messages, () => {
  if (!activeSessionId.value) return
  if (messages.value.some(m => m.type === 'streaming')) return
  saveActiveSession()
}, { deep: true })

// 登录/退出时切换到对应账号的会话记录
watch(user, () => {
  sessions.value = []
  activeSessionId.value = null
  loadSessions()
})

/*function isNewConversationAfterPrescription() {
  const list = messages.value.filter(m => m.type !== 'streaming')
  if (list.length < 2) return false
  const last = list[list.length - 1]
  if (last.role !== 'user') return false
  // 只要历史中曾出现过处方，且用户发了新消息，就视为新对话，清除旧记忆
  const hasPrescription = list.some(m => m.type === 'prescription')
  return hasPrescription
}*/

async function callSiliconFlowStream(onChunk, userInputText = '') {
  let apiMessages =[]
  const list = messages.value.filter(m => m.type !== 'streaming')

  // 🚀 1. 找到历史对话中，最后一次成功开方的位置
  let lastPrescriptionIdx = -1
  for (let i = list.length - 1; i >= 0; i--) {
    if (list[i].type === 'prescription') {
      lastPrescriptionIdx = i
      break
    }
  }

  // 🚀 2. 包含完整对话历史，让 AI 能参考上下文（如”上次开的头疼方吃了好多了”）
  // 处方消息序列化为纯文字摘要，避免原始 JSON 暴露给 AI 造成重复输出或乱码
  for (let i = 0; i < list.length; i++) {
    const m = list[i]
    const role = m.role === 'user' ? 'user' : 'assistant'
    let content = ''

    if (m.type === 'prescription') {
      // 将处方卡片转为可读摘要，禁止传入原始 JSON
      const recipeNames = (m.recipes || []).map(r => r.name).filter(Boolean).join('、')
      const acupointNames = (m.acupoints || [])
        .filter(a => a && a.name !== '无')
        .map(a => a.name)
        .join('、')
      content = `【已出具处方】\n辨证结果：${m.diagnosis_result || ''}\n方案概要：${m.summary || ''}\n食疗推荐：${recipeNames || '见处方卡'}`
      if (acupointNames) content += `\n穴位推荐：${acupointNames}`
    } else if (m.type === 'inquiry') {
      content = m.text || ''
    } else {
      content = m.content || ''
    }

    if (!content) continue
    apiMessages.push({ role, content })
  }

  // 🚀 3. 若有历史处方，在开头注入上下文提示，告知 AI 可参考历史（而非忘掉）
  if (lastPrescriptionIdx >= 0 && apiMessages.length > 0) {
    apiMessages.unshift({
      role: 'assistant',
      content: '【系统提示】本对话有过往问诊记录。若用户提及上次处方或症状变化，请结合历史信息综合判断，无需重复追问已了解的内容。若用户提出全新问题，则重新独立辨证分析。',
    })
  }

  // 🚀 4. userTurnCount 仍只统计【当前新轮次】中用户的发言次数，保证追问/开方节奏不受历史影响
  const currentStartIndex = lastPrescriptionIdx >= 0 ? lastPrescriptionIdx + 1 : 0
  const currentTurnCount = list.slice(currentStartIndex).filter(m => m.role === 'user').length

  // 发送请求给后端
  const response = await fetch(TCM_CHAT_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({
      messages: apiMessages,
      systemPrompt: SYSTEM_PROMPT,
      userTurnCount: currentTurnCount, // 使用刚算出来的精准轮数
      userJustConfirmed: CONFIRM_KEYWORDS.some(k => userInputText.includes(k)),
      conversationResetAfterPrescription: lastPrescriptionIdx >= 0,
      isGeneralQuestion: GENERAL_QUESTION_PATTERNS.some(k => userInputText.includes(k)),
      userSaysAllFine: ALL_FINE_KEYWORDS.some(k => userInputText.includes(k)),
      userNeedsPlanCard: isPlanRequestText(userInputText),
      isVagueSymptom: isVagueSymptomText(userInputText),
    }),
  })

  if (!response.ok) {
    const errText = await response.text().catch(() => '')
    throw new Error(`请求失败(${response.status}): ${errText}`)
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let sseBuffer = ''
  let fullText = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    sseBuffer += decoder.decode(value, { stream: true })
    const lines = sseBuffer.split('\n')
    sseBuffer = lines.pop() || ''

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || !trimmed.startsWith('data: ')) continue
      const jsonStr = trimmed.slice(6)
      if (jsonStr === '[DONE]') continue

      try {
        const parsed = JSON.parse(jsonStr)
        // SSE 数据按 OpenAI-compatible 字段解析（当前上游为硅基流动 SiliconFlow）：choices[0].delta.content
        const chunk = parsed.choices?.[0]?.delta?.content || ''
        if (chunk) {
          fullText += chunk
          onChunk(chunk, fullText)
        }
      } catch {}
    }
  }

  return fullText
}

function extractJSON(text, preferType = null) {
  const tryParse = (str) => {
    try {
      const s = String(str).replace(/,\s*([}\]])/g, '$1').trim()
      return JSON.parse(s)
    } catch { return null }
  }
  const codeBlocks = text.match(/```(?:json)?\s*([\s\S]*?)```/g) || []
  for (const block of codeBlocks) {
    const inner = block.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '').trim()
    const parsed = tryParse(inner)
    if (parsed && parsed.type && (!preferType || parsed.type === preferType)) return parsed
  }
  const rx = preferType === 'prescription' ? /"type"\s*:\s*"prescription"/ : /"type"\s*:\s*"(?:prescription|inquiry)"/
  const idx = text.search(rx)
  if (idx >= 0) {
    let start = text.lastIndexOf('{', idx)
    if (start < 0) start = text.indexOf('{')
    if (start >= 0) {
      let depth = 0
      for (let i = start; i < text.length; i++) {
        if (text[i] === '{') depth++
        else if (text[i] === '}') depth--
        if (depth === 0) {
          const parsed = tryParse(text.slice(start, i + 1))
          if (parsed && parsed.type && (!preferType || parsed.type === preferType)) return parsed
          break
        }
      }
    }
  }
  const startIdx = text.indexOf('{')
  if (startIdx === -1) return null
  let depth = 0
  for (let i = startIdx; i < text.length; i++) {
    if (text[i] === '{') depth++
    else if (text[i] === '}') depth--
    if (depth === 0) {
      const parsed = tryParse(text.slice(startIdx, i + 1))
      if (parsed && parsed.type) return parsed
      break
    }
  }
  return null
}

function stripJsonFromText(text) {
  let result = text.replace(/```json[\s\S]*?```/g, '').replace(/```[\s\S]*?```/g, '')

  const startIdx = result.indexOf('{')
  if (startIdx >= 0) {
    let depth = 0
    for (let i = startIdx; i < result.length; i++) {
      if (result[i] === '{') depth++
      else if (result[i] === '}') depth--
      if (depth === 0) {
        try {
          const parsed = JSON.parse(result.slice(startIdx, i + 1))
          if (parsed && parsed.type) {
            result = result.slice(0, startIdx) + result.slice(i + 1)
          }
        } catch {}
        break
      }
    }
  }
  // 移除泄露到界面的内部标识（type: "inquiry" 等）
  result = result.replace(/\s*type\s*:\s*["']?(?:inquiry|prescription)["']?\s*/gi, '').trim()
  return result.trim()
}

function cleanDisplayContent(content) {
  if (!content) return content
  let s = String(content).replace(/\s*type\s*:\s*["']?(?:inquiry|prescription)["']?\s*/gi, '').trim()
  // 兜底：压缩异常连发的感叹号，避免出现刷屏式“!!!!!!”
  s = s.replace(/([!！])\1{3,}/g, '$1')
  s = s.replace(/(?:[!！]\s*){4,}/g, '！')
  // 分点作答时每条换行：1. xxx 2. xxx -> 1. xxx\n2. xxx
  s = s.replace(/([^\n])\s*(\d+)[\.、]\s+/g, '$1\n$2. ')
  return s
}

function ensureArray(val) {
  if (!val) return []
  if (Array.isArray(val)) return val
  if (typeof val === 'string') {
    if (val.includes('\n')) return val.split('\n').filter(s => s.trim())
    if (val.includes('、')) return val.split('、').filter(s => s.trim())
    return [val]
  }
  return [] 
}

// 安全过滤：含毒药材或成药的方子不展示
const TOXIC_HERBS = ['附子', '乌头', '马钱子', '砒霜', '生半夏', '生南星']
function isUnsafeRecipe(r) {
  const ingStr = ensureArray(r.ingredients).join('、')
  if (TOXIC_HERBS.some(h => ingStr.includes(h))) return true
  const stepsStr = ensureArray(r.steps).join(' ') + (r.name || '')
  if ((r.name?.includes('丸') || r.name?.includes('散')) && (stepsStr.includes('成药') || stepsStr.includes('可直接购买'))) return true
  return false
}

function cleanPrescription(jsonData) {
  const aiResponse = { ...jsonData, role: 'assistant' }
  if (!Array.isArray(aiResponse.recipes)) {
    aiResponse.recipes = Array.isArray(jsonData.recipe) ? jsonData.recipe : (jsonData.recipes ? [jsonData.recipes].flat() : [])
  }
  aiResponse.recipes = aiResponse.recipes.map(r => {
    if (typeof r === 'string') {
      return { name: r, category: 'meal', ingredients: [], steps: [], tags: [], rationale: '' }
    }
    const rationale = String(
      r.rationale || r.reason || r.medical_basis || r.theory || r.医理依据 || '',
    ).trim()
    return {
      ...r,
      id: 'r_' + Math.random().toString(36).substr(2, 9),
      name: r.name || '调理食谱',
      category: r.category || 'meal',
      ingredients: ensureArray(r.ingredients),
      steps: ensureArray(r.steps),
      tags: ensureArray(r.tags),
      rationale
    }
  }).filter(Boolean).filter(r => !isUnsafeRecipe(r))
  aiResponse.lifestyle = ensureArray(aiResponse.lifestyle)
  if (aiResponse.recipes.length === 0) {
    aiResponse.lifestyle = [...aiResponse.lifestyle, '该方案涉及需专业指导的药材，部分方剂已隐藏，建议线下咨询医师。']
  }
  if (!Array.isArray(aiResponse.acupoints)) aiResponse.acupoints = []
  if (!aiResponse.warm_words) aiResponse.warm_words = '根据您的描述，为您辩证分析如下：'
  return aiResponse
}

async function send() {
  const text = input.value.trim()
  if (!text || isGenerating.value) return
  const requestSessionId = activeSessionId.value

  messages.value.push({ role: 'user', content: text })
  input.value = ''

  /*if (isNewConversationAfterPrescription()) {
    userTurnCount.value = 1
  } else {
    userTurnCount.value++
  }*/

 /* if (pendingPrescription.value) {
    const isConfirming = CONFIRM_KEYWORDS.some(k => text.includes(k))
    if (isConfirming) {
      messages.value.push(pendingPrescription.value)
      pendingPrescription.value = null
      return
    }
    pendingPrescription.value = null
  }*/

  isGenerating.value = true
  loadingStatus.value = 'AI 思考中...'
  const streamMsg = { role: 'assistant', type: 'streaming', content: '' }
  messages.value.push(streamMsg)
  const streamIdx = messages.value.length - 1

  try {
    const fullText = await callSiliconFlowStream((chunk, accumulated) => {
      if (activeSessionId.value !== requestSessionId) return
      if (loadingStatus.value) loadingStatus.value = ''
      if (prescriptionLoading.value) return

      const codeBlockIdx = accumulated.indexOf('```json')
      if (codeBlockIdx >= 0) {
        messages.value[streamIdx].content = accumulated.slice(0, codeBlockIdx).trim()
        if (accumulated.includes('"prescription"')) {
          prescriptionLoading.value = true
          prescriptionLoadingSessionId.value = requestSessionId
        }
        return
      }

      const textLines = accumulated.split('\n')
      for (let i = 0; i < textLines.length; i++) {
        const tl = textLines[i].trim()
        if (tl.startsWith('{') && (tl.includes('"type"') || tl.includes('"prescription"'))) {
          messages.value[streamIdx].content = textLines.slice(0, i).join('\n').trim()
          if (accumulated.includes('"prescription"')) {
            prescriptionLoading.value = true
            prescriptionLoadingSessionId.value = requestSessionId
          }
          return
        }
      }

      messages.value[streamIdx].content = accumulated
    }, text)

    if (activeSessionId.value !== requestSessionId) return
    prescriptionLoading.value = false
    prescriptionLoadingSessionId.value = null
    const jsonData = extractJSON(fullText, null)

   if (jsonData && jsonData.type === 'prescription') {
      // 🚀 修复：去除拦截逻辑，只要解析到了处方卡片，直接在界面上渲染
      const cleaned = cleanPrescription(jsonData)
      const warmText = stripJsonFromText(fullText)
      
      if (warmText) {
        messages.value[streamIdx] = { role: 'assistant', type: 'text', content: warmText }
        messages.value.push(cleaned)
      } else {
        messages.value[streamIdx] = cleaned
      }
    } else if (jsonData && jsonData.type === 'inquiry')  {
      const textBefore = stripJsonFromText(fullText)
      const inquiryMsg = { ...jsonData, role: 'assistant', selectedOptions: [] }
      if (textBefore) {
        messages.value[streamIdx] = { role: 'assistant', type: 'text', content: textBefore }
        messages.value.push(inquiryMsg)
      } else {
        messages.value[streamIdx] = inquiryMsg
      }
    } else {
      messages.value[streamIdx] = { role: 'assistant', type: 'text', content: stripJsonFromText(fullText) || '...' }
    }
  } catch (err) {
    console.error(err)
    if (activeSessionId.value !== requestSessionId) return
    prescriptionLoading.value = false
    prescriptionLoadingSessionId.value = null
    const existing = messages.value[streamIdx]
    if (existing && existing.content) {
      messages.value[streamIdx] = { role: 'assistant', type: 'text', content: existing.content }
    } else {
      messages.value[streamIdx] = { role: 'assistant', type: 'text', content: '连接波动，请重试。' }
    }
  } finally {
    isGenerating.value = false
    loadingStatus.value = ''
    prescriptionLoading.value = false
    prescriptionLoadingSessionId.value = null
  }
}

function toggleSelection(msg, opt) {
  if (opt.value === 'none' || opt.value === 'finish') {
    handleSingleOption(opt)
    return
  }

  const idx = msg.selectedOptions.indexOf(opt.label)
  if (idx > -1) {
    msg.selectedOptions.splice(idx, 1)
  } else {
    msg.selectedOptions.push(opt.label)
  }
}

function confirmSelection(msg) {
  if (msg.selectedOptions.length === 0) return
  input.value = `我有以下症状：${msg.selectedOptions.join('、')}`
  send()
}

function handleSingleOption(opt) {
  if (opt.value === 'none') {
    input.value = '' 
    messages.value.push({ role: 'assistant', type: 'text', content: '请具体描述一下您的感觉：' })
  } else if (opt.value === 'finish') {
    input.value = '我没有其他明显症状了，请开方。'
    send()
  } else {
    input.value = `我有【${opt.label}】的症状` 
    send()
  }
}

async function toggleFavorite(recipe) {
  if (!user.value) { alert('请先登录'); return }
  const recipeId = String(recipe.id)
  if (favorited.value.has(recipeId)) favorited.value.delete(recipeId)
  else favorited.value.add(recipeId)
  try {
    const { data } = await supabase.from('profiles').select('saved_recipes').eq('id', user.value.id).single()
    let list = data?.saved_recipes || []; if(!Array.isArray(list)) list = []
    const idx = list.findIndex(r => String(r.id) === recipeId)
    const rationale = String(
      recipe.rationale || recipe.reason || recipe.medical_basis || recipe.theory || recipe.医理依据 || '',
    ).trim()
    if (idx >= 0) list.splice(idx, 1)
    else list.push({ ...recipe, rationale, id: recipeId, saved_at: new Date().toISOString() })
    await supabase.from('profiles').update({ saved_recipes: list }).eq('id', user.value.id)
    window.dispatchEvent(new Event('profile-updated'))
  } catch (err) { alert('操作失败'); console.error(err) }
}

async function handleSavePlan(fullMessage) {
  if (!user.value) { messages.value.push({ role: 'assistant', type: 'text', content: '请登录。' }); return }

  const planToSave = JSON.parse(JSON.stringify(fullMessage))
  
  if (planToSave.recipes && Array.isArray(planToSave.recipes)) {
    planToSave.recipes = planToSave.recipes.filter(r => favorited.value.has(String(r.id)))
  }

  const newPlan = { ...planToSave, id: Date.now(), saved_at: new Date().toISOString() }
  
  try {
    const { data } = await supabase.from('profiles').select('care_plans').eq('id', user.value.id).single()
    let list = data?.care_plans || []; if(!Array.isArray(list)) list = []

    const planKey = p => { const { id, saved_at, ...rest } = p; return JSON.stringify(rest) }
    if (list.some(p => planKey(p) === planKey(newPlan))) {
      messages.value.push({ role: 'assistant', type: 'text', content: '该方案已存在。' })
      return
    }

    await supabase.from('profiles').update({ care_plans: [newPlan, ...list] }).eq('id', user.value.id)
    window.dispatchEvent(new Event('profile-updated'))
    
    const count = planToSave.recipes.length
    messages.value.push({ role: 'assistant', type: 'text', content: `✅ 已加入调理计划（包含 ${count} 个已收藏食谱）。` })
  } catch (err) { console.error(err); messages.value.push({ role: 'assistant', type: 'text', content: '保存失败。' }) }
}
function handleKeydown(e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }

function openPanel() {
  open.value = true
  nextTick(() => scrollToBottom())
}

function findScrollableInPanel(startNode) {
  const panel = panelShellRef.value
  let el = startNode instanceof HTMLElement ? startNode : null

  while (el && panel && el !== panel) {
    if (el.dataset?.scrollable === 'true' && el.scrollHeight > el.clientHeight) {
      return el
    }
    el = el.parentElement
  }

  if (messagesContainer.value && messagesContainer.value.scrollHeight > messagesContainer.value.clientHeight) {
    return messagesContainer.value
  }

  return null
}

function onPanelWheel(e) {
  if (!open.value) return
  const scroller = findScrollableInPanel(e.target)

  // Consume wheel events inside panel to prevent background scroll bleeding.
  e.preventDefault()
  e.stopPropagation()

  if (!scroller) return

  const atTop = scroller.scrollTop <= 0
  const atBottom = scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 1
  const up = e.deltaY < 0
  const down = e.deltaY > 0

  if ((up && atTop) || (down && atBottom)) return

  scroller.scrollTop += e.deltaY
  if (e.deltaX) scroller.scrollLeft += e.deltaX
}

/** 面板尺寸：右下角固定，从左下角拖拽调整 */
const AI_PANEL_SIZE_KEY = 'ai-companion-panel-size'
const PANEL_MIN_W = 320
const PANEL_MIN_H = 400
const PANEL_DEFAULT_W = 480
const PANEL_DEFAULT_H = 720
const PANEL_MAX_W = 960

const panelW = ref(PANEL_DEFAULT_W)
const panelH = ref(PANEL_DEFAULT_H)

function panelMaxH() {
  return Math.floor(window.innerHeight * 0.92)
}

function clampPanelSize() {
  const maxW = Math.min(PANEL_MAX_W, window.innerWidth - 24)
  panelW.value = Math.max(PANEL_MIN_W, Math.min(panelW.value, maxW))
  panelH.value = Math.max(PANEL_MIN_H, Math.min(panelH.value, panelMaxH()))
}

function persistPanelSize() {
  clampPanelSize()
  try {
    localStorage.setItem(AI_PANEL_SIZE_KEY, JSON.stringify({ w: panelW.value, h: panelH.value }))
  } catch {}
}

function loadPanelSize() {
  try {
    const raw = localStorage.getItem(AI_PANEL_SIZE_KEY)
    if (!raw) return
    const { w, h } = JSON.parse(raw)
    if (typeof w === 'number' && typeof h === 'number') {
      panelW.value = w
      panelH.value = h
      clampPanelSize()
    }
  } catch {}
}

const resizing = ref(false)
function onResizeHandleDown(e) {
  if (e.button !== 0) return
  e.preventDefault()
  resizing.value = true
  const startX = e.clientX
  const startY = e.clientY
  const startW = panelW.value
  const startH = panelH.value

  const onMove = (ev) => {
    if (!resizing.value) return
    const nextW = startW + (startX - ev.clientX)
    const nextH = startH + (startY - ev.clientY)
    panelW.value = Math.max(PANEL_MIN_W, Math.min(PANEL_MAX_W, Math.min(nextW, window.innerWidth - 24)))
    panelH.value = Math.max(PANEL_MIN_H, Math.min(nextH, panelMaxH()))
  }
  const onUp = () => {
    resizing.value = false
    persistPanelSize()
    window.removeEventListener('mousemove', onMove)
    window.removeEventListener('mouseup', onUp)
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  }
  document.body.style.cursor = 'nesw-resize'
  document.body.style.userSelect = 'none'
  window.addEventListener('mousemove', onMove)
  window.addEventListener('mouseup', onUp)
}

function onViewportResize() {
  clampPanelSize()
}

onMounted(() => {
  loadPanelSize()
  loadSessions()
  window.addEventListener('resize', onViewportResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', onViewportResize)
})

defineExpose({ openPanel })
</script>

<template>
  <button class="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-sandalwood text-white shadow-card flex items-center justify-center hover:bg-sandalwood/90 transition-all" @click="toggle">
    <ScrollText class="w-7 h-7" />
  </button>

  <Teleport to="body">
    <Transition enter-active-class="transition duration-200 ease-out" enter-from-class="opacity-0 translate-y-4" enter-to-class="opacity-100 translate-y-0" leave-active-class="transition duration-150 ease-in" leave-from-class="opacity-100 translate-y-0" leave-to-class="opacity-0 translate-y-4">
      <div
        ref="panelShellRef"
        v-show="open"
        class="ai-panel-shell fixed bottom-24 right-6 z-50 rounded-xl shadow-card border border-sandalwood/20 flex flex-col bg-[#FDFBF7] overflow-hidden relative"
        @wheel.capture="onPanelWheel"
        :style="{ width: `${panelW}px`, height: `${panelH}px`, maxHeight: `${panelMaxH()}px` }"
      >
        <div
          class="ai-panel-resize-handle"
          title="拖拽调整窗口大小"
          aria-label="拖拽调整窗口大小"
          @mousedown="onResizeHandleDown"
        />

        <div class="px-4 py-3 border-b border-sandalwood/15 flex justify-between items-center bg-[#FBF8F2] shrink-0">
          <div class="max-w-[55%] flex items-center min-w-0">
            <template v-if="editingSessionId === activeSessionId">
              <input
                v-model="editingTitle"
                @blur="commitRenameSession(activeSessionId, $event)"
                @keyup.enter="commitRenameSession(activeSessionId, $event)"
                @keyup.esc="cancelRenameSession"
                autofocus
                class="font-serif font-semibold text-sandalwood bg-sandalwood/10 px-2 py-0.5 rounded outline-none w-full text-sm"
              />
            </template>
            <template v-else>
              <div
                class="group flex items-center gap-1.5 min-w-0 cursor-pointer"
                @click="startRenameSession(sessions.find(s => s.id === activeSessionId) || { id: activeSessionId, title: AI_TUTOR_LABEL }, $event)"
              >
                <h3 class="font-serif font-semibold text-sandalwood truncate">
                  {{ sessions.find(s => s.id === activeSessionId)?.title || AI_TUTOR_LABEL }}
                </h3>
                <Edit2 class="w-3.5 h-3.5 text-sandalwood/40 group-hover:text-sandalwood transition-colors opacity-0 group-hover:opacity-100 shrink-0" />
              </div>
            </template>
          </div>
          <div class="flex items-center gap-1.5">
            <button v-if="user" @click="createNewSession" title="新建对话" :disabled="isGenerating" class="p-1.5 rounded-lg hover:bg-sandalwood/10 text-sandalwood/60 hover:text-sandalwood transition disabled:opacity-30 disabled:cursor-not-allowed">
              <PlusCircle class="w-4 h-4" />
            </button>
            <button v-if="user" @click="showSessionList = !showSessionList" title="历史对话" class="p-1.5 rounded-lg hover:bg-sandalwood/10 transition" :class="showSessionList ? 'text-sandalwood bg-sandalwood/10' : 'text-sandalwood/60 hover:text-sandalwood'">
              <History class="w-4 h-4" />
            </button>
            <X class="w-5 h-5 cursor-pointer text-sandalwood/70 ml-1" @click="open = false" />
          </div>
        </div>

        <!-- 历史会话列表面板 -->
        <div v-if="showSessionList" class="absolute left-0 right-0 bottom-0 z-10 bg-[#FDFBF7] flex flex-col border-t border-sandalwood/15 overflow-hidden" style="top: 52px">
          <div class="px-4 py-2.5 border-b border-sandalwood/10 flex items-center justify-between shrink-0">
            <span class="text-xs font-semibold text-sandalwood/70 uppercase tracking-wide">历史对话</span>
            <button v-if="user" @click="createNewSession" :disabled="isGenerating" class="flex items-center gap-1 text-xs text-sandalwood bg-sandalwood/10 px-2.5 py-1 rounded-lg hover:bg-sandalwood/20 transition disabled:opacity-30 disabled:cursor-not-allowed">
              <PlusCircle class="w-3.5 h-3.5" /> 新建对话
            </button>
          </div>
          <div class="ai-panel-scroll flex-1 overflow-y-auto" data-scrollable="true">
            <div v-if="!sessions.length" class="p-6 text-center text-xs text-gray-400">暂无历史记录</div>
            <div
              v-for="s in sessions" :key="s.id"
              @click="switchToSession(s.id)"
              class="px-4 py-3 border-b border-sandalwood/10 cursor-pointer hover:bg-sandalwood/5 flex items-center gap-3 group transition"
              :class="[s.id === activeSessionId ? 'bg-sandalwood/10' : '', isGenerating ? 'opacity-40 pointer-events-none' : '']"
            >
              <MessageCircle class="w-4 h-4 text-sandalwood/40 shrink-0" />
              <div class="flex-1 min-w-0">
                <input
                  v-if="editingSessionId === s.id"
                  v-model="editingTitle"
                  @click.stop
                  @keyup.enter.stop="commitRenameSession(s.id, $event)"
                  @keyup.esc.stop="cancelRenameSession($event)"
                  @blur="commitRenameSession(s.id, $event)"
                  maxlength="30"
                  autofocus
                  class="w-full text-sm px-2 py-1 border border-sandalwood/20 rounded bg-white text-gray-800 outline-none focus:ring-1 focus:ring-sandalwood/40"
                />
                <div v-else class="group/title flex items-center gap-1 min-w-0" @click.stop="startRenameSession(s, $event)">
                  <p class="text-sm text-gray-800 truncate">{{ s.title }}</p>
                  <Edit2 class="w-3 h-3 text-sandalwood/30 group-hover/title:text-sandalwood transition-colors opacity-0 group-hover/title:opacity-100 shrink-0" />
                </div>
                <p class="text-xs text-gray-400 mt-0.5">{{ formatSessionDate(s.updatedAt) }}</p>
              </div>
              <button
                @click="deleteSession(s.id, $event)"
                title="删除对话"
                class="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-50 text-gray-300 hover:text-red-400 transition"
              >
                <Trash2 class="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        <div ref="messagesContainer" class="ai-panel-scroll flex-1 overflow-y-auto p-4 space-y-4 bg-[#FAF6ED]" data-scrollable="true">
          <div v-for="(m, i) in messages" :key="i">
            
            <div v-if="m.type === 'text' || !m.type" :class="['max-w-[85%] rounded-lg px-4 py-2.5 text-sm', m.role === 'user' ? 'ml-auto bg-sandalwood/15 text-sandalwood' : 'mr-auto bg-[#F5EDD8] text-sandalwood whitespace-pre-wrap']">
               {{ m.role === 'user' ? (m.content || '...') : cleanDisplayContent(m.content) || '...' }}
            </div>

            <div v-else-if="m.type === 'streaming' && (m.content || !prescriptionLoading)" class="mr-auto bg-[#F5EDD8] text-sandalwood px-4 py-2.5 rounded-lg text-sm max-w-[85%] whitespace-pre-wrap">
              <span>{{ cleanDisplayContent(m.content) }}</span><span class="inline-block w-0.5 h-3.5 bg-sandalwood/70 ml-0.5 animate-blink align-middle"></span>
            </div>
            
            <div v-else-if="m.type === 'inquiry'" class="mr-auto bg-white border border-sandalwood/20 p-4 rounded-xl shadow-sm w-[90%] animate-slide-up">
              <p class="text-sm mb-3 font-medium text-gray-800">{{ m.text }}</p>
              
              <div class="flex flex-col gap-2">
                <button v-for="opt in m.options" :key="opt.value" 
                  @click="toggleSelection(m, opt)" 
                  class="text-left px-3 py-2 text-xs border rounded-lg transition flex items-center justify-between group"
                  :class="[
                    (m.selectedOptions && m.selectedOptions.includes(opt.label)) ? 'bg-sandalwood text-white border-sandalwood' : 
                    opt.value === 'finish' ? 'bg-gray-100 text-gray-700 font-bold border-gray-300' : 
                    'bg-white border-sandalwood/30 text-gray-700 hover:bg-sandalwood/5'
                  ]"
                >
                  <span :class="{'italic opacity-80': opt.value === 'none'}">{{ opt.label }}</span>
                  
                  <span v-if="m.selectedOptions && m.selectedOptions.includes(opt.label)">
                    <Check class="w-3.5 h-3.5" />
                  </span>
                </button>
              </div>

              <div v-if="m.selectedOptions && m.selectedOptions.length > 0" class="mt-3 pt-3 border-t border-gray-100">
                <button @click="confirmSelection(m)" class="w-full bg-sandalwood text-white py-2 rounded-lg text-xs font-bold flex justify-center items-center gap-1 hover:bg-sandalwood/90">
                  选好了，发送 ({{ m.selectedOptions.length }}) <Send class="w-3 h-3"/>
                </button>
              </div>
            </div>

            <div v-else-if="m.type === 'prescription'" class="mr-auto w-[98%] space-y-2 animate-slide-up">
              
              <div class="bg-[#F5EDD8] text-sandalwood px-4 py-2.5 rounded-lg text-sm mr-auto flex items-start gap-2">
                <MessageCircle class="w-4 h-4 mt-0.5 shrink-0" />
                <span>{{ m.warm_words }}</span>
              </div>

              <div class="bg-white border border-sandalwood/20 rounded-xl overflow-hidden shadow-md">
                <div class="bg-[#FAF6ED] p-3 border-b border-sandalwood/10">
                  <div class="text-sandalwood font-serif font-bold flex items-center gap-2">💡 {{ m.diagnosis_result }}</div>
                  <p class="text-xs text-sandalwood/70 mt-1">{{ m.summary }}</p>
                </div>
                <div class="p-3 space-y-3">
                   <div v-if="!m.recipes || m.recipes.length === 0" class="text-xs text-amber-600 bg-amber-50 p-2 rounded border border-amber-100">该方案涉及需专业指导的药材，部分方剂已隐藏，建议线下咨询医师。</div>
                   <div v-for="r in m.recipes" :key="r.id" class="border border-gray-100 rounded bg-white overflow-hidden">
                      <div @click="foldedStates[r.id] = !foldedStates[r.id]" class="p-2 flex justify-between cursor-pointer hover:bg-gray-50 items-center">
                        <div class="flex items-center gap-2">
                          <div v-if="r.category === 'tea'" class="w-6 h-6 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center"><Coffee class="w-3.5 h-3.5"/></div>
                          <div v-else-if="r.category === 'meal'" class="w-6 h-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center"><Soup class="w-3.5 h-3.5"/></div>
                          <div v-else class="w-6 h-6 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center"><Pill class="w-3.5 h-3.5"/></div>
                          <span class="text-sm font-bold text-gray-700">{{ r.name }}</span>
                        </div>
                        <div class="flex items-center gap-1">
                           <span v-if="!foldedStates[r.id]" class="text-[10px] text-sandalwood/60">点击展开做法</span>
                           <ChevronDown class="w-4 h-4 text-gray-400" :class="{'rotate-180': foldedStates[r.id]}"/>
                        </div>
                      </div>
                      <div v-show="foldedStates[r.id]" class="p-2 pt-0 text-xs text-gray-600 border-t border-gray-50">
                         <div class="flex flex-wrap gap-1 my-2"><span v-for="t in r.tags" :key="t" class="px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded text-[10px]">{{ t }}</span></div>
                         
                         <p class="mt-2"><strong>食材：</strong>{{ ensureArray(r.ingredients).join('、') }}</p>
                         <p class="mt-1"><strong>步骤：</strong>{{ ensureArray(r.steps).join(' ') }}</p>
                         
                         <div v-if="r.rationale" class="mt-2 bg-[#F5EDD8]/30 p-2 rounded text-sandalwood/80 border border-sandalwood/10">
                           <div class="flex items-center gap-1 font-bold mb-1"><BookOpen class="w-3 h-3" /> 医理依据</div>
                           {{ r.rationale }}
                         </div>
                         <button @click.stop="toggleFavorite(r)" class="w-full mt-2 py-1 border border-dashed rounded flex justify-center gap-1" :class="favorited.has(String(r.id)) ? 'text-red-500 bg-red-50' : 'text-gray-400'">
                           <Heart class="w-3 h-3" :class="{'fill-current': favorited.has(String(r.id))}"/> {{ favorited.has(String(r.id)) ? '已收藏' : '收藏' }}
                         </button>
                      </div>
                   </div>

                   <div v-if="m.acupoints && m.acupoints.length" class="bg-gray-50 p-2.5 rounded border border-gray-100">
                      <div class="text-xs font-bold text-sandalwood mb-1.5 flex items-center gap-1"><span class="w-1.5 h-1.5 bg-sandalwood rounded-full"></span> 穴位按揉</div>
                      <div v-if="m.acupoints.length === 1 && m.acupoints[0].name === '无'" class="text-xs text-gray-500">暂无穴位推荐</div>
                      <template v-else>
                        <div v-for="(a, idx) in m.acupoints" :key="idx" class="text-xs mb-2 last:mb-0 border-b border-gray-200/50 pb-2 last:border-0 last:pb-0">
                          <div class="font-bold text-gray-800">{{ a.name }}</div>
                          <div class="text-gray-500 mb-1">📍 {{ a.location }}</div>
                          <div class="bg-white p-1.5 rounded text-sandalwood/80 border border-sandalwood/5">👉 {{ a.method || '轻柔按压 3-5 分钟' }}</div>
                        </div>
                      </template>
                   </div>
                   
                   <div v-if="m.lifestyle && m.lifestyle.length" class="text-xs text-gray-500 bg-gray-50 p-2 rounded"><span class="font-bold text-sandalwood">🚫 禁忌：</span> {{ (m.lifestyle || []).join('；') }}</div>
                   
                   <button @click="handleSavePlan(m)" class="w-full bg-sandalwood text-white py-2 rounded flex justify-center gap-2 text-sm hover:bg-sandalwood/90">
                     <PlusCircle class="w-4 h-4"/> 加入调理计划 (仅保存已收藏食谱)
                   </button>
                </div>
              </div>
            </div>
          </div>
          <div v-if="loadingStatus" class="mr-auto bg-[#F5EDD8] text-sandalwood px-4 py-2.5 rounded-lg text-sm flex items-center gap-2 animate-pulse"><Loader2 class="w-4 h-4 animate-spin" /><span>{{ loadingStatus }}</span></div>
          <div v-if="prescriptionLoading && prescriptionLoadingSessionId === activeSessionId" class="mr-auto w-[98%] space-y-2 animate-slide-up">
            <div class="bg-white border border-sandalwood/20 rounded-xl overflow-hidden shadow-md animate-pulse">
              <div class="bg-[#FAF6ED] p-3 border-b border-sandalwood/10">
                <div class="h-4 bg-sandalwood/20 rounded w-3/4 mb-2"></div>
                <div class="h-3 bg-sandalwood/10 rounded w-1/2"></div>
              </div>
              <div class="p-3 space-y-2">
                <div class="h-8 bg-gray-100 rounded"></div>
                <div class="h-8 bg-gray-100 rounded"></div>
                <div class="h-8 bg-gray-100 rounded"></div>
              </div>
            </div>
            <div class="flex items-center gap-2 text-sandalwood text-xs"><Loader2 class="w-3.5 h-3.5 animate-spin" />正在生成处方...</div>
          </div>
        </div>

        <div class="p-3 border-t bg-[#FDFBF7] flex gap-2">
          <input v-model="input" @keyup.enter="send" :disabled="isGenerating" placeholder="输入症状..." class="flex-1 px-4 py-2 border rounded-lg outline-none focus:ring-1 focus:ring-sandalwood/50 disabled:opacity-50" />
          <button @click="send" :disabled="isGenerating" class="p-2 bg-sandalwood text-white rounded-lg disabled:opacity-50"><Send class="w-5 h-5"/></button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.animate-slide-up {
  animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes slideUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

.animate-blink {
  animation: blink 0.8s step-end infinite;
}

/* 右下角定位：从左下角拖拽放大（向左变宽、向上变高） */
.ai-panel-shell {
  position: fixed;
  overscroll-behavior: contain;
}
.ai-panel-scroll {
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
}
.ai-panel-resize-handle {
  position: absolute;
  left: 0;
  bottom: 0;
  width: 22px;
  height: 22px;
  z-index: 20;
  cursor: nesw-resize;
  background: linear-gradient(135deg, transparent 50%, rgba(139, 94, 60, 0.22) 50%);
  border-bottom-left-radius: 10px;
}
.ai-panel-resize-handle:hover {
  background: linear-gradient(135deg, transparent 45%, rgba(139, 94, 60, 0.35) 45%);
}
</style>

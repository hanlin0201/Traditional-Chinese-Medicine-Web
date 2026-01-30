<script setup>
import { ref, nextTick, watch } from 'vue'
import { ScrollText, Send, X, ChevronDown, Heart, PlusCircle, Loader2, BookOpen, Coffee, Soup, Pill, MessageCircle, Check } from 'lucide-vue-next'
import { supabase } from '@/supabaseClient'
import { useAuth } from '@/composables/useAuth'

const { user, logUserHistory } = useAuth()
const open = ref(false)
const input = ref('')
const loadingStatus = ref('') 
const messagesContainer = ref(null)
const favorited = ref(new Set())   
const foldedStates = ref({})       

// 👇 硅基流动 Key
const SILICON_FLOW_KEY = 'sk-jdxdncsbxuaarzlasizgjsllivylwwwjrgvrmotmqxaeonid' 

// ==========================================
// 👇 System Prompt 保持不变
// ==========================================
const SYSTEM_PROMPT = `
你是一位精通《黄帝内经》、《本草纲目》与《伤寒论》的资深中医专家。
你需要智能识别用户意图，在“问诊开方”和“知识解答”两种模式间自动切换。
如果是问诊开方模式，那么你的目标是进行“深度辩证”，通过 3-4 轮由浅入深的提问，精准锁定用户体质，最后才开方。

【问诊状态机 (State Machine)】：

1. **状态一：初步接触/闲聊**
   - 触发：用户打招呼、询问身份、或输入无关内容（如“你好”）。
   - 动作：返回 "type": "text"。
   - **关键**：Content 必须包含具体的欢迎语或回应，不能从上一次回复中复制。

2.**状态二：知识解答 (Knowledge Q&A)**
   - 触发：用户询问中药功效、穴位作用、病理名词解释等（如“当归有什么用？”、“什么是肝火旺？”）。
   - 动作：返回 "type": "text"。
   - **要求**：直接用通俗易懂的语言解答，引用经典，**不要**进入问诊流程，**不要**开方。

3. **状态三：多轮问诊 (Inquiry Loop)**
   - 触发：用户描述了主诉，或者正在回答你的问题。
   - **核心逻辑**：
     - 从【寒热、汗液、头身、二便、饮食、睡眠、情志、妇女】挑选维度追问。
     - **停止条件**：已进行 3-4 轮交互 OR 用户选“无其他症状”。
   - **选项强制规范**：
     - 选项 N-1: { "label": "以上都不是", "value": "none" }
     - 选项 N:   { "label": "无其他症状，请开方", "value": "finish" }

4. **状态四：最终开方 (Prescription)**
   - 触发：满足停止条件。
   - 动作：返回 "type": "prescription"。
   - **暖心过渡**：在开方前，必须生成一段话（warm_words），例如“已详细了解您的症状，结合...理论，为您制定如下方案”。
   - **食谱要求**：包含 [简易茶饮]、[家常食疗]、[经典方剂] 3 种方案，且必须有《本草》理论依据。
   - **穴位要求**：必须提供具体的按揉方法（method），如“用拇指按揉2分钟，有酸胀感”。
- 触发：满足停止条件。
   - 动作：返回 "type": "prescription"。
   - **暖心过渡**：在开方前，必须生成一段话（warm_words），例如“已详细了解您的症状，结合...理论，为您制定如下方案”。
   - **食谱要求**：包含 [简易茶饮]、[家常食疗]、[经典方剂] 3 种方案，且必须有《本草》理论依据。
   - **穴位要求**：必须提供具体的按揉方法（method），如“用拇指按揉2分钟，有酸胀感”。
---
【JSON 格式规范 (纯 JSON，无 Markdown)】：

格式 A（闲聊）：
{ "role": "assistant", "type": "text", "content": "..." }

格式 B（问诊）：
{ "role": "assistant", "type": "inquiry", "text": "...", "options": [...] }

格式 C（处方）：
{
  "role": "assistant", "type": "prescription", 
  "warm_words": "...", "diagnosis_result": "...", "summary": "...",
  "recipes": [
    { "category": "tea", "name": "...", "tags": [], "ingredients": ["..."], "steps": ["..."], "rationale": "..." }
  ],
  "acupoints": [ ... ],
  "lifestyle": [...]
}
`

const messages = ref([
  { role: 'assistant', type: 'text', content: '您好，我是 AI 养生导师。请告诉我您哪里不舒服，或者有什么中医药知识问题都可以咨询我。' }
])

function toggle() { open.value = !open.value; if(open.value) scrollToBottom() }
function scrollToBottom() { nextTick(() => { if (messagesContainer.value) messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight }) }
watch(messages, scrollToBottom, { deep: true })

async function callDeepSeek(userText) {
  if (!SILICON_FLOW_KEY || SILICON_FLOW_KEY.includes('在这里填入')) {
    alert('请配置 API Key')
    throw new Error('Key missing')
  }

  const inquiryCount = messages.value.filter(m => m.type === 'inquiry').length
  const roundInfo = `【系统提示：当前已进行了 ${inquiryCount} 轮问诊。如果信息不足请继续追问，如果用户选了 finish 或已满 4 轮请开方】`

  const response = await fetch('https://api.siliconflow.cn/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SILICON_FLOW_KEY}` },
    body: JSON.stringify({
      model: 'deepseek-ai/DeepSeek-V3',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        ...messages.value.map(m => {
           if (m.type === 'prescription') return { role: m.role, content: `已开方：${m.diagnosis_result}` }
           if (m.type === 'inquiry') return { role: m.role, content: `AI 问：${m.text}` }
           return { role: m.role, content: m.content || '' }
        }),
        { role: 'system', content: roundInfo }, 
        { role: 'user', content: userText }
      ],
      stream: false,
      response_format: { type: 'json_object' }
    })
  })

  if (!response.ok) throw new Error('API请求失败')
  const data = await response.json()
  let content = data.choices[0].message.content.replace(/```json/g, '').replace(/```/g, '').trim()
  return JSON.parse(content)
}

// 🛡️ 核心修复 1：更强健的数据清洗，防止空白
function ensureArray(val) {
  if (!val) return []
  if (Array.isArray(val)) return val
  if (typeof val === 'string') {
    // 尝试识别分隔符
    if (val.includes('\n')) return val.split('\n').filter(s => s.trim())
    if (val.includes('、')) return val.split('、').filter(s => s.trim())
    return [val]
  }
  return [] 
}

async function send() {
  const text = input.value.trim()
  if (!text || loadingStatus.value) return

  messages.value.push({ role: 'user', content: text })
  input.value = ''
  
  const lastMsg = messages.value[messages.value.length - 2] 
  const isAnsweringInquiry = lastMsg && lastMsg.type === 'inquiry'
  const hasMedicalKeywords = /痛|痒|晕|酸|胀|麻|失眠|便秘|感冒|发烧|虚|热|寒|胃|头|气|血/.test(text) && text.length > 1
  
  const isMedicalContext = isAnsweringInquiry || hasMedicalKeywords

  if (isMedicalContext) {
    loadingStatus.value = 'AI 正在把脉...'
    const timer = setInterval(() => {
      if (loadingStatus.value === 'AI 正在把脉...') loadingStatus.value = '辩证思考...'
      else if (loadingStatus.value === '辩证思考...') loadingStatus.value = '斟酌药方...'
    }, 1500)
    window._loadingTimer = timer
  } else {
    loadingStatus.value = 'AI 思考中...'
  }

  try {
    const aiResponse = await callDeepSeek(text)
    
    // 🛡️ 数据清洗
    if (aiResponse.type === 'prescription') {
      if (!Array.isArray(aiResponse.recipes)) aiResponse.recipes = []
      
      aiResponse.recipes = aiResponse.recipes.map(r => {
        const rId = 'r_' + Math.random().toString(36).substr(2, 9)
        // 🌟 修改 4：删除了自动展开的代码，现在默认是折叠的
        
        return {
          ...r, 
          id: rId,
          name: r.name || '调理食谱', 
          category: r.category || 'meal',
          ingredients: ensureArray(r.ingredients),
          steps: ensureArray(r.steps),
          tags: ensureArray(r.tags)
        }
      })
      
      aiResponse.lifestyle = ensureArray(aiResponse.lifestyle)
      if (!Array.isArray(aiResponse.acupoints)) aiResponse.acupoints = []
      
      if (!aiResponse.warm_words) aiResponse.warm_words = "根据您的描述，为您辩证分析如下："
    } else if (aiResponse.type === 'inquiry') {
      // 🌟 修改 2：为问诊消息增加本地状态，支持多选
      aiResponse.selectedOptions = [] // 初始化空选择数组
    }
    
    if (aiResponse.type === 'text' && !aiResponse.content) {
      aiResponse.content = "收到，请您继续描述。"
    }
    
    messages.value.push(aiResponse)
  } catch (err) {
    console.error(err)
    messages.value.push({ role: 'assistant', type: 'text', content: '连接波动，请重试。' })
  } finally {
    if (window._loadingTimer) clearInterval(window._loadingTimer)
    loadingStatus.value = ''
  }
}

// 🌟 修改 2：实现多选逻辑
// 切换选项选中状态
function toggleSelection(msg, opt) {
  // 特殊选项互斥处理
  if (opt.value === 'none' || opt.value === 'finish') {
    handleSingleOption(opt) // 直接触发单选逻辑
    return
  }

  // 普通症状：支持多选
  const idx = msg.selectedOptions.indexOf(opt.label)
  if (idx > -1) {
    msg.selectedOptions.splice(idx, 1) // 取消选中
  } else {
    msg.selectedOptions.push(opt.label) // 选中
  }
}

// 提交多选结果
function confirmSelection(msg) {
  if (msg.selectedOptions.length === 0) return
  input.value = `我有以下症状：${msg.selectedOptions.join('、')}`
  send()
}

// 旧的单选逻辑 (保留给特殊选项用)
function handleSingleOption(opt) {
  if (opt.value === 'none') {
    input.value = '' 
    messages.value.push({ role: 'assistant', type: 'text', content: '请具体描述一下您的感觉：' })
  } else if (opt.value === 'finish') {
    input.value = '我没有其他明显症状了，请开方。'
    send()
  } else {
    // 兼容旧逻辑
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
    if (idx >= 0) list.splice(idx, 1); else list.push({ ...recipe, id: recipeId, saved_at: new Date().toISOString() })
    await supabase.from('profiles').update({ saved_recipes: list }).eq('id', user.value.id)
    window.dispatchEvent(new Event('profile-updated'))
  } catch (err) { alert('操作失败'); console.error(err) }
}

// 🌟 修改 3：保存计划时，过滤掉未收藏的食谱
async function handleSavePlan(fullMessage) {
  if (!user.value) { messages.value.push({ role: 'assistant', type: 'text', content: '请登录。' }); return }

  // 1. 深度拷贝消息对象，避免修改原显示
  const planToSave = JSON.parse(JSON.stringify(fullMessage))
  
  // 2. 核心逻辑：只保留 favorited 里的食谱
  // 如果 recipes 存在，进行过滤
  if (planToSave.recipes && Array.isArray(planToSave.recipes)) {
    planToSave.recipes = planToSave.recipes.filter(r => favorited.value.has(String(r.id)))
  }

  // 如果过滤完没有食谱了，还是允许保存（保存诊断和穴位），但可以给个提示
  // 这里不做拦截，直接保存

  const newPlan = { ...planToSave, id: Date.now(), saved_at: new Date().toISOString() }
  
  try {
    const { data } = await supabase.from('profiles').select('care_plans').eq('id', user.value.id).single()
    let list = data?.care_plans || []; if(!Array.isArray(list)) list = []
    
    // 避免重复保存同一条诊断 (用 diagnosis_result 判断)
    if (list.some(p => p.diagnosis_result === newPlan.diagnosis_result)) { 
      messages.value.push({ role: 'assistant', type: 'text', content: '该方案已存在。' }); 
      return 
    }

    await supabase.from('profiles').update({ care_plans: [newPlan, ...list] }).eq('id', user.value.id)
    window.dispatchEvent(new Event('profile-updated'))
    
    const count = planToSave.recipes.length
    messages.value.push({ role: 'assistant', type: 'text', content: `✅ 已加入调理计划（包含 ${count} 个已收藏食谱）。` })
  } catch (err) { console.error(err); messages.value.push({ role: 'assistant', type: 'text', content: '保存失败。' }) }
}

function handleKeydown(e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }
</script>

<template>
  <button class="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-sandalwood text-white shadow-card flex items-center justify-center hover:bg-sandalwood/90 transition-all" @click="toggle">
    <ScrollText class="w-7 h-7" />
  </button>

  <Teleport to="body">
    <Transition enter-active-class="transition duration-200 ease-out" enter-from-class="opacity-0 translate-y-4" enter-to-class="opacity-100 translate-y-0" leave-active-class="transition duration-150 ease-in" leave-from-class="opacity-100 translate-y-0" leave-to-class="opacity-0 translate-y-4">
      <div v-show="open" class="fixed bottom-24 right-6 z-50 w-[360px] h-[650px] max-h-[85vh] rounded-xl shadow-card border border-sandalwood/20 flex flex-col bg-[#FDFBF7] overflow-hidden">
        <div class="px-4 py-3 border-b border-sandalwood/15 flex justify-between items-center bg-[#FBF8F2]">
          <h3 class="font-serif font-semibold text-sandalwood">AI 养生导师</h3>
          <X class="w-5 h-5 cursor-pointer text-sandalwood/70" @click="open = false" />
        </div>

        <div ref="messagesContainer" class="flex-1 overflow-y-auto p-4 space-y-4 bg-[#FAF6ED]">
          <div v-for="(m, i) in messages" :key="i">
            
            <div v-if="m.type === 'text' || !m.type" :class="['max-w-[85%] rounded-lg px-4 py-2.5 text-sm', m.role === 'user' ? 'ml-auto bg-sandalwood/15 text-sandalwood' : 'mr-auto bg-[#F5EDD8] text-sandalwood']">
               {{ m.content || '...' }}
            </div>
            
            <div v-else-if="m.type === 'inquiry'" class="mr-auto bg-white border border-sandalwood/20 p-4 rounded-xl shadow-sm w-[90%] animate-slide-up">
              <p class="text-sm mb-3 font-medium text-gray-800">{{ m.text }}</p>
              
              <div class="flex flex-col gap-2">
                <button v-for="opt in m.options" :key="opt.value" 
                  @click="toggleSelection(m, opt)" 
                  class="text-left px-3 py-2 text-xs border rounded-lg transition flex items-center justify-between group"
                  :class="[
                    // 样式逻辑：如果选中了(在数组里)，或者它是完成按钮，显示深色；否则白色
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
                      <div v-for="(a, idx) in m.acupoints" :key="idx" class="text-xs mb-2 last:mb-0 border-b border-gray-200/50 pb-2 last:border-0 last:pb-0">
                        <div class="font-bold text-gray-800">{{ a.name }}</div>
                        <div class="text-gray-500 mb-1">📍 {{ a.location }}</div>
                        <div class="bg-white p-1.5 rounded text-sandalwood/80 border border-sandalwood/5">👉 {{ a.method || '轻柔按压 3-5 分钟' }}</div>
                      </div>
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
        </div>

        <div class="p-3 border-t bg-[#FDFBF7] flex gap-2">
          <input v-model="input" @keyup.enter="send" :disabled="!!loadingStatus" placeholder="输入症状..." class="flex-1 px-4 py-2 border rounded-lg outline-none focus:ring-1 focus:ring-sandalwood/50 disabled:opacity-50" />
          <button @click="send" :disabled="!!loadingStatus" class="p-2 bg-sandalwood text-white rounded-lg disabled:opacity-50"><Send class="w-5 h-5"/></button>
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
</style>
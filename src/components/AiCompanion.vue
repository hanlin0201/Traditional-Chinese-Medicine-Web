<script setup>
import { ref, nextTick, watch } from 'vue'
import { ScrollText, Send, X, ChevronDown, Heart, PlusCircle } from 'lucide-vue-next'
import { supabase } from '@/supabaseClient'
import { useAuth } from '@/composables/useAuth'

const { user, logUserHistory } = useAuth()

// --- 状态定义 ---
const open = ref(false)
const input = ref('')
const messagesContainer = ref(null)
const favorited = ref(new Set())   
const foldedStates = ref({})       

// --- Mock 数据 ---
const MOCK_INQUIRY = {
  role: 'assistant', type: 'inquiry',
  text: '收到。为了给您更精准的建议，请告诉我您是否有以下伴随症状？',
  options: [
    { label: '口苦、急躁易怒', value: '肝火旺' },
    { label: '心慌、健忘多梦', value: '心脾两虚' },
    { label: '手脚心热、盗汗', value: '阴虚火旺' },
    { label: '没有其他明显症状', value: '一般失眠' }
  ]
}

const MOCK_PRESCRIPTION = {
  role: 'assistant', type: 'prescription',
  diagnosis_result: '肝火扰心型失眠',
  summary: '根据您的描述，您属于肝火旺导致的心神不宁。建议清肝泻火，安神定志。',
  pendingTag: '肝火旺',
  recipes: [
    {
      id: 101, name: '夏枯草黑豆茶', tags: ['清肝', '去火'],
      ingredients: ['夏枯草 10g', '黑豆 30g', '冰糖适量'],
      steps: ['1. 黑豆炒香至皮裂。', '2. 放入夏枯草煮水 15 分钟。', '3. 加入冰糖调味。']
    },
    {
      id: 102, name: '芹菜红枣汤', tags: ['平肝', '降压'],
      ingredients: ['鲜芹菜 200g', '红枣 5枚'],
      steps: ['1. 芹菜洗净切段。', '2. 红枣去核。', '3. 加水煮 20 分钟。']
    }
  ],
  acupoints: [
    { name: '太冲穴', location: '足背侧，第一、二跖骨结合部之前凹陷处', method: '睡前按揉 5 分钟，有酸胀感为宜。' }
  ],
  lifestyle: ['忌食辛辣、饮酒', '每晚 23:00 前必须卧床', '睡前温水泡脚 20 分钟']
}

const messages = ref([
  { role: 'assistant', type: 'text', content: '您好，我是 AI 养生导师。您可以告诉我近来的身体不适或想调理的方向，我会从中医角度为您提供建议。' }
])

// --- 交互逻辑 ---
function toggle() { open.value = !open.value; if(open.value) scrollToBottom() }
function scrollToBottom() { nextTick(() => { if (messagesContainer.value) messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight }) }
watch(messages, scrollToBottom, { deep: true })

function send() {
  const text = input.value.trim()
  if (!text) return
  messages.value.push({ role: 'user', content: text })
  input.value = ''
  logUserHistory(text)
  setTimeout(() => { messages.value.push({ ...MOCK_INQUIRY }) }, 600)
}

function handleOption(opt) {
  messages.value.push({ role: 'user', content: opt.label })
  setTimeout(() => { messages.value.push({ ...MOCK_PRESCRIPTION }) }, 1000)
}

// ✅ 核心修复1：真实收藏食谱
async function toggleFavorite(recipe) {
  if (!user.value) return 
  
  // UI 乐观更新
  if (favorited.value.has(recipe.id)) {
    favorited.value.delete(recipe.id)
  } else {
    favorited.value.add(recipe.id)
  }

  try {
    const { data: profile } = await supabase.from('profiles').select('saved_recipes').eq('id', user.value.id).single()
    let currentRecipes = profile?.saved_recipes || []
    
    // 检查是否存在
    const idx = currentRecipes.findIndex(r => r.name === recipe.name)
    if (idx >= 0) {
      currentRecipes.splice(idx, 1) // 存在则删除
    } else {
      currentRecipes.push({ ...recipe, saved_at: new Date().toISOString() }) // 不存在则添加
    }

    await supabase.from('profiles').update({ saved_recipes: currentRecipes }).eq('id', user.value.id)
  } catch (err) {
    console.error('收藏失败', err)
  }
}

// ✅ 核心修复2：真实保存整张计划卡片
async function handleSavePlan(fullMessage) {
  if (!user.value) {
    messages.value.push({ role: 'assistant', type: 'text', content: '请登录后保存。' }); return
  }

  const newPlan = {
    ...fullMessage, 
    id: Date.now(), // 唯一ID
    saved_at: new Date().toISOString()
  }

  try {
    const { data: profile } = await supabase.from('profiles').select('care_plans').eq('id', user.value.id).single()
    const currentPlans = profile?.care_plans || []

    // 查重
    if (currentPlans.some(p => p.diagnosis_result === newPlan.diagnosis_result)) {
      messages.value.push({ role: 'assistant', type: 'text', content: '该计划已存在。' }); return
    }

    const { error } = await supabase.from('profiles').update({ care_plans: [newPlan, ...currentPlans] }).eq('id', user.value.id)

    if (error) throw error
    messages.value.push({ role: 'assistant', type: 'text', content: `✅ 已将【${newPlan.diagnosis_result}】完整方案加入您的调理计划。` })
  } catch (err) {
    console.error('保存计划失败', err)
    messages.value.push({ role: 'assistant', type: 'text', content: '保存失败，请重试。' })
  }
}

function handleKeydown(e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }
</script>

<template>
  <button class="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-sandalwood text-white shadow-card flex items-center justify-center hover:bg-sandalwood/90 transition-all" @click="toggle">
    <ScrollText class="w-7 h-7" />
  </button>

  <Teleport to="body">
    <Transition enter-active-class="transition duration-200 ease-out" enter-from-class="opacity-0 translate-y-4" enter-to-class="opacity-100 translate-y-0" leave-active-class="transition duration-150 ease-in" leave-from-class="opacity-100 translate-y-0" leave-to-class="opacity-0 translate-y-4">
      <div v-show="open" class="fixed bottom-24 right-6 z-50 w-[360px] h-[600px] max-h-[80vh] rounded-xl shadow-card border border-sandalwood/20 flex flex-col bg-[#FDFBF7] overflow-hidden">
        <div class="px-4 py-3 border-b border-sandalwood/15 flex justify-between items-center bg-[#FBF8F2]">
          <h3 class="font-serif font-semibold text-sandalwood">AI 养生导师</h3>
          <X class="w-5 h-5 cursor-pointer text-sandalwood/70" @click="open = false" />
        </div>

        <div ref="messagesContainer" class="flex-1 overflow-y-auto p-4 space-y-4 bg-[#FAF6ED]">
          <div v-for="(m, i) in messages" :key="i">
            <div v-if="m.type === 'text' || !m.type" :class="['max-w-[85%] rounded-lg px-4 py-2.5 text-sm', m.role === 'user' ? 'ml-auto bg-sandalwood/15 text-sandalwood' : 'mr-auto bg-[#F5EDD8] text-sandalwood']">{{ m.content }}</div>
            
            <div v-else-if="m.type === 'inquiry'" class="mr-auto bg-white border border-sandalwood/20 p-4 rounded-xl shadow-sm w-[90%]">
              <p class="text-sm mb-3 font-medium">{{ m.text }}</p>
              <div class="flex flex-wrap gap-2">
                <button v-for="opt in m.options" :key="opt.value" @click="handleOption(opt)" class="px-3 py-1 text-xs border border-sandalwood/30 rounded-full hover:bg-sandalwood hover:text-white transition">{{ opt.label }}</button>
              </div>
            </div>

            <div v-else-if="m.type === 'prescription'" class="mr-auto bg-white border border-sandalwood/20 rounded-xl overflow-hidden shadow-md w-[98%]">
              <div class="bg-[#FAF6ED] p-3 border-b border-sandalwood/10">
                <div class="text-sandalwood font-serif font-bold flex items-center gap-2">💡 {{ m.diagnosis_result }}</div>
                <p class="text-xs text-sandalwood/70 mt-1">{{ m.summary }}</p>
              </div>
              <div class="p-3 space-y-3">
                 <div v-for="r in m.recipes" :key="r.id" class="border border-gray-100 rounded bg-white">
                    <div @click="foldedStates[r.id] = !foldedStates[r.id]" class="p-2 flex justify-between cursor-pointer hover:bg-gray-50">
                      <span class="text-sm font-bold text-gray-700">{{ r.name }}</span>
                      <ChevronDown class="w-4 h-4 text-gray-400" :class="{'rotate-180': foldedStates[r.id]}"/>
                    </div>
                    <div v-show="foldedStates[r.id]" class="p-2 pt-0 text-xs text-gray-600 border-t border-gray-50">
                       <p class="mt-2"><strong>食材：</strong>{{ r.ingredients.join('、') }}</p>
                       <p class="mt-1"><strong>步骤：</strong>{{ r.steps.join(' ') }}</p>
                       <button @click.stop="toggleFavorite(r)" class="w-full mt-2 py-1 border border-dashed rounded flex justify-center gap-1" :class="favorited.has(r.id) ? 'text-red-500 bg-red-50' : 'text-gray-400'">
                         <Heart class="w-3 h-3" :class="{'fill-current': favorited.has(r.id)}"/> {{ favorited.has(r.id) ? '已收藏' : '收藏' }}
                       </button>
                    </div>
                 </div>
                 <button @click="handleSavePlan(m)" class="w-full bg-sandalwood text-white py-2 rounded flex justify-center gap-2 text-sm hover:bg-sandalwood/90"><PlusCircle class="w-4 h-4"/> 加入调理计划</button>
              </div>
            </div>
          </div>
        </div>

        <div class="p-3 border-t bg-[#FDFBF7] flex gap-2">
          <input v-model="input" @keyup.enter="send" placeholder="输入症状..." class="flex-1 px-4 py-2 border rounded-lg outline-none focus:ring-1 focus:ring-sandalwood/50" />
          <button @click="send" class="p-2 bg-sandalwood text-white rounded-lg"><Send class="w-5 h-5"/></button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
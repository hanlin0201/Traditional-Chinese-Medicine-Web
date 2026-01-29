<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import { supabase } from '@/supabaseClient'
import { useAuth } from '@/composables/useAuth'
import HealthTagManager from '@/components/HealthTagManager.vue'
import { Trash2, ChevronDown, FileText, ChefHat, User, Edit2, Check, Camera } from 'lucide-vue-next'

const { user } = useAuth()
const loading = ref(true)
const activeTab = ref('plans')

// 数据
const username = ref('')
const avatar_url = ref('')
const isEditingName = ref(false)
const fileInput = ref(null) // 引用隐藏的文件输入框

const carePlans = ref([])
const savedRecipes = ref([])
const foldedStates = ref({})

// 1. 获取数据
async function getProfile() {
  try {
    if (!user.value) return
    const { data } = await supabase.from('profiles').select('*').eq('id', user.value.id).single()
    if (data) {
      username.value = data.username || ''
      avatar_url.value = data.avatar_url || ''
      carePlans.value = data.care_plans || []
      savedRecipes.value = data.saved_recipes || []
    }
  } catch (error) { console.error(error) } 
  finally { loading.value = false }
}

// 2. 触发文件选择 (点击头像时调用)
function triggerFileInput() {
  fileInput.value.click()
}

// 3. 处理文件上传 (转 Base64 存入 DB)
async function handleFileChange(event) {
  const file = event.target.files[0]
  if (!file) return

  // 限制图片大小 (例如 1MB)，防止 Base64 太长数据库存不下
  if (file.size > 1024 * 1024) {
    alert('图片太大，请选择小于 1MB 的图片')
    return
  }

  const reader = new FileReader()
  reader.onload = async (e) => {
    const base64String = e.target.result
    avatar_url.value = base64String // 立即预览
    
    // 保存到数据库
    await saveProfileField({ avatar_url: base64String })
  }
  reader.readAsDataURL(file)
}

// 4. 保存单个字段通用函数
async function saveProfileField(updates) {
  try {
    const { error } = await supabase.from('profiles').update({ 
      ...updates, 
      updated_at: new Date() 
    }).eq('id', user.value.id)
    if (error) throw error
  } catch (error) {
    alert('保存失败: ' + error.message)
  }
}

// 5. 保存昵称
async function saveName() {
  isEditingName.value = false
  if (!username.value.trim()) username.value = '未命名'
  await saveProfileField({ username: username.value })
}

// 6. 删除逻辑
async function deletePlan(planId) {
  if(!confirm('确定删除?')) return
  const newPlans = carePlans.value.filter(p => p.id !== planId)
  await supabase.from('profiles').update({ care_plans: newPlans }).eq('id', user.value.id)
  carePlans.value = newPlans
}

async function deleteRecipe(recipeId) {
  if(!confirm('确定删除?')) return
  const newRecipes = savedRecipes.value.filter(r => String(r.id) !== String(recipeId)) // 强转String对比
  await supabase.from('profiles').update({ saved_recipes: newRecipes }).eq('id', user.value.id)
  savedRecipes.value = newRecipes
}

// 监听刷新
onMounted(() => {
  getProfile()
  window.addEventListener('profile-updated', getProfile)
})

onUnmounted(() => {
  window.removeEventListener('profile-updated', getProfile)
})
</script>

<template>
  <div class="min-h-screen bg-[#FDFBF7] pb-24 p-4">
    <div class="max-w-xl mx-auto space-y-6">
      
      <section class="bg-white p-6 rounded-xl shadow-sm border border-sandalwood/10 flex flex-col items-center justify-center text-center">
        
        <input 
          type="file" 
          ref="fileInput" 
          accept="image/*" 
          class="hidden" 
          @change="handleFileChange"
        />

        <div 
          @click="triggerFileInput"
          class="w-20 h-20 rounded-full bg-sandalwood/10 flex items-center justify-center overflow-hidden border-2 border-sandalwood/20 mb-3 cursor-pointer group relative hover:border-sandalwood transition-colors"
        >
           <img v-if="avatar_url" :src="avatar_url" class="w-full h-full object-cover" />
           <User v-else class="w-8 h-8 text-sandalwood/50" />
           
           <div class="absolute inset-0 bg-black/30 hidden group-hover:flex items-center justify-center text-white">
             <Camera class="w-6 h-6" />
           </div>
        </div>

        <div class="flex items-center justify-center gap-2 h-8 w-full">
          <div v-if="!isEditingName" @click="isEditingName = true" class="flex items-center gap-2 cursor-pointer hover:bg-gray-50 px-2 py-1 rounded group">
            <h2 class="text-xl font-serif font-bold text-sandalwood">{{ username || '点击设置昵称' }}</h2>
            <Edit2 class="w-3 h-3 text-gray-300 group-hover:text-sandalwood/50" />
          </div>
          <div v-else class="flex items-center gap-2">
            <input 
              v-model="username" 
              @blur="saveName"
              @keyup.enter="saveName"
              autoFocus
              class="text-xl font-serif font-bold text-sandalwood text-center bg-[#FDFBF7] border-b border-sandalwood/50 outline-none w-40"
            />
            <button @click="saveName" class="text-green-600 hover:bg-green-50 p-1 rounded"><Check class="w-4 h-4" /></button>
          </div>
        </div>
        
        <p class="text-xs text-gray-400 mt-1">{{ user?.email }}</p>
      </section>

      <HealthTagManager />

      <section>
        <div class="flex gap-6 border-b border-sandalwood/10 mb-4">
          <button @click="activeTab='plans'" :class="activeTab==='plans'?'text-sandalwood font-bold border-b-2 border-sandalwood':'text-gray-400'" class="pb-2 px-1 text-sm flex gap-2 items-center transition-all">
            <FileText class="w-4 h-4"/> 调理计划
          </button>
          <button @click="activeTab='recipes'" :class="activeTab==='recipes'?'text-sandalwood font-bold border-b-2 border-sandalwood':'text-gray-400'" class="pb-2 px-1 text-sm flex gap-2 items-center transition-all">
             <ChefHat class="w-4 h-4"/> 收藏食谱
          </button>
        </div>

        <div v-if="activeTab === 'plans'" class="space-y-4">
          <div v-if="carePlans.length === 0" class="text-center text-gray-400 text-sm py-10 bg-white rounded-xl border border-dashed border-sandalwood/10">
            暂无计划，请点击右下角卷轴问问 AI 导师
          </div>
          <div v-for="plan in carePlans" :key="plan.id" class="bg-white border border-sandalwood/10 rounded-xl overflow-hidden shadow-sm">
             <div class="bg-[#FAF6ED] p-3 flex justify-between items-center border-b border-sandalwood/5">
                <span class="font-bold text-sandalwood flex items-center gap-2">💡 {{ plan.diagnosis_result }}</span>
                <button @click="deletePlan(plan.id)" class="p-1 text-gray-300 hover:text-red-500 transition">
                  <Trash2 class="w-4 h-4" />
                </button>
             </div>
             <div class="p-4 space-y-4">
               <p class="text-sm text-gray-700 leading-relaxed">{{ plan.summary }}</p>
               <div v-if="plan.acupoints" class="bg-gray-50 p-3 rounded-lg border border-gray-100">
                 <div class="text-xs font-bold text-sandalwood mb-2 flex items-center gap-1"><span class="w-1.5 h-1.5 bg-sandalwood rounded-full"></span> 穴位按揉</div>
                 <div v-for="(a, idx) in plan.acupoints" :key="idx" class="text-xs mb-2 last:mb-0">
                   <span class="font-bold text-gray-800">{{ a.name }}</span> | <span class="text-gray-600">{{ a.location }}</span>
                   <div class="mt-1 text-sandalwood/80 bg-white p-1.5 rounded border border-sandalwood/5">👉 {{ a.method }}</div>
                 </div>
               </div>
               <div v-if="plan.lifestyle" class="text-xs text-gray-500"><span class="font-bold text-sandalwood">🚫 禁忌：</span> {{ plan.lifestyle.join('；') }}</div>
             </div>
          </div>
        </div>

        <div v-else class="grid grid-cols-1 gap-3">
           <div v-if="savedRecipes.length === 0" class="text-center text-gray-400 text-sm py-10 bg-white rounded-xl border border-dashed border-sandalwood/10">暂无收藏食谱</div>
           <div v-for="r in savedRecipes" :key="r.id" class="bg-white border border-sandalwood/10 rounded-xl p-4 shadow-sm relative group">
              <button @click="deleteRecipe(r.id)" class="absolute top-3 right-3 text-gray-300 hover:text-red-500 transition"><Trash2 class="w-4 h-4" /></button>
              <h4 class="font-bold text-gray-800 mb-1">{{ r.name }}</h4>
              <div class="flex flex-wrap gap-1 mb-3">
                 <span v-for="t in r.tags" :key="t" class="text-[10px] bg-[#EEF2E6] text-[#5A7C65] px-1.5 py-0.5 rounded border border-[#5A7C65]/20">{{ t }}</span>
              </div>
              <p class="text-xs text-gray-600 mb-3 bg-gray-50 p-2 rounded"><strong>食材：</strong>{{ r.ingredients.join('、') }}</p>
              <button @click="foldedStates[r.id] = !foldedStates[r.id]" class="w-full text-xs text-center text-sandalwood/70 hover:text-sandalwood border-t pt-2 flex items-center justify-center gap-1">{{ foldedStates[r.id] ? '收起做法' : '查看做法' }}<ChevronDown class="w-3 h-3 transition-transform" :class="{'rotate-180': foldedStates[r.id]}" /></button>
              <div v-show="foldedStates[r.id]" class="mt-2 text-xs text-gray-600 space-y-1 pl-2 border-l-2 border-sandalwood/10">
                 <p v-for="(s, i) in r.steps" :key="i">{{ s }}</p>
              </div>
           </div>
        </div>
      </section>

    </div>
  </div>
</template>
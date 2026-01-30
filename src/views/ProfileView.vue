<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import { supabase } from '@/supabaseClient'
import { useAuth } from '@/composables/useAuth'
import HealthTagManager from '@/components/HealthTagManager.vue'
import { 
  Trash2, ChevronDown, FileText, ChefHat, User, Edit2, 
  Check, Camera, Calendar, Activity, X 
} from 'lucide-vue-next'

const { user } = useAuth()
const loading = ref(true)
const activeTab = ref('plans')
const foldedStates = ref({}) 

// 数据
const username = ref('')
const avatar_url = ref('')
const isEditingName = ref(false)
const fileInput = ref(null)
const carePlans = ref([])
const savedRecipes = ref([])
const profile = ref(null)

// 辅助：切换展开/收起
function toggleFold(uniqueKey) {
  foldedStates.value[uniqueKey] = !foldedStates.value[uniqueKey]
}

// 1. 获取数据
async function getProfile() {
  try {
    loading.value = true
    if (!user.value) return
    const { data } = await supabase.from('profiles').select('*').eq('id', user.value.id).single()
    if (data) {
      profile.value = data
      username.value = data.username || ''
      avatar_url.value = data.avatar_url || ''
      carePlans.value = (data.care_plans || []).sort((a, b) => new Date(b.saved_at) - new Date(a.saved_at))
      savedRecipes.value = (data.saved_recipes || []).sort((a, b) => new Date(b.saved_at) - new Date(a.saved_at))
    }
  } catch (error) { console.error(error) }
  finally { loading.value = false }
}

// 2. 文件上传逻辑
function triggerFileInput() { fileInput.value.click() }
async function handleFileChange(event) {
  const file = event.target.files[0]
  if (!file) return
  if (file.size > 1024 * 1024) return alert('图片太大，请选择小于 1MB 的图片')
  const reader = new FileReader()
  reader.onload = async (e) => {
    const base64String = e.target.result
    avatar_url.value = base64String
    await saveProfileField({ avatar_url: base64String })
  }
  reader.readAsDataURL(file)
}

// 3. 保存逻辑
async function saveProfileField(updates) {
  await supabase.from('profiles').update({ ...updates, updated_at: new Date() }).eq('id', user.value.id)
}
async function saveName() {
  isEditingName.value = false
  if (!username.value.trim()) username.value = '未命名'
  await saveProfileField({ username: username.value })
}

// 4. 删除逻辑
async function deletePlan(planId) {
  if(!confirm('确定删除这条调理记录吗?')) return
  const newPlans = carePlans.value.filter(p => p.id !== planId)
  await supabase.from('profiles').update({ care_plans: newPlans }).eq('id', user.value.id)
  carePlans.value = newPlans
}
async function deleteRecipe(recipeId) {
  if(!confirm('确定取消收藏该食谱?')) return
  const newRecipes = savedRecipes.value.filter(r => String(r.id) !== String(recipeId))
  await supabase.from('profiles').update({ saved_recipes: newRecipes }).eq('id', user.value.id)
  savedRecipes.value = newRecipes
}

// 🛠️ 工具函数
function ensureArray(val) { return (!val) ? [] : (Array.isArray(val) ? val : [val]) }
function formatDate(isoString) {
  if (!isoString) return ''
  return new Date(isoString).toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', hour: '2-digit', minute:'2-digit' })
}

onMounted(() => {
  getProfile()
  window.addEventListener('profile-updated', getProfile)
})
onUnmounted(() => {
  window.removeEventListener('profile-updated', getProfile)
})
</script>

<template>
  <div class="min-h-screen bg-[#FDFBF7] pb-24">
    
    <div class="bg-sandalwood text-white pt-12 pb-20 px-4 relative overflow-hidden shadow-lg">
      <div class="absolute top-0 right-0 opacity-10 transform translate-x-10 -translate-y-10 pointer-events-none">
        <User class="w-64 h-64" />
      </div>

      <div class="relative z-10 flex items-center gap-5">
        <input type="file" ref="fileInput" accept="image/*" class="hidden" @change="handleFileChange" />
        <div 
          @click="triggerFileInput"
          class="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center border-2 border-white/30 backdrop-blur-md cursor-pointer group relative overflow-hidden transition-transform hover:scale-105 shadow-inner shrink-0"
        >
          <img v-if="avatar_url" :src="avatar_url" class="w-full h-full object-cover" />
          <User v-else class="w-10 h-10 text-white/80" />
          <div class="absolute inset-0 bg-black/30 hidden group-hover:flex items-center justify-center transition-all">
            <Camera class="w-6 h-6 text-white opacity-90" />
          </div>
        </div>

        <div class="flex-1 min-w-0">
          <div v-if="!isEditingName" @click="isEditingName = true" class="group flex items-center gap-2 cursor-pointer w-fit">
            <h1 class="text-2xl font-serif font-bold text-white tracking-wide truncate group-hover:opacity-80 transition-opacity">
              {{ username || '点击设置昵称' }}
            </h1>
            <Edit2 class="w-4 h-4 text-white/50 group-hover:text-white transition-colors opacity-0 group-hover:opacity-100" />
          </div>
          <div v-else class="flex items-center gap-2 animate-in fade-in zoom-in duration-200">
             <input v-model="username" @blur="saveName" @keyup.enter="saveName" autoFocus class="text-xl font-serif font-bold text-sandalwood bg-[#FDFBF7] px-3 py-1 rounded outline-none w-full max-w-[200px] shadow-lg" />
             <button @click="saveName" class="w-8 h-8 flex items-center justify-center bg-white/20 hover:bg-white/30 text-white rounded-full backdrop-blur transition"><Check class="w-4 h-4" /></button>
          </div>
          <p class="text-white/60 text-sm mt-1.5 font-light">已坚持养生 <span class="font-bold text-white">{{ carePlans.length }}</span> 次</p>
        </div>
      </div>
    </div>

  <div class="-mt-10 px-2 relative z-20 w-full space-y-4 max-w-6xl mx-auto">
      
      <div class="bg-white rounded-xl shadow-card p-1 border border-sandalwood/5 overflow-hidden">
         <HealthTagManager />
      </div>

      <div class="bg-white rounded-xl shadow-sm p-1.5 flex gap-2 border border-sandalwood/10">
        <button @click="activeTab = 'plans'" class="flex-1 py-3 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2" :class="activeTab === 'plans' ? 'bg-sandalwood text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'">
          <FileText class="w-4 h-4"/> 调理方案
        </button>
        <button @click="activeTab = 'recipes'" class="flex-1 py-3 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2" :class="activeTab === 'recipes' ? 'bg-sandalwood text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'">
          <ChefHat class="w-4 h-4"/> 收藏食谱
        </button>
      </div>

      <div v-if="loading" class="flex justify-center py-20 text-sandalwood">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-current"></div>
      </div>

      <div v-else>
        <div v-if="activeTab === 'plans'" class="space-y-4 animate-in slide-in-from-bottom-4 duration-500">
          <div v-if="!carePlans.length" class="text-center py-20 text-gray-400 bg-white rounded-xl border border-dashed border-sandalwood/10">
             <p>暂无调理记录</p>
             <p class="text-xs mt-2">去和 AI 聊聊身体情况吧</p>
          </div>

          <div v-for="plan in carePlans" :key="plan.id" class="bg-white rounded-xl p-4 shadow-card border border-sandalwood/10 relative group hover:shadow-lg transition-all duration-300">
            <button @click="deletePlan(plan.id)" class="absolute top-4 right-4 text-gray-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all p-2 hover:bg-red-50 rounded-full">
              <Trash2 class="w-4 h-4" />
            </button>

            <div class="flex items-start gap-4 mb-4 border-b border-dashed border-gray-100 pb-4">
              <div class="w-12 h-12 rounded-xl bg-[#F5EDD8] flex items-center justify-center shrink-0 shadow-sm border border-[#EADBB5]">
                <Activity class="w-6 h-6 text-sandalwood" />
              </div>
              <div>
                <h3 class="font-bold text-gray-800 text-lg leading-tight mt-0.5">{{ plan.diagnosis_result }}</h3>
                <div class="flex items-center gap-2 mt-2 text-xs text-gray-400 font-mono">
                  <Calendar class="w-3 h-3" />
                  <span>{{ formatDate(plan.saved_at) }}</span>
                </div>
              </div>
            </div>

            <div class="text-sm text-gray-600 mb-5 bg-[#FAF9F6] p-4 rounded-lg leading-relaxed border border-gray-100">
              {{ plan.summary }}
            </div>

            <div v-if="plan.recipes && plan.recipes.length > 0">
               <div class="text-xs font-bold text-sandalwood mb-3 flex items-center gap-1 uppercase tracking-wider opacity-80">
                 <ChefHat class="w-3.5 h-3.5" /> 推荐食谱
               </div>
               <div class="space-y-3">
                 <div v-for="recipe in plan.recipes" :key="recipe.id" class="border border-sandalwood/10 rounded-xl overflow-hidden bg-white shadow-sm transition-all hover:border-sandalwood/30">
                    <div class="flex items-center gap-3 p-3 bg-[#FAF6ED]/30 cursor-pointer" @click="toggleFold(`plan-${plan.id}-recipe-${recipe.id}`)">
                      <div class="w-10 h-10 rounded-lg bg-white flex items-center justify-center text-xl shrink-0 shadow-sm border border-sandalwood/5">
                        {{ recipe.category === 'tea' ? '🍵' : (recipe.category === 'meal' ? '🥣' : '💊') }}
                      </div>
                      <div class="flex-1 min-w-0">
                        <div class="font-bold text-gray-800 text-sm truncate">{{ recipe.name }}</div>
                        <div class="text-xs text-gray-500 truncate mt-0.5">食材：{{ ensureArray(recipe.ingredients).join('、') }}</div>
                      </div>
                      <ChevronDown class="w-4 h-4 text-gray-400 transition-transform duration-300" :class="{'rotate-180': foldedStates[`plan-${plan.id}-recipe-${recipe.id}`]}" />
                    </div>
                    <div v-show="foldedStates[`plan-${plan.id}-recipe-${recipe.id}`]" class="bg-white px-4 pb-4 pt-1 border-t border-dashed border-sandalwood/10">
                       <div class="mt-2 text-xs text-gray-600 space-y-2">
                          <p v-for="(s, i) in ensureArray(recipe.steps)" :key="i" class="leading-relaxed flex gap-2">
                             <span class="font-bold text-sandalwood/60 shrink-0">{{ i+1 }}.</span> <span>{{ s }}</span>
                          </p>
                       </div>
                    </div>
                 </div>
               </div>
            </div>

            <div class="mt-5 pt-4 border-t border-dashed border-gray-100 grid gap-3">
               <div v-if="plan.acupoints && plan.acupoints.length">
                  <div class="text-xs font-bold text-gray-400 mb-2">穴位方案</div>
                  <div class="grid grid-cols-1 gap-2">
                     <div v-for="(ac, idx) in plan.acupoints" :key="idx" class="bg-gray-50 border border-gray-100 px-3 py-2 rounded-lg text-sm">
                        <div class="font-bold text-gray-700 mb-1 flex items-center gap-2">
                           <div class="w-1.5 h-1.5 rounded-full bg-sandalwood"></div>
                           {{ ac.name }}
                        </div>
                        <div v-if="ac.location" class="text-xs text-gray-500 mb-1.5 flex items-start gap-1">
                           <span class="shrink-0">📍</span> {{ ac.location }}
                        </div>
                        <div v-if="ac.method" class="text-xs text-sandalwood/80 leading-relaxed bg-[#F5EDD8]/40 p-2 rounded flex items-start gap-1">
                           <span class="shrink-0">👇</span> {{ ac.method }}
                        </div>
                     </div>
                  </div>
               </div>
               
               <div v-if="plan.lifestyle && plan.lifestyle.length" class="flex gap-2 items-start bg-red-50/50 p-2.5 rounded-lg text-xs">
                  <span class="font-bold text-red-400/80 shrink-0">🚫 禁忌：</span>
                  <span class="text-gray-600 leading-relaxed">{{ ensureArray(plan.lifestyle).join('；') }}</span>
               </div>
            </div>
          </div>
        </div>

        <div v-else-if="activeTab === 'recipes'" class="grid grid-cols-1 gap-4 animate-in slide-in-from-bottom-4 duration-500">
           <div v-if="!savedRecipes.length" class="text-center py-20 text-gray-400 bg-white rounded-xl border border-dashed border-sandalwood/10">
             <p>还没有收藏过食谱</p>
          </div>

          <div v-for="recipe in savedRecipes" :key="recipe.id" class="bg-white p-5 rounded-xl shadow-card border border-gray-100 relative group transition-all hover:-translate-y-1 hover:shadow-lg">
             <button @click="deleteRecipe(recipe.id)" class="absolute top-3 right-3 text-gray-300 hover:text-red-400 p-2 hover:bg-red-50 rounded-full transition-colors opacity-0 group-hover:opacity-100">
               <X class="w-4 h-4" />
             </button>

             <div class="flex gap-4">
                <div class="w-14 h-14 rounded-xl bg-orange-50 flex items-center justify-center text-3xl shrink-0 border border-orange-100 shadow-sm">
                   {{ recipe.category === 'tea' ? '🍵' : '🥣' }}
                </div>
                <div class="flex-1 min-w-0 pt-1">
                   <h4 class="font-bold text-gray-800 text-lg">{{ recipe.name }}</h4>
                   <div class="flex flex-wrap gap-1.5 mt-2">
                      <span v-for="tag in ensureArray(recipe.tags)" :key="tag" class="text-[10px] bg-[#EEF2E6] text-[#5A7C65] px-2 py-0.5 rounded-full border border-[#5A7C65]/20 font-medium">
                        {{ tag }}
                      </span>
                   </div>
                </div>
             </div>

             <div class="mt-4 text-xs text-gray-600 bg-gray-50 p-3 rounded-lg leading-relaxed">
                <span class="font-bold text-gray-800">食材：</span>{{ ensureArray(recipe.ingredients).join('、') }}
             </div>
             
             <button @click="toggleFold(`saved-${recipe.id}`)" class="w-full mt-3 text-xs text-center font-bold text-sandalwood bg-sandalwood/5 hover:bg-sandalwood/10 py-2 rounded-lg flex items-center justify-center gap-1 transition-colors">
               {{ foldedStates[`saved-${recipe.id}`] ? '收起做法' : '查看详细做法' }}
               <ChevronDown class="w-3.5 h-3.5 transition-transform duration-300" :class="{'rotate-180': foldedStates[`saved-${recipe.id}`]}" />
             </button>

             <div v-show="foldedStates[`saved-${recipe.id}`]" class="mt-3 space-y-2 pl-2 border-l-2 border-sandalwood/20 animate-in fade-in">
                <p v-for="(s, i) in ensureArray(recipe.steps)" :key="i" class="text-xs text-gray-600 leading-relaxed">
                   <span class="font-bold text-sandalwood/60 mr-1">{{ i+1 }}.</span> {{ s }}
                </p>
             </div>
          </div>
        </div>
      
      </div>
    </div>
  </div>
</template>

<style scoped>
.bg-sandalwood { background-color: #A9805B; }
.text-sandalwood { color: #A9805B; }
.border-sandalwood\/10 { border-color: rgba(169, 128, 91, 0.1); }
.border-sandalwood\/5 { border-color: rgba(169, 128, 91, 0.05); }
.bg-sandalwood\/5 { background-color: rgba(169, 128, 91, 0.05); }
.shadow-card {
  box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.05);
}
</style>

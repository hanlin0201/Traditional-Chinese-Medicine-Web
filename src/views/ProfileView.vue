<script setup>
import { onMounted, onUnmounted, ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '@/supabaseClient'
import { useAuth } from '@/composables/useAuth'
import HealthTagManager from '@/components/HealthTagManager.vue'
import { 
  Trash2, ChevronDown, FileText, ChefHat, User, Edit2, 
  Check, Camera, Calendar, Activity, X, Leaf, 
  Lock, Unlock, Image as ImageIcon, BookOpen, Utensils
} from 'lucide-vue-next'

const router = useRouter()
const { user } = useAuth()
const loading = ref(true)
const activeTab = ref('plans')
const foldedStates = ref({}) 

// --- 基础数据 ---
const username = ref('')
const avatar_url = ref('')
const isEditingName = ref(false)
const fileInput = ref(null)
const profile = ref(null)

// --- 简介与隐私 ---
const bio = ref('') 
const isEditingBio = ref(false)
const privacySettings = ref({
  plans: true,
  recipes: false,
  herbs: false
})

// --- 五大板块数据 ---
const carePlans = ref([])      
const savedRecipes = ref([])   // 🌟 混合了 AI 和 广场食谱
const favoriteHerbs = ref([])  
const myWorks = ref([])        
const myRecipes = ref([])      

// 会话缓存：再次进入个人中心时先展示上次数据，调理/收藏/作品数不闪 0
const _profileCache = { userId: null, payload: null }
function applyProfilePayload(payload) {
  if (!payload) return
  profile.value = payload.profile
  username.value = payload.username ?? ''
  avatar_url.value = payload.avatar_url ?? ''
  bio.value = payload.bio ?? ''
  privacySettings.value = { ...payload.privacySettings }
  carePlans.value = payload.carePlans ?? []
  favoriteHerbs.value = payload.favoriteHerbs ?? []
  savedRecipes.value = payload.savedRecipes ?? []
  myWorks.value = payload.myWorks ?? []
  myRecipes.value = payload.myRecipes ?? []
}
function saveProfilePayload() {
  if (!user.value) return
  _profileCache.userId = user.value.id
  _profileCache.payload = {
    profile: profile.value,
    username: username.value,
    avatar_url: avatar_url.value,
    bio: bio.value,
    privacySettings: { ...privacySettings.value },
    carePlans: [...carePlans.value],
    favoriteHerbs: [...favoriteHerbs.value],
    savedRecipes: [...savedRecipes.value],
    myWorks: [...myWorks.value],
    myRecipes: [...myRecipes.value],
  }
}

// 辅助：切换展开/收起
function toggleFold(uniqueKey) {
  foldedStates.value[uniqueKey] = !foldedStates.value[uniqueKey]
}

// --- 1. 获取数据：5 个请求并行 + 双源合并 ---
async function getProfile() {
  if (!user.value) return
  const uid = user.value.id
  const isRevalidate = loading.value === false && _profileCache.userId === uid
  if (!isRevalidate) loading.value = true
  try {
    const [
      { data: profileData },
      { data: herbsData },
      { data: favRecipesData },
      { data: worksData },
      { data: myRecipesData },
    ] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', uid).single(),
      supabase.from('favorite_herbs').select('*, herb:herbs(*)').eq('user_id', uid).order('created_at', { ascending: false }),
      supabase.from('favorite_recipes').select('*, recipe:recipes(*)').eq('user_id', uid).order('created_at', { ascending: false }),
      supabase.from('homeworks').select('*').eq('user_id', uid).order('created_at', { ascending: false }),
      supabase.from('recipes').select('*').eq('author_id', uid).order('created_at', { ascending: false }),
    ])

    let aiRecipes = []
    if (profileData) {
      profile.value = profileData
      username.value = profileData.username || ''
      avatar_url.value = profileData.avatar_url || ''
      bio.value = profileData.bio || ''
      privacySettings.value = {
        plans: profileData.is_plans_private ?? true,
        recipes: profileData.is_saved_private ?? false,
        herbs: profileData.is_herbs_private ?? false
      }
      carePlans.value = (profileData.care_plans || []).sort((a, b) => new Date(b.saved_at) - new Date(a.saved_at))
      if (profileData.saved_recipes && Array.isArray(profileData.saved_recipes)) {
        aiRecipes = profileData.saved_recipes.map(r => ({
          ...r,
          id: r.id || `ai-${Date.now()}-${Math.random()}`,
          is_ai: true,
          saved_at: r.saved_at || new Date().toISOString(),
          ingredients: r.ingredients || [],
          steps: r.steps || [],
          tags: r.tags || ['AI推荐']
        }))
      }
    }

    if (herbsData) {
      favoriteHerbs.value = herbsData.map(item => ({
        ...item.herb,
        favorite_id: item.id,
        saved_at: item.created_at
      }))
    }

    let marketRecipes = []
    if (favRecipesData) {
      marketRecipes = favRecipesData.map(item => ({
        ...item.recipe,
        favorite_id: item.id,
        saved_at: item.created_at,
        is_ai: false,
        tags: item.recipe?.tags || ['广场精选']
      }))
    }
    savedRecipes.value = [...marketRecipes, ...aiRecipes].sort((a, b) =>
      new Date(b.saved_at) - new Date(a.saved_at)
    )

    if (worksData) myWorks.value = worksData
    if (myRecipesData) myRecipes.value = myRecipesData

    saveProfilePayload()
  } catch (error) {
    console.error('获取个人信息失败:', error)
  } finally {
    loading.value = false
  }
}

// --- 保存逻辑 ---
async function saveProfileField(updates) {
  await supabase.from('profiles').update({ ...updates, updated_at: new Date() }).eq('id', user.value.id)
}
async function saveName() {
  isEditingName.value = false
  if (!username.value.trim()) username.value = '未命名'
  await saveProfileField({ username: username.value })
}
async function saveBio() {
  isEditingBio.value = false
  await saveProfileField({ bio: bio.value })
}
async function togglePrivacy(type) {
  const fieldMap = { plans: 'is_plans_private', recipes: 'is_saved_private', herbs: 'is_herbs_private' }
  privacySettings.value[type] = !privacySettings.value[type]
  await saveProfileField({ [fieldMap[type]]: privacySettings.value[type] })
}

// --- 删除逻辑 ---
async function deletePlan(planId) {
  if(!confirm('确定删除这条调理记录吗?')) return
  const newPlans = carePlans.value.filter(p => p.id !== planId)
  await supabase.from('profiles').update({ care_plans: newPlans }).eq('id', user.value.id)
  carePlans.value = newPlans
}

// 🌟 修复：智能删除 (区分 AI 和 广场)
async function deleteRecipe(recipe) {
  if(!confirm('确定取消收藏该食谱?')) return
  
  try {
    if (recipe.is_ai) {
      // 1. 删除 AI 食谱 (更新 profiles 数组)
      // 过滤掉当前这个食谱
      const newAiRecipes = savedRecipes.value
        .filter(r => r.is_ai && r.id !== recipe.id) // 拿到剩下的 AI 食谱
        .map(r => {
           // 还原成纯净的 JSON 对象存回数据库 (去掉 is_ai 等临时字段)
           const { is_ai, ...rest } = r
           return rest
        })
        
      await supabase.from('profiles').update({ saved_recipes: newAiRecipes }).eq('id', user.value.id)
      
      // 更新前端
      savedRecipes.value = savedRecipes.value.filter(r => r.id !== recipe.id)
      
    } else {
      // 2. 删除广场食谱 (删 favorite_recipes 表)
      const { error } = await supabase.from('favorite_recipes').delete().eq('id', recipe.favorite_id)
      if (error) throw error
      
      // 更新前端
      savedRecipes.value = savedRecipes.value.filter(r => r.id !== recipe.id)
    }
  } catch (e) {
    console.error(e)
    alert('删除失败')
  }
}

async function deleteHerb(favoriteId) {
  if(!confirm('确定将该药材移出私库吗?')) return
  const { error } = await supabase.from('favorite_herbs').delete().eq('id', favoriteId)
  if (!error) favoriteHerbs.value = favoriteHerbs.value.filter(h => h.favorite_id !== favoriteId)
}

// --- 其他 ---
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

function goToHerbDetail(herbName) { router.push(`/herb/${herbName}`) }

// 工具函数
function ensureArray(val) { return (!val) ? [] : (Array.isArray(val) ? val : [val]) }
function formatDate(isoString) {
  if (!isoString) return ''
  return new Date(isoString).toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', hour: '2-digit', minute:'2-digit' })
}

onMounted(() => {
  if (user.value && _profileCache.userId === user.value.id && _profileCache.payload) {
    applyProfilePayload(_profileCache.payload)
    loading.value = false
    getProfile() // 后台刷新，不阻塞界面
  } else {
    getProfile()
  }
  window.addEventListener('profile-updated', getProfile)
})
onUnmounted(() => {
  window.removeEventListener('profile-updated', getProfile)
})
</script>

<template>
  <div class="min-h-screen bg-[#FDFBF7] pb-24">
    
    <div class="bg-sandalwood text-white pt-12 pb-16 px-4 relative overflow-hidden shadow-lg">
      <div class="absolute top-0 right-0 opacity-10 transform translate-x-10 -translate-y-10 pointer-events-none">
        <User class="w-64 h-64" />
      </div>

      <div class="relative z-10 flex flex-col items-center sm:flex-row sm:items-start gap-6 max-w-4xl mx-auto">
        <input type="file" ref="fileInput" accept="image/*" class="hidden" @change="handleFileChange" />
        <div 
          @click="triggerFileInput"
          class="w-24 h-24 rounded-full bg-white/20 flex items-center justify-center border-4 border-white/20 backdrop-blur-md cursor-pointer group relative overflow-hidden transition-transform hover:scale-105 shadow-inner shrink-0"
        >
          <img v-if="avatar_url" :src="avatar_url" class="w-full h-full object-cover" />
          <User v-else class="w-12 h-12 text-white/80" />
          <div class="absolute inset-0 bg-black/30 hidden group-hover:flex items-center justify-center transition-all">
            <Camera class="w-8 h-8 text-white opacity-90" />
          </div>
        </div>

        <div class="flex-1 min-w-0 text-center sm:text-left w-full">
          <div class="flex items-center justify-center sm:justify-start gap-2 mb-2">
            <div v-if="!isEditingName" @click="isEditingName = true" class="group flex items-center gap-2 cursor-pointer">
              <h1 class="text-2xl font-serif font-bold text-white tracking-wide truncate group-hover:opacity-80">
                {{ username || '点击设置昵称' }}
              </h1>
              <Edit2 class="w-4 h-4 text-white/50 group-hover:text-white transition-colors opacity-0 group-hover:opacity-100" />
            </div>
            <div v-else class="flex items-center gap-2 animate-in fade-in zoom-in duration-200">
               <input v-model="username" @blur="saveName" @keyup.enter="saveName" autoFocus class="text-xl font-serif font-bold text-sandalwood bg-[#FDFBF7] px-3 py-1 rounded outline-none w-full max-w-[200px]" />
               <button @click="saveName" class="w-8 h-8 flex items-center justify-center bg-white/20 hover:bg-white/30 text-white rounded-full"><Check class="w-4 h-4" /></button>
            </div>
          </div>

          <div class="text-white/80 text-sm font-light leading-relaxed max-w-lg">
             <div v-if="!isEditingBio" @click="isEditingBio = true" class="group cursor-pointer min-h-[1.5em] flex items-center justify-center sm:justify-start gap-2">
               <span>{{ bio || '写一句简介，记录你的养生心得...' }}</span>
               <Edit2 class="w-3 h-3 text-white/40 group-hover:text-white/80 opacity-0 group-hover:opacity-100 transition-opacity" />
             </div>
             <div v-else class="flex items-center gap-2 animate-in fade-in">
               <textarea v-model="bio" rows="2" @blur="saveBio" class="w-full text-sandalwood bg-[#FDFBF7] px-3 py-2 rounded text-sm outline-none resize-none shadow-lg" placeholder="写点什么..."></textarea>
             </div>
          </div>
          
          <div class="flex items-center justify-center sm:justify-start gap-6 mt-4 text-xs font-medium text-white/60">
             <div><span class="text-white text-lg font-bold block">{{ carePlans.length }}</span>调理</div>
             <div><span class="text-white text-lg font-bold block">{{ savedRecipes.length + favoriteHerbs.length }}</span>收藏</div>
             <div><span class="text-white text-lg font-bold block">{{ myWorks.length }}</span>作品</div>
          </div>
        </div>
      </div>
    </div>

  <div class="-mt-8 px-2 relative z-20 w-full space-y-4 max-w-6xl mx-auto">
      
      <div class="bg-white rounded-xl shadow-card p-1 border border-sandalwood/5 overflow-hidden">
         <HealthTagManager />
      </div>

      <div class="bg-white rounded-xl shadow-sm p-1.5 flex overflow-x-auto gap-2 border border-sandalwood/10 scrollbar-hide">
        <button v-for="tab in [
            { id: 'plans', icon: FileText, label: '调理方案' },
            { id: 'herbs', icon: Leaf, label: '药材私库' },
            { id: 'recipes', icon: ChefHat, label: '收藏食谱' },
            { id: 'works', icon: ImageIcon, label: '我的作品' },
            { id: 'my_recipes', icon: BookOpen, label: '我的菜谱' },
          ]"
          :key="tab.id"
          @click="activeTab = tab.id" 
          class="flex-shrink-0 px-4 py-3 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 whitespace-nowrap" 
          :class="activeTab === tab.id ? 'bg-sandalwood text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'"
        >
          <component :is="tab.icon" class="w-4 h-4"/> {{ tab.label }}
        </button>
      </div>

      <div class="min-h-[300px]">
        
        <div v-if="activeTab === 'plans'" class="animate-in slide-in-from-bottom-4 duration-500">
          <div class="flex justify-between items-center mb-4 px-2">
             <h3 class="font-bold text-gray-700">我的调理记录</h3>
             <button @click="togglePrivacy('plans')" class="text-xs flex items-center gap-1 px-3 py-1.5 rounded-full border transition-all" :class="privacySettings.plans ? 'bg-gray-100 text-gray-500 border-gray-200' : 'bg-green-50 text-green-700 border-green-200'">
               <component :is="privacySettings.plans ? Lock : Unlock" class="w-3 h-3" />
               {{ privacySettings.plans ? '仅自己可见' : '公开可见' }}
             </button>
          </div>

          <div v-if="!carePlans.length" class="text-center py-20 text-gray-400 bg-white rounded-xl border border-dashed border-sandalwood/10">
             <p>暂无调理记录</p><p class="text-xs mt-2">去和 AI 聊聊身体情况吧</p>
          </div>

          <div v-for="plan in carePlans" :key="plan.id" class="bg-white rounded-xl p-4 shadow-card border border-sandalwood/10 relative group mb-4">
            <button @click="deletePlan(plan.id)" class="absolute top-4 right-4 text-gray-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all p-2 hover:bg-red-50 rounded-full"><Trash2 class="w-4 h-4" /></button>
            <div class="flex items-start gap-4 mb-4 border-b border-dashed border-gray-100 pb-4">
              <div class="w-12 h-12 rounded-xl bg-[#F5EDD8] flex items-center justify-center shrink-0 shadow-sm border border-[#EADBB5]"><Activity class="w-6 h-6 text-sandalwood" /></div>
              <div>
                <h3 class="font-bold text-gray-800 text-lg leading-tight mt-0.5">{{ plan.diagnosis_result }}</h3>
                <div class="flex items-center gap-2 mt-2 text-xs text-gray-400 font-mono"><Calendar class="w-3 h-3" /><span>{{ formatDate(plan.saved_at) }}</span></div>
              </div>
            </div>
            <div class="text-sm text-gray-600 mb-5 bg-[#FAF9F6] p-4 rounded-lg leading-relaxed border border-gray-100">{{ plan.summary }}</div>

            <div v-if="plan.recipes && plan.recipes.length > 0">
               <div class="text-xs font-bold text-sandalwood mb-3 flex items-center gap-1 uppercase tracking-wider opacity-80"><ChefHat class="w-3.5 h-3.5" /> 推荐食谱</div>
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
                        <div class="font-bold text-gray-700 mb-1 flex items-center gap-2"><div class="w-1.5 h-1.5 rounded-full bg-sandalwood"></div>{{ ac.name }}</div>
                        <div v-if="ac.location" class="text-xs text-gray-500 mb-1.5 flex items-start gap-1"><span class="shrink-0">📍</span> {{ ac.location }}</div>
                        <div v-if="ac.method" class="text-xs text-sandalwood/80 leading-relaxed bg-[#F5EDD8]/40 p-2 rounded flex items-start gap-1"><span class="shrink-0">👇</span> {{ ac.method }}</div>
                     </div>
                  </div>
               </div>
               <div v-if="plan.lifestyle && plan.lifestyle.length" class="flex gap-2 items-start bg-red-50/50 p-2.5 rounded-lg text-xs">
                  <span class="font-bold text-red-400/80 shrink-0">🚫 禁忌：</span><span class="text-gray-600 leading-relaxed">{{ ensureArray(plan.lifestyle).join('；') }}</span>
               </div>
            </div>
          </div>
        </div>

        <div v-else-if="activeTab === 'herbs'" class="animate-in slide-in-from-bottom-4 duration-500">
           <div class="flex justify-between items-center mb-4 px-2">
             <h3 class="font-bold text-gray-700">收藏的药材</h3>
             <button @click="togglePrivacy('herbs')" class="text-xs flex items-center gap-1 px-3 py-1.5 rounded-full border transition-all" :class="privacySettings.herbs ? 'bg-gray-100 text-gray-500 border-gray-200' : 'bg-green-50 text-green-700 border-green-200'">
               <component :is="privacySettings.herbs ? Lock : Unlock" class="w-3 h-3" />
               {{ privacySettings.herbs ? '仅自己可见' : '公开可见' }}
             </button>
          </div>
          
          <div class="grid grid-cols-1 gap-4">
             <div v-if="!favoriteHerbs.length" class="text-center py-20 text-gray-400 bg-white rounded-xl border border-dashed border-sandalwood/10"><p>私库空空如也</p></div>
             <div v-for="herb in favoriteHerbs" :key="herb.favorite_id" class="bg-white p-4 rounded-xl shadow-card border border-sandalwood/10 relative group hover:shadow-lg cursor-pointer flex items-center gap-4" @click="goToHerbDetail(herb.name)">
                <button @click.stop="deleteHerb(herb.favorite_id)" class="absolute top-3 right-3 text-gray-300 hover:text-red-400 p-2 hover:bg-red-50 rounded-full transition-colors opacity-0 group-hover:opacity-100 z-10"><X class="w-4 h-4" /></button>
                <div class="w-14 h-14 rounded-lg bg-[#EEF2E6] flex items-center justify-center text-2xl shrink-0 text-[#5A7C65]">🌿</div>
                <div class="flex-1 min-w-0">
                   <h4 class="font-bold text-gray-800">{{ herb.name }}</h4>
                   <p class="text-xs text-gray-500 mt-1 truncate">{{ herb.nature }} · {{ herb.taste }}</p>
                </div>
                <ChevronDown class="-rotate-90 w-4 h-4 text-gray-300" />
             </div>
          </div>
        </div>

        <div v-else-if="activeTab === 'recipes'" class="grid grid-cols-1 gap-4 animate-in slide-in-from-bottom-4 duration-500">
           <div class="flex justify-between items-center mb-2 px-2">
             <h3 class="font-bold text-gray-700">我的收藏夹</h3>
             <button @click="togglePrivacy('recipes')" class="text-xs flex items-center gap-1 px-3 py-1.5 rounded-full border transition-all" :class="privacySettings.recipes ? 'bg-gray-100 text-gray-500 border-gray-200' : 'bg-green-50 text-green-700 border-green-200'">
               <component :is="privacySettings.recipes ? Lock : Unlock" class="w-3 h-3" />
               {{ privacySettings.recipes ? '仅自己可见' : '公开可见' }}
             </button>
          </div>

           <div v-if="!savedRecipes.length" class="text-center py-20 text-gray-400 bg-white rounded-xl border border-dashed border-sandalwood/10"><p>还没有收藏过食谱</p></div>

           <div v-for="recipe in savedRecipes" :key="recipe.id" class="bg-white p-5 rounded-xl shadow-card border border-gray-100 relative group transition-all hover:-translate-y-1 hover:shadow-lg">
             <button @click="deleteRecipe(recipe)" class="absolute top-3 right-3 text-gray-300 hover:text-red-400 p-2 hover:bg-red-50 rounded-full transition-colors opacity-0 group-hover:opacity-100"><X class="w-4 h-4" /></button>
             
             <div class="flex gap-4">
                <div class="w-14 h-14 rounded-xl bg-orange-50 flex items-center justify-center text-3xl shrink-0 border border-orange-100 shadow-sm">{{ recipe.category === 'tea' ? '🍵' : '🥣' }}</div>
                <div class="flex-1 min-w-0 pt-1">
                   <h4 class="font-bold text-gray-800 text-lg flex items-center gap-2">
                     {{ recipe.name }}
                     <span v-if="recipe.is_ai" class="text-[10px] bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded border border-purple-100">AI推荐</span>
                   </h4>
                   <div class="flex flex-wrap gap-1.5 mt-2">
                      <span v-for="tag in ensureArray(recipe.tags)" :key="tag" class="text-[10px] bg-[#EEF2E6] text-[#5A7C65] px-2 py-0.5 rounded-full border border-[#5A7C65]/20 font-medium">{{ tag }}</span>
                   </div>
                </div>
             </div>
             <div class="mt-4 text-xs text-gray-600 bg-gray-50 p-3 rounded-lg leading-relaxed"><span class="font-bold text-gray-800">食材：</span>{{ ensureArray(recipe.ingredients).join('、') }}</div>
             
             <button @click="toggleFold(`saved-${recipe.id}`)" class="w-full mt-3 text-xs text-center font-bold text-sandalwood bg-sandalwood/5 hover:bg-sandalwood/10 py-2 rounded-lg flex items-center justify-center gap-1 transition-colors">
               {{ foldedStates[`saved-${recipe.id}`] ? '收起做法' : '查看详细做法' }}
               <ChevronDown class="w-3.5 h-3.5 transition-transform duration-300" :class="{'rotate-180': foldedStates[`saved-${recipe.id}`]}" />
             </button>
             <div v-show="foldedStates[`saved-${recipe.id}`]" class="mt-3 space-y-2 pl-2 border-l-2 border-sandalwood/20 animate-in fade-in">
                <p v-for="(s, i) in ensureArray(recipe.steps)" :key="i" class="text-xs text-gray-600 leading-relaxed"><span class="font-bold text-sandalwood/60 mr-1">{{ i+1 }}.</span> {{ s }}</p>
             </div>
          </div>
        </div>

        <div v-else-if="activeTab === 'works'" class="animate-in slide-in-from-bottom-4 duration-500">
           <div class="flex justify-between items-center mb-4 px-2">
             <h3 class="font-bold text-gray-700">我的跟做作业</h3>
             <span class="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">默认为公开</span>
          </div>

          <div v-if="!myWorks.length" class="text-center py-20 text-gray-400 bg-white rounded-xl border border-dashed border-sandalwood/10"><p>还没交过作业，快去食谱广场试试吧</p></div>
          <div class="grid grid-cols-2 md:grid-cols-3 gap-3">
             <div v-for="work in myWorks" :key="work.id" class="aspect-square bg-gray-100 rounded-xl overflow-hidden relative group cursor-pointer shadow-sm border border-gray-200">
                <img :src="work.image_url" class="w-full h-full object-cover transition-transform group-hover:scale-110" />
                <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                   <p class="text-white text-xs line-clamp-2">{{ work.content || '打卡成功' }}</p>
                   <span class="text-[10px] text-white/60 mt-1">{{ formatDate(work.created_at) }}</span>
                </div>
             </div>
          </div>
        </div>

        <div v-else-if="activeTab === 'my_recipes'" class="animate-in slide-in-from-bottom-4 duration-500">
           <div class="flex justify-between items-center mb-4 px-2">
             <h3 class="font-bold text-gray-700">我发布的食谱</h3>
             <button class="text-xs bg-sandalwood text-white px-3 py-1.5 rounded-full shadow-sm hover:bg-sandalwood/90 flex items-center gap-1">
               <Utensils class="w-3 h-3" /> 发布新菜谱
             </button>
          </div>

          <div v-if="!myRecipes.length" class="text-center py-20 text-gray-400 bg-white rounded-xl border border-dashed border-sandalwood/10"><p>您还没有发布过原创食谱</p></div>
          <div class="grid grid-cols-1 gap-4">
             <div v-for="recipe in myRecipes" :key="recipe.id" class="bg-white p-4 rounded-xl shadow-card border border-gray-100 flex gap-4">
                <div class="w-20 h-20 rounded-xl bg-green-50 flex items-center justify-center text-3xl shrink-0 border border-green-100">🥗</div>
                <div class="flex-1">
                   <h4 class="font-bold text-gray-800 text-lg">{{ recipe.name }}</h4>
                   <p class="text-xs text-gray-500 mt-1 line-clamp-2">{{ recipe.description || '暂无描述' }}</p>
                   <div class="mt-2 flex gap-2">
                      <span class="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded">原创</span>
                      <span class="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded">{{ formatDate(recipe.created_at) }}</span>
                   </div>
                </div>
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
.shadow-card { box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.05); }
.scrollbar-hide::-webkit-scrollbar { display: none; }
.scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
</style>
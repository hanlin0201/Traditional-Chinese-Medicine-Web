<script setup>
import { onMounted, onUnmounted, ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '@/supabaseClient'
import { useAuth } from '@/composables/useAuth'
import HealthTagManager from '@/components/HealthTagManager.vue'
import { SOLAR_TERMS_LOOKUP } from '@/constants/solarTerms'
import { BODY_TYPES } from '@/constants/recipeFilters'
import { 
  Trash2, ChevronDown, FileText, ChefHat, User, Edit2, 
  Check, Camera, Calendar, Activity, X, Leaf, 
  Lock, Unlock, Image as ImageIcon, BookOpen, Utensils, Settings, LogOut, UserPlus,
  UserCheck, Sparkles, Soup, ListOrdered, Clock
} from 'lucide-vue-next'

const router = useRouter()
const { user, handleLogout } = useAuth()
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

// --- 我发布的菜谱：发布弹窗状态 ---
const showNewRecipeModal = ref(false)
const newRecipeName = ref('')
const newRecipeDesc = ref('')
const newRecipeBodyType = ref('')
const newRecipeSolarTerm = ref('')
const newRecipeTime = ref('')
const newRecipeEfficacy = ref('')
// 结构化食材/步骤输入：支持逐项新增/删除
const newRecipeIngredients = ref([{ name: '', amount: '' }])
const newRecipeSteps = ref([''])
const newRecipeImageFile = ref(null)
const newRecipeImagePreview = ref('')
const isPublishingRecipe = ref(false)

const solarTermOptions = computed(() => [
  { value: '', label: '不按节气' },
  ...SOLAR_TERMS_LOOKUP.map(t => ({ value: t.name, label: t.name }))
])

// --- 我发布的食谱：详情弹窗 & 删除 ---
const selectedMyRecipe = ref(null)
function openMyRecipe(recipe) {
  selectedMyRecipe.value = recipe
}
function closeMyRecipe() {
  selectedMyRecipe.value = null
}

async function deleteMyRecipe(recipeId) {
  if (!user.value) {
    alert('请先登录后再操作')
    return
  }
  if (!confirm('确定要删除这条已发布的食谱吗？')) return

  try {
    const next = myRecipes.value.filter(r => r.id !== recipeId)
    const { error } = await supabase
      .from('profiles')
      .update({ my_recipes: next, updated_at: new Date() })
      .eq('id', user.value.id)
    if (error) throw error

    myRecipes.value = next
    if (selectedMyRecipe.value && selectedMyRecipe.value.id === recipeId) {
      closeMyRecipe()
    }
    saveProfilePayload()
  } catch (e) {
    console.error(e)
    alert('删除失败，请稍后重试')
  }
}

function resetNewRecipeForm() {
  newRecipeName.value = ''
  newRecipeDesc.value = ''
  newRecipeBodyType.value = ''
  newRecipeSolarTerm.value = ''
  newRecipeTime.value = ''
  newRecipeEfficacy.value = ''
  newRecipeIngredients.value = [{ name: '', amount: '' }]
  newRecipeSteps.value = ['']
  newRecipeImageFile.value = null
  newRecipeImagePreview.value = ''
}

function openNewRecipeModal() {
  if (!user.value) {
    alert('请先登录后再发布菜谱')
    return
  }
  resetNewRecipeForm()
  showNewRecipeModal.value = true
}

function closeNewRecipeModal() {
  if (isPublishingRecipe.value) return
  showNewRecipeModal.value = false
}

function onNewRecipeImageSelected(event) {
  const file = event.target.files?.[0]
  if (!file) return
  if (file.size > 2 * 1024 * 1024) {
    alert('图片太大，请选择小于 2MB 的图片')
    return
  }
  newRecipeImageFile.value = file
  newRecipeImagePreview.value = URL.createObjectURL(file)
}

async function handlePublishRecipe() {
  if (!user.value) {
    alert('请先登录后再发布菜谱')
    return
  }
  if (!newRecipeName.value.trim()) {
    alert('请填写菜谱名称')
    return
  }
  if (!newRecipeBodyType.value) {
    alert('请选择适宜体质')
    return
  }

  isPublishingRecipe.value = true
  try {
    // 1. 先上传图片（如果有）
    let imageUrl = ''
    if (newRecipeImageFile.value) {
      const ext = newRecipeImageFile.value.name.split('.').pop()
      const fileName = `recipes/${Date.now()}_${Math.floor(Math.random() * 1000)}.${ext}`
      const { error: uploadError } = await supabase
        .storage
        .from('image')
        .upload(fileName, newRecipeImageFile.value)
      if (uploadError) throw new Error('图片上传失败，请稍后重试')
      const { data: publicUrlData } = supabase.storage.from('image').getPublicUrl(fileName)
      imageUrl = publicUrlData?.publicUrl || ''
    }

    // 2. 解析表单为结构化字段
    const efficacyArr = newRecipeEfficacy.value
      .split(/[,，\s]+/)
      .map(t => t.trim())
      .filter(Boolean)

    const ingredientsArr = newRecipeIngredients.value
      .map(i => ({
        name: (i.name || '').trim(),
        amount: (i.amount || '').trim(),
        isHerb: false
      }))
      .filter(i => i.name)

    const stepsArr = newRecipeSteps.value
      .map(s => (s || '').trim())
      .filter(Boolean)

    // 3. 当前阶段：不改 recipes 表结构（避免 author_id 不存在的报错）
    //    直接把“我发布的食谱”存到 profiles.my_recipes（JSON 数组）中，仅当前账号可见。
    const nowIso = new Date().toISOString()
    const newRecipe = {
      id: `my-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      name: newRecipeName.value.trim(),
      description: newRecipeDesc.value.trim() || null,
      image: imageUrl || null,
      body_type: newRecipeBodyType.value,
      solar_term: newRecipeSolarTerm.value || null,
      time: newRecipeTime.value.trim() || null,
      efficacy: efficacyArr,
      ingredients: ingredientsArr,
      steps: stepsArr,
      created_at: nowIso,
      // 个人上传暂不参与评分，先用 null 占位
      rating: null,
      cooked_count: 0
    }

    const nextMyRecipes = [newRecipe, ...myRecipes.value]
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ my_recipes: nextMyRecipes, updated_at: new Date() })
      .eq('id', user.value.id)
    if (updateError) throw updateError

    // 回读校验：确保确实写入账号数据（避免“看似成功但实际没存上”）
    const { data: verifyProfile, error: verifyError } = await supabase
      .from('profiles')
      .select('my_recipes')
      .eq('id', user.value.id)
      .single()
    if (verifyError) throw verifyError
    if (!verifyProfile?.my_recipes || !Array.isArray(verifyProfile.my_recipes)) {
      throw new Error('保存失败：账号未返回 my_recipes 字段，请检查 profiles 表结构/权限')
    }

    myRecipes.value = verifyProfile.my_recipes
    saveProfilePayload()

    alert('菜谱发布成功！目前仅在“我发布的食谱”中可见')
    closeNewRecipeModal()
  } catch (e) {
    console.error(e)
    alert(e.message || '发布失败，请稍后重试')
  } finally {
    isPublishingRecipe.value = false
  }
}

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
    ] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', uid).single(),
      supabase.from('favorite_herbs').select('*, herb:herbs(*)').eq('user_id', uid).order('created_at', { ascending: false }),
      supabase.from('favorite_recipes').select('*, recipe:recipes(*)').eq('user_id', uid).order('created_at', { ascending: false }),
      supabase.from('homeworks').select('*').eq('user_id', uid).order('created_at', { ascending: false }),
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
    // 我发布的食谱：从 profiles.my_recipes 读取（当前账号私有）
    myRecipes.value = (profileData?.my_recipes && Array.isArray(profileData.my_recipes)) ? profileData.my_recipes : []

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

// 删除跟做作业
async function deleteWork(workId) {
  if (!user.value) {
    alert('请先登录后再操作')
    return
  }
  if (!confirm('确定要删除这条作业吗？')) return

  try {
    const { error } = await supabase
      .from('homeworks')
      .delete()
      .eq('id', workId)
      .eq('user_id', user.value.id)

    if (error) throw error

    myWorks.value = myWorks.value.filter(w => w.id !== workId)
    saveProfilePayload()
  } catch (e) {
    console.error(e)
    alert('删除失败，请稍后重试')
  }
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

// 从「我的作品」跳转到独立的作业详情页
function goToHomeworkDetail(work) {
  if (!work) return
  router.push({
    name: 'WorkDetail',
    params: { id: work.id },
  })
}

async function doLogout() {
  await handleLogout()
  router.push('/')
}

async function doSwitchAccount() {
  await handleLogout()
  router.push({ path: '/', query: { login: '1' } })
}

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
          <div class="mt-4">
            <router-link to="/profile/edit" class="inline-flex items-center gap-1.5 text-white/90 hover:text-white text-sm font-medium">
              <Edit2 class="w-4 h-4" /> 编辑资料
            </router-link>
          </div>
        </div>
      </div>
    </div>

  <div class="-mt-8 px-2 relative z-20 w-full space-y-4 max-w-6xl mx-auto">
      
      <div class="bg-white rounded-xl shadow-card p-4 border border-sandalwood/5 overflow-hidden">
        <h3 class="font-bold text-gray-700 mb-3 flex items-center gap-2"><Settings class="w-4 h-4 text-sandalwood" /> 账号与设置</h3>
        <div class="space-y-1">
          <router-link to="/profile/edit" class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-700 hover:bg-stone-50 transition-colors">
            <Edit2 class="w-4 h-4 text-stone-400" />
            <span>编辑资料</span>
          </router-link>
          <button type="button" class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-700 hover:bg-stone-50 transition-colors text-left" @click="doLogout">
            <LogOut class="w-4 h-4 text-stone-400" />
            <span>退出登录</span>
          </button>
          <button type="button" class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-700 hover:bg-stone-50 transition-colors text-left" @click="doSwitchAccount">
            <UserPlus class="w-4 h-4 text-stone-400" />
            <span>切换账号</span>
          </button>
        </div>
      </div>

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
          <div v-else class="grid grid-cols-2 md:grid-cols-3 gap-3">
             <div
               v-for="work in myWorks"
               :key="work.id"
               class="aspect-square bg-gray-100 rounded-xl overflow-hidden relative group cursor-pointer shadow-sm border border-gray-200"
               @click="goToHomeworkDetail(work)"
             >
                <button
                  type="button"
                  class="absolute top-2 right-2 z-10 bg-black/40 text-white/80 rounded-full p-1.5 shadow-sm opacity-0 group-hover:opacity-100 transition"
                  @click.stop="deleteWork(work.id)"
                >
                  <Trash2 class="w-4 h-4" />
                </button>
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
             <button
               type="button"
               class="text-xs bg-sandalwood text-white px-3 py-1.5 rounded-full shadow-sm hover:bg-sandalwood/90 flex items-center gap-1"
               @click="openNewRecipeModal"
             >
               <Utensils class="w-3 h-3" /> 发布新菜谱
             </button>
          </div>

          <div v-if="!myRecipes.length" class="text-center py-20 text-gray-400 bg-white rounded-xl border border-dashed border-sandalwood/10">
            <p>您还没有发布过原创食谱</p>
          </div>
          <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div
              v-for="recipe in myRecipes"
              :key="recipe.id"
              class="group bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden border border-stone-100 flex flex-col cursor-pointer relative"
              @click="openMyRecipe(recipe)"
            >
              <button
                type="button"
                class="absolute top-2 right-2 z-10 bg-white/90 rounded-full p-1.5 shadow-sm text-stone-300 hover:text-red-500 hover:bg-red-50 transition"
                @click.stop="deleteMyRecipe(recipe.id)"
              >
                <Trash2 class="w-4 h-4" />
              </button>
              <div class="relative h-40 overflow-hidden bg-gray-100">
                <img v-if="recipe.image" :src="recipe.image" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                <div v-else class="w-full h-full flex items-center justify-center text-4xl">🥗</div>
                <div class="absolute bottom-2 left-2 flex gap-2" v-if="recipe.time">
                  <span class="bg-black/60 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-md">
                    {{ recipe.time }}
                  </span>
                </div>
              </div>
              <div class="p-4 flex-1 flex flex-col">
                <h4 class="text-base font-bold text-gray-800 mb-1 line-clamp-2">{{ recipe.name }}</h4>
                <p class="text-xs text-gray-500 mb-2 line-clamp-2">{{ recipe.description || '暂无描述' }}</p>
                <div class="flex flex-wrap gap-2 mt-auto">
                  <span class="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded">原创</span>
                  <span v-if="recipe.body_type" class="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded">
                    {{ recipe.body_type }}
                  </span>
                  <span v-if="recipe.created_at" class="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded">
                    {{ formatDate(recipe.created_at) }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  </div>

  <!-- 我发布的食谱：详情资料卡（样式对齐“食谱推荐”的详情卡） -->
  <Transition
    enter-active-class="transition duration-300 ease-out"
    enter-from-class="opacity-0 translate-y-4"
    enter-to-class="opacity-100 translate-y-0"
    leave-active-class="transition duration-200 ease-in"
    leave-from-class="opacity-100 translate-y-0"
    leave-to-class="opacity-0 translate-y-4"
  >
    <Teleport to="body">
      <div v-if="selectedMyRecipe" class="fixed inset-0 z-[1300] flex items-center justify-center p-4 sm:p-6 bg-black/40 backdrop-blur-[2px]">
        <div class="absolute inset-0" @click="closeMyRecipe"></div>
        <div class="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl h-[90vh] flex flex-col overflow-hidden z-10">
          <button @click="closeMyRecipe" class="absolute top-4 right-4 z-20 bg-black/20 backdrop-blur-md text-white p-2 rounded-full hover:bg-black/40 transition">
            <X :size="20" />
          </button>

          <div class="flex-1 overflow-y-auto custom-scrollbar bg-white pb-20">
            <div class="h-72 w-full shrink-0 relative">
              <img v-if="selectedMyRecipe.image" :src="selectedMyRecipe.image" class="w-full h-full object-cover">
              <div v-else class="w-full h-full flex items-center justify-center text-6xl text-gray-300">🥗</div>
              <div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-white to-transparent h-24"></div>
            </div>

            <div class="p-6 sm:p-8 -mt-6 relative z-10">
              <h2 class="text-3xl font-bold text-stone-900 mb-2">{{ selectedMyRecipe.name }}</h2>
              
              <div class="flex items-center gap-4 mb-8 bg-stone-50 p-4 rounded-xl border border-stone-100">
                <div class="text-center px-4 border-r border-stone-200">
                  <div class="text-3xl font-bold text-amber-500">{{ selectedMyRecipe.rating ?? '--' }}</div>
                  <div class="text-[10px] text-stone-400">综合评分</div>
                </div>
                <div class="flex-1 pl-2">
                  <div class="text-sm text-stone-600 mb-2">
                    <span class="font-bold text-emerald-600">{{ selectedMyRecipe.cooked_count || 0 }}</span> 人已做过
                  </div>
                  <div class="flex flex-wrap gap-2 text-[11px] text-stone-400">
                    <span v-if="selectedMyRecipe.time" class="inline-flex items-center gap-1 bg-white px-2 py-1 rounded-full border border-stone-100">
                      <Clock :size="12" /> {{ selectedMyRecipe.time }}
                    </span>
                    <span v-if="selectedMyRecipe.solar_term" class="inline-flex items-center gap-1 bg-amber-50 text-amber-700 px-2 py-1 rounded-full border border-amber-100">
                      {{ selectedMyRecipe.solar_term }}
                    </span>
                    <span v-if="selectedMyRecipe.created_at" class="inline-flex items-center gap-1 bg-stone-50 px-2 py-1 rounded-full border border-stone-100">
                      创建于 {{ formatDate(selectedMyRecipe.created_at) }}
                    </span>
                  </div>
                </div>
              </div>

              <div class="grid grid-cols-2 gap-4 mb-6">
                <div class="bg-stone-50 p-3 rounded-xl border border-stone-100">
                  <span class="text-xs text-stone-400 block mb-1">适宜体质</span>
                  <span class="font-medium text-emerald-700 flex items-center gap-1">
                    <UserCheck :size="14"/> {{ selectedMyRecipe.body_type || '—' }}
                  </span>
                </div>
                <div class="bg-stone-50 p-3 rounded-xl border border-stone-100">
                  <span class="text-xs text-stone-400 block mb-1">主要功效</span>
                  <span class="font-medium text-amber-700 flex items-center gap-1">
                    <Sparkles :size="14"/>
                    {{ (selectedMyRecipe.efficacy && selectedMyRecipe.efficacy.length) ? selectedMyRecipe.efficacy.join('/') : '—' }}
                  </span>
                </div>
              </div>

              <p v-if="selectedMyRecipe.description" class="text-stone-600 leading-relaxed mb-8 bg-stone-50 p-4 rounded-xl border border-stone-100">
                {{ selectedMyRecipe.description }}
              </p>

              <div class="mb-8">
                <h3 class="text-lg font-bold mb-4 flex items-center gap-2"><Soup :size="20" /> 所需食材</h3>
                <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div
                    v-for="(ing, idx) in (selectedMyRecipe.ingredients || [])"
                    :key="idx"
                    class="flex items-center justify-between p-2 rounded-lg border border-stone-100 bg-white"
                  >
                    <span class="text-stone-700">{{ ing.name }}</span>
                    <span class="text-xs text-stone-400">{{ ing.amount }}</span>
                  </div>
                  <div v-if="!(selectedMyRecipe.ingredients && selectedMyRecipe.ingredients.length)" class="text-sm text-stone-400">
                    暂无食材信息
                  </div>
                </div>
              </div>

              <div class="mb-10">
                <h3 class="text-lg font-bold mb-4 flex items-center gap-2"><ListOrdered :size="20" /> 烹饪步骤</h3>
                <div v-if="selectedMyRecipe.steps && selectedMyRecipe.steps.length" class="space-y-6">
                  <div v-for="(step, idx) in selectedMyRecipe.steps" :key="idx" class="flex gap-4">
                    <div class="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-sm font-bold mt-0.5">
                      {{ idx + 1 }}
                    </div>
                    <p class="text-stone-600 leading-relaxed">{{ step }}</p>
                  </div>
                </div>
                <div v-else class="text-sm text-stone-400 bg-stone-50 p-4 rounded-xl border border-stone-100">
                  暂无步骤信息
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </Teleport>
  </Transition>

  <!-- 发布新菜谱弹窗 -->
  <transition
    enter-active-class="transition duration-200 ease-out"
    enter-from-class="opacity-0 scale-95"
    enter-to-class="opacity-100 scale-100"
    leave-active-class="transition duration-150 ease-in"
    leave-from-class="opacity-100 scale-100"
    leave-to-class="opacity-0 scale-95"
  >
    <div
      v-if="showNewRecipeModal"
      class="fixed inset-0 z-[1200] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
    >
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
        <div class="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <h3 class="font-bold text-lg text-gray-800">发布新菜谱</h3>
          <button
            type="button"
            class="text-gray-400 hover:text-gray-600"
            @click="closeNewRecipeModal"
          >
            <X class="w-5 h-5" />
          </button>
        </div>

        <div class="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          <div>
            <label class="block text-xs font-medium text-gray-500 mb-1">菜谱名称</label>
            <input
              v-model="newRecipeName"
              type="text"
              class="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-sandalwood/20 focus:border-sandalwood/60"
              placeholder="例如：四神健脾养胃粥"
            />
          </div>

          <div>
            <label class="block text-xs font-medium text-gray-500 mb-1">一句简介（可选）</label>
            <textarea
              v-model="newRecipeDesc"
              rows="2"
              class="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-sandalwood/20 focus:border-sandalwood/60"
              placeholder="简单介绍这道菜适合什么人、有什么功效"
            ></textarea>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1">适宜体质</label>
              <select
                v-model="newRecipeBodyType"
                class="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sandalwood/20 focus:border-sandalwood/60"
              >
                <option
                  v-for="opt in BODY_TYPES"
                  :key="opt.value || 'all'"
                  :value="opt.value"
                  :disabled="!opt.value"
                >
                  {{ opt.label }}
                </option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1">对应节气（可选）</label>
              <select
                v-model="newRecipeSolarTerm"
                class="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sandalwood/20 focus:border-sandalwood/60"
              >
                <option v-for="opt in solarTermOptions" :key="opt.value" :value="opt.value">
                  {{ opt.label }}
                </option>
              </select>
            </div>
          </div>

          <div>
            <label class="block text-xs font-medium text-gray-500 mb-1">烹饪时间（可选）</label>
            <input
              v-model="newRecipeTime"
              type="text"
              class="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-sandalwood/20 focus:border-sandalwood/60"
              placeholder="例如：约30分钟"
            />
          </div>

          <div>
            <label class="block text-xs font-medium text-gray-500 mb-1">主要功效标签（可选）</label>
            <input
              v-model="newRecipeEfficacy"
              type="text"
              class="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-sandalwood/20 focus:border-sandalwood/60"
              placeholder="例如：健脾养胃 清热降火（用空格或逗号分隔）"
            />
          </div>

          <div>
            <label class="block text-xs font-medium text-gray-500 mb-1">食材清单</label>
            <div class="space-y-2">
              <div
                v-for="(ing, idx) in newRecipeIngredients"
                :key="idx"
                class="grid grid-cols-[1.2fr_1fr_auto] gap-2 items-center"
              >
                <input
                  v-model="ing.name"
                  type="text"
                  class="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-sandalwood/20 focus:border-sandalwood/60"
                  placeholder="食材名称，如：山药"
                />
                <input
                  v-model="ing.amount"
                  type="text"
                  class="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-sandalwood/20 focus:border-sandalwood/60"
                  placeholder="用量，如：20g"
                />
                <button
                  type="button"
                  class="text-xs text-gray-400 hover:text-red-500 px-2 py-1 flex items-center gap-1"
                  @click="newRecipeIngredients.splice(idx, 1)"
                  v-if="newRecipeIngredients.length > 1"
                >
                  <Trash2 class="w-3 h-3" /> 删除
                </button>
              </div>
              <button
                type="button"
                class="mt-1 inline-flex items-center px-3 py-1.5 rounded-full border border-gray-300 text-xs text-gray-600 hover:bg-gray-50"
                @click="newRecipeIngredients.push({ name: '', amount: '' })"
              >
                + 添加食材
              </button>
            </div>
          </div>

          <div>
            <label class="block text-xs font-medium text-gray-500 mb-1">详细步骤</label>
            <div class="space-y-2">
              <div
                v-for="(step, idx) in newRecipeSteps"
                :key="idx"
                class="flex items-start gap-2"
              >
                <span class="mt-2 text-xs text-gray-400 w-5 text-right">{{ idx + 1 }}.</span>
                <textarea
                  v-model="newRecipeSteps[idx]"
                  rows="2"
                  class="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-sandalwood/20 focus:border-sandalwood/60"
                  :placeholder="`填写第 ${idx + 1} 步的做法`"
                ></textarea>
                <button
                  type="button"
                  class="mt-2 text-xs text-gray-400 hover:text-red-500 px-2 py-1 flex items-center gap-1"
                  @click="newRecipeSteps.splice(idx, 1)"
                  v-if="newRecipeSteps.length > 1"
                >
                  <Trash2 class="w-3 h-3" /> 删除
                </button>
              </div>
              <button
                type="button"
                class="mt-1 inline-flex items-center px-3 py-1.5 rounded-full border border-gray-300 text-xs text-gray-600 hover:bg-gray-50"
                @click="newRecipeSteps.push('')"
              >
                + 添加步骤
              </button>
            </div>
          </div>

          <div>
            <label class="block text-xs font-medium text-gray-500 mb-1">菜谱配图（可选）</label>
            <div class="flex items-center gap-3">
              <div class="w-20 h-20 rounded-xl bg-gray-100 flex items-center justify-center overflow-hidden border border-gray-200 text-gray-400 text-xs">
                <img v-if="newRecipeImagePreview" :src="newRecipeImagePreview" class="w-full h-full object-cover" />
                <span v-else>暂无图片</span>
              </div>
              <label class="inline-flex items-center px-3 py-2 rounded-full border border-gray-300 text-xs font-medium text-gray-700 cursor-pointer bg-white hover:bg-gray-50">
                选择图片
                <input type="file" accept="image/*" class="hidden" @change="onNewRecipeImageSelected" />
              </label>
            </div>
          </div>
        </div>

        <div class="px-4 py-3 border-t border-gray-100 flex justify-end gap-3 bg-gray-50">
          <button
            type="button"
            class="px-4 py-2 rounded-full text-xs font-medium text-gray-500 hover:bg-gray-100"
            @click="closeNewRecipeModal"
            :disabled="isPublishingRecipe"
          >
            取消
          </button>
          <button
            type="button"
            class="px-5 py-2 rounded-full text-xs font-bold text-white bg-sandalwood hover:bg-sandalwood/90 disabled:opacity-60 disabled:cursor-not-allowed"
            @click="handlePublishRecipe"
            :disabled="isPublishingRecipe"
          >
            {{ isPublishingRecipe ? '发布中...' : '发布菜谱' }}
          </button>
        </div>
      </div>
    </div>
  </transition>
</template>

<style scoped>
.bg-sandalwood { background-color: #A9805B; }
.text-sandalwood { color: #A9805B; }
.border-sandalwood\/10 { border-color: rgba(169, 128, 91, 0.1); }
.border-sandalwood\/5 { border-color: rgba(169, 128, 91, 0.05); }
.shadow-card { box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.05); }
.scrollbar-hide::-webkit-scrollbar { display: none; }
.scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }

/* 复用食谱详情弹窗的滚动条样式 */
.custom-scrollbar::-webkit-scrollbar { width: 6px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background-color: #d6d3d1; border-radius: 20px; }
</style>
<script setup>
defineOptions({ name: 'RecipeMarket' })

import { ref, onMounted, onActivated } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { 
  Clock, UserCheck, Sparkles, AlertTriangle, Leaf, X, Soup, ListOrdered, 
  Star, Heart, Camera, MessageCircle, Send, Upload
} from 'lucide-vue-next'
import { supabase } from '@/supabaseClient' 

const router = useRouter()
const route = useRoute()

// 状态定义
const recipes = ref([])
const loading = ref(true)
const selectedRecipe = ref(null)

// 评论与作业数据
const comments = ref([])
const homeworks = ref([])
const newComment = ref('')
const isSubmitting = ref(false)

// --- 1. 获取基础食谱数据 ---
const fetchRecipes = async () => {
  if (recipes.value.length > 0) return 

  try {
    loading.value = true
    let { data, error } = await supabase.from('recipes').select('*').order('id')
    if (error) throw error

    if (data) {
      recipes.value = data.map(item => ({
        ...item,
        bodyType: item.body_type, 
        efficacy: item.efficacy || [],
        ingredients: item.ingredients || [],
        steps: item.steps || [],
        contraindications: item.contraindications || [],
        rating: item.rating || (8.5 + Math.random()).toFixed(1),
        cooked_count: item.cooked_count || 0,
        is_favorite: item.is_favorite || false
      }))
    }
  } catch (error) {
    console.error('获取食谱失败:', error)
  } finally {
    loading.value = false
  }
}

// --- 2. 获取评论和作业 (打开弹窗时调用) ---
const fetchInteractions = async (recipeId) => {
  // 查评论
  const { data: cData } = await supabase
    .from('comments')
    .select('*')
    .eq('recipe_id', recipeId)
    .order('created_at', { ascending: false })
  comments.value = cData || []

  // 查作业
  const { data: hData } = await supabase
    .from('homeworks')
    .select('*')
    .eq('recipe_id', recipeId)
    .order('created_at', { ascending: false })
  homeworks.value = hData || []
}

// --- 3. 提交评论功能 ---
const submitComment = async () => {
  if (!newComment.value.trim()) return
  
  isSubmitting.value = true
  const { error } = await supabase.from('comments').insert({
    recipe_id: selectedRecipe.value.id,
    content: newComment.value,
    user_name: '养生萌新' // 暂时写死，以后接了登录可以换成 user.name
  })

  if (!error) {
    newComment.value = ''
    fetchInteractions(selectedRecipe.value.id) // 刷新列表
  }
  isSubmitting.value = false
}

// --- 4. 上传作业功能 (修复版) ---
const handleFileUpload = async (event) => {
  const file = event.target.files[0]
  if (!file) return

  // 1. 简单的文件校验 (可选：限制大小为 5MB)
  if (file.size > 5 * 1024 * 1024) {
    alert('图片太大了，请上传 5MB 以内的图片')
    return
  }

  isSubmitting.value = true
  try {
    // 2. 生成安全的文件名
    // 某些情况下中文文件名会导致上传失败，建议只保留扩展名，前面用时间戳+随机数
    const fileExt = file.name.split('.').pop()
    const fileName = `homework/${Date.now()}_${Math.floor(Math.random() * 1000)}.${fileExt}`

    // 3. 上传到 'image' 桶 (务必确认后台桶名字叫 image 且是 Public 的)
    const { data, error: uploadError } = await supabase.storage
      .from('image') 
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (uploadError) {
      console.error('Supabase 上传详细错误:', uploadError)
      throw new Error('上传被拒绝，请检查 Storage Policies 权限')
    }

    // 4. 获取公开链接
    const { data: publicUrlData } = supabase.storage
      .from('image')
      .getPublicUrl(fileName)
      
    const publicUrl = publicUrlData.publicUrl

    // 5. 写入数据库
    const { error: dbError } = await supabase.from('homeworks').insert({
      recipe_id: selectedRecipe.value.id,
      image_url: publicUrl,
      content: '打卡成功！味道真不错～', // 这里后续可以改成让用户输入
      user_name: '交作业小能手'
    })

    if (dbError) throw dbError

    alert('作业提交成功！')
    fetchInteractions(selectedRecipe.value.id) // 刷新列表
    
  } catch (e) {
    console.error(e)
    // 给用户更明确的提示
    alert(`上传失败: ${e.message || '请检查网络或后台权限'}`)
  } finally {
    isSubmitting.value = false
    // 清空 input，防止无法连续上传同一张图
    event.target.value = '' 
  }
}

// --- 交互逻辑 ---
const openRecipe = (recipe) => {
  selectedRecipe.value = recipe;
  router.replace({ query: { ...route.query, open_id: recipe.id } })
  fetchInteractions(recipe.id) // 打开时加载评论
};

const closeRecipe = () => {
  selectedRecipe.value = null;
  router.replace({ query: { ...route.query, open_id: undefined } })
};

const toggleFavorite = (e) => {
  e?.stopPropagation()
  if (selectedRecipe.value) selectedRecipe.value.is_favorite = !selectedRecipe.value.is_favorite
}

const handleHerbClick = (item) => {
  if (item.isHerb) router.push({ name: 'HerbDetail', params: { name: item.name } })
};

onMounted(() => fetchRecipes())

onActivated(() => {
  const pendingId = route.query.open_id
  if (pendingId && !selectedRecipe.value) {
    const target = recipes.value.find(r => r.id == pendingId)
    if (target) {
      selectedRecipe.value = target
      fetchInteractions(target.id)
    }
  }
})
</script>

<template>
  <div class="min-h-screen bg-stone-50 text-stone-800 p-6 pt-15 pb-24">
    <header class="mb-8">
      <h1 class="text-3xl font-bold text-stone-900 mb-2">🌿 养生膳食广场</h1>
      <p class="text-stone-500">根据您的体质推荐的精准食疗方案</p>
    </header>

    <div v-if="loading" class="text-center py-20 text-stone-500">⏳ 正在获取食谱...</div>
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div v-for="recipe in recipes" :key="recipe.id" @click="openRecipe(recipe)"
        class="group bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer overflow-hidden border border-stone-100 flex flex-col relative">
        <div class="relative h-48 overflow-hidden">
          <img :src="recipe.image" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500">
          <div class="absolute bottom-2 left-2 flex gap-2">
            <span class="bg-black/60 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-md flex items-center gap-1">
              <Clock :size="12" /> {{ recipe.time }}
            </span>
          </div>
          <div class="absolute top-2 right-2 bg-amber-400 text-white text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1 shadow-sm">
            <Star :size="10" fill="currentColor" /> {{ recipe.rating }}
          </div>
        </div>
        <div class="p-4 flex-1 flex flex-col">
          <h3 class="text-lg font-bold text-stone-800 mb-1">{{ recipe.name }}</h3>
          <p class="text-xs text-stone-400 mb-3">{{ recipe.cooked_count }} 人做过</p>
          <div class="flex flex-wrap gap-2 mt-auto">
            <span class="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-100">{{ recipe.bodyType }}</span>
          </div>
        </div>
      </div>
    </div>

<Transition
      enter-active-class="transition duration-300 ease-out"
      enter-from-class="opacity-0 translate-y-4"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition duration-200 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 translate-y-4"
    >
      <Teleport to="body">
        <div v-if="selectedRecipe" class="fixed inset-0 z-[999] flex items-center justify-center p-4 sm:p-6 bg-black/40 backdrop-blur-[2px]">
          
          <div class="absolute inset-0" @click="closeRecipe"></div>

          <div class="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl h-[85vh] flex flex-col overflow-hidden z-10">
            
            <button @click="closeRecipe" class="absolute top-4 right-4 z-20 bg-black/20 backdrop-blur-md text-white p-2 rounded-full hover:bg-black/40 transition">
              <X :size="20" />
            </button>

            <div class="flex-1 overflow-y-auto custom-scrollbar bg-white">
              <div class="h-80 w-full shrink-0 relative">
                 <img :src="selectedRecipe.image" class="w-full h-full object-cover">
                 <div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-white to-transparent h-24"></div>
              </div>

              <div class="p-6 sm:p-8 -mt-6 relative z-10">
                <h2 class="text-3xl font-bold text-stone-900 mb-2">{{ selectedRecipe.name }}</h2>
                
                <div class="flex items-center gap-4 mb-8 bg-stone-50 p-4 rounded-xl border border-stone-100">
                   <div class="text-center px-4 border-r border-stone-200">
                      <div class="text-3xl font-bold text-amber-500">{{ selectedRecipe.rating }}</div>
                      <div class="text-[10px] text-stone-400">综合评分</div>
                   </div>
                   <div class="flex-1 pl-2">
                      <div class="text-sm text-stone-600 mb-2">
                        <span class="font-bold">{{ recipe?.cooked_count || homeworks.length }}</span> 人已交作业
                      </div>
                      <div class="flex -space-x-2 overflow-hidden py-1">
                        <div v-for="(hw, i) in homeworks.slice(0, 5)" :key="i" class="w-8 h-8 rounded-full border-2 border-white bg-stone-200 overflow-hidden">
                          <img :src="hw.image_url" class="w-full h-full object-cover">
                        </div>
                        <div v-if="homeworks.length === 0" class="text-xs text-stone-400 pt-1">快来抢沙发！</div>
                      </div>
                   </div>
                </div>

                <div class="grid grid-cols-2 gap-4 mb-6">
                   <div class="bg-stone-50 p-3 rounded-xl border border-stone-100">
                      <span class="text-xs text-stone-400 block mb-1">适宜体质</span>
                      <span class="font-medium text-emerald-700 flex items-center gap-1"><UserCheck :size="14"/> {{ selectedRecipe.bodyType }}</span>
                   </div>
                   <div class="bg-stone-50 p-3 rounded-xl border border-stone-100">
                      <span class="text-xs text-stone-400 block mb-1">主要功效</span>
                      <span class="font-medium text-amber-700 flex items-center gap-1"><Sparkles :size="14"/> {{ selectedRecipe.efficacy.join('/') }}</span>
                   </div>
                </div>

                <div class="mb-8">
                  <h3 class="text-lg font-bold mb-4 flex items-center gap-2"><Soup :size="20" /> 所需食材</h3>
                  <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div v-for="(ing, idx) in selectedRecipe.ingredients" :key="idx"
                      class="flex items-center justify-between p-2 rounded-lg border transition-colors relative overflow-hidden"
                      :class="ing.isHerb ? 'bg-amber-50 border-amber-200 cursor-pointer hover:bg-amber-100 group' : 'bg-white border-stone-100'"
                      @click="ing.isHerb ? handleHerbClick(ing) : null"
                    >
                      <span :class="ing.isHerb ? 'text-amber-900 font-medium' : 'text-stone-600'">
                        {{ ing.name }} <Leaf v-if="ing.isHerb" :size="12" class="inline ml-1 text-amber-500"/>
                      </span>
                      <span class="text-xs text-stone-400">{{ ing.amount }}</span>
                    </div>
                  </div>
                </div>

                <div class="mb-10">
                  <h3 class="text-lg font-bold mb-4 flex items-center gap-2"><ListOrdered :size="20" /> 烹饪步骤</h3>
                  <div class="space-y-6">
                    <div v-for="(step, idx) in selectedRecipe.steps" :key="idx" class="flex gap-4">
                      <div class="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-sm font-bold mt-0.5">{{ idx + 1 }}</div>
                      <p class="text-stone-600 leading-relaxed">{{ step }}</p>
                    </div>
                  </div>
                </div>

                <div class="mb-8">
                  <h3 class="text-lg font-bold mb-4">大家的作品 ({{ homeworks.length }})</h3>
                  <div class="grid grid-cols-3 gap-2">
                    <div v-for="hw in homeworks" :key="hw.id" class="aspect-square rounded-lg overflow-hidden bg-stone-100">
                      <img :src="hw.image_url" class="w-full h-full object-cover">
                    </div>
                    <label class="aspect-square rounded-lg border-2 border-dashed border-stone-300 flex flex-col items-center justify-center text-stone-400 cursor-pointer hover:bg-stone-50 hover:border-emerald-400 hover:text-emerald-600 transition">
                      <input type="file" accept="image/*" class="hidden" @change="handleFileUpload" :disabled="isSubmitting">
                      <Camera :size="24" class="mb-1" />
                      <span class="text-xs">{{ isSubmitting ? '上传中...' : '晒作业' }}</span>
                    </label>
                  </div>
                </div>

                <div class="mb-4">
                  <h3 class="text-lg font-bold mb-4">评论 ({{ comments.length }})</h3>
                  <div class="flex gap-2 mb-6">
                    <input v-model="newComment" type="text" placeholder="说点什么..." class="flex-1 bg-stone-50 border border-stone-200 rounded-full px-4 text-sm focus:outline-none focus:border-emerald-500">
                    <button @click="submitComment" :disabled="isSubmitting" class="bg-emerald-600 text-white p-2 rounded-full hover:bg-emerald-700 disabled:opacity-50">
                      <Send :size="18" />
                    </button>
                  </div>
                  <div class="space-y-4">
                    <div v-for="c in comments" :key="c.id" class="flex gap-3">
                      <div class="w-8 h-8 rounded-full bg-stone-200 flex items-center justify-center text-xs font-bold text-stone-500">{{ c.user_name?.[0] || '友' }}</div>
                      <div>
                        <div class="text-xs text-stone-400 mb-1">{{ c.user_name }}</div>
                        <p class="text-sm text-stone-700 bg-stone-50 p-2 rounded-r-lg rounded-bl-lg">{{ c.content }}</p>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </div>
            
            <div class="bg-white border-t border-stone-100 p-3 px-6 flex items-center justify-between shrink-0 z-30 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
               <div class="flex flex-col items-center gap-1 cursor-pointer hover:scale-105 transition" @click="toggleFavorite">
                  <Heart :size="24" :class="selectedRecipe.is_favorite ? 'fill-red-500 text-red-500' : 'text-stone-400'" />
                  <span class="text-[10px]" :class="selectedRecipe.is_favorite ? 'text-red-500' : 'text-stone-400'">{{ selectedRecipe.is_favorite ? '已收藏' : '收藏' }}</span>
               </div>
               <label class="bg-emerald-600 text-white px-8 py-2.5 rounded-full font-bold flex items-center gap-2 shadow-lg shadow-emerald-200 hover:bg-emerald-700 active:scale-95 transition cursor-pointer">
                  <input type="file" accept="image/*" class="hidden" @change="handleFileUpload">
                  <Camera :size="18" /> 
                  <span>交作业</span>
               </label>
            </div>

          </div>
        </div>
      </Teleport>
    </Transition>
   
  </div>
</template>

<style scoped>
::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background-color: #d6d3d1; border-radius: 20px; }
</style>
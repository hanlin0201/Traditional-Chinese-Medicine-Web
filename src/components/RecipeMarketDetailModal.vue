<script setup>
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { X, UserCheck, Sparkles, Soup, ListOrdered, Leaf, Star, Camera, Send, Loader2 } from 'lucide-vue-next'
import { supabase } from '@/supabaseClient'
import { useAuth } from '@/composables/useAuth'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  recipeId: { type: [Number, String], default: null },
})
const emit = defineEmits(['update:modelValue'])

const router = useRouter()
const { user: currentUser } = useAuth()

const selectedRecipe = ref(null)
const comments = ref([])
const homeworks = ref([])
const newComment = ref('')
const isSubmitting = ref(false)

const showUploadModal = ref(false)
const uploadFile = ref(null)
const uploadPreview = ref('')
const uploadContent = ref('')
const uploadTags = ref('')

function close() {
  emit('update:modelValue', false)
}

function formatDate(isoStr) {
  if (!isoStr) return ''
  const date = new Date(isoStr)
  return `${date.getMonth() + 1}月${date.getDate()}日`
}

function normalizeRecipe(item, isFavorite = false) {
  return {
    ...item,
    bodyType: item.body_type,
    efficacy: item.efficacy || [],
    ingredients: item.ingredients || [],
    steps: item.steps || [],
    rating: item.rating || (8.5 + Math.random()).toFixed(1),
    cooked_count: item.cooked_count || 0,
    is_favorite: isFavorite,
    is_user_submission: !!(item.author_user_id != null && String(item.author_user_id).length > 0),
    author_display_name: item.author_name || '养生达人',
    author_display_avatar: item.author_avatar_url || '',
  }
}

async function fetchInteractions(recipeId) {
  const { data: cData } = await supabase.from('comments').select('*').eq('recipe_id', recipeId).order('created_at', { ascending: false })
  comments.value = cData || []
  const { data: hData } = await supabase.from('homeworks').select('*').eq('recipe_id', recipeId).order('created_at', { ascending: false })
  homeworks.value = hData || []
  if (selectedRecipe.value) selectedRecipe.value.cooked_count = homeworks.value.length
}

async function loadRecipeDetail(recipeId) {
  if (!recipeId) return
  const { data } = await supabase.from('recipes').select('*').eq('id', recipeId).single()
  if (!data) return
  let isFavorite = false
  if (currentUser.value?.id) {
    const { data: fav } = await supabase
      .from('favorite_recipes')
      .select('id')
      .eq('user_id', currentUser.value.id)
      .eq('recipe_id', recipeId)
      .maybeSingle()
    isFavorite = !!fav
  }
  const { count: favCount } = await supabase.from('favorite_recipes').select('*', { count: 'exact', head: true }).eq('recipe_id', recipeId)
  selectedRecipe.value = { ...normalizeRecipe(data, isFavorite), favorites_count: favCount || 0 }
  await fetchInteractions(recipeId)
}

const submitComment = async () => {
  if (!newComment.value.trim()) return
  if (!currentUser.value || !selectedRecipe.value) return alert('请先登录')
  isSubmitting.value = true
  const { error } = await supabase.from('comments').insert({
    recipe_id: selectedRecipe.value.id,
    content: newComment.value,
    user_name: currentUser.value.user_metadata?.full_name || '养生达人',
    user_id: currentUser.value.id,
  })
  if (!error) {
    newComment.value = ''
    fetchInteractions(selectedRecipe.value.id)
  }
  isSubmitting.value = false
}

const toggleFavorite = async (e) => {
  e?.stopPropagation()
  if (!currentUser.value || !selectedRecipe.value) return alert('请先登录')
  const recipe = selectedRecipe.value
  const originalState = recipe.is_favorite
  recipe.is_favorite = !originalState
  recipe.favorites_count = Math.max(0, (recipe.favorites_count || 0) + (originalState ? -1 : 1))
  try {
    if (!originalState) {
      await supabase.from('favorite_recipes').insert({ user_id: currentUser.value.id, recipe_id: recipe.id })
    } else {
      await supabase.from('favorite_recipes').delete().eq('user_id', currentUser.value.id).eq('recipe_id', recipe.id)
    }
  } catch {
    recipe.is_favorite = originalState
    recipe.favorites_count = Math.max(0, (recipe.favorites_count || 0) + (originalState ? 1 : -1))
  }
}

function triggerSelectImage() {
  document.getElementById('workdetail-recipe-file-input')?.click()
}

function onFileSelected(event) {
  const file = event.target.files?.[0]
  if (!file) return
  uploadFile.value = file
  uploadPreview.value = URL.createObjectURL(file)
  showUploadModal.value = true
  event.target.value = ''
}

function closeUploadModal() {
  showUploadModal.value = false
  uploadFile.value = null
  uploadPreview.value = ''
  uploadContent.value = ''
  uploadTags.value = ''
}

const submitHomework = async () => {
  if (!uploadFile.value || !selectedRecipe.value) return
  if (!currentUser.value) return alert('请先登录')
  isSubmitting.value = true
  try {
    const fileExt = uploadFile.value.name.split('.').pop()
    const fileName = `homework/${Date.now()}_${Math.floor(Math.random() * 1000)}.${fileExt}`
    const { error: uploadError } = await supabase.storage.from('image').upload(fileName, uploadFile.value)
    if (uploadError) throw uploadError
    const { data: publicUrlData } = supabase.storage.from('image').getPublicUrl(fileName)
    const tagsArray = uploadTags.value.split(/[,，\s]+/).filter((t) => t.trim())
    const { data: inserted, error: dbError } = await supabase
      .from('homeworks')
      .insert({
        recipe_id: selectedRecipe.value.id,
        user_id: currentUser.value.id,
        image_url: publicUrlData.publicUrl,
        content: uploadContent.value || '打卡成功！',
        tags: tagsArray,
        user_name: currentUser.value.user_metadata?.full_name || '养生达人',
      })
      .select()
      .single()
    if (dbError) throw dbError
    if (inserted) homeworks.value = [inserted, ...homeworks.value]
    selectedRecipe.value.cooked_count = homeworks.value.length
    closeUploadModal()
    fetchInteractions(selectedRecipe.value.id)
  } catch (e) {
    alert(`发布失败: ${e.message}`)
  } finally {
    isSubmitting.value = false
  }
}

function handleHerbClick(item) {
  if (item?.isHerb) router.push({ name: 'HerbDetail', params: { name: item.name } })
}

watch(
  () => [props.modelValue, props.recipeId],
  async ([open, rid]) => {
    if (open && rid) await loadRecipeDetail(rid)
  },
  { immediate: true },
)
</script>

<template>
  <Transition
    enter-active-class="transition duration-300 ease-out"
    enter-from-class="opacity-0 translate-y-4"
    enter-to-class="opacity-100 translate-y-0"
    leave-active-class="transition duration-200 ease-in"
    leave-from-class="opacity-100 translate-y-0"
    leave-to-class="opacity-0 translate-y-4"
  >
    <Teleport to="body">
      <div v-if="modelValue && selectedRecipe" class="fixed inset-0 z-[1300] flex items-center justify-center p-4 sm:p-6 bg-black/40 backdrop-blur-[2px]">
        <div class="absolute inset-0" @click="close"></div>
        <div class="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl h-[90vh] flex flex-col overflow-hidden z-10">
          <button @click="close" class="absolute top-4 right-4 z-20 bg-black/20 backdrop-blur-md text-white p-2 rounded-full hover:bg-black/40 transition">
            <X :size="20" />
          </button>

          <div class="flex-1 overflow-y-auto custom-scrollbar bg-white pb-20">
            <div class="h-72 w-full shrink-0 relative">
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
                    <span class="font-bold text-emerald-600">{{ selectedRecipe.cooked_count }}</span> 人已交作业
                  </div>
                  <div class="flex -space-x-2 overflow-hidden py-1">
                    <div v-for="(hw, i) in homeworks.slice(0, 5)" :key="i" class="w-8 h-8 rounded-full border-2 border-white bg-stone-200 overflow-hidden">
                      <img :src="hw.image_url" class="w-full h-full object-cover">
                    </div>
                  </div>
                </div>
              </div>

              <div class="grid grid-cols-2 gap-4 mb-6">
                <div class="bg-stone-50 p-3 rounded-xl border border-stone-100">
                  <span class="text-xs text-stone-400 block mb-1">适宜体质</span>
                  <span class="font-medium text-emerald-700 flex items-center gap-1"><UserCheck :size="14" /> {{ selectedRecipe.bodyType }}</span>
                </div>
                <div class="bg-stone-50 p-3 rounded-xl border border-stone-100">
                  <span class="text-xs text-stone-400 block mb-1">主要功效</span>
                  <span class="font-medium text-amber-700 flex items-center gap-1"><Sparkles :size="14" /> {{ selectedRecipe.efficacy.join('/') }}</span>
                </div>
              </div>

              <div class="mb-8">
                <h3 class="text-lg font-bold mb-4 flex items-center gap-2"><Soup :size="20" /> 所需食材</h3>
                <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div
                    v-for="(ing, idx) in selectedRecipe.ingredients"
                    :key="idx"
                    class="flex items-center justify-between p-2 rounded-lg border transition-colors relative overflow-hidden"
                    :class="ing.isHerb ? 'bg-amber-50 border-amber-200 cursor-pointer hover:bg-amber-100 group' : 'bg-white border-stone-100'"
                    @click="ing.isHerb ? handleHerbClick(ing) : null"
                  >
                    <span :class="ing.isHerb ? 'text-amber-900 font-medium' : 'text-stone-600'">{{ ing.name }} <Leaf v-if="ing.isHerb" :size="12" class="inline ml-1 text-amber-500" /></span>
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
                <div class="flex items-center justify-between mb-4">
                  <h3 class="text-lg font-bold">大家的作品 ({{ homeworks.length }})</h3>
                  <button @click="triggerSelectImage" class="text-sm text-emerald-600 font-bold flex items-center gap-1">
                    <Camera :size="16" /> 我交作业
                  </button>
                </div>
                <div class="space-y-4">
                  <div v-if="!homeworks.length" class="text-center py-6 bg-stone-50 rounded-xl text-stone-400 text-sm">暂无作业，快来抢沙发</div>
                  <div v-for="hw in homeworks" :key="hw.id" class="bg-white p-3 rounded-xl border border-stone-100 shadow-sm flex gap-4">
                    <div class="flex-1 min-w-0 flex flex-col">
                      <div class="flex items-center gap-2 mb-2">
                        <div class="w-6 h-6 rounded-full bg-stone-200 flex items-center justify-center text-[10px] text-stone-500 font-bold">{{ hw.user_name?.[0] }}</div>
                        <span class="text-xs text-stone-500 font-medium truncate">{{ hw.user_name }}</span>
                        <span class="text-[10px] text-stone-300 ml-auto">{{ formatDate(hw.created_at) }}</span>
                      </div>
                      <p class="text-sm text-stone-800 line-clamp-2 mb-2">{{ hw.content }}</p>
                      <div class="flex flex-wrap gap-1 mt-auto">
                        <span v-for="tag in (hw.tags || [])" :key="tag" class="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">#{{ tag }}</span>
                      </div>
                    </div>
                    <div class="w-24 h-24 rounded-lg bg-stone-100 overflow-hidden flex-shrink-0 relative">
                      <img :src="hw.image_url" class="w-full h-full object-cover">
                    </div>
                  </div>
                </div>
              </div>

              <div class="mb-4">
                <h3 class="text-lg font-bold mb-4">评论 ({{ comments.length }})</h3>
                <div class="space-y-4">
                  <div v-for="c in comments" :key="c.id" class="flex gap-3">
                    <div class="w-8 h-8 rounded-full bg-stone-200 flex items-center justify-center text-xs font-bold text-stone-500">{{ c.user_name?.[0] || '匿' }}</div>
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
            <div class="flex items-center gap-2 bg-stone-100 rounded-full px-4 py-2 flex-1 mr-4">
              <input v-model="newComment" @keyup.enter="submitComment" type="text" placeholder="说点什么..." class="bg-transparent text-sm w-full outline-none">
              <button @click="submitComment" :disabled="isSubmitting" class="text-emerald-600"><Send :size="16" /></button>
            </div>
            <div class="flex items-center gap-4">
              <div class="flex items-center gap-1.5 cursor-pointer hover:scale-105 transition" @click="(e) => toggleFavorite(e)">
                <Star :size="24" :class="selectedRecipe.is_favorite ? 'fill-yellow-400 text-yellow-400' : 'text-stone-400'" />
                <span class="text-sm text-stone-500">{{ selectedRecipe.favorites_count || 0 }}</span>
              </div>
              <button @click="triggerSelectImage" class="bg-emerald-600 text-white px-5 py-2 rounded-full font-bold flex items-center gap-1 shadow-lg shadow-emerald-200 hover:bg-emerald-700 active:scale-95 transition cursor-pointer text-sm">
                <Camera :size="16" /> 交作业
              </button>
            </div>
            <input id="workdetail-recipe-file-input" type="file" accept="image/*" class="hidden" @change="onFileSelected">
          </div>
        </div>
      </div>
    </Teleport>
  </Transition>

  <Transition
    enter-active-class="transition duration-300 ease-out"
    enter-from-class="opacity-0 scale-95"
    enter-to-class="opacity-100 scale-100"
    leave-active-class="transition duration-200 ease-in"
    leave-from-class="opacity-100 scale-100"
    leave-to-class="opacity-0 scale-95"
  >
    <Teleport to="body">
      <div v-if="showUploadModal" class="fixed inset-0 z-[1400] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <div class="bg-white w-full max-w-md rounded-2xl overflow-hidden flex flex-col max-h-[90vh]">
          <div class="flex items-center justify-between px-4 py-3 border-b border-stone-100">
            <button @click="closeUploadModal" class="p-2 -ml-2 text-stone-400 hover:text-stone-600"><X :size="24" /></button>
            <h3 class="font-bold text-lg">发布作业</h3>
            <button @click="submitHomework" :disabled="isSubmitting" class="bg-emerald-600 text-white px-4 py-1.5 rounded-full text-sm font-bold disabled:opacity-50 flex items-center gap-1">
              <Loader2 v-if="isSubmitting" :size="14" class="animate-spin" /> {{ isSubmitting ? '发布中' : '发布' }}
            </button>
          </div>
          <div class="flex-1 overflow-y-auto p-4">
            <div class="aspect-square bg-stone-100 rounded-xl overflow-hidden mb-4 relative shadow-inner border border-stone-200">
              <img v-if="uploadPreview" :src="uploadPreview" class="w-full h-full object-cover" />
              <button @click="triggerSelectImage" class="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-3 py-1.5 rounded-full backdrop-blur hover:bg-black/70 transition">更换图片</button>
            </div>
            <div class="space-y-4">
              <textarea v-model="uploadContent" placeholder="填写你的制作心得，分享给更多人吧..." rows="4" class="w-full p-3 bg-stone-50 rounded-xl border-none resize-none focus:ring-2 focus:ring-emerald-100 placeholder:text-stone-400 text-sm"></textarea>
              <input v-model="uploadTags" placeholder="添加标签，用逗号分隔（例如：低脂,快手）" class="w-full p-3 bg-stone-50 rounded-xl border-none focus:ring-2 focus:ring-emerald-100 placeholder:text-stone-400 text-sm" />
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </Transition>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar { width: 6px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background-color: #d6d3d1; border-radius: 20px; }
</style>

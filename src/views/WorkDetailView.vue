<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { supabase } from '@/supabaseClient'
import { useAuth } from '@/composables/useAuth'
import { ChevronLeft, Heart, MoreHorizontal, Trash2 } from 'lucide-vue-next'
import RecipeMarketDetailModal from '@/components/RecipeMarketDetailModal.vue'

const route = useRoute()
const router = useRouter()
const { user: currentUser } = useAuth()

const loading = ref(true)
const homework = ref(null)
const recipe = ref(null)
const comments = ref([])
const newComment = ref('')
const isLiked = ref(false)

const showRelatedRecipeModal = ref(false)
const relatedRecipeId = ref(null)

const formatDate = (isoStr) => {
  if (!isoStr) return ''
  const date = new Date(isoStr)
  return `${date.getMonth() + 1}月${date.getDate()}日`
}

async function fetchData() {
  const id = route.params.id
  if (!id) return
  loading.value = true
  try {
    const [{ data: hw }, { data: cs }] = await Promise.all([
      supabase.from('homeworks').select('*').eq('id', id).single(),
      supabase.from('homework_comments').select('*').eq('homework_id', id).order('created_at', { ascending: true }),
    ])
    homework.value = hw
    comments.value = cs || []

    if (hw?.recipe_id) {
      const { data: recipeData } = await supabase
        .from('recipes')
        .select('id, name, image, time, body_type, efficacy')
        .eq('id', hw.recipe_id)
        .single()
      recipe.value = recipeData
    }

    if (currentUser.value && hw) {
      const { data } = await supabase
        .from('homework_likes')
        .select('id')
        .eq('user_id', currentUser.value.id)
        .eq('homework_id', hw.id)
        .single()
      isLiked.value = !!data
    }
  } finally {
    loading.value = false
  }
}

async function submitComment() {
  if (!newComment.value.trim()) return
  if (!currentUser.value || !homework.value) return alert('请先登录')

  const { data, error } = await supabase
    .from('homework_comments')
    .insert({
      homework_id: homework.value.id,
      user_id: currentUser.value.id,
      content: newComment.value,
      user_name: currentUser.value.user_metadata?.full_name || '养生达人',
    })
    .select()
    .single()

  if (!error && data) {
    comments.value.push(data)
    newComment.value = ''
  }
}

async function toggleLike() {
  if (!currentUser.value || !homework.value) return alert('请先登录')

  const original = isLiked.value
  isLiked.value = !original
  homework.value.likes_count = (homework.value.likes_count || 0) + (original ? -1 : 1)

  try {
    if (original) {
      await supabase
        .from('homework_likes')
        .delete()
        .eq('user_id', currentUser.value.id)
        .eq('homework_id', homework.value.id)
    } else {
      await supabase.from('homework_likes').insert({
        user_id: currentUser.value.id,
        homework_id: homework.value.id,
      })
    }
  } catch {
    isLiked.value = original
    homework.value.likes_count = (homework.value.likes_count || 0) + (original ? 1 : -1)
  }
}

async function deleteHomework() {
  if (!currentUser.value || !homework.value) return
  if (currentUser.value.id !== homework.value.user_id) return
  if (!confirm('确定要删除这条作业吗？')) return

  try {
    const { error } = await supabase
      .from('homeworks')
      .delete()
      .eq('id', homework.value.id)
      .eq('user_id', currentUser.value.id)

    if (error) throw error
    router.back()
  } catch (e) {
    console.error(e)
    alert('删除失败，请稍后重试')
  }
}

function openRelatedRecipe() {
  if (!recipe.value?.id) return
  relatedRecipeId.value = recipe.value.id
  showRelatedRecipeModal.value = true
}

onMounted(fetchData)
</script>

<template>
  <div class="min-h-screen bg-white flex flex-col">
    <div class="h-14 border-b border-stone-100 flex items-center justify-between px-4 bg-white shrink-0 z-10">
      <button @click="router.back()" class="p-2 -ml-2 text-stone-800 hover:bg-stone-50 rounded-full">
        <ChevronLeft :size="24" />
      </button>
      <div class="font-bold text-base flex items-center gap-2">
        <div
          v-if="homework"
          class="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center text-[10px] font-bold text-emerald-700"
        >
          {{ homework.user_name?.[0] }}
        </div>
        <span v-if="homework">{{ homework.user_name }}</span>
        <span v-else>作业详情</span>
      </div>
      <button class="p-2 -mr-2 text-stone-800">
        <MoreHorizontal :size="24" />
      </button>
    </div>

    <div v-if="loading" class="flex-1 flex items-center justify-center text-stone-400 text-sm">
      加载中...
    </div>

    <template v-else-if="homework">
      <div class="flex-1 overflow-y-auto custom-scrollbar">
        <div class="w-full bg-stone-50">
          <img :src="homework.image_url" class="w-full h-auto max-h-[70vh] object-contain mx-auto" />
        </div>

        <div class="p-5 pb-20 max-w-2xl mx-auto">
          <div
            v-if="recipe"
            class="mb-4 p-3 rounded-xl bg-emerald-50/40 border border-emerald-100 flex items-center gap-3 cursor-pointer hover:bg-emerald-50/70 transition-colors"
            @click="openRelatedRecipe"
          >
            <div class="w-12 h-12 rounded-lg overflow-hidden bg-white flex-shrink-0">
              <img
                v-if="recipe.image"
                :src="recipe.image"
                class="w-full h-full object-cover"
              />
              <div v-else class="w-full h-full flex items-center justify-center text-xl">🥣</div>
            </div>
            <div class="flex-1 min-w-0">
              <div class="text-xs text-emerald-700/80 mb-0.5">跟做自 · 推荐食谱</div>
              <div class="text-sm font-semibold text-emerald-900 truncate">
                {{ recipe.name }}
              </div>
              <div class="mt-1 flex flex-wrap gap-1 text-[10px] text-emerald-600/80">
                <span v-if="recipe.body_type" class="px-2 py-0.5 rounded-full bg-white/70 border border-emerald-100">
                  {{ recipe.body_type }}
                </span>
                <span
                  v-if="recipe.time"
                  class="px-2 py-0.5 rounded-full bg-white/70 border border-emerald-100"
                >
                  {{ recipe.time }}
                </span>
              </div>
            </div>
            <button
              type="button"
              class="text-[11px] font-semibold text-emerald-700 bg-white/80 border border-emerald-200 px-2.5 py-1 rounded-full shrink-0"
              @click.stop="openRelatedRecipe"
            >
              查看完整食谱
            </button>
          </div>

          <h1 class="text-xl font-bold text-stone-900 mb-3 leading-relaxed">
            {{ homework.content }}
          </h1>

          <div class="flex flex-wrap gap-2 mb-6">
            <span v-for="tag in (homework.tags || [])" :key="tag" class="text-sm text-blue-600">#{{ tag }}</span>
            <span class="text-sm text-stone-400 ml-auto">{{ formatDate(homework.created_at) }}</span>
          </div>

          <div class="border-t border-stone-100 my-6"></div>

          <h3 class="font-bold text-base mb-4">评论 ({{ comments.length }})</h3>
          <div class="space-y-6">
            <div v-if="!comments.length" class="text-center text-stone-400 py-4 text-sm">
              还没有人评论，快来抢沙发～
            </div>
            <div v-for="comment in comments" :key="comment.id" class="flex gap-3">
              <div
                class="w-8 h-8 rounded-full bg-stone-100 flex-shrink-0 flex items-center justify-center text-xs font-bold"
              >
                {{ comment.user_name?.[0] }}
              </div>
              <div class="flex-1">
                <div class="flex items-center justify-between">
                  <span class="text-xs text-stone-500 font-bold">{{ comment.user_name }}</span>
                </div>
                <p class="text-sm text-stone-800 mt-1 leading-relaxed">
                  {{ comment.content }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="h-14 border-t border-stone-100 px-4 flex items-center gap-4 bg-white shrink-0 max-w-2xl mx-auto w-full">
        <div class="flex-1 bg-stone-100 rounded-full h-9 flex items-center px-4 gap-2">
          <input
            v-model="newComment"
            @keyup.enter="submitComment"
            type="text"
            placeholder="说点好听的..."
            class="bg-transparent text-sm w-full outline-none"
          />
        </div>

        <button @click="toggleLike" class="flex flex-col items-center gap-0.5 min-w-[32px]">
          <Heart :size="22" :class="isLiked ? 'fill-red-500 text-red-500' : 'text-stone-800'" />
          <span class="text-[10px] text-stone-500">{{ homework.likes_count || '赞' }}</span>
        </button>

        <button
          v-if="currentUser && homework && currentUser.id === homework.user_id"
          @click="deleteHomework"
          class="flex items-center gap-1 text-xs text-red-500 px-3 py-1.5 rounded-full border border-red-200 hover:bg-red-50"
        >
          <Trash2 :size="14" />
          删除作业
        </button>
      </div>
    </template>

    <div v-else class="flex-1 flex items-center justify-center text-stone-400 text-sm">
      作业不存在或已被删除
    </div>
  </div>

  <RecipeMarketDetailModal
    v-model="showRelatedRecipeModal"
    :recipe-id="relatedRecipeId"
  />
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: #d6d3d1;
  border-radius: 20px;
}
</style>

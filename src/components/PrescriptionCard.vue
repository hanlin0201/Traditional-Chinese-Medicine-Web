<script setup>
import { ref, computed } from 'vue'
import { Heart, ChevronDown, ChevronUp } from 'lucide-vue-next'

const props = defineProps({
  diagnosisResult: { type: String, required: true },
  summary: { type: String, required: true },
  recipes: { type: Array, default: () => [] },
  acupoints: { type: Array, default: () => [] },
  lifestyle: { type: Array, default: () => [] },
})

const emit = defineEmits(['save-plan'])

// 折叠：默认收起，点击卡片切换
const expandedIndex = ref(null)

function toggleRecipe(index) {
  expandedIndex.value = expandedIndex.value === index ? null : index
}

function isExpanded(index) {
  return expandedIndex.value === index
}

// 收藏：本地状态
const favorited = ref(new Set())

function toggleFavorite(name) {
  const next = new Set(favorited.value)
  if (next.has(name)) next.delete(name)
  else next.add(name)
  favorited.value = next
}

function isFavorited(name) {
  return favorited.value.has(name)
}

function onSavePlan() {
  emit('save-plan')
}
</script>

<template>
  <div class="prescription-card rounded-xl bg-white border border-sandalwood/15 shadow-card overflow-hidden max-w-[85%] w-full">
    <!-- 头部：诊断结果 + 摘要 -->
    <div class="prescription-header px-4 py-3 bg-amber-50/80 border-b border-amber-200/60">
      <h4 class="text-base font-semibold text-amber-800 mb-1">{{ diagnosisResult }}</h4>
      <p class="text-sm text-amber-700/90 leading-relaxed">{{ summary }}</p>
    </div>

    <!-- 中部：食谱折叠区 -->
    <div class="prescription-recipes px-4 py-3 space-y-2">
      <div
        v-for="(recipe, index) in recipes"
        :key="recipe.name"
        class="recipe-item rounded-lg border border-sandalwood/15 bg-paper overflow-hidden transition-all duration-300"
      >
        <button
          type="button"
          class="w-full text-left px-3 py-2.5 flex items-center justify-between gap-2 focus:outline-none focus:ring-2 focus:ring-sandalwood/20 focus:ring-inset"
          @click="toggleRecipe(index)"
        >
          <div class="flex-1 min-w-0">
            <span class="font-medium text-sandalwood block truncate">{{ recipe.name }}</span>
            <div class="flex flex-wrap gap-1 mt-0.5">
              <span
                v-for="tag in recipe.tags"
                :key="tag"
                class="inline-block px-1.5 py-0.5 rounded text-xs bg-sandalwood/10 text-sandalwood"
              >
                {{ tag }}
              </span>
            </div>
          </div>
          <button
            type="button"
            class="shrink-0 p-1 rounded text-sandalwood/60 hover:bg-sandalwood/10 hover:text-cinnabar focus:outline-none"
            :class="{ 'text-cinnabar': isFavorited(recipe.name) }"
            :aria-label="isFavorited(recipe.name) ? '取消收藏' : '收藏'"
            @click.stop="toggleFavorite(recipe.name)"
          >
            <Heart
              class="w-5 h-5"
              :class="{ 'fill-current': isFavorited(recipe.name) }"
            />
          </button>
          <span class="shrink-0 text-sandalwood/50">
            <ChevronDown v-if="!isExpanded(index)" class="w-4 h-4" />
            <ChevronUp v-else class="w-4 h-4" />
          </span>
        </button>
        <Transition
          enter-active-class="transition-all duration-300 ease-out"
          enter-from-class="opacity-0 max-h-0"
          enter-to-class="opacity-100 max-h-[500px]"
          leave-active-class="transition-all duration-200 ease-in"
          leave-from-class="opacity-100 max-h-[500px]"
          leave-to-class="opacity-0 max-h-0"
        >
          <div
            v-show="isExpanded(index)"
            class="recipe-detail border-t border-sandalwood/10 bg-white/80 px-3 py-2 text-sm text-sandalwood/90 overflow-hidden"
          >
            <p class="font-medium text-sandalwood/80 mb-1">食材</p>
            <ul class="list-disc list-inside mb-2 space-y-0.5">
              <li v-for="ing in recipe.ingredients" :key="ing">{{ ing }}</li>
            </ul>
            <p class="font-medium text-sandalwood/80 mb-1">步骤</p>
            <ul class="list-decimal list-inside space-y-0.5">
              <li v-for="(step, i) in recipe.steps" :key="i">{{ step }}</li>
            </ul>
          </div>
        </Transition>
      </div>
    </div>

    <!-- 底部：穴位 + 生活禁忌 -->
    <div class="prescription-wellness px-4 py-3 border-t border-sandalwood/10 space-y-3 bg-[#FAFBF8]">
      <div v-if="acupoints?.length">
        <p class="text-xs font-medium text-bamboo uppercase tracking-wide mb-1.5">穴位调理</p>
        <ul class="space-y-2">
          <li
            v-for="ap in acupoints"
            :key="ap.name"
            class="text-sm text-sandalwood/90 rounded-lg bg-white/70 px-3 py-2 border border-sandalwood/10"
          >
            <span class="font-medium text-sandalwood">{{ ap.name }}</span>
            <span class="text-sandalwood/70"> · {{ ap.location }}</span>
            <p class="mt-0.5 text-sandalwood/80">{{ ap.method }}</p>
          </li>
        </ul>
      </div>
      <div v-if="lifestyle?.length">
        <p class="text-xs font-medium text-bamboo uppercase tracking-wide mb-1.5">生活宜忌</p>
        <ul class="flex flex-wrap gap-1.5">
          <li
            v-for="(item, i) in lifestyle"
            :key="i"
            class="text-sm text-sandalwood/90 px-2 py-1 rounded bg-white/70 border border-sandalwood/10"
          >
            {{ item }}
          </li>
        </ul>
      </div>
    </div>

    <!-- 足部：添加到调理计划 -->
    <div class="prescription-cta px-4 py-3 border-t border-sandalwood/15 bg-[#FDFBF7]">
      <button
        type="button"
        class="w-full py-3 rounded-lg font-medium text-white bg-sandalwood hover:bg-sandalwood/90 active:bg-sandalwood/80 transition-colors"
        @click="onSavePlan"
      >
        添加到我的调理计划
      </button>
    </div>
  </div>
</template>

<style scoped>
.shadow-card {
  box-shadow: 0 2px 8px -2px rgb(139 90 43 / 0.12), 0 4px 12px -4px rgb(139 90 43 / 0.08);
}
</style>

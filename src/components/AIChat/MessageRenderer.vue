<script setup>
import { ref } from 'vue'
import { ChevronDown, Heart } from 'lucide-vue-next'

const props = defineProps({
  message: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['inquiry-option', 'save-plan'])

// 控制食谱折叠状态的字典 { index: boolean }
const foldedStates = ref({})

function toggleFold(index) {
  foldedStates.value[index] = !foldedStates.value[index]
}

// 简单的收藏状态切换（仅前端视觉）
const favorited = ref(new Set())
function toggleHeart(name) {
  if (favorited.value.has(name)) {
    favorited.value.delete(name)
  } else {
    favorited.value.add(name)
  }
}
</script>

<template>
  <div class="w-full max-w-[95%] mb-4">
    
    <div v-if="!message.type || message.type === 'text'" class="flex justify-start">
      <div class="bg-[#F5EDD8] text-sandalwood border border-amber-200/60 px-4 py-3 rounded-2xl rounded-tl-none shadow-sm text-sm leading-relaxed">
        {{ message.content }}
      </div>
    </div>

    <div v-else-if="message.role === 'user'" class="flex justify-end">
      <div class="bg-sandalwood text-white px-4 py-2 rounded-2xl rounded-tr-none shadow-sm text-sm">
        {{ message.content }}
      </div>
    </div>

    <div v-else-if="message.type === 'inquiry'" class="flex justify-start w-full">
      <div class="bg-white border border-sandalwood/20 rounded-xl p-4 shadow-sm w-full">
        <p class="text-sandalwood text-sm mb-3 font-medium">{{ message.text }}</p>
        <div class="flex flex-wrap gap-2">
          <button 
            v-for="opt in message.options" 
            :key="opt.value"
            @click="$emit('inquiry-option', opt)"
            class="px-3 py-1.5 text-xs rounded-full border border-sandalwood/30 text-sandalwood hover:bg-sandalwood hover:text-white transition-colors bg-[#FDFBF7]"
          >
            {{ opt.label }}
          </button>
        </div>
      </div>
    </div>

    <div v-else-if="message.type === 'prescription'" class="flex justify-start w-full">
      <div class="bg-white border border-sandalwood/20 rounded-xl overflow-hidden shadow-md w-full">
        <div class="bg-[#FAF6ED] p-3 border-b border-sandalwood/10">
          <div class="text-sandalwood font-serif font-bold flex items-center gap-2">
            <span class="text-lg">💡</span>
            {{ message.diagnosis_result }}
          </div>
          <p class="text-xs text-sandalwood/70 mt-1">{{ message.summary }}</p>
        </div>

        <div class="p-3 space-y-3">
          <div 
            v-for="(recipe, idx) in message.recipes" 
            :key="idx"
            class="border border-gray-100 rounded-lg bg-white shadow-sm"
          >
            <div 
              @click="toggleFold(idx)"
              class="p-3 flex justify-between items-center cursor-pointer hover:bg-gray-50 transition"
            >
              <div>
                <div class="font-bold text-gray-800 text-sm">{{ recipe.name }}</div>
                <div class="flex gap-1 mt-1">
                  <span v-for="tag in recipe.tags" :key="tag" class="text-[10px] bg-green-50 text-green-700 px-1.5 py-0.5 rounded border border-green-100">
                    {{ tag }}
                  </span>
                </div>
              </div>
              <ChevronDown 
                class="w-4 h-4 text-gray-400 transition-transform duration-300"
                :class="{ 'rotate-180': foldedStates[idx] }" 
              />
            </div>

            <div v-show="foldedStates[idx]" class="p-3 border-t border-gray-50 bg-[#FCFCFC] text-xs space-y-2 transition-all">
              <div>
                <span class="font-bold text-gray-500">食材：</span>
                <span class="text-gray-700">{{ recipe.ingredients.join('、') }}</span>
              </div>
              <div>
                <span class="font-bold text-gray-500 block mb-1">做法：</span>
                <ul class="list-decimal list-inside text-gray-600 space-y-1">
                  <li v-for="(step, sIdx) in recipe.steps" :key="sIdx">{{ step }}</li>
                </ul>
              </div>
              <button 
                @click.stop="toggleHeart(recipe.name)"
                class="w-full mt-2 py-1.5 border border-dashed border-gray-300 rounded text-gray-400 hover:text-red-500 hover:border-red-200 flex items-center justify-center gap-1 transition"
                :class="{ 'text-red-500 bg-red-50 border-red-200': favorited.has(recipe.name) }"
              >
                <Heart class="w-3 h-3" :class="{ 'fill-current': favorited.has(recipe.name) }" />
                {{ favorited.has(recipe.name) ? '已收藏' : '收藏食谱' }}
              </button>
            </div>
          </div>
        </div>

        <div class="p-3 pt-0">
          <button 
            @click="$emit('save-plan', message.pendingTag)"
            class="w-full bg-sandalwood text-white py-2 rounded-lg text-sm hover:bg-sandalwood/90 transition shadow-sm"
          >
            加入我的调理计划
          </button>
        </div>
      </div>
    </div>

  </div>
</template>
<script setup>
import { ref, onMounted } from 'vue'
import { supabase } from '@/supabaseClient'
import { useAuth } from '@/composables/useAuth'
import { X, Plus, Tag } from 'lucide-vue-next'

const { user } = useAuth()

// 数据结构
const tags = ref({ active: [], history: [] })
const newTagInput = ref('')
const loading = ref(true) // 只在刚进入页面时转圈，添加时绝不转圈

// 1. 初始化加载
async function loadTags() {
  try {
    if (!user.value) return
    const { data } = await supabase
      .from('profiles')
      .select('health_tags')
      .eq('id', user.value.id)
      .single()
    
    if (data && data.health_tags) {
      tags.value = data.health_tags
    }
  } catch (err) {
    console.error(err)
  } finally {
    loading.value = false
  }
}

// 2. 极速添加 (乐观更新)
async function addTag() {
  const val = newTagInput.value.trim()
  if (!val) return

  // --- ⚡️ 第一步：先斩后奏 (UI 立即更新) ---
  const tempTag = { 
    name: val, 
    added_at: new Date().toISOString(),
    source: 'manual' 
  }
  
  // 查重 (防止重复添加)
  if (tags.value.active.some(t => t.name === val)) {
    newTagInput.value = ''
    return
  }

  // 这里的操作是同步的，浏览器不需要等待网络，所以是瞬间完成
  const backupTags = JSON.parse(JSON.stringify(tags.value)) // 备份旧数据以防回滚
  tags.value.active.push(tempTag) 
  newTagInput.value = '' // 秒清空输入框，爽！

  // --- 🐢 第二步：后台补票 (异步存库) ---
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ health_tags: tags.value })
      .eq('id', user.value.id)

    if (error) throw error
    // 成功了啥都不用做，因为界面已经是新的了

  } catch (err) {
    // --- ❌ 第三步：补票失败 (回滚) ---
    console.error('保存失败，回滚UI', err)
    tags.value = backupTags // 悄悄变回去
    alert('添加失败，请检查网络')
  }
}

// 3. 极速删除 (乐观更新)
async function removeTag(tagName) {
  // --- ⚡️ 第一步：先斩后奏 ---
  const backupTags = JSON.parse(JSON.stringify(tags.value))
  tags.value.active = tags.value.active.filter(t => t.name !== tagName)

  // --- 🐢 第二步：后台补票 ---
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ health_tags: tags.value })
      .eq('id', user.value.id)

    if (error) throw error
  } catch (err) {
    // --- ❌ 第三步：回滚 ---
    tags.value = backupTags
    alert('删除失败')
  }
}

onMounted(() => {
  loadTags()
})
</script>

<template>
  <div class="bg-white p-5 rounded-xl shadow-sm border border-sandalwood/10">
    <h3 class="text-sm font-serif font-bold text-sandalwood mb-4 flex items-center gap-2">
      <Tag class="w-4 h-4" />
      我的体质标签
    </h3>

    <div v-if="loading" class="text-xs text-gray-400 py-2">
      加载标签中...
    </div>

    <div v-else>
      <div class="flex flex-wrap gap-2 mb-4">
        <div v-if="tags.active.length === 0" class="text-xs text-gray-400 bg-gray-50 px-3 py-1.5 rounded-lg border border-dashed border-gray-200">
          暂无标签，添加一个试试？
        </div>

        <div 
          v-for="tag in tags.active" 
          :key="tag.name"
          class="group relative bg-[#EEF2E6] text-[#5A7C65] px-3 py-1.5 rounded-lg text-xs font-medium border border-[#5A7C65]/20 flex items-center gap-1 transition-all hover:pr-7"
        >
          {{ tag.name }}
          
          <button 
            @click="removeTag(tag.name)"
            class="absolute right-1 opacity-0 group-hover:opacity-100 p-0.5 hover:bg-[#5A7C65] hover:text-white rounded-full transition-all"
          >
            <X class="w-3 h-3" />
          </button>
        </div>
      </div>

      <div class="relative flex items-center">
        <input 
          v-model="newTagInput"
          @keyup.enter="addTag"
          type="text" 
          placeholder="输入体质特征 (如: 湿气重)..." 
          class="w-full bg-[#FDFBF7] border border-sandalwood/20 rounded-lg py-2 pl-3 pr-10 text-sm focus:outline-none focus:border-sandalwood/50 focus:ring-1 focus:ring-sandalwood/20 transition-all placeholder:text-gray-400"
        />
        <button 
          @click="addTag"
          class="absolute right-2 p-1 bg-sandalwood text-white rounded-md hover:bg-sandalwood/90 transition-colors"
          :disabled="!newTagInput.trim()"
        >
          <Plus class="w-4 h-4" />
        </button>
      </div>
    </div>
  </div>
</template>
<script setup>
import { onMounted, watch, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft } from 'lucide-vue-next'
// 3D 核心组件与控制器
import { TresCanvas } from '@tresjs/core'
import { OrbitControls } from '@tresjs/cientos'
// 引入你的 3D 模型子组件
import Herb3DScene from '@/components/Herb3DScene.vue'
// 引入数据获取逻辑
import { useHerbDetail } from '@/composables/useHerbData'

const route = useRoute()
const router = useRouter()
const id = computed(() => route.params.id)

// 数据加载状态管理
const { herb, loading, error, load } = useHerbDetail(id)

/**
 * 格式化带序号的文本，在序号前换行
 * 支持的序号格式：
 * - 圆圈数字：①②③④⑤⑥⑦⑧⑨⑩
 * - 括号数字：⑴⑵⑶⑷⑸⑹⑺⑻⑼⑽ 或 (1)(2)(3)
 * - 书名号引用：《xxx》：
 * - 数字序号：1、2、3 或 1. 2. 3
 */
function formatNumberedText(text) {
  if (!text) return '暂无'
  
  // 对文本进行 HTML 转义，防止 XSS
  let formatted = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  
  // 在圆圈数字序号前换行（①②③...）
  formatted = formatted.replace(/([①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳])/g, '<br/><span class="text-cinnabar font-medium">$1</span>')
  
  // 在括号数字序号前换行（⑴⑵⑶...）
  formatted = formatted.replace(/([⑴⑵⑶⑷⑸⑹⑺⑻⑼⑽])/g, '<br/><span class="text-cinnabar font-medium">$1</span>')
  
  // 在书名号引用前换行（《本草纲目》：）
  formatted = formatted.replace(/(《[^》]+》[：:]\s*)/g, '<br/><span class="text-bamboo">$1</span>')
  
  // 移除开头可能产生的多余换行
  formatted = formatted.replace(/^(<br\/>)+/, '')
  
  return formatted
}

function doLoad() {
  // 确保 ID 存在且有效才加载
  if (id.value && id.value !== '') {
    load(id.value)
  }
}

// 首次挂载和 ID 变化时触发加载
onMounted(doLoad)
watch(id, doLoad)

function goBack() {
  router.push('/herbs') // 返回药材列表
}
</script>

<template>
  <div class="min-h-screen pb-24 flex flex-col bg-[#FDFBF7]">
    <header class="sticky top-0 z-10 glass-search wood-overlay px-4 py-2 flex items-center gap-3 border-b border-sandalwood/10">
      <button
        type="button"
        class="p-1.5 rounded-lg text-sandalwood hover:bg-sandalwood/10 transition-colors"
        aria-label="返回"
        @click="goBack"
      >
        <ArrowLeft class="w-5 h-5" />
      </button>
      <h1 class="font-serif font-semibold text-sandalwood truncate text-lg">
        {{ herb?.name || '药材详情' }}
      </h1>
    </header>

    <template v-if="loading">
      <div class="flex-1 flex flex-col items-center justify-center text-sandalwood/60 gap-3">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-sandalwood"></div>
        <span class="text-sm font-serif">正在翻阅本草纲目...</span>
      </div>
    </template>

    <template v-else-if="error || !herb">
      <div class="flex-1 flex flex-col items-center justify-center text-cinnabar gap-2">
        <span class="text-3xl">🍂</span>
        <span class="font-serif">未找到该药材记录</span>
        <button @click="goBack" class="text-sm underline text-sandalwood mt-2">返回首页</button>
      </div>
    </template>

    <template v-else>
      <!-- 3D 容器：显式高度 + shrink-0 防止 flex 压缩；内层 absolute 填满，确保 TresCanvas 父级有尺寸 -->
      <div class="w-full h-[42vh] min-h-[300px] shrink-0 bg-paper/90 border-b border-sandalwood/10 relative">
        <div class="tres-canvas-fill absolute inset-0 w-full h-full">
          <TresCanvas clear-color="#FDFBF7" alpha>
            <TresPerspectiveCamera :position="[3, 3, 3]" :look-at="[0, 0, 0]" />
            <OrbitControls :enable-zoom="false" :auto-rotate="false" />
            <Herb3DScene />
            <TresAmbientLight :intensity="1.5" />
            <TresDirectionalLight :position="[5, 5, 5]" :intensity="1" />
          </TresCanvas>
        </div>
        <div class="absolute bottom-2 right-4 z-10 text-xs text-sandalwood/40 font-serif pointer-events-none">
          ⟲ 拖动旋转查看
        </div>
      </div>

      <main class="flex-1 px-4 py-6 max-w-2xl mx-auto w-full space-y-5 animate-fade-in-up">
        
        <!-- 基本信息卡片：药材类别和别名 -->
        <div class="rounded-xl bg-paper-card shadow-paper p-5 border border-sandalwood/10">
          <h2 class="text-cinnabar font-serif font-semibold text-base mb-3 flex items-center gap-2">
            <span class="w-1 h-4 bg-cinnabar rounded" /> 基本信息
          </h2>
          <div class="space-y-2 text-sm">
            <div class="flex" v-if="herb.classification">
              <span class="text-sandalwood/60 w-20 shrink-0">药材类别</span>
              <span class="text-sandalwood/90">{{ herb.classification }}</span>
            </div>
            <div class="flex" v-if="herb.alias">
              <span class="text-sandalwood/60 w-20 shrink-0">别名</span>
              <span class="text-sandalwood/90">{{ herb.alias }}</span>
            </div>
          </div>
        </div>

        <div class="rounded-xl bg-paper-card shadow-paper p-5 border border-sandalwood/10">
          <h2 class="text-cinnabar font-serif font-semibold text-base mb-2 flex items-center gap-2">
            <span class="w-1 h-4 bg-cinnabar rounded" /> 性味归经
          </h2>
          <p class="text-sandalwood/90 text-sm leading-relaxed text-justify">
            {{ herb.taste || '暂无' }}{{ herb.channel ? '；' + herb.channel : '' }}
          </p>
        </div>

        <div class="rounded-xl bg-paper-card shadow-paper p-5 border border-sandalwood/10">
          <h2 class="text-cinnabar font-serif font-semibold text-base mb-2 flex items-center gap-2">
            <span class="w-1 h-4 bg-cinnabar rounded" /> 功效与作用
          </h2>
          <div 
            class="text-sandalwood/90 text-sm leading-relaxed text-justify formatted-content"
            v-html="formatNumberedText(herb.effect)"
          ></div>
        </div>

        <div class="rounded-xl bg-paper-card shadow-paper p-5 border border-sandalwood/10">
          <h2 class="text-bamboo font-serif font-semibold text-base mb-2 flex items-center gap-2">
            <span class="w-1 h-4 bg-bamboo rounded" /> 用法用量
          </h2>
          <div 
            class="text-sandalwood/90 text-sm leading-relaxed text-justify formatted-content"
            v-html="formatNumberedText(herb.usage)"
          ></div>
        </div>

        <div class="rounded-xl bg-paper-card shadow-paper p-5 border border-sandalwood/10">
          <h2 class="text-cinnabar font-serif font-semibold text-base mb-2 flex items-center gap-2">
            <span class="w-1 h-4 bg-cinnabar rounded" /> 注意事项
          </h2>
          <div 
            class="text-sandalwood/90 text-sm leading-relaxed text-justify formatted-content"
            v-html="formatNumberedText(herb.tips)"
          ></div>
        </div>
      </main>
    </template>
  </div>
</template>

<style scoped>
/* 格式化内容样式 */
.formatted-content :deep(br) {
  content: '';
  display: block;
  margin-top: 0.75rem;
}

.formatted-content :deep(br:first-child) {
  display: none;
}
</style>
<script setup>
import { computed } from 'vue'

const props = defineProps({
  herb: {
    type: Object,
    required: true,
  },
})

// 智能图片路径处理
const imgSrc = computed(() => {
  // 1. 优先使用数据库里的完整 URL
  if (props.herb.image_url && props.herb.image_url.trim() !== '') {
    return props.herb.image_url
  }
  // 2. 如果有 CDN 路径逻辑可以在这里加
  // if (props.herb.image) return `${CDN_URL}${props.herb.image}`
  
  // 3. 都没有则返回本地占位图 (请确保 public 文件夹下有这个 svg)
  return '/placeholder-herb.svg'
})

// 图片加载失败时的备用处理
const handleImageError = (e) => {
  e.target.src = '/placeholder-herb.svg'
  e.target.onerror = null // 防止死循环
}
</script>

<template>
  <article
    class="group relative flex flex-col h-full bg-paper-card rounded-xl overflow-hidden border border-sandalwood/10 shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
  >
    <div class="relative aspect-[4/3] overflow-hidden bg-paper">
      <img
        :src="imgSrc"
        :alt="herb.name"
        loading="lazy"
        class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        @error="handleImageError"
      />
      
      <div class="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
    </div>

    <div class="p-3 flex-1 flex flex-col gap-2">
      <h3 class="font-serif font-bold text-lg text-sandalwood group-hover:text-cinnabar transition-colors">
        {{ herb.name }}
      </h3>

      <div class="flex flex-wrap gap-1.5 mt-auto">
        <span
          v-if="herb.classification"
          class="px-2 py-0.5 rounded text-[10px] font-medium bg-bamboo/10 text-bamboo border border-bamboo/20"
        >
          {{ herb.classification }}
        </span>

        <template v-if="herb.tags && herb.tags.length">
          <span
            v-for="tag in herb.tags.slice(0, 2)" 
            :key="tag"
            class="px-2 py-0.5 rounded text-[10px] font-medium bg-sandalwood/5 text-sandalwood/70"
          >
            {{ tag }}
          </span>
        </template>
      </div>
    </div>
  </article>
</template>
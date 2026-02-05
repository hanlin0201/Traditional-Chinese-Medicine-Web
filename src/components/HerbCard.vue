<script setup>
import { CDN_URL } from '@/config'
import { useRouter } from 'vue-router'

const props = defineProps({
  herb: {
    type: Object,
    required: true,
  },
})

const router = useRouter()

function goDetail() {
  router.push({ name: 'HerbDetail', params: { id: props.herb.id } })
}

// 优先 Supabase image_url（完整 URL），否则 CDN + image
function imgSrc() {
  if (props.herb.image_url) return props.herb.image_url
  return `${CDN_URL}${props.herb.image || ''}`
}
</script>

<template>
  <article
    class="group cursor-pointer rounded-xl bg-paper-card shadow-card border border-sandalwood/10 overflow-hidden hover:shadow-lg hover:border-sandalwood/20 transition-all duration-300"
    @click="goDetail"
  >
    <div class="relative aspect-[4/3] bg-paper overflow-hidden">
      <img
        :src="imgSrc()"
        :alt="herb.name"
        loading="lazy"
        class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        @error="($e) => { $e.target.src = '/placeholder-herb.svg'; $e.target.onerror = null }"
      />
      <div class="absolute inset-0 bg-gradient-to-t from-sandalwood/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
    <div class="p-4">
      <h3 class="font-serif font-semibold text-sandalwood text-lg mb-2">{{ herb.name }}</h3>
      <div class="flex flex-wrap gap-1.5">
        <span
          v-for="tag in herb.tags"
          :key="tag"
          class="px-2.5 py-0.5 rounded-full text-xs bg-bamboo/15 text-bamboo"
        >
          {{ tag }}
        </span>
      </div>
    </div>
  </article>
</template>

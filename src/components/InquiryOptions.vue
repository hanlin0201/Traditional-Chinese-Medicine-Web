<script setup>
defineProps({
  text: { type: String, required: true },
  options: { type: Array, required: true },
})
const emit = defineEmits(['select'])
</script>

<template>
  <div class="inquiry-card rounded-xl bg-white border border-sandalwood/15 shadow-paper p-4 mr-0 max-w-[85%]">
    <p class="text-sandalwood/95 text-sm leading-relaxed mb-3">{{ text }}</p>
    <div class="flex flex-wrap gap-2">
      <button
        v-for="opt in options"
        :key="opt.value"
        type="button"
        class="inquiry-pill px-3 py-1.5 rounded-full text-xs font-medium border border-gray-300 text-gray-600 bg-white hover:border-sandalwood hover:text-sandalwood hover:bg-sandalwood/5 active:border-sandalwood active:bg-sandalwood/10 transition-colors"
        @click="emit('select', opt)"
      >
        {{ opt.label }}
      </button>
    </div>
  </div>
</template>

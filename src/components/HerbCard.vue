<script setup>
import { computed } from 'vue'

const props = defineProps({
  herb: {
    type: Object,
    required: true,
  },
  opening: {
    type: Boolean,
    default: false,
  },
})

// 智能图片路径处理
const imgSrc = computed(() => {
  if (props.herb.image_url && props.herb.image_url.trim() !== '') {
    return props.herb.image_url
  }
  return '/placeholder-herb.svg'
})

// 图片加载失败时的备用处理
const handleImageError = (e) => {
  e.target.src = '/placeholder-herb.svg'
  e.target.onerror = null
}
</script>

<template>
  <article
    class="drawer-card"
    :class="{ 'drawer-card--opening': opening }"
  >
    <!-- 抽屉面板主体 -->
    <div class="drawer-face">
      <!-- 木纹纹理叠加 -->
      <div class="drawer-grain"></div>

      <!-- 药材图片：hover 时从上方探出 -->
      <div class="drawer-peek">
        <img
          :src="imgSrc"
          :alt="herb.name"
          loading="lazy"
          class="drawer-peek-img"
          @error="handleImageError"
        />
      </div>

      <!-- 药名标签（宣纸风格） -->
      <div class="drawer-label">
        <span class="drawer-label-text">{{ herb.name }}</span>
      </div>

      <!-- 分类标签 -->
      <div class="drawer-tags">
        <span v-if="herb.classification" class="drawer-tag">
          {{ herb.classification }}
        </span>
      </div>

      <!-- 铜拉手 -->
      <div class="drawer-handle">
        <div class="drawer-handle-knob"></div>
      </div>
    </div>
  </article>
</template>

<style scoped>
/* ========== 抽屉卡片整体 ========== */
.drawer-card {
  position: relative;
  cursor: pointer;
  transition: transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94),
              box-shadow 0.4s ease;
}

/* 打开动画状态 */
.drawer-card--opening {
  transform: translateY(-18px) scaleY(1.04);
  z-index: 20;
}
.drawer-card--opening .drawer-face {
  box-shadow:
    0 16px 40px rgba(74, 50, 40, 0.35),
    inset 0 1px 0 rgba(255, 255, 255, 0.08);
}
.drawer-card--opening .drawer-peek {
  max-height: 140px;
  opacity: 1;
}

/* ========== 抽屉面板 ========== */
.drawer-face {
  position: relative;
  overflow: hidden;
  border-radius: 6px;
  /* 木色渐变：深胡桃 -> 栗壳棕 */
  background: linear-gradient(
    170deg,
    #6B4C3B 0%,
    #5C3D2E 40%,
    #4A3228 100%
  );
  /* 内凹边框效果 */
  box-shadow:
    inset 0 2px 4px rgba(0, 0, 0, 0.3),
    inset 0 -1px 2px rgba(255, 255, 255, 0.06),
    0 3px 10px rgba(74, 50, 40, 0.2);
  border: 1px solid rgba(107, 76, 59, 0.5);
  padding: 14px 12px 38px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  transition: box-shadow 0.4s ease;
}

.drawer-card:hover .drawer-face {
  box-shadow:
    inset 0 2px 4px rgba(0, 0, 0, 0.3),
    inset 0 -1px 2px rgba(255, 255, 255, 0.06),
    0 8px 24px rgba(74, 50, 40, 0.3);
}

/* ========== 木纹纹理叠加 ========== */
.drawer-grain {
  position: absolute;
  inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.06'/%3E%3C/svg%3E");
  pointer-events: none;
  z-index: 1;
}

/* ========== 药材图片（hover 探出） ========== */
.drawer-peek {
  position: relative;
  z-index: 2;
  width: 100%;
  max-height: 0;
  opacity: 0;
  overflow: hidden;
  border-radius: 4px;
  transition: max-height 0.45s cubic-bezier(0.25, 0.46, 0.45, 0.94),
              opacity 0.35s ease;
}

.drawer-card:hover .drawer-peek {
  max-height: 140px;
  opacity: 1;
}

.drawer-peek-img {
  width: 100%;
  height: 120px;
  object-fit: cover;
  border-radius: 4px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

/* ========== 药名标签（宣纸风格） ========== */
.drawer-label {
  position: relative;
  z-index: 2;
  background: #F5F0E8;
  border: 1px solid #D4C5A9;
  border-radius: 3px;
  padding: 6px 16px;
  box-shadow:
    0 1px 3px rgba(0, 0, 0, 0.12),
    inset 0 0 0 1px rgba(255, 255, 255, 0.5);
  min-width: 60%;
  text-align: center;
}

.drawer-label-text {
  font-family: 'Noto Serif SC', 'SimSun', '宋体', serif;
  font-weight: 700;
  font-size: 1rem;
  color: #3B2516;
  letter-spacing: 3px;
}

/* ========== 分类标签 ========== */
.drawer-tags {
  position: relative;
  z-index: 2;
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  justify-content: center;
}

.drawer-tag {
  padding: 2px 8px;
  border-radius: 3px;
  font-size: 0.65rem;
  font-weight: 500;
  background: rgba(245, 240, 232, 0.15);
  color: #D4C5A9;
  border: 1px solid rgba(212, 197, 169, 0.25);
  letter-spacing: 0.5px;
}

/* ========== 铜拉手 ========== */
.drawer-handle {
  position: absolute;
  bottom: 10px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 3;
}

.drawer-handle-knob {
  width: 32px;
  height: 14px;
  border-radius: 7px;
  /* 金属光泽渐变 */
  background: linear-gradient(
    180deg,
    #DAA520 0%,
    #B8860B 40%,
    #8B6914 100%
  );
  box-shadow:
    0 2px 4px rgba(0, 0, 0, 0.3),
    inset 0 1px 1px rgba(255, 255, 255, 0.3),
    0 0 0 1px rgba(139, 105, 20, 0.5);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.drawer-card:hover .drawer-handle-knob {
  transform: scaleX(1.1);
  box-shadow:
    0 3px 6px rgba(0, 0, 0, 0.35),
    inset 0 1px 2px rgba(255, 255, 255, 0.4),
    0 0 8px rgba(218, 165, 32, 0.3);
}
</style>

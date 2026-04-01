<script>
// 模块级缓存：setup 重新执行也不会重置
const _seasonalCache = { info: null, recipes: null };
</script>

<script setup>
import {
  ref,
  onMounted,
  onUnmounted,
  watch,
  computed,
  nextTick,
  inject,
} from "vue";
import { useRouter, useRoute } from "vue-router";
import gsap from "gsap";
import {
  Soup,
  ArrowRight,
  BookOpen,
  Utensils,
  ScrollText,
  ChevronDown,
  ArrowUp,
  MessageCircle,
  Activity,
} from "lucide-vue-next";

import TcmHistorySection from "@/components/TcmHistorySection.vue";
import HerbalPairing from "@/components/home/HerbalPairing.vue";
import MythBuster from "@/components/home/MythBuster.vue";
// 注意：移除了 getNearestSolarTerm 的引入
import { supabase } from "@/supabaseClient";
import { preloadHomeFeaturePages } from "@/composables/usePagePreload";
import {
  FEATURE_COPY,
  SITE_SHORT_NAME,
  SITE_PLATFORM_TAGLINE,
  AI_TUTOR_LABEL,
  AI_TUTOR_MOTTO,
  homeNextHintText,
} from "@/constants/branding";

const router = useRouter();
const route = useRoute();
const openAiCompanion = inject("openAiCompanion", () => {});

// --- 数据状态 ---
const currentTermName = ref("");
const termInfo = ref(_seasonalCache.info);
const seasonalRecipes = ref(_seasonalCache.recipes || []);
const loading = ref(!_seasonalCache.info);
const nearestDaysDiff = ref(0);

const todayLabel = (() => {
  const d = new Date();
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
})();

// --- 核心翻页逻辑 ---
const activeIndex = ref(0);
const isAnimating = ref(false);
const totalSections = 4;

// --- 底部指引文案 ---
const nextSectionLabels = [
  { text: homeNextHintText("pairing"), target: 1 },
  { text: homeNextHintText("mythBuster"), target: 2 },
  { text: homeNextHintText("history"), target: 3 },
  { text: "", target: -1 },
];

const currentNextLabel = computed(() => {
  return nextSectionLabels[activeIndex.value] || { text: "", target: -1 };
});

// --- 动画跳转逻辑 ---
const moveTo = (index) => {
  if (index < 0 || index >= totalSections) return;
  if (isAnimating.value) return;

  isAnimating.value = true;
  activeIndex.value = index;

  gsap.to(".scroll-container", {
    y: `-${index * 100}%`,
    duration: 1.0,
    ease: "power2.out",
    overwrite: true,
  });

  setTimeout(() => {
    isAnimating.value = false;
  }, 800);
};

const handleWheel = (e) => {
  e.preventDefault();
  if (isAnimating.value) return;
  if (Math.abs(e.deltaY) < 20) return;
  if (e.deltaY > 0) moveTo(activeIndex.value + 1);
  else moveTo(activeIndex.value - 1);
};

let touchStartY = 0;
const handleTouchStart = (e) => {
  touchStartY = e.touches[0].clientY;
};
const handleTouchEnd = (e) => {
  if (isAnimating.value) return;
  const touchEndY = e.changedTouches[0].clientY;
  const diff = touchStartY - touchEndY;
  if (Math.abs(diff) > 50) {
    if (diff > 0) moveTo(activeIndex.value + 1);
    else moveTo(activeIndex.value - 1);
  }
};

// --- 业务跳转 ---
function goToHistory() {
  moveTo(3);
}
function handleMainPanelClick() {
  router.push("/acupoints");
}
function goToHerbs() {
  router.push("/herbs");
}
function goToRecipes() {
  router.push("/recipes");
}
function goToRecipeDetail(id) {
  router.push({ path: "/recipes", query: { open_id: id } });
}
// --- UI 控制逻辑（来自 main）---
watch(activeIndex, (newVal) => {
  if (newVal > 0) document.body.classList.add("hide-global-nav");
  else document.body.classList.remove("hide-global-nav");
});

watch(
  () => ({ path: route.path, history: route.query.history }),
  (curr) => {
    if (curr.path === "/" && curr.history === "open") nextTick(() => moveTo(3));
  },
  { immediate: true },
);

// ==========================================
// 核心修改：增加本地节气计算逻辑，永远指向下一个节气
// ==========================================
const SOLAR_TERMS_LOOKUP = [
  { name: "小寒", month: 1, day: 5 },
  { name: "大寒", month: 1, day: 20 },
  { name: "立春", month: 2, day: 3 },
  { name: "雨水", month: 2, day: 18 },
  { name: "惊蛰", month: 3, day: 5 },
  { name: "春分", month: 3, day: 20 },
  { name: "清明", month: 4, day: 4 },
  { name: "谷雨", month: 4, day: 19 },
  { name: "立夏", month: 5, day: 5 },
  { name: "小满", month: 5, day: 20 },
  { name: "芒种", month: 6, day: 5 },
  { name: "夏至", month: 6, day: 21 },
  { name: "小暑", month: 7, day: 6 },
  { name: "大暑", month: 7, day: 22 },
  { name: "立秋", month: 8, day: 7 },
  { name: "处暑", month: 8, day: 22 },
  { name: "白露", month: 9, day: 7 },
  { name: "秋分", month: 9, day: 22 },
  { name: "寒露", month: 10, day: 8 },
  { name: "霜降", month: 10, day: 23 },
  { name: "立冬", month: 11, day: 7 },
  { name: "小雪", month: 11, day: 22 },
  { name: "大雪", month: 12, day: 6 },
  { name: "冬至", month: 12, day: 21 },
];

const calculateSeasonalState = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const day = now.getDate();

  const sorted = [...SOLAR_TERMS_LOOKUP].sort((a, b) =>
    a.month !== b.month ? a.month - b.month : a.day - b.day,
  );

  // 查找当前所处的节气
  let activeTerm = sorted[sorted.length - 1];
  for (let i = sorted.length - 1; i >= 0; i--) {
    if (
      month > sorted[i].month ||
      (month === sorted[i].month && day >= sorted[i].day)
    ) {
      activeTerm = sorted[i];
      break;
    }
  }

  // 查找下一个节气并计算倒计时
  let nextTerm = sorted.find(
    (t) => t.month > month || (t.month === month && t.day > day),
  );
  let targetYear = year;
  if (!nextTerm) {
    nextTerm = sorted[0];
    targetYear += 1;
  }

  const todayReset = new Date(year, now.getMonth(), day);
  const targetDate = new Date(targetYear, nextTerm.month - 1, nextTerm.day);
  const diffDays = Math.ceil((targetDate - todayReset) / (1000 * 60 * 60 * 24));

  nearestDaysDiff.value = diffDays;
  return activeTerm.name;
};

// --- 数据获取：Supabase ---
const fetchSeasonalData = async () => {
  // 同步计算节气名与倒计时，立即渲染
  const termName = calculateSeasonalState();
  currentTermName.value = termName;

  // 有缓存直接用，不再请求
  if (_seasonalCache.info) {
    termInfo.value = _seasonalCache.info;
    seasonalRecipes.value = _seasonalCache.recipes;
    loading.value = false;
    return;
  }

  termInfo.value = { name: termName };
  loading.value = false;

  try {
    const [{ data: info }, { data: recipes }] = await Promise.all([
      supabase.from("solar_terms").select("*").eq("name", termName).single(),
      supabase
        .from("recipes")
        .select("id, name, image")
        .eq("solar_term", termName)
        .or("moderation_status.eq.published,moderation_status.is.null")
        .limit(3),
    ]);
    if (info) {
      termInfo.value = info;
      _seasonalCache.info = info;
    }
    if (recipes && recipes.length) {
      seasonalRecipes.value = recipes;
      _seasonalCache.recipes = recipes;
    }
  } catch (e) {
    // 网络失败时节气名与倒计时仍正常显示
  }
};

onMounted(() => {
  fetchSeasonalData();
  // 用户停留首页时，在空闲时段预加载药材页/食谱页代码与首屏数据
  if (typeof window !== "undefined" && "requestIdleCallback" in window) {
    window.requestIdleCallback(
      () => {
        preloadHomeFeaturePages();
      },
      { timeout: 2000 },
    );
  } else {
    setTimeout(() => {
      preloadHomeFeaturePages();
    }, 300);
  }
  window.addEventListener("wheel", handleWheel, { passive: false });
  window.addEventListener("touchstart", handleTouchStart, { passive: true });
  window.addEventListener("touchend", handleTouchEnd, { passive: true });
});

onUnmounted(() => {
  window.removeEventListener("wheel", handleWheel);
  window.removeEventListener("touchstart", handleTouchStart);
  window.removeEventListener("touchend", handleTouchEnd);
  document.body.classList.remove("hide-global-nav");
});
</script>

<template>
  <div class="viewport">
    <div class="scroll-container">
      <div class="page-section">
        <section class="tcm-section tcm-home-hero">
          <div class="home-hero-inner">
            <div
              class="home-glass-card home-glass-card--primary home-glass-card--bento animate-fade-in-up delay-100"
            >
              <header class="home-card-head home-card-head--bento">
                <h2 class="home-card-title">{{ SITE_SHORT_NAME }}</h2>
                <p class="home-card-motto home-card-motto--platform">
                  {{ SITE_PLATFORM_TAGLINE }}
                </p>
                <div
                  class="home-card-deco home-card-deco--bento"
                  aria-hidden="true"
                >
                  <span class="home-card-deco-line"></span>
                  <span class="home-card-deco-dot"></span>
                  <span class="home-card-deco-line"></span>
                </div>
              </header>

              <div class="home-bento-grid">
                <aside
                  v-if="termInfo"
                  class="bento-tile bento-tile--seasonal seasonal-mini-card seasonal-mini-card--bento seasonal-mini-card--left-tall seasonal-card-enter"
                >
                  <div class="seasonal-mini-head seasonal-mini-head--bento">
                    <div class="seasonal-mini-titles">
                      <span class="seasonal-mini-eyebrow">{{
                        FEATURE_COPY.seasonal.title
                      }}</span>
                      <span class="seasonal-mini-motto">{{
                        FEATURE_COPY.seasonal.motto
                      }}</span>
                    </div>
                    <span class="today-pill today-pill--mini">{{
                      todayLabel
                    }}</span>
                  </div>
                  <div class="seasonal-mini-main seasonal-mini-main--bento">
                    <div class="seasonal-mini-term-row">
                      <span class="term-name-mini term-name-mini--bento">{{
                        termInfo.name
                      }}</span>
                      <span class="term-count-mini">
                        {{
                          nearestDaysDiff > 0
                            ? `距下一节气 ${nearestDaysDiff} 天`
                            : "今日交节"
                        }}
                      </span>
                    </div>
                    <p class="term-principle-mini term-principle-mini--bento">
                      {{ termInfo.principle }}
                    </p>
                    <div class="advice-inline advice-inline--bento">
                      <span class="advice-inline-good"
                        ><b>宜</b> {{ termInfo.recommend_text }}</span
                      >
                      <span class="advice-inline-bad"
                        ><b>忌</b> {{ termInfo.avoid_text }}</span
                      >
                    </div>
                  </div>
                  <div
                    class="seasonal-mini-recipes seasonal-mini-recipes--bento"
                  >
                    <div class="seasonal-mini-recipes-head">
                      <Soup class="seasonal-mini-soup-icon" />
                      <span class="seasonal-mini-recipes-label">当季甄选</span>
                    </div>
                    <div class="mini-recipe-chips mini-recipe-chips--bento">
                      <button
                        v-for="recipe in seasonalRecipes"
                        :key="recipe.id"
                        type="button"
                        class="mini-recipe-chip mini-recipe-chip--bento"
                        :title="recipe.name"
                        @click="goToRecipeDetail(recipe.id)"
                      >
                        <img
                          :src="recipe.image"
                          class="mini-recipe-chip-img"
                          alt=""
                          loading="lazy"
                        />
                      </button>
                    </div>
                  </div>
                </aside>

                <button
                  type="button"
                  class="bento-tile bento-tile--recipe recipe-spotlight"
                  :class="{ 'bento-tile--recipe-tall': !termInfo && !loading }"
                  @click.stop="goToRecipes"
                >
                  <Utensils class="recipe-spotlight-icon" stroke-width="1.75" />
                  <span class="recipe-spotlight-title">{{
                    FEATURE_COPY.recipes.title
                  }}</span>
                  <span class="recipe-spotlight-motto">{{
                    FEATURE_COPY.recipes.motto
                  }}</span>
                  <span class="recipe-spotlight-hint">进入养生膳食广场</span>
                  <ArrowRight class="recipe-spotlight-arrow" />
                </button>

                <button
                  type="button"
                  class="bento-tile bento-tile--ai"
                  :class="{ 'bento-tile--ai-tall': !termInfo && !loading }"
                  @click="openAiCompanion"
                >
                  <div class="ai-pulse-ring ai-pulse-ring--rect"></div>
                  <div class="ai-pulse-ring ai-pulse-ring--rect delay-2"></div>
                  <div class="ai-mentor-inner">
                    <MessageCircle class="ai-mentor-icon" stroke-width="1.75" />
                    <span class="ai-mentor-label">{{ AI_TUTOR_LABEL }}</span>
                    <span class="ai-mentor-sub">{{ AI_TUTOR_MOTTO }}</span>
                  </div>
                </button>
              </div>

              <nav class="home-quick-nav" aria-label="主要功能入口">
                <button
                  type="button"
                  class="quick-nav-item"
                  @click.stop="goToHerbs"
                >
                  <div
                    class="quick-nav-icon quick-nav-icon--herb"
                    aria-hidden="true"
                  >
                    <BookOpen class="quick-nav-svg" stroke-width="1.75" />
                  </div>
                  <span class="quick-nav-title">{{
                    FEATURE_COPY.herbs.title
                  }}</span>
                  <span class="quick-nav-motto">{{
                    FEATURE_COPY.herbs.motto
                  }}</span>
                </button>
                <button
                  type="button"
                  class="quick-nav-item"
                  @click.stop="handleMainPanelClick"
                >
                  <div
                    class="quick-nav-icon quick-nav-icon--acu"
                    aria-hidden="true"
                  >
                    <Activity class="quick-nav-svg" stroke-width="1.75" />
                  </div>
                  <span class="quick-nav-title">{{
                    FEATURE_COPY.acupoints.title
                  }}</span>
                  <span class="quick-nav-motto">{{
                    FEATURE_COPY.acupoints.motto
                  }}</span>
                </button>
                <button
                  type="button"
                  class="quick-nav-item"
                  @click.stop="goToHistory"
                >
                  <div
                    class="quick-nav-icon quick-nav-icon--hist"
                    aria-hidden="true"
                  >
                    <ScrollText class="quick-nav-svg" stroke-width="1.75" />
                  </div>
                  <span class="quick-nav-title">{{
                    FEATURE_COPY.history.title
                  }}</span>
                  <span class="quick-nav-motto">{{
                    FEATURE_COPY.history.motto
                  }}</span>
                </button>
              </nav>
            </div>
          </div>
        </section>
      </div>

      <div class="page-section"><HerbalPairing /></div>

      <div class="page-section"><MythBuster /></div>

      <div class="page-section"><TcmHistorySection /></div>
    </div>

    <div class="pagination">
      <div
        v-for="(n, index) in totalSections"
        :key="index"
        class="dot-indicator"
        :class="{ active: activeIndex === index }"
        @click="moveTo(index)"
      ></div>
    </div>

    <transition name="slide-fade">
      <div v-if="activeIndex > 0" class="sidebar-nav">
        <div class="sidebar-btn" @click="moveTo(0)" title="回到顶部">
          <ArrowUp class="w-5 h-5" />
          <span class="btn-text">顶部</span>
        </div>
      </div>
    </transition>

    <transition name="fade">
      <div
        v-if="currentNextLabel.text"
        class="next-page-hint"
        @click="moveTo(currentNextLabel.target)"
      >
        <span class="hint-text">{{ currentNextLabel.text }}</span>
        <ChevronDown class="hint-chevron animate-bounce" stroke-width="2.25" />
      </div>
    </transition>
  </div>
</template>

<style scoped>
/* =========================================
   1. 视口与容器
   ========================================= */
.viewport {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100vh;
  overflow: hidden;
  overscroll-behavior: none;
  touch-action: none;
  --primary: #8b5e3c;
  --primary-dark: #5d4037;
  --accent: #c44d36;
  /* 与 App.vue 顶栏 min-h-[4.5rem] 对齐，避免首屏内容被挡 */
  --main-nav-h: 4.5rem;
}

.scroll-container {
  width: 100%;
  height: 100%;
}

.page-section {
  width: 100%;
  height: 100vh;
}

/* 侧边导航 */
.pagination {
  position: fixed;
  right: 20px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  flex-direction: column;
  gap: 15px;
  z-index: 100;
}
.dot-indicator {
  width: 10px;
  height: 10px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.3s;
}
.dot-indicator.active {
  background: #8b5e3c;
  transform: scale(1.4);
}

/* =========================================
   侧边隐藏式导航条
   ========================================= */
.sidebar-nav {
  position: fixed;
  right: 0;
  top: 70%;
  transform: translateY(-50%) translateX(60%);
  z-index: 999;
  display: flex;
  flex-direction: column;
  gap: 10px;
  opacity: 0.6;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
}

.sidebar-nav:hover {
  opacity: 1;
  transform: translateY(-50%) translateX(0);
}

.sidebar-btn {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(5px);
  padding: 10px 12px 10px 18px;
  border-radius: 30px 0 0 30px;
  box-shadow: -4px 4px 15px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--primary);
  border: 1px solid rgba(139, 94, 60, 0.15);
  border-right: none;
  transition: all 0.3s;
}

.sidebar-btn:hover {
  background: var(--primary);
  color: white;
  padding-right: 20px;
}

.sidebar-btn .btn-text {
  font-size: 0.85rem;
  font-weight: bold;
  white-space: nowrap;
}

.slide-fade-enter-active,
.slide-fade-leave-active {
  transition: all 0.5s ease;
}

.slide-fade-enter-from,
.slide-fade-leave-to {
  transform: translateY(-50%) translateX(100%);
  opacity: 0;
}

/* 底部「继续下滑」指引：白字、加大、胶囊底 + 轻微呼吸动效 */
.next-page-hint {
  position: fixed;
  bottom: max(16px, env(safe-area-inset-bottom));
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  z-index: 999;
  cursor: pointer;
  color: #fff;
  background: linear-gradient(
    180deg,
    rgba(0, 0, 0, 0.12) 0%,
    rgba(0, 0, 0, 0.22) 100%
  );
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  border: 1px solid rgba(255, 255, 255, 0.28);
  border-radius: 999px;
  padding: 12px 28px 14px;
  box-shadow:
    0 8px 28px rgba(0, 0, 0, 0.2),
    0 0 0 1px rgba(0, 0, 0, 0.06) inset;
  transition:
    transform 0.25s ease,
    box-shadow 0.25s ease,
    background 0.25s ease;
  opacity: 1;
  animation: next-hint-breathe 2.8s ease-in-out infinite;
}

@keyframes next-hint-breathe {
  0%,
  100% {
    box-shadow:
      0 8px 28px rgba(0, 0, 0, 0.2),
      0 0 0 1px rgba(0, 0, 0, 0.06) inset;
  }
  50% {
    box-shadow:
      0 10px 36px rgba(0, 0, 0, 0.28),
      0 0 0 1px rgba(255, 255, 255, 0.12) inset;
  }
}

.next-page-hint:hover {
  transform: translateX(-50%) translateY(-4px);
  background: linear-gradient(
    180deg,
    rgba(0, 0, 0, 0.18) 0%,
    rgba(0, 0, 0, 0.3) 100%
  );
}

.hint-text {
  font-size: clamp(1.05rem, 2.6vw, 1.28rem);
  font-weight: 400;
  letter-spacing: 0.14em;
  font-family: "Ma Shan Zheng", cursive;
  text-shadow:
    0 2px 16px rgba(0, 0, 0, 0.45),
    0 1px 3px rgba(0, 0, 0, 0.35);
  text-align: center;
  max-width: min(94vw, 26rem);
  line-height: 1.4;
}

.hint-chevron {
  width: 1.625rem;
  height: 1.625rem;
  flex-shrink: 0;
  filter: drop-shadow(0 2px 6px rgba(0, 0, 0, 0.35));
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* =========================================
   2. 内容样式
   ========================================= */
.tcm-section {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.tcm-home-hero.tcm-section {
  align-items: center;
  justify-content: center;
  min-height: 100%;
  padding: calc(var(--main-nav-h) + 0.75rem) clamp(14px, 3.2vw, 32px)
    max(1rem, env(safe-area-inset-bottom));
  overflow-x: hidden;
  overflow-y: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
  box-sizing: border-box;
  background-image: url("/photo/title_background.jpg");
  background-size: cover;
  background-position: center;
}
.tcm-home-hero.tcm-section::before {
  content: "";
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.25);
  z-index: 1;
  pointer-events: none;
}
.tcm-home-hero.tcm-section::after {
  content: "";
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 30%;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.1), transparent);
  pointer-events: none;
  z-index: 1;
}
.tcm-home-hero.tcm-section::-webkit-scrollbar {
  display: none;
  width: 0;
  height: 0;
}
.home-hero-inner {
  position: relative;
  z-index: 2;
  min-width: 0;
  overflow-x: hidden;
  width: 100%;
  max-width: min(1200px, 100%);
  max-height: calc(100vh - var(--main-nav-h) - 1.75rem);
  padding: 0;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  align-self: center;
}
.home-hero-inner .home-glass-card {
  max-height: calc(100vh - var(--main-nav-h) - 1.75rem);
}
.home-glass-card {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  max-height: calc(100vh - var(--main-nav-h) - 1.75rem);
  overflow-x: hidden;
  overflow-y: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
  background: rgba(255, 255, 255, 0.88);
  backdrop-filter: blur(22px);
  -webkit-backdrop-filter: blur(22px);
  border-radius: 22px;
  padding: clamp(1.15rem, 2vw, 1.65rem);
  box-shadow:
    0 4px 28px rgba(45, 55, 45, 0.1),
    0 1px 0 rgba(255, 255, 255, 0.95) inset;
  border: 1px solid rgba(255, 255, 255, 0.82);
}
.home-glass-card::-webkit-scrollbar {
  display: none;
  width: 0;
  height: 0;
}
.home-glass-card--primary {
  width: 100%;
}
.home-glass-card--bento {
  gap: 0;
  /* 去掉外层整块米色玻璃底，功能入口仍保留各自小卡片样式 */
  background: transparent;
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
  border: none;
  box-shadow: none;
  border-radius: 0;
}
.home-glass-card--bento .home-card-head--bento .home-card-title {
  color: #fff;
  font-size: clamp(2.05rem, 4vw, 2.95rem);
  letter-spacing: 0.15em;
  text-shadow:
    0 2px 18px rgba(0, 0, 0, 0.38),
    0 1px 4px rgba(0, 0, 0, 0.28);
}
.home-glass-card--bento .home-card-head--bento .home-card-motto--platform {
  color: rgba(255, 255, 255, 0.88);
  font-size: 0.78rem;
  text-shadow:
    0 1px 12px rgba(0, 0, 0, 0.32),
    0 0 1px rgba(0, 0, 0, 0.15);
}
.home-glass-card--bento .home-card-deco-line {
  background: rgba(255, 255, 255, 0.42);
}
.home-glass-card--bento .home-card-deco-dot {
  background: rgba(255, 255, 255, 0.95);
  box-shadow: 0 0 0 1px rgba(196, 77, 54, 0.35);
}
.home-card-head {
  flex-shrink: 0;
  text-align: left;
  margin-bottom: 0.95rem;
}
.home-card-head--bento {
  text-align: center;
  margin-bottom: 1rem;
}
.home-card-head--bento .home-card-deco--bento {
  justify-content: center;
}
.home-bento-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.12fr) minmax(0, 1fr);
  grid-template-rows: minmax(132px, 1fr) auto;
  gap: 14px;
  margin-bottom: 20px;
  flex-shrink: 0;
  min-height: 0;
}
.bento-tile {
  min-width: 0;
  box-sizing: border-box;
}
.bento-tile--ai {
  grid-column: 2;
  grid-row: 2;
  position: relative;
  margin: 0;
  padding: 0.65rem 0.55rem;
  border: 1px solid rgba(255, 248, 240, 0.55);
  border-radius: 20px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  /* 暖赭 / 琥珀 / 檀褐 — 与全站纸色、朱砂点缀统一 */
  background:
    radial-gradient(
      ellipse 95% 85% at 18% 12%,
      rgba(255, 255, 255, 0.32),
      transparent 52%
    ),
    radial-gradient(
      ellipse 120% 100% at 30% 22%,
      #fdf6ec,
      #e8c9a0 42%,
      #b88354 72%,
      #7a4f32
    );
  box-shadow:
    0 12px 36px rgba(90, 52, 34, 0.28),
    0 0 0 1px rgba(255, 255, 255, 0.18) inset,
    inset 0 1px 0 rgba(255, 255, 255, 0.5);
  transition:
    transform 0.22s ease,
    box-shadow 0.22s ease,
    border-color 0.22s ease;
}
.bento-tile--ai-tall {
  grid-column: 1;
  grid-row: 1 / 3;
  padding: 1.25rem 1rem;
}
.bento-tile--ai:hover {
  transform: translateY(-2px);
  border-color: rgba(255, 252, 248, 0.72);
  box-shadow:
    0 16px 44px rgba(90, 52, 34, 0.34),
    0 0 0 1px rgba(255, 255, 255, 0.22) inset,
    inset 0 1px 0 rgba(255, 255, 255, 0.55);
}
.bento-tile--ai:active {
  transform: translateY(0);
}
.bento-tile--recipe {
  grid-column: 2;
  grid-row: 1;
  min-height: 0;
  align-self: stretch;
}
.bento-tile--recipe-tall {
  grid-column: 2;
  grid-row: 1 / 3;
  justify-content: center;
}
.bento-tile--seasonal {
  grid-column: 1;
  grid-row: 1 / 3;
  margin: 0;
  align-self: stretch;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.bento-tile--seasonal::-webkit-scrollbar {
  display: none;
  width: 0;
  height: 0;
}
.seasonal-mini-card {
  flex-shrink: 0;
  margin: 4px 0 14px;
  padding: 0.85rem 1rem;
  border-radius: 14px;
  background: linear-gradient(
    145deg,
    rgba(255, 252, 247, 0.96),
    rgba(242, 237, 228, 0.78)
  );
  border: 1px solid rgba(255, 255, 255, 0.45);
  box-shadow:
    0 8px 28px rgba(45, 40, 35, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.65);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}
.seasonal-mini-card--bento {
  margin: 0;
  padding: 0.65rem 0.72rem;
  border-radius: 18px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-height: 0;
  background: linear-gradient(
    158deg,
    rgba(255, 253, 248, 0.93) 0%,
    rgba(248, 241, 230, 0.88) 42%,
    rgba(238, 230, 216, 0.9) 100%
  );
  border: 1px solid rgba(255, 255, 255, 0.52);
  box-shadow:
    0 10px 36px rgba(45, 40, 35, 0.12),
    0 2px 12px rgba(139, 94, 60, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.72),
    inset 0 0 0 1px rgba(139, 94, 60, 0.06);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
}
.seasonal-mini-head--bento {
  margin-bottom: 0.35rem;
}
.seasonal-mini-main--bento {
  gap: 4px;
}
.term-name-mini--bento {
  font-size: clamp(1.05rem, 2.4vw, 1.35rem);
}
.term-principle-mini--bento {
  font-size: 0.68rem;
  line-height: 1.45;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.advice-inline--bento {
  font-size: 0.62rem;
  gap: 6px 10px;
}
.seasonal-mini-recipes--bento {
  margin-top: 0.35rem;
  padding-top: 0.45rem;
}
.seasonal-mini-recipes--bento .seasonal-mini-recipes-head {
  margin-bottom: 6px;
}
.mini-recipe-chips--bento {
  gap: 6px;
}
.mini-recipe-chip--bento {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  box-shadow:
    0 2px 8px rgba(45, 40, 35, 0.1),
    0 0 0 1px rgba(255, 255, 255, 0.35) inset;
}
.seasonal-mini-card--left-tall {
  padding: 0.88rem 1rem;
  gap: 8px;
}
.seasonal-mini-card--left-tall .seasonal-mini-head--bento {
  margin-bottom: 0.5rem;
}
.seasonal-mini-card--left-tall .term-name-mini--bento {
  font-size: clamp(1.15rem, 2.6vw, 1.52rem);
}
.seasonal-mini-card--left-tall .term-principle-mini--bento {
  font-size: 0.72rem;
  -webkit-line-clamp: 4;
}
.seasonal-mini-card--left-tall .advice-inline--bento {
  font-size: 0.65rem;
}
.seasonal-mini-card--left-tall .mini-recipe-chip--bento {
  width: 50px;
  height: 50px;
}
.home-quick-nav {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-top: 2px;
  margin-bottom: 6px;
  flex-shrink: 0;
}
.quick-nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: 5px;
  padding: 11px 8px 12px;
  margin: 0;
  border: 1px solid rgba(255, 255, 255, 0.48);
  border-radius: 18px;
  background: linear-gradient(
    168deg,
    rgba(255, 253, 248, 0.9) 0%,
    rgba(245, 239, 228, 0.82) 55%,
    rgba(236, 228, 215, 0.86) 100%
  );
  cursor: pointer;
  transition:
    border-color 0.2s,
    box-shadow 0.2s,
    transform 0.15s;
  box-shadow:
    0 8px 28px rgba(45, 40, 35, 0.1),
    0 1px 4px rgba(139, 94, 60, 0.06),
    inset 0 1px 0 rgba(255, 255, 255, 0.65);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}
.quick-nav-item:hover {
  border-color: rgba(255, 255, 255, 0.72);
  box-shadow:
    0 12px 32px rgba(45, 40, 35, 0.14),
    0 0 0 1px rgba(139, 94, 60, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);
  transform: translateY(-2px);
}
.quick-nav-icon {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--primary-dark);
  box-shadow:
    0 4px 12px rgba(45, 40, 35, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.88);
  border: 1px solid rgba(255, 255, 255, 0.55);
}
.quick-nav-icon--herb {
  background: linear-gradient(155deg, #fff9ed, #f2e6cc 55%, #e8dcc0);
}
.quick-nav-icon--acu {
  background: linear-gradient(155deg, #faf4eb, #ebe0d4 55%, #ddd2c4);
}
.quick-nav-icon--hist {
  background: linear-gradient(155deg, #f5efe6, #e5dcd0 55%, #d9cfc2);
}
.quick-nav-svg {
  width: 22px;
  height: 22px;
}
.quick-nav-title {
  font-family: "Ma Shan Zheng", cursive;
  font-size: 0.88rem;
  font-weight: 400;
  color: var(--primary-dark);
  letter-spacing: 0.1em;
  line-height: 1.2;
}
.quick-nav-motto {
  font-family: "Ma Shan Zheng", cursive;
  font-size: 0.58rem;
  color: rgba(61, 56, 48, 0.7);
  letter-spacing: 0.08em;
  line-height: 1.35;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  max-width: 100%;
}
.seasonal-mini-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 0.55rem;
}
.seasonal-mini-titles {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.seasonal-mini-eyebrow {
  font-family: "Ma Shan Zheng", cursive;
  font-size: 1.02rem;
  color: var(--primary-dark);
  letter-spacing: 0.12em;
}
.seasonal-mini-motto {
  font-family: "Ma Shan Zheng", cursive;
  font-size: 0.62rem;
  color: rgba(61, 56, 48, 0.65);
  letter-spacing: 0.13em;
  line-height: 1.4;
}
.today-pill--mini {
  flex-shrink: 0;
  padding: 4px 10px;
  font-size: 0.65rem;
  letter-spacing: 0.08em;
  background: rgba(139, 94, 60, 0.1);
  border-radius: 999px;
  border: 1px solid rgba(139, 94, 60, 0.16);
  color: var(--primary-dark);
}
.seasonal-mini-main {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.seasonal-mini-term-row {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 8px 12px;
}
.term-name-mini {
  font-family: "Ma Shan Zheng", serif;
  font-size: clamp(1.28rem, 3vw, 1.72rem);
  color: var(--primary-dark);
  letter-spacing: 0.08em;
}
.term-count-mini {
  font-size: 0.72rem;
  color: rgba(61, 56, 48, 0.72);
  letter-spacing: 0.06em;
}
.term-principle-mini {
  margin: 0;
  font-size: 0.74rem;
  color: rgba(61, 56, 48, 0.78);
  line-height: 1.55;
  letter-spacing: 0.04em;
}
.advice-inline {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 14px;
  font-size: 0.68rem;
  line-height: 1.45;
  letter-spacing: 0.03em;
}
.advice-inline-good {
  color: #3d5c28;
}
.advice-inline-bad {
  color: #8b3a3a;
}
.advice-inline b {
  margin-right: 4px;
  font-weight: 700;
}
.seasonal-mini-recipes {
  margin-top: 0.6rem;
  padding-top: 0.6rem;
  border-top: 1px solid rgba(139, 94, 60, 0.12);
}
.seasonal-mini-recipes-head {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px 10px;
  margin-bottom: 8px;
}
.seasonal-mini-soup-icon {
  width: 14px;
  height: 14px;
  color: var(--primary);
  flex-shrink: 0;
}
.seasonal-mini-recipes-label {
  font-family: "Ma Shan Zheng", cursive;
  font-size: 0.72rem;
  font-weight: 400;
  color: var(--primary-dark);
  letter-spacing: 0.1em;
}
.seasonal-mini-recipes-hint {
  font-size: 0.6rem;
  color: rgba(61, 56, 48, 0.55);
  letter-spacing: 0.1em;
}
@media (min-width: 480px) {
  .seasonal-mini-recipes-hint {
    margin-left: auto;
  }
}
.mini-recipe-chips {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.mini-recipe-chip {
  padding: 0;
  border: none;
  border-radius: 10px;
  overflow: hidden;
  cursor: pointer;
  width: 52px;
  height: 52px;
  flex-shrink: 0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  transition:
    transform 0.2s,
    box-shadow 0.2s;
}
.mini-recipe-chip:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.12);
}
.mini-recipe-chip.mini-recipe-chip--bento:hover {
  box-shadow:
    0 4px 14px rgba(45, 40, 35, 0.14),
    0 0 0 1px rgba(139, 94, 60, 0.12) inset;
}
.mini-recipe-chip-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.home-card-title {
  font-family: "Ma Shan Zheng", cursive;
  font-size: clamp(1.65rem, 2.7vw, 2.2rem);
  color: var(--primary-dark);
  margin: 0 0 0.32rem;
  letter-spacing: 0.14em;
  line-height: 1.25;
  font-weight: 400;
}
.home-card-motto {
  margin: 0;
  font-family: "Ma Shan Zheng", cursive;
  font-size: 0.8rem;
  color: rgba(61, 56, 48, 0.78);
  letter-spacing: 0.16em;
  line-height: 1.55;
}
.home-card-motto--platform {
  font-size: 0.72rem;
  letter-spacing: 0.065em;
  line-height: 1.65;
}
.home-card-deco {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0.55rem 0 0.45rem;
}
.home-card-deco-line {
  width: 26px;
  height: 1px;
  background: rgba(139, 94, 60, 0.38);
}
.home-card-deco-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--accent);
  opacity: 0.8;
}
.home-card-meta {
  margin: 0;
}
.today-pill--inset {
  background: rgba(139, 94, 60, 0.09);
  color: var(--primary-dark);
  border: 1px solid rgba(139, 94, 60, 0.16);
  box-shadow: none;
  font-size: 0.78rem;
  letter-spacing: 0.1em;
}

.ai-mentor-inner {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 0 8px;
}
.bento-tile--ai-tall .ai-mentor-inner {
  padding: 0 12px;
}
.bento-tile--ai .ai-mentor-icon {
  width: 34px;
  height: 34px;
  color: rgba(255, 255, 255, 0.95);
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.12));
}
.bento-tile--ai-tall .ai-mentor-icon {
  width: clamp(48px, 8vw, 58px);
  height: clamp(48px, 8vw, 58px);
}
.bento-tile--ai .ai-mentor-label {
  font-family: "Ma Shan Zheng", cursive;
  font-size: 0.82rem;
  font-weight: 400;
  color: #fffdfb;
  letter-spacing: 0.1em;
  text-shadow: 0 1px 4px rgba(45, 30, 22, 0.35);
}
.bento-tile--ai-tall .ai-mentor-label {
  font-size: clamp(1rem, 2.2vw, 1.18rem);
  letter-spacing: 0.08em;
}
.bento-tile--ai .ai-mentor-sub {
  font-family: "Ma Shan Zheng", cursive;
  font-size: 0.56rem;
  color: rgba(255, 246, 235, 0.92);
  letter-spacing: 0.1em;
  line-height: 1.35;
  max-width: 11em;
  text-align: center;
}
.bento-tile--ai-tall .ai-mentor-sub {
  font-size: 0.7rem;
  letter-spacing: 0.14em;
  line-height: 1.45;
  max-width: 12em;
}
.recipe-spotlight {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: 4px;
  padding: 0.85rem 0.9rem 2rem;
  border: 1px solid rgba(255, 255, 255, 0.55);
  border-radius: 20px;
  background: linear-gradient(
    162deg,
    rgba(255, 254, 251, 0.96) 0%,
    rgba(252, 244, 232, 0.92) 45%,
    rgba(245, 230, 210, 0.9) 100%
  );
  box-shadow:
    0 12px 40px rgba(139, 94, 60, 0.14),
    0 0 0 1px rgba(196, 77, 54, 0.12),
    inset 0 1px 0 rgba(255, 255, 255, 0.78),
    inset 0 0 24px rgba(232, 210, 180, 0.22);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  cursor: pointer;
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease,
    border-color 0.2s ease;
}
.bento-tile--recipe-tall.recipe-spotlight {
  padding: 1.1rem 1rem 2.25rem;
}
.recipe-spotlight:hover {
  transform: translateY(-2px);
  border-color: rgba(255, 255, 255, 0.75);
  box-shadow:
    0 16px 44px rgba(139, 94, 60, 0.18),
    0 0 0 1px rgba(196, 77, 54, 0.16),
    inset 0 1px 0 rgba(255, 255, 255, 0.85),
    inset 0 0 28px rgba(228, 200, 165, 0.35);
}
.recipe-spotlight-icon {
  width: 40px;
  height: 40px;
  color: #8b5e3c;
}
.recipe-spotlight-title {
  font-family: "Ma Shan Zheng", cursive;
  font-size: 1.02rem;
  font-weight: 400;
  color: var(--primary-dark);
  letter-spacing: 0.12em;
}
.recipe-spotlight-motto {
  font-family: "Ma Shan Zheng", cursive;
  font-size: 0.66rem;
  color: rgba(61, 56, 48, 0.82);
  letter-spacing: 0.12em;
  line-height: 1.4;
  padding: 0 4px;
}
.recipe-spotlight-hint {
  font-family: "Ma Shan Zheng", cursive;
  font-size: 0.62rem;
  color: var(--accent);
  font-weight: 400;
  letter-spacing: 0.1em;
  margin-top: 2px;
}
.recipe-spotlight-arrow {
  position: absolute;
  bottom: 10px;
  right: 12px;
  width: 20px;
  height: 20px;
  color: rgba(139, 94, 60, 0.38);
}

.ai-pulse-ring {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 100%;
  height: 100%;
  border-radius: 50%;
  border: 2px solid rgba(196, 154, 108, 0.4);
  opacity: 0;
  animation: pulse-ring 3s infinite;
}
.ai-pulse-ring--rect {
  border-radius: 20px;
  border-color: rgba(255, 240, 228, 0.45);
}
.ai-pulse-ring.delay-2 {
  animation-delay: 1.5s;
}
.pulse-ring {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 100%;
  height: 100%;
  border-radius: 50%;
  border: 1px solid var(--primary);
  opacity: 0;
  animation: pulse-ring 3s infinite;
}
.pulse-ring.delay-2 {
  animation-delay: 1.5s;
}
@keyframes pulse-ring {
  0% {
    width: 100%;
    height: 100%;
    opacity: 0.5;
  }
  100% {
    width: 160%;
    height: 160%;
    opacity: 0;
  }
}
.action-btn {
  display: flex;
  align-items: center;
  gap: 12px;
  background: white;
  padding: 14px 18px;
  border-radius: 16px;
  border: 1px solid rgba(139, 94, 60, 0.1);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.04);
  cursor: pointer;
  transition: all 0.3s;
  text-align: left;
}
.action-btn:hover {
  transform: translateX(4px);
  box-shadow: 0 8px 20px rgba(139, 94, 60, 0.12);
  border-color: var(--primary);
}
.btn-icon {
  width: 42px;
  height: 42px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.btn-text .main {
  font-size: 0.98rem;
  font-weight: bold;
  color: var(--primary-dark);
  display: block;
}
.btn-text .sub {
  font-size: 0.72rem;
  color: #6d6560;
  line-height: 1.35;
  letter-spacing: 0.12em;
}
.arrow {
  width: 18px;
  color: #ccc;
  margin-left: auto;
  flex-shrink: 0;
}
.today-pill {
  display: inline-block;
  padding: 6px 14px;
  border-radius: 50px;
  font-size: 0.85rem;
  letter-spacing: 0.08em;
}
.seasonal-card-enter {
  animation: seasonal-card-enter 0.6s ease-out;
}
@keyframes seasonal-card-enter {
  from {
    opacity: 0;
    transform: translateY(24px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
.bg-overlay-noise {
  position: absolute;
  inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg width='200' height='200' viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.05'/%3E%3C/svg%3E");
  z-index: 1;
  pointer-events: none;
}
.title-decoration {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 10px 0;
  opacity: 0.6;
}
.title-decoration .line {
  width: 40px;
  height: 1px;
  background: var(--primary);
}
.title-decoration .dot {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--accent);
}
.animate-fade-in-down {
  animation: fadeInDown 1s ease-out;
}
.animate-fade-in-up {
  animation: fadeInUp 1s ease-out;
}
.delay-100 {
  animation-delay: 0.15s;
  animation-fill-mode: both;
}
@keyframes fadeInDown {
  from {
    opacity: 0;
    transform: translateY(-30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 首页首屏：节气卡与入口方格内文字统一近黑；主入口标题加粗；除「四时之序」眉题外整体略放大 */
.tcm-home-hero .seasonal-mini-eyebrow {
  font-size: 1.02rem;
  color: #0a0a0a;
}
.tcm-home-hero .seasonal-mini-motto {
  font-size: 0.74rem;
  color: #0a0a0a;
}
.tcm-home-hero .term-name-mini {
  font-size: clamp(1.35rem, 3.2vw, 1.85rem);
  color: #0a0a0a;
}
.tcm-home-hero .term-name-mini--bento {
  font-size: clamp(1.12rem, 2.6vw, 1.48rem);
}
.tcm-home-hero .seasonal-mini-card--left-tall .term-name-mini--bento {
  font-size: clamp(1.22rem, 2.8vw, 1.62rem);
}
.tcm-home-hero .term-count-mini {
  font-size: 0.8rem;
  color: #0a0a0a;
}
.tcm-home-hero .term-principle-mini {
  font-size: 0.82rem;
  color: #0a0a0a;
}
.tcm-home-hero .term-principle-mini--bento {
  font-size: 0.74rem;
}
.tcm-home-hero .seasonal-mini-card--left-tall .term-principle-mini--bento {
  font-size: 0.78rem;
}
.tcm-home-hero .advice-inline--bento {
  font-size: 0.7rem;
}
.tcm-home-hero .seasonal-mini-card--left-tall .advice-inline--bento {
  font-size: 0.73rem;
}
.tcm-home-hero .advice-inline-good,
.tcm-home-hero .advice-inline-bad {
  color: #0a0a0a;
}
.tcm-home-hero .seasonal-mini-recipes-label {
  font-size: 0.82rem;
  font-weight: 700;
  color: #0a0a0a;
}
.tcm-home-hero .seasonal-mini-recipes-hint {
  font-size: 0.7rem;
  color: #0a0a0a;
}
.tcm-home-hero .seasonal-mini-soup-icon {
  color: #0a0a0a;
}
.tcm-home-hero .today-pill--mini {
  font-size: 0.72rem;
  color: #0a0a0a;
}
.tcm-home-hero .quick-nav-title {
  font-size: 1rem;
  font-weight: 700;
  color: #0a0a0a;
}
.tcm-home-hero .quick-nav-motto {
  font-size: 0.72rem;
  color: #0a0a0a;
}
.tcm-home-hero .quick-nav-icon {
  color: #0a0a0a;
}
.tcm-home-hero .quick-nav-svg {
  width: 24px;
  height: 24px;
}
.tcm-home-hero .recipe-spotlight-title {
  font-size: 1.15rem;
  font-weight: 700;
  color: #0a0a0a;
}
.tcm-home-hero .recipe-spotlight-motto {
  font-size: 0.76rem;
  color: #0a0a0a;
}
.tcm-home-hero .recipe-spotlight-hint {
  font-size: 0.74rem;
  font-weight: 700;
  color: #0a0a0a;
}
.tcm-home-hero .recipe-spotlight-icon {
  color: #0a0a0a;
}
.tcm-home-hero .recipe-spotlight-arrow {
  color: rgba(10, 10, 10, 0.45);
}
.tcm-home-hero .bento-tile--ai {
  border-color: rgba(255, 255, 255, 0.72);
  background:
    radial-gradient(
      ellipse 95% 85% at 18% 12%,
      rgba(255, 255, 255, 0.55),
      transparent 52%
    ),
    linear-gradient(155deg, #fff9f3 0%, #fce8d8 42%, #e8d2b8 78%, #d4b896);
  box-shadow:
    0 12px 32px rgba(90, 52, 34, 0.16),
    0 0 0 1px rgba(255, 255, 255, 0.55) inset,
    inset 0 1px 0 rgba(255, 255, 255, 0.9);
}
.tcm-home-hero .bento-tile--ai:hover {
  box-shadow:
    0 16px 40px rgba(90, 52, 34, 0.2),
    0 0 0 1px rgba(255, 255, 255, 0.62) inset,
    inset 0 1px 0 rgba(255, 255, 255, 0.95);
}
.tcm-home-hero .bento-tile--ai .ai-mentor-label {
  font-size: 0.95rem;
  font-weight: 700;
  color: #0a0a0a;
  text-shadow: none;
}
.tcm-home-hero .bento-tile--ai-tall .ai-mentor-label {
  font-size: clamp(1.08rem, 2.4vw, 1.28rem);
}
.tcm-home-hero .bento-tile--ai .ai-mentor-sub {
  font-size: 0.68rem;
  color: #0a0a0a;
}
.tcm-home-hero .bento-tile--ai-tall .ai-mentor-sub {
  font-size: 0.8rem;
}
.tcm-home-hero .bento-tile--ai .ai-mentor-icon {
  color: #0a0a0a;
  filter: drop-shadow(0 1px 0 rgba(255, 255, 255, 0.85));
}
.tcm-home-hero .home-glass-card--bento .home-card-head--bento .home-card-title {
  font-size: clamp(2.25rem, 4.3vw, 3.15rem);
}
.tcm-home-hero
  .home-glass-card--bento
  .home-card-head--bento
  .home-card-motto--platform {
  font-size: 0.88rem;
}

@media (max-width: 1024px) {
  .home-hero-inner {
    max-height: none;
    --home-mid-scale: 1.12;
    max-width: calc(min(1180px, 100%) / var(--home-mid-scale));
  }
  .home-hero-inner .home-glass-card {
    max-height: none;
  }
  .home-glass-card {
    min-height: 0;
    max-height: none;
  }
  .home-bento-grid {
    grid-template-columns: 1fr;
    grid-template-rows: auto;
  }
  .bento-tile--seasonal {
    grid-column: 1;
    grid-row: auto;
  }
  .bento-tile--recipe {
    grid-column: 1;
    grid-row: auto;
  }
  .bento-tile--recipe-tall {
    grid-column: 1;
    grid-row: auto;
    min-height: 210px;
  }
  .bento-tile--ai {
    grid-column: 1;
    grid-row: auto;
    min-height: 156px;
  }
  .bento-tile--ai-tall {
    grid-column: 1;
    grid-row: auto;
    min-height: 172px;
  }
}
@media (max-width: 768px) {
  .today-pill {
    padding: 5px 12px;
    font-size: 0.8rem;
  }
  .mini-recipe-chip {
    width: 48px;
    height: 48px;
  }
  .mini-recipe-chip--bento {
    width: 44px;
    height: 44px;
  }
  .home-quick-nav {
    gap: 8px;
  }
  .quick-nav-item {
    padding: 10px 6px 11px;
  }
  .quick-nav-title {
    font-size: 0.76rem;
  }
  .quick-nav-motto {
    font-size: 0.55rem;
    -webkit-line-clamp: 3;
  }
  .tcm-home-hero .quick-nav-title {
    font-size: 0.9rem;
  }
  .tcm-home-hero .quick-nav-motto {
    font-size: 0.64rem;
  }
}
</style>

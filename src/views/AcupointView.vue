<script setup>
import { ref, computed, watch } from 'vue'
import { Search, ChevronRight, ChevronDown, X, ZoomIn, ZoomOut, RotateCcw } from 'lucide-vue-next'
import { MERIDIAN_GROUPS, CATEGORIES, searchAcupoints } from '@/constants/acupoints.js'
import { supabase } from '@/supabaseClient'

// ===================== 状态 =====================

// 视图模式
const viewMode = ref('2D') // '2D' | '3D'

// 搜索
const searchQuery = ref('')
const searchResults = computed(() => searchAcupoints(searchQuery.value))
const isSearching = computed(() => searchQuery.value.trim().length > 0)

// 左侧手风琴：当前展开的经脉 id
const expandedMeridianId = ref(null)

// 选中的穴位
const selectedPoint = ref(null)      // { meridianId, meridianName, meridianColor, point }
const showDetailPanel = ref(false)

// Supabase 数据
const pointDetail = ref(null)        // { name, position, disease }
const detailLoading = ref(false)

// ===================== Supabase 查询 =====================

/** 从 Supabase 获取穴位详情 */
async function fetchPointDetail(pointName) {
  detailLoading.value = true
  pointDetail.value = null

  try {
    const { data, error } = await supabase
      .from('acupoint')
      .select('name, position, disease')
      .eq('name', pointName)
      .maybeSingle()

    if (error) {
      console.warn('查询穴位失败:', error)
    } else {
      pointDetail.value = data // data 为 null 表示该穴位暂无数据
    }
  } catch (e) {
    console.error('穴位查询异常:', e)
  } finally {
    detailLoading.value = false
  }
}

// ===================== 交互逻辑 =====================

/** 切换经脉展开/收起 */
function toggleMeridian(meridianId) {
  if (expandedMeridianId.value === meridianId) {
    expandedMeridianId.value = null
  } else {
    expandedMeridianId.value = meridianId
  }
}

/** 点击穴位 */
function selectPoint(meridian, pointName) {
  selectedPoint.value = {
    meridianId: meridian.id,
    meridianName: meridian.name,
    meridianColor: meridian.color,
    point: pointName,
  }
  showDetailPanel.value = true
  fetchPointDetail(pointName)
}

/** 从搜索结果中选中穴位 */
function selectFromSearch(result) {
  const meridian = MERIDIAN_GROUPS.find(m => m.id === result.meridianId)
  if (meridian) {
    expandedMeridianId.value = meridian.id
    selectPoint(meridian, result.point)
    searchQuery.value = ''
  }
}

/** 关闭详情面板 */
function closeDetail() {
  showDetailPanel.value = false
  pointDetail.value = null
}

/** 判断穴位是否选中 */
function isPointSelected(meridianId, pointName) {
  return selectedPoint.value
    && selectedPoint.value.meridianId === meridianId
    && selectedPoint.value.point === pointName
}

/** 按分类获取经脉列表 */
function getMeridiansByCategory(category) {
  return MERIDIAN_GROUPS.filter(m => m.category === category)
}

/** 当前展开经脉的完整数据 */
const activeMeridian = computed(() => {
  if (!expandedMeridianId.value) return null
  return MERIDIAN_GROUPS.find(m => m.id === expandedMeridianId.value) || null
})

/** 将主治文本拆分为标签数组 */
const diseaseTags = computed(() => {
  if (!pointDetail.value?.disease) return []
  // 按常见分隔符拆分：顿号、逗号、分号、空格
  return pointDetail.value.disease
    .split(/[、，,；;]+/)
    .map(s => s.trim())
    .filter(s => s.length > 0)
})
</script>

<template>
  <div class="acupoint-page">

    <!-- ==================== 左侧面板 ==================== -->
    <aside class="left-panel">

      <!-- 搜索栏 -->
      <div class="search-box">
        <Search :size="16" class="search-icon" />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="搜索穴位..."
          class="search-input"
        />
        <button v-if="searchQuery" class="search-clear" @click="searchQuery = ''">
          <X :size="14" />
        </button>
      </div>

      <!-- 搜索结果下拉 -->
      <div v-if="isSearching" class="search-results">
        <div v-if="searchResults.length === 0" class="search-empty">
          未找到"{{ searchQuery }}"相关穴位
        </div>
        <div
          v-for="(r, idx) in searchResults"
          :key="idx"
          class="search-result-item"
          @click="selectFromSearch(r)"
        >
          <span class="result-point">{{ r.point }}</span>
          <span class="result-meridian">{{ r.meridianName }}</span>
        </div>
      </div>

      <!-- 经脉手风琴列表 -->
      <div v-show="!isSearching" class="meridian-list">
        <template v-for="category in CATEGORIES" :key="category">
          <div class="category-header">
            <span class="category-bar"></span>
            <span class="category-name">{{ category }}</span>
          </div>

          <div
            v-for="meridian in getMeridiansByCategory(category)"
            :key="meridian.id"
            class="meridian-group"
          >
            <!-- 经脉标题行（可点击展开/收起） -->
            <div
              class="meridian-header"
              :class="{ 'meridian-header--active': expandedMeridianId === meridian.id }"
              @click="toggleMeridian(meridian.id)"
            >
              <span class="meridian-dot" :style="{ background: meridian.color }"></span>
              <span class="meridian-name">{{ meridian.name }}</span>
              <span class="meridian-count">{{ meridian.points.length }}穴</span>
              <component
                :is="expandedMeridianId === meridian.id ? ChevronDown : ChevronRight"
                :size="16"
                class="meridian-arrow"
              />
            </div>

            <!-- 穴位标签列表（展开时显示） -->
            <Transition name="accordion">
              <div
                v-if="expandedMeridianId === meridian.id"
                class="point-tags"
              >
                <button
                  v-for="point in meridian.points"
                  :key="point"
                  class="point-tag"
                  :class="{ 'point-tag--selected': isPointSelected(meridian.id, point) }"
                  @click.stop="selectPoint(meridian, point)"
                >
                  {{ point }}
                </button>
              </div>
            </Transition>
          </div>
        </template>
      </div>
    </aside>

    <!-- ==================== 中央视图区 ==================== -->
    <main class="center-viewport">

      <!-- 标题 + 2D/3D 切换 -->
      <div class="viewport-header">
        <h1 class="viewport-title">经络穴位导航</h1>
        <div class="view-toggle">
          <button
            class="toggle-btn"
            :class="{ 'toggle-btn--active': viewMode === '2D' }"
            @click="viewMode = '2D'"
          >
            2D
          </button>
          <button
            class="toggle-btn"
            :class="{ 'toggle-btn--active': viewMode === '3D' }"
            @click="viewMode = '3D'"
          >
            3D
          </button>
        </div>
      </div>

      <!-- 视图内容 -->
      <div class="viewport-content">

        <!-- 2D 视图 -->
        <div v-if="viewMode === '2D'" class="view-2d">
          <!-- 已选择经脉且有图片 -->
          <div v-if="activeMeridian && activeMeridian.image" class="image-2d-container">
            <img
              :src="activeMeridian.image"
              :alt="activeMeridian.name"
              class="image-2d"
              draggable="false"
            />
            <div class="image-2d-label">
              <span class="image-label-dot" :style="{ background: activeMeridian.color }"></span>
              {{ activeMeridian.name }}
            </div>
          </div>
          <!-- 未选择经脉 / 经外穴无图片 -->
          <div v-else class="placeholder-body">
            <div class="placeholder-text">
              <span class="placeholder-icon">🧘</span>
              <p>{{ activeMeridian ? activeMeridian.name : '2D 经络图' }}</p>
              <p class="placeholder-sub">
                {{ activeMeridian ? '暂无该经脉的2D图片' : '请在左侧选择经脉查看经络图' }}
              </p>
            </div>
          </div>
        </div>

        <!-- 3D 视图占位 -->
        <div v-if="viewMode === '3D'" class="view-3d">
          <div class="placeholder-body">
            <div class="placeholder-text">
              <span class="placeholder-icon">🫀</span>
              <p>3D 人体模型</p>
              <p class="placeholder-sub">Three.js 渲染区域（待接入）</p>
            </div>
          </div>
        </div>
      </div>

      <!-- 底部控制栏 -->
      <div class="viewport-footer">
        <div class="zoom-controls">
          <button class="zoom-btn" title="缩小"><ZoomOut :size="16" /></button>
          <button class="zoom-btn" title="放大"><ZoomIn :size="16" /></button>
          <button class="zoom-btn" title="重置视角"><RotateCcw :size="16" /></button>
        </div>
        <span class="footer-hint">点击穴位查看详情</span>
      </div>
    </main>

    <!-- ==================== 右侧详情面板 ==================== -->
    <Transition name="slide-right">
      <aside v-if="showDetailPanel && selectedPoint" class="right-panel">
        <button class="close-btn" @click="closeDetail">
          <X :size="18" />
        </button>

        <!-- 穴位名 -->
        <h2 class="detail-name">{{ selectedPoint.point }}</h2>

        <!-- 所属经脉标签 -->
        <span
          class="detail-meridian-badge"
          :style="{ background: selectedPoint.meridianColor + '18', color: selectedPoint.meridianColor, borderColor: selectedPoint.meridianColor + '30' }"
        >
          {{ selectedPoint.meridianName }}
        </span>

        <!-- 分割线 -->
        <div class="detail-divider">
          <span class="divider-line"></span>
          <span class="divider-diamond"></span>
          <span class="divider-line"></span>
        </div>

        <!-- 加载中 -->
        <div v-if="detailLoading" class="detail-loading">
          <div class="loading-spinner"></div>
          <span>查询中...</span>
        </div>

        <!-- 已获取到数据 -->
        <template v-else-if="pointDetail">
          <!-- 定位 -->
          <div class="detail-section">
            <div class="section-label">
              <span class="section-bar red"></span>
              <span class="section-title">定位</span>
            </div>
            <p class="section-content">
              {{ pointDetail.position || '暂无定位信息' }}
            </p>
          </div>

          <!-- 主治 -->
          <div class="detail-section">
            <div class="section-label">
              <span class="section-bar red"></span>
              <span class="section-title">主治</span>
            </div>
            <div v-if="diseaseTags.length" class="indication-tags">
              <span
                v-for="(tag, idx) in diseaseTags"
                :key="idx"
                class="indication-tag"
              >
                {{ tag }}
              </span>
            </div>
            <p v-else class="section-content muted">暂无主治信息</p>
          </div>
        </template>

        <!-- 数据库中无该穴位 -->
        <div v-else class="detail-empty">
          <span class="empty-icon">📋</span>
          <p>该穴位数据尚未录入</p>
        </div>

        <!-- 底部来源 -->
        <p class="detail-source">数据来源：中医百科</p>
      </aside>
    </Transition>

  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400;600;700&display=swap');

/* ==================== 页面整体 ==================== */
.acupoint-page {
  --primary: #8B5E3C;
  --primary-dark: #5D4037;
  --accent-red: #C44E46;
  --accent-green: #5D7A47;
  --bg: #FDFBF7;
  --panel-bg: rgba(253, 251, 247, 0.94);
  --text-main: #2c2c2c;
  --text-muted: #999;
  --radius: 12px;

  font-family: 'Noto Serif SC', 'SimSun', 宋体, serif;
  display: flex;
  height: 100vh;
  overflow: hidden;
  background: var(--bg);
  position: relative;
}

/* ==================== 左侧面板 ==================== */
.left-panel {
  width: 280px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  background: var(--panel-bg);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  border-right: 1px solid rgba(139, 94, 60, 0.1);
  z-index: 10;
  overflow: hidden;
}

/* 搜索框 */
.search-box {
  position: relative;
  display: flex;
  align-items: center;
  margin: 16px 14px 10px;
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(139, 94, 60, 0.15);
  border-radius: 10px;
  padding: 0 10px;
  transition: border-color 0.2s;
}
.search-box:focus-within {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(139, 94, 60, 0.08);
}

.search-icon { color: var(--primary); opacity: 0.5; flex-shrink: 0; }

.search-input {
  flex: 1;
  border: none;
  background: transparent;
  padding: 10px 8px;
  font-family: inherit;
  font-size: 0.88rem;
  color: var(--primary-dark);
  outline: none;
}
.search-input::placeholder { color: rgba(139, 94, 60, 0.4); }

.search-clear {
  display: flex; align-items: center; justify-content: center;
  width: 20px; height: 20px; border-radius: 50%;
  border: none; background: rgba(139, 94, 60, 0.1);
  color: var(--primary); cursor: pointer;
  transition: background 0.2s;
}
.search-clear:hover { background: rgba(139, 94, 60, 0.2); }

/* 搜索结果 */
.search-results {
  flex: 1;
  overflow-y: auto;
  padding: 0 14px 14px;
}

.search-empty {
  padding: 24px 0;
  text-align: center;
  font-size: 0.85rem;
  color: var(--text-muted);
}

.search-result-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.15s;
}
.search-result-item:hover {
  background: rgba(139, 94, 60, 0.06);
}

.result-point {
  font-size: 0.92rem;
  font-weight: 600;
  color: var(--primary-dark);
}
.result-meridian {
  font-size: 0.75rem;
  color: var(--text-muted);
}

/* 经脉列表 */
.meridian-list {
  flex: 1;
  overflow-y: auto;
  padding: 0 10px 20px;

  /* 自定义滚动条 */
  scrollbar-width: thin;
  scrollbar-color: rgba(139, 94, 60, 0.15) transparent;
}
.meridian-list::-webkit-scrollbar { width: 4px; }
.meridian-list::-webkit-scrollbar-track { background: transparent; }
.meridian-list::-webkit-scrollbar-thumb { background: rgba(139, 94, 60, 0.15); border-radius: 2px; }

/* 分类标题 */
.category-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 6px 8px;
}
.category-bar {
  width: 3px;
  height: 14px;
  background: var(--accent-red);
  border-radius: 2px;
}
.category-name {
  font-size: 0.88rem;
  font-weight: 700;
  color: var(--primary-dark);
  letter-spacing: 1px;
}

/* 经脉组 */
.meridian-group {
  margin-bottom: 2px;
}

/* 经脉标题行 */
.meridian-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 10px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  user-select: none;
}
.meridian-header:hover {
  background: rgba(139, 94, 60, 0.05);
}
.meridian-header--active {
  background: var(--primary-dark);
  color: #fff;
}
.meridian-header--active:hover {
  background: var(--primary-dark);
}

.meridian-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.meridian-name {
  flex: 1;
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--primary-dark);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.meridian-header--active .meridian-name { color: #fff; }

.meridian-count {
  font-size: 0.72rem;
  color: var(--text-muted);
  flex-shrink: 0;
}
.meridian-header--active .meridian-count { color: rgba(255,255,255,0.7); }

.meridian-arrow {
  color: var(--text-muted);
  flex-shrink: 0;
}
.meridian-header--active .meridian-arrow { color: rgba(255,255,255,0.7); }

/* 穴位标签区 */
.point-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 8px 10px 12px 26px;
  overflow: hidden;
}

.point-tag {
  padding: 4px 10px;
  font-family: inherit;
  font-size: 0.78rem;
  color: var(--primary-dark);
  background: rgba(255, 255, 255, 0.7);
  border: 1px solid rgba(139, 94, 60, 0.12);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
}
.point-tag:hover {
  background: rgba(139, 94, 60, 0.08);
  border-color: rgba(139, 94, 60, 0.25);
}
.point-tag--selected {
  background: var(--primary-dark);
  color: #fff;
  border-color: var(--primary-dark);
}

/* 手风琴动画 */
.accordion-enter-active,
.accordion-leave-active {
  transition: all 0.3s ease;
  max-height: 500px;
  opacity: 1;
}
.accordion-enter-from,
.accordion-leave-to {
  max-height: 0;
  opacity: 0;
  padding-top: 0;
  padding-bottom: 0;
}

/* ==================== 中央视图区 ==================== */
.center-viewport {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  position: relative;
  background:
    url("data:image/svg+xml,%3Csvg width='200' height='200' viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E"),
    var(--bg);
}

/* 标题 + 切换 */
.viewport-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px 20px 0;
  gap: 12px;
  z-index: 2;
}

.viewport-title {
  font-size: 1.6rem;
  font-weight: 700;
  color: var(--primary-dark);
  letter-spacing: 4px;
  margin: 0;
  text-shadow: 0 1px 2px rgba(0,0,0,0.05);
}

/* 2D / 3D 切换按钮 */
.view-toggle {
  display: flex;
  background: rgba(139, 94, 60, 0.06);
  border-radius: 8px;
  padding: 3px;
  border: 1px solid rgba(139, 94, 60, 0.1);
}

.toggle-btn {
  padding: 6px 20px;
  font-family: inherit;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--primary);
  background: transparent;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.25s;
  letter-spacing: 1px;
}
.toggle-btn--active {
  background: var(--primary-dark);
  color: #fff;
  box-shadow: 0 2px 6px rgba(93, 64, 55, 0.2);
}

/* 视图内容区 */
.viewport-content {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
}

/* 视图区域 */
.view-2d,
.view-3d {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 2D 图片展示 */
.image-2d-container {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  overflow: hidden;
}

.image-2d {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  border-radius: 12px;
  box-shadow: 0 4px 24px rgba(139, 94, 60, 0.08);
  animation: imageIn 0.4s ease-out;
  user-select: none;
}

@keyframes imageIn {
  from { opacity: 0; transform: scale(0.97); }
  to { opacity: 1; transform: scale(1); }
}

.image-2d-label {
  position: absolute;
  top: 24px;
  left: 24px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 14px;
  background: rgba(253, 251, 247, 0.88);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(139, 94, 60, 0.1);
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--primary-dark);
  letter-spacing: 1px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.image-label-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.placeholder-body {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  border: 2px dashed rgba(139, 94, 60, 0.12);
  border-radius: 20px;
  margin: 16px;
}

.placeholder-text {
  text-align: center;
  color: var(--primary);
  opacity: 0.5;
}
.placeholder-text .placeholder-icon {
  font-size: 3.5rem;
  display: block;
  margin-bottom: 8px;
}
.placeholder-text p {
  margin: 4px 0;
  font-size: 1.1rem;
  font-weight: 600;
  letter-spacing: 2px;
}
.placeholder-text .placeholder-sub {
  font-size: 0.85rem;
  font-weight: 400;
  opacity: 0.7;
}

/* 底部控制栏 */
.viewport-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 20px 14px;
  z-index: 2;
}

.zoom-controls {
  display: flex;
  gap: 6px;
}

.zoom-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 8px;
  border: 1px solid rgba(139, 94, 60, 0.15);
  background: rgba(255, 255, 255, 0.8);
  color: var(--primary);
  cursor: pointer;
  transition: all 0.2s;
}
.zoom-btn:hover {
  background: rgba(139, 94, 60, 0.08);
  border-color: var(--primary);
}

.footer-hint {
  font-size: 0.78rem;
  color: rgba(139, 94, 60, 0.35);
  letter-spacing: 1px;
}

/* ==================== 右侧详情面板 ==================== */
.right-panel {
  width: 300px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  background: var(--panel-bg);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  border-left: 1px solid rgba(139, 94, 60, 0.1);
  padding: 20px;
  overflow-y: auto;
  z-index: 10;
  position: relative;
}

.close-btn {
  position: absolute;
  top: 14px;
  right: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: var(--primary);
  cursor: pointer;
  transition: background 0.2s;
}
.close-btn:hover {
  background: rgba(139, 94, 60, 0.1);
}

.detail-name {
  font-size: 2rem;
  font-weight: 700;
  color: var(--primary-dark);
  margin: 0 0 12px;
  letter-spacing: 3px;
}

.detail-meridian-badge {
  display: inline-block;
  padding: 4px 12px;
  font-size: 0.78rem;
  font-weight: 600;
  border-radius: 20px;
  border: 1px solid;
  letter-spacing: 0.5px;
  margin-bottom: 16px;
}

/* 分割线 */
.detail-divider {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 20px;
}
.divider-line {
  flex: 1;
  height: 1px;
  background: rgba(139, 94, 60, 0.12);
}
.divider-diamond {
  width: 5px;
  height: 5px;
  background: var(--accent-red);
  transform: rotate(45deg);
  flex-shrink: 0;
}

/* 详情区块 */
.detail-section {
  margin-bottom: 22px;
}

.section-label {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}

.section-bar {
  width: 3px;
  height: 16px;
  border-radius: 2px;
}
.section-bar.red { background: var(--accent-red); }

.section-title {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--accent-red);
  letter-spacing: 1px;
}

.section-content {
  font-size: 0.88rem;
  line-height: 1.75;
  color: var(--primary-dark);
  margin: 0;
  text-align: justify;
}

.placeholder-content {
  color: var(--text-muted);
  font-style: italic;
}

.section-content.muted {
  color: var(--text-muted);
  font-style: italic;
}

/* 加载状态 */
.detail-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 32px 0;
  color: var(--primary);
  font-size: 0.85rem;
}

.loading-spinner {
  width: 24px;
  height: 24px;
  border: 2px solid rgba(139, 94, 60, 0.15);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* 无数据状态 */
.detail-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 32px 0;
  color: var(--text-muted);
  text-align: center;
}

.empty-icon {
  font-size: 2rem;
  opacity: 0.5;
}

.detail-empty p {
  margin: 0;
  font-size: 0.85rem;
}

/* 主治标签 */
.indication-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.indication-tag {
  padding: 4px 12px;
  font-size: 0.82rem;
  color: var(--primary-dark);
  background: rgba(139, 94, 60, 0.06);
  border: 1px solid rgba(139, 94, 60, 0.1);
  border-radius: 6px;
}

.detail-source {
  margin-top: auto;
  padding-top: 16px;
  font-size: 0.72rem;
  color: rgba(139, 94, 60, 0.3);
  text-align: right;
}

/* 右面板滑入动画 */
.slide-right-enter-active {
  transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1);
}
.slide-right-leave-active {
  transition: all 0.25s ease-in;
}
.slide-right-enter-from {
  transform: translateX(100%);
  opacity: 0;
}
.slide-right-leave-to {
  transform: translateX(100%);
  opacity: 0;
}

/* ==================== 响应式 ==================== */
@media (max-width: 900px) {
  .acupoint-page {
    flex-direction: column;
    height: auto;
    min-height: 100vh;
  }

  .left-panel {
    width: 100%;
    max-height: 45vh;
    border-right: none;
    border-bottom: 1px solid rgba(139, 94, 60, 0.1);
  }

  .right-panel {
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    width: 85vw;
    max-width: 340px;
    box-shadow: -4px 0 24px rgba(0, 0, 0, 0.1);
  }

  .center-viewport {
    min-height: 50vh;
  }
}
</style>

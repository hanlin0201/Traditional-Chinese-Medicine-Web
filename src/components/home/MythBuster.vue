<script setup>
import { ref, computed, onMounted, watch } from "vue";
import {
  HelpCircle,
  XCircle,
  RefreshCw,
  Loader2,
  Search,
  ChevronDown,
  ChevronUp,
} from "lucide-vue-next";
import { supabase } from "@/supabaseClient";
import { FEATURE_COPY } from "@/constants/branding";

const bgImage = "/images/myth-bg-2.jpg?v=2";

const fullMyths = ref([]);
const displayedMyths = ref([]);
const loading = ref(false);
const expandedId = ref(null);
const mythSearch = ref("");
const activeHitIndex = ref(0);

let hitIdOrder = [];

const FALLBACK = [
  {
    id: 1,
    emoji: "❌",
    question: "感冒了就要立刻喝姜汤捂汗？",
    answer: "错！",
    detail:
      '姜汤只适用于<span class="hl">风寒感冒</span>（怕冷、流清涕）。若是风热感冒，喝姜汤如同火上浇油。',
    type: "danger",
  },
  {
    id: 2,
    emoji: "🚫",
    question: "晚上吃姜，真的等于吃砒霜？",
    answer: "片面。",
    detail:
      "中医认为夜间主收敛，姜主发散，晚上吃姜会影响睡眠、伤阴，但绝无砒霜之毒。",
    type: "warning",
  },
  {
    id: 3,
    emoji: "💡",
    question: "只有肾虚的人才需要吃黑芝麻？",
    answer: "非也。",
    detail:
      "黑芝麻补肝肾、润五脏，还能润肠通便、乌发美容，普通人日常食疗也非常合适。",
    type: "safe",
  },
];

function normalize(row, index) {
  const id = row.id != null ? Number(row.id) || index + 1 : index + 1;
  const answer =
    row.answer_text != null && String(row.answer_text).trim() !== ""
      ? row.answer_text
      : (row.answer ?? "");
  return {
    id,
    emoji: row.emoji ?? "",
    question: row.question ?? "",
    answer,
    detail: row.detail ?? "",
    type: row.type ?? "warning",
  };
}

function hasValidItems(list) {
  return (
    Array.isArray(list) &&
    list.some((item) => item && String(item.question || "").trim() !== "")
  );
}

function stripHtml(html) {
  if (html == null) return "";
  return String(html)
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeHtml(text) {
  return String(text ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function highlightPlain(text, q) {
  const t = String(text ?? "");
  const needle = String(q ?? "").trim();
  if (!needle) return escapeHtml(t);
  const re = new RegExp(needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
  let out = "";
  let last = 0;
  let m;
  while ((m = re.exec(t)) !== null) {
    out += escapeHtml(t.slice(last, m.index));
    out += `<mark class="myth-search-hit">${escapeHtml(m[0])}</mark>`;
    last = m.index + m[0].length;
    if (m[0].length === 0) {
      re.lastIndex++;
      if (re.lastIndex > t.length) break;
    }
  }
  out += escapeHtml(t.slice(last));
  return out;
}

const BATCH_SIZE = 3;

const isMythSearching = computed(() => mythSearch.value.trim().length > 0);

const mythSourceList = computed(() => {
  const list = fullMyths.value;
  return list && list.length && hasValidItems(list) ? list : FALLBACK;
});

function rowMatchesQuery(item, q) {
  const hay = [item.question, item.answer, stripHtml(item.detail)]
    .filter(Boolean)
    .join("\u0001");
  return hay.includes(q);
}

const visibleMyths = computed(() => {
  const src = mythSourceList.value;
  const q = mythSearch.value.trim();
  if (!q) {
    return displayedMyths.value.length
      ? displayedMyths.value
      : src.slice(0, BATCH_SIZE);
  }
  return src.filter((item) => rowMatchesQuery(item, q));
});

watch([visibleMyths, mythSearch], () => {
  const q = mythSearch.value.trim();
  if (!q) {
    activeHitIndex.value = 0;
    hitIdOrder = [];
    return;
  }
  hitIdOrder = visibleMyths.value.map((x) => x.id);
  if (hitIdOrder.length === 0) {
    activeHitIndex.value = 0;
    return;
  }
  if (activeHitIndex.value >= hitIdOrder.length) activeHitIndex.value = 0;
});

function clearMythSearch() {
  mythSearch.value = "";
  expandedId.value = null;
  activeHitIndex.value = 0;
}

function focusHit(delta) {
  const ids = hitIdOrder.length
    ? hitIdOrder
    : visibleMyths.value.map((x) => x.id);
  if (!ids.length) return;
  let idx = activeHitIndex.value;
  if (!hitIdOrder.length) hitIdOrder = ids;
  idx = (idx + delta + ids.length) % ids.length;
  activeHitIndex.value = idx;
  const id = ids[idx];
  expandedId.value = id;
  requestAnimationFrame(() => {
    const el = document.querySelector(`[data-myth-id="${id}"]`);
    el?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  });
}

function pickRandomBatch() {
  const list = fullMyths.value;
  if (!list || list.length === 0) return;
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  displayedMyths.value = copy.slice(0, BATCH_SIZE);
}

async function loadMyths() {
  loading.value = true;
  fullMyths.value = [];
  displayedMyths.value = [];
  mythSearch.value = "";
  expandedId.value = null;
  try {
    const { data, error } = await supabase.from("myths").select("*");
    if (error) {
      console.warn("[养生避雷针] Supabase error:", error.message);
      fullMyths.value = [...FALLBACK];
      pickRandomBatch();
      return;
    }
    const raw = Array.isArray(data) ? data : [];
    const mapped = raw.map((r, i) => normalize(r, i));
    fullMyths.value = hasValidItems(mapped) ? mapped : [...FALLBACK];
    pickRandomBatch();
  } catch (e) {
    console.warn("[养生避雷针] load failed:", e);
    fullMyths.value = [...FALLBACK];
    pickRandomBatch();
  } finally {
    loading.value = false;
  }
}

function refreshBatch() {
  if (isMythSearching.value) return;
  if (!fullMyths.value.length) return;
  expandedId.value = null;
  pickRandomBatch();
}

function toggle(id) {
  expandedId.value = expandedId.value === id ? null : id;
}

onMounted(() => {
  loadMyths();
});
</script>

<template>
  <section
    class="myth-buster-screen"
    :style="{ backgroundImage: `url(${bgImage})` }"
  >
    <div class="bg-overlay"></div>

    <div class="content-wrapper">
      <div class="section-header">
        <div class="title-row">
          <h3 class="title">{{ FEATURE_COPY.mythBuster.title }}</h3>
          <div
            class="refresh-control"
            :class="{ 'is-loading': loading, 'is-disabled': isMythSearching }"
            @click="refreshBatch"
          >
            <RefreshCw class="refresh-icon" />
            <span class="action-text">随机换一批</span>
          </div>
        </div>
        <span class="subtitle">{{ FEATURE_COPY.mythBuster.motto }}</span>

        <div class="myth-search-bar">
          <div class="myth-search-field">
            <Search class="myth-search-icon" :size="18" aria-hidden="true" />
            <input
              v-model="mythSearch"
              type="search"
              class="myth-search-input"
              placeholder="搜索谣言、结论或解析中的关键词…"
              enterkeyhint="search"
              autocomplete="off"
            />
            <div
              v-if="isMythSearching && visibleMyths.length"
              class="myth-hit-nav"
            >
              <button
                type="button"
                class="hit-btn"
                aria-label="上一条"
                @click.stop="focusHit(-1)"
              >
                <ChevronUp :size="18" />
              </button>
              <span class="hit-count"
                >{{ activeHitIndex + 1 }} / {{ visibleMyths.length }}</span
              >
              <button
                type="button"
                class="hit-btn"
                aria-label="下一条"
                @click.stop="focusHit(1)"
              >
                <ChevronDown :size="18" />
              </button>
            </div>
            <button
              v-show="mythSearch.trim()"
              type="button"
              class="myth-search-clear"
              aria-label="清空搜索"
              @click.stop="clearMythSearch"
            >
              清空
            </button>
          </div>
          <p v-if="isMythSearching" class="myth-search-meta">
            <template v-if="visibleMyths.length">
              在 {{ mythSourceList.length }} 条中匹配到
              {{ visibleMyths.length }} 条（含问题、结论与解析纯文本）
            </template>
            <template v-else
              >未匹配到包含「{{ mythSearch.trim() }}」的条目</template
            >
          </p>
        </div>
      </div>

      <div class="myth-list">
        <div v-if="loading" class="loading-state">
          <Loader2 class="w-8 h-8 animate-spin text-brown-600" />
          <p>正在搜罗养生秘籍...</p>
        </div>
        <template v-else>
          <div
            v-for="(item, idx) in visibleMyths"
            :key="item.id + '-' + idx"
            class="myth-item"
            :class="{
              'is-expanded': expandedId === item.id,
              'is-search-hit':
                isMythSearching &&
                hitIdOrder.length &&
                hitIdOrder[activeHitIndex] === item.id,
            }"
            :data-myth-id="item.id"
            @click="toggle(item.id)"
          >
            <div class="myth-question">
              <span class="emoji" v-if="item.emoji">{{ item.emoji }}</span>
              <HelpCircle class="icon-q" />
              <span
                v-if="isMythSearching"
                v-html="highlightPlain(item.question, mythSearch)"
              />
              <span v-else>{{ item.question }}</span>
              <span class="indicator">{{
                expandedId === item.id ? "收起" : "揭秘"
              }}</span>
            </div>

            <div
              v-show="expandedId === item.id"
              class="myth-answer animate-slide-down"
            >
              <div class="answer-badge" :class="item.type">
                <XCircle class="w-5 h-5 text-red-500" />
                <span
                  v-if="isMythSearching"
                  class="font-bold answer-text"
                  v-html="highlightPlain(item.answer, mythSearch)"
                />
                <span v-else class="font-bold answer-text">{{
                  item.answer
                }}</span>
              </div>
              <p
                v-if="isMythSearching"
                class="detail"
                v-html="highlightPlain(stripHtml(item.detail), mythSearch)"
              />
              <p v-else class="detail" v-html="item.detail"></p>
            </div>
          </div>
        </template>
      </div>
    </div>
  </section>
</template>

<style scoped>
.myth-buster-screen {
  position: relative;
  width: 100%;
  height: 100vh;
  scroll-snap-align: start;
  scroll-snap-stop: always;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.bg-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.4);
  z-index: 0;
}

.content-wrapper {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 800px;
  padding: 40px;
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(16px);
  border-radius: 24px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  border: 1px solid rgba(255, 255, 255, 0.5);
  max-height: 90vh;
  overflow-y: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.content-wrapper::-webkit-scrollbar {
  display: none;
  width: 0;
}

.section-header {
  text-align: center;
  margin-bottom: 30px;
}
.title-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
  flex-wrap: wrap;
  margin-bottom: 8px;
}
.title {
  font-family: "Ma Shan Zheng", cursive;
  font-size: 2.35rem;
  color: #5d4037;
  font-weight: 400;
  margin: 0;
  letter-spacing: 0.08em;
}
.refresh-control {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  color: #8b5e3c;
  font-size: 0.95rem;
  padding: 6px 14px;
  border-radius: 24px;
  border: 1px solid rgba(139, 94, 60, 0.3);
  background: rgba(255, 255, 255, 0.6);
  transition: all 0.25s;
}
.refresh-control:hover {
  background: #c44d36;
  color: white;
  border-color: #c44d36;
}
.refresh-control.is-disabled {
  opacity: 0.45;
  cursor: not-allowed;
  pointer-events: none;
}
.refresh-control.is-loading .refresh-icon {
  animation: spin 0.8s linear infinite;
}
@keyframes spin {
  100% {
    transform: rotate(360deg);
  }
}
.refresh-icon {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
}
.action-text {
  font-weight: 600;
}
.subtitle {
  font-family: "Ma Shan Zheng", cursive;
  font-size: 1.05rem;
  color: #8b5e3c;
  letter-spacing: 0.14em;
}

.myth-search-bar {
  margin-top: 22px;
  text-align: left;
}
.myth-search-field {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-radius: 12px;
  border: 1px solid rgba(139, 94, 60, 0.22);
  background: rgba(255, 255, 255, 0.75);
}
.myth-search-icon {
  flex-shrink: 0;
  color: #8b5e3c;
}
.myth-search-input {
  flex: 1;
  min-width: 140px;
  border: none;
  background: transparent;
  font-size: 0.95rem;
  color: #3e2723;
  outline: none;
}
.myth-search-input::placeholder {
  color: #a1887f;
}
.myth-hit-nav {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}
.hit-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
  border: none;
  border-radius: 8px;
  background: rgba(139, 94, 60, 0.12);
  color: #5d4037;
  cursor: pointer;
  transition: background 0.2s;
}
.hit-btn:hover {
  background: rgba(196, 77, 54, 0.25);
}
.hit-count {
  font-size: 0.8rem;
  color: #6d4c41;
  min-width: 3.2rem;
  text-align: center;
  font-variant-numeric: tabular-nums;
}
.myth-search-clear {
  flex-shrink: 0;
  border: none;
  background: transparent;
  color: #c44d36;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 8px;
}
.myth-search-clear:hover {
  background: rgba(196, 77, 54, 0.12);
}
.myth-search-meta {
  margin: 8px 0 0;
  font-size: 0.8rem;
  color: #8b7355;
  line-height: 1.5;
}
:deep(.myth-search-hit) {
  background: #fff59d;
  color: inherit;
  padding: 0 2px;
  border-radius: 2px;
}
.myth-item.is-search-hit {
  box-shadow:
    0 0 0 2px #c44d36,
    0 10px 15px rgba(0, 0, 0, 0.06);
}

.myth-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-height: 200px;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  color: #8b5e3c;
  gap: 10px;
}

.myth-item {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.02);
  border: 1px solid rgba(139, 94, 60, 0.1);
  transition: all 0.3s ease;
  cursor: pointer;
}
.myth-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 15px rgba(0, 0, 0, 0.05);
  border-color: #c44d36;
}

.myth-question {
  padding: 20px 24px;
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 1.1rem;
  color: #2c2c2c;
  font-weight: 500;
}
.emoji {
  font-size: 1.2rem;
  line-height: 1;
}
.icon-q {
  color: #c44d36;
  width: 22px;
  height: 22px;
  flex-shrink: 0;
}
.indicator {
  margin-left: auto;
  font-size: 0.85rem;
  color: #888;
  background: #f5f5f5;
  padding: 4px 10px;
  border-radius: 20px;
  transition: all 0.3s;
}
.myth-item:hover .indicator {
  background: #c44d36;
  color: white;
}

.myth-answer {
  background: #fff5f2;
  padding: 15px 24px 24px 58px;
  border-top: 1px dashed rgba(196, 77, 54, 0.2);
}
.answer-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}
.answer-badge .answer-text {
  color: #c62828;
}
.answer-badge.warning .answer-text {
  color: #e65100;
}
.answer-badge.safe .answer-text {
  color: #2e7d32;
}
.detail {
  font-size: 1rem;
  color: #5d4037;
  line-height: 1.7;
}
.detail :deep(.hl) {
  font-weight: 700;
  color: #5d4037;
}
.detail :deep(.danger) {
  color: #c62828;
  font-weight: 600;
}
.detail :deep(.warning) {
  color: #e65100;
  font-weight: 500;
}
.detail :deep(.safe) {
  color: #2e7d32;
  font-weight: 500;
}

.animate-slide-down {
  animation: slideDown 0.3s cubic-bezier(0.25, 0.8, 0.5, 1);
}
@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
    height: 0;
  }
  to {
    opacity: 1;
    transform: translateY(0);
    height: auto;
  }
}

@media (max-width: 768px) {
  .content-wrapper {
    padding: 20px;
    width: 95%;
  }
  .title {
    font-size: 1.5rem;
  }
}
</style>

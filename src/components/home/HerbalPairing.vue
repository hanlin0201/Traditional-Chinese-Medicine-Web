<script setup>
import { ref, computed, onMounted, watch } from "vue";
import { useRouter } from "vue-router";
import { Link, AlertTriangle, Compass, Search, X } from "lucide-vue-next";
import { supabase } from "@/supabaseClient";
import { FEATURE_COPY } from "@/constants/branding";

const router = useRouter();
const fullPairings = ref([]);
const browsePairs = ref([]);
const herbQuery = ref("");
const loading = ref(false);
/**
 * 搜索结果必须用 ref（深度响应），不能用 shallowRef：
 * 点击翻转只改 item.isOpen，shallowRef 不会跟踪深层属性，界面不更新。
 */
const searchPairs = ref([]);

const SEARCH_RESULT_CAP = 200;

const isSearching = computed(() => herbQuery.value.trim().length > 0);

watch(
  [herbQuery, fullPairings],
  () => {
    const q = herbQuery.value.trim();
    if (!q) {
      searchPairs.value = [];
      return;
    }
    const list = fullPairings.value;
    searchPairs.value = list
      .filter(
        (p) =>
          (p.left_herb && String(p.left_herb).includes(q)) ||
          (p.right_herb && String(p.right_herb).includes(q))
      )
      .slice(0, SEARCH_RESULT_CAP)
      .map((p, i) => ({
        ...mapPairingRow(p),
        _key: `s-${p.id ?? i}-${i}`,
      }));
  },
  { immediate: true }
);

const displayedPairs = computed(() => {
  if (herbQuery.value.trim()) return searchPairs.value;
  return browsePairs.value;
});

const pairRowKey = (item, index) =>
  isSearching.value ? item._key ?? `s-${item.id}-${index}` : item.id ?? index;

// --- 背景图设置 ---
const bgImage =
  "https://img95.699pic.com/video_cover/46/24/21/a_awADQHKSEUjU1630462421.jpg!/fw/820";

function mapPairingRow(item) {
  return {
    ...item,
    isOpen: false,
  };
}

function pickRandomBrowse() {
  const list = fullPairings.value;
  if (!list.length) {
    browsePairs.value = [];
    return;
  }
  const shuffled = [...list].sort(() => Math.random() - 0.5);
  browsePairs.value = shuffled.slice(0, 16).map(mapPairingRow);
}

function clearHerbSearch() {
  herbQuery.value = "";
}

function shuffleBrowseBatch() {
  if (loading.value || isSearching.value) return;
  pickRandomBrowse();
}

// --- 1. 加载全量配伍 + 随机浏览 ---
const fetchRandomPairings = async () => {
  loading.value = true;
  try {
    const { data, error } = await supabase
      .from("herbal_pairings")
      .select("*")
      .limit(2000);

    if (error) throw error;

    const rows = Array.isArray(data) ? data : [];
    fullPairings.value = rows.map(mapPairingRow);
    pickRandomBrowse();
  } catch (e) {
    console.error("获取失败:", e);
    // 演示数据
    const demo = [
      {
        id: 1,
        type: "good",
        left_herb: "枸杞",
        right_herb: "菊花",
        effect: "清肝明目",
        description:
          "枸杞滋补肝肾，菊花清热解毒。二者搭配，补而不腻，常用于目赤肿痛或视力减退。",
        isOpen: false,
      },
      {
        id: 2,
        type: "bad",
        left_herb: "甘草",
        right_herb: "甘遂",
        effect: "十八反",
        description: "药性相反，同用产生剧烈毒性，损伤元气，属于十八反禁忌。",
        isOpen: false,
      },
      {
        id: 3,
        type: "good",
        left_herb: "黄芪",
        right_herb: "当归",
        effect: "气血双补",
        description:
          "当归补血活血，黄芪补气生血。气旺则血生，是补血汤的经典配伍。",
        isOpen: false,
      },
      {
        id: 4,
        type: "good",
        left_herb: "陈皮",
        right_herb: "半夏",
        effect: "燥湿化痰",
        description: "陈皮理气，半夏化痰。二药相须为用，大大增强化痰功效。",
        isOpen: false,
      },
      {
        id: 5,
        type: "good",
        left_herb: "人参",
        right_herb: "莱菔子",
        effect: "补气消食",
        description:
          "虽有人参恶莱菔子之说，但临床上二者同用可防补气太过导致的腹胀。",
        isOpen: false,
      },
      {
        id: 6,
        type: "good",
        left_herb: "麦冬",
        right_herb: "五味子",
        effect: "敛肺生津",
        description:
          "麦冬养阴，五味子敛肺，合用适于气阴两虚之咳喘口干。",
        isOpen: false,
      },
      {
        id: 7,
        type: "good",
        left_herb: "白芍",
        right_herb: "甘草",
        effect: "缓急止痛",
        description: "芍药甘草汤意，酸甘化阴，舒筋缓急。",
        isOpen: false,
      },
      {
        id: 8,
        type: "good",
        left_herb: "茯苓",
        right_herb: "白术",
        effect: "健脾利湿",
        description: "健脾与渗湿相配，适于脾虚湿困。",
        isOpen: false,
      },
      {
        id: 9,
        type: "good",
        left_herb: "桂枝",
        right_herb: "白芍",
        effect: "调和营卫",
        description: "一散一收，调和营卫，为桂枝汤核心配伍。",
        isOpen: false,
      },
      {
        id: 10,
        type: "good",
        left_herb: "川芎",
        right_herb: "白芷",
        effect: "祛风止痛",
        description: "上行头目，祛风止痛，多用于风寒头痛。",
        isOpen: false,
      },
      {
        id: 11,
        type: "good",
        left_herb: "地黄",
        right_herb: "山茱萸",
        effect: "补益肝肾",
        description: "滋阴固精，常用于肾虚腰酸、遗精等。",
        isOpen: false,
      },
      {
        id: 12,
        type: "good",
        left_herb: "知母",
        right_herb: "黄柏",
        effect: "滋阴降火",
        description: "知母清热滋阴，黄柏泻火，相须用于阴虚火旺。",
        isOpen: false,
      },
      {
        id: 13,
        type: "good",
        left_herb: "柴胡",
        right_herb: "黄芩",
        effect: "和解少阳",
        description: "表里兼顾，和解少阳，小柴胡汤要药。",
        isOpen: false,
      },
      {
        id: 14,
        type: "good",
        left_herb: "桔梗",
        right_herb: "枳壳",
        effect: "升降气机",
        description: "一升一降，宣肺宽中，气机调畅。",
        isOpen: false,
      },
      {
        id: 15,
        type: "good",
        left_herb: "石膏",
        right_herb: "知母",
        effect: "清气分热",
        description: "清热泻火力强，适用于气分大热。",
        isOpen: false,
      },
      {
        id: 16,
        type: "good",
        left_herb: "玄参",
        right_herb: "麦冬",
        effect: "养阴润燥",
        description: "增液润燥，多用于热病伤阴、咽干口燥。",
        isOpen: false,
      },
    ];
    fullPairings.value = demo.map(mapPairingRow);
    pickRandomBrowse();
  } finally {
    setTimeout(() => {
      loading.value = false;
    }, 800);
  }
};

// --- 2. 交互逻辑 ---
const toggleFlip = (item) => {
  item.isOpen = !item.isOpen;
};

const navToHerb = (e, name) => {
  e.stopPropagation();
  router.push(`/herb/${name}`);
};

onMounted(() => {
  fetchRandomPairings();
});
</script>

<template>
  <div
    class="herbal-match-section"
    :style="{ backgroundImage: `url(${bgImage})` }"
  >
    <div class="bg-overlay"></div>

    <div class="content-layer">
      <div class="match-header">
        <div class="title-area">
          <h2 class="main-title">百子柜 · {{ FEATURE_COPY.pairing.title }}</h2>
          <p class="sub-title">{{ FEATURE_COPY.pairing.motto }}</p>
        </div>

        <div
          class="refresh-control"
          :class="{ 'is-disabled': isSearching }"
          @click="shuffleBrowseBatch"
        >
          <div class="compass-box" :class="{ 'is-loading': loading }">
            <Compass :size="28" />
          </div>
          <div class="label-group">
            <span class="action-text">换一批</span>
          </div>
        </div>
      </div>

      <div class="search-row">
        <div class="search-field">
          <Search class="search-icon" :size="18" aria-hidden="true" />
          <input
            v-model="herbQuery"
            type="search"
            class="herb-search-input"
            placeholder="输入药材名，查看与之宜 / 忌配伍的药材"
            enterkeyhint="search"
            autocomplete="off"
          />
          <button
            v-show="herbQuery.trim()"
            type="button"
            class="search-clear"
            aria-label="清空"
            @click="clearHerbSearch"
          >
            <X :size="16" />
          </button>
        </div>
        <p v-if="isSearching" class="search-hint">
          <template v-if="displayedPairs.length">
            共 {{ displayedPairs.length }} 条配伍
            <span v-if="displayedPairs.length >= SEARCH_RESULT_CAP">
              （至多展示 {{ SEARCH_RESULT_CAP }} 条）
            </span>
          </template>
          <template v-else> 未找到包含「{{ herbQuery.trim() }}」的配伍记录 </template>
        </p>
      </div>

      <div class="cabinet-container">
        <div class="cabinet-inner">
          <div
            v-for="(item, idx) in displayedPairs"
            :key="pairRowKey(item, idx)"
            class="grid-cell"
            @click="toggleFlip(item)"
          >
            <div class="flip-inner" :class="{ 'is-flipped': item.isOpen }">
              <div class="card-face card-front" :class="item.type">
                <div class="brass-ring"></div>

                <div class="herb-names">
                  <span class="herb-text">{{ item.left_herb }}</span>
                  <div class="icon-wrap" :class="item.type">
                    <Link v-if="item.type === 'good'" size="10" />
                    <AlertTriangle v-else size="10" />
                  </div>
                  <span class="herb-text">{{ item.right_herb }}</span>
                </div>

                <div class="drawer-label">{{ item.effect }}</div>
                <div class="click-hint">点击翻转</div>
              </div>

              <div class="card-face card-back" :class="item.type">
                <div class="back-header">
                  <span class="back-tag" :class="item.type">
                    {{ item.type === "good" ? "宜" : "忌" }}
                  </span>
                  <span class="back-effect">{{ item.effect }}</span>
                </div>

                <div class="back-content">
                  <p class="back-desc">{{ item.description }}</p>
                </div>

                <div class="back-footer">
                  <span
                    class="link-pill"
                    @click="(e) => navToHerb(e, item.left_herb)"
                  >
                    {{ item.left_herb }}
                  </span>
                  <span
                    class="link-pill"
                    @click="(e) => navToHerb(e, item.right_herb)"
                  >
                    {{ item.right_herb }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@import url("https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400;700&display=swap");

.herbal-match-section {
  position: relative;
  width: 100%;
  min-height: 100vh;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  /* filter: brightness(0.9); 这个滤镜可以去掉了，我们用遮罩层来实现 */
  font-family: "Noto Serif SC", serif;
  box-sizing: border-box;
}

/* 【修复点 2】恢复并修正遮罩层样式 */
.bg-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  /* 使用黑色半透明背景，0.4 表示 40% 的不透明度，数字越大越暗 */
  background-color: rgba(0, 0, 0, 0.4);
  z-index: 0;
  /* pointer-events: none; 确保点击事件能穿透遮罩层，不过在这里 z-index 已经处理了 */
}

.content-layer {
  position: relative;
  z-index: 1;
  width: 100%;
  height: 100%;
  padding: clamp(40px, 9vh, 70px) clamp(12px, 2vw, 20px) clamp(12px, 2vh, 20px);
  box-sizing: border-box;
  overflow-y: auto;
  overflow-x: hidden;
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.content-layer::-webkit-scrollbar {
  display: none;
  width: 0;
}

/* --- 下面是之前调整过的紧凑版样式 (保持不变) --- */

.match-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  max-width: 1000px;
  margin: 0 auto 20px;
  border-bottom: 2px solid rgba(255, 255, 255, 0.35);
  padding-bottom: 10px;
}
.main-title {
  font-family: "Ma Shan Zheng", cursive;
  font-size: 1.85rem;
  color: #fff;
  margin: 0;
  letter-spacing: 0.12em;
  font-weight: 400;
  text-shadow:
    0 1px 3px rgba(0, 0, 0, 0.45),
    0 0 24px rgba(0, 0, 0, 0.25);
}
.sub-title {
  font-family: "Ma Shan Zheng", cursive;
  font-size: 0.95rem;
  color: rgba(255, 255, 255, 0.88);
  letter-spacing: 0.12em;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.4);
}

.refresh-control {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}
.refresh-control.is-disabled {
  opacity: 0.45;
  cursor: not-allowed;
  pointer-events: none;
}

.search-row {
  max-width: 1000px;
  margin: 0 auto 16px;
}
.search-field {
  display: flex;
  align-items: center;
  gap: 10px;
  max-width: 520px;
  padding: 10px 14px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.35);
  box-sizing: border-box;
}
.search-icon {
  flex-shrink: 0;
  color: rgba(255, 255, 255, 0.85);
}
.herb-search-input {
  flex: 1;
  min-width: 0;
  border: none;
  background: transparent;
  color: #fff;
  font-size: 0.95rem;
  font-family: "Noto Serif SC", serif;
  outline: none;
}
.herb-search-input::placeholder {
  color: rgba(255, 255, 255, 0.55);
}
.search-clear {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
  border: none;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.15);
  color: rgba(255, 255, 255, 0.9);
  cursor: pointer;
  transition: background 0.2s;
}
.search-clear:hover {
  background: rgba(255, 255, 255, 0.28);
}
.search-hint {
  margin: 8px 0 0;
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.82);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.35);
}
.compass-box {
  color: rgba(255, 255, 255, 0.95);
  transition: transform 0.3s;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.35));
}
.compass-box.is-loading {
  animation: spin 0.8s linear infinite;
}
@keyframes spin {
  100% {
    transform: rotate(360deg);
  }
}
.action-text {
  font-weight: bold;
  color: rgba(255, 255, 255, 0.95);
  font-size: 0.9rem;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.35);
}

.cabinet-container {
  max-width: 1000px;
  margin: 0 auto;
  background: #5d4037;
  padding: 15px;
  border-radius: 6px;
  box-shadow:
    inset 0 0 20px rgba(0, 0, 0, 0.5),
    0 15px 30px rgba(0, 0, 0, 0.2);
  border: 3px solid #4e342e;
  box-sizing: border-box;
  width: 100%;
  overflow-x: hidden;
}

.cabinet-inner {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(190px, 100%), 1fr));
  gap: clamp(6px, 1vw, 10px);
}

.grid-cell {
  background-color: transparent;
  height: clamp(100px, 15vh, 155px);
  perspective: 800px;
  cursor: pointer;
}

.flip-inner {
  position: relative;
  width: 100%;
  height: 100%;
  text-align: center;
  transition: transform 0.5s cubic-bezier(0.4, 0.2, 0.2, 1);
  transform-style: preserve-3d;
}
.flip-inner.is-flipped {
  transform: rotateY(180deg);
}

.card-face {
  position: absolute;
  width: 100%;
  height: 100%;
  -webkit-backface-visibility: hidden;
  backface-visibility: hidden;
  border-radius: 4px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.card-front {
  background: #fdfbf7;
  border: 1px solid #d7ccc8;
  border-bottom: 3px solid #a1887f;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #3e2723;
  z-index: 2;
}
.grid-cell:hover .card-front {
  background: #fff;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}
.card-front.bad {
  background: #fff5f5;
  border-color: #ef9a9a;
  border-bottom-color: #e57373;
}

.brass-ring {
  width: 24px;
  height: 4px;
  background: #8d6e63;
  border-radius: 2px;
  margin-bottom: 15px;
  opacity: 0.6;
}
.herb-names {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 12px;
}
.herb-text {
  font-size: 1.05rem;
  font-weight: bold;
  color: #3e2723;
}
.icon-wrap {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.icon-wrap.good {
  background: #e8f5e9;
  color: #2e7d32;
}
.icon-wrap.bad {
  background: #ffebee;
  color: #c62828;
}
.drawer-label {
  font-size: 0.8rem;
  background: #efebe9;
  color: #5d4037;
  padding: 2px 8px;
  border-radius: 3px;
  font-weight: bold;
}
.click-hint {
  font-size: 0.6rem;
  color: #bcaaa4;
  margin-top: 10px;
  opacity: 0;
  transition: opacity 0.2s;
}
.grid-cell:hover .click-hint {
  opacity: 0.8;
}

.card-back {
  background: #fff;
  transform: rotateY(180deg);
  border: 1px solid #efebe9;
  display: flex;
  flex-direction: column;
  padding: 10px;
  text-align: left;
}
.card-back.good {
  border-top: 3px solid #66bb6a;
}
.card-back.bad {
  border-top: 3px solid #ef5350;
}

.back-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
  border-bottom: 1px dashed #eee;
  padding-bottom: 4px;
}
.back-tag {
  font-size: 0.65rem;
  font-weight: bold;
  color: #fff;
  padding: 2px 6px;
  border-radius: 4px;
}
.back-tag.good {
  background: #66bb6a;
}
.back-tag.bad {
  background: #ef5350;
}
.back-effect {
  font-size: 0.9rem;
  font-weight: bold;
  color: #5d4037;
}

.back-content {
  flex: 1;
  overflow: hidden;
  display: flex;
}
.back-desc {
  font-size: 0.8rem;
  color: #4e342e;
  line-height: 1.4;
  margin: 0;
  overflow-y: auto;
  scrollbar-width: none;
}
.back-desc::-webkit-scrollbar {
  display: none;
}

.back-footer {
  margin-top: 6px;
  padding-top: 4px;
  border-top: 1px solid #f5f5f5;
  display: flex;
  gap: 5px;
}
.link-pill {
  font-size: 0.65rem;
  background: #f5f5f5;
  color: #795548;
  padding: 2px 6px;
  border-radius: 3px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 2px;
  transition: all 0.2s;
}
.link-pill:hover {
  background: #5d4037;
  color: white;
}
</style>

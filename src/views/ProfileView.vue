
<script setup>
import { onMounted, onUnmounted, ref, computed, watch } from "vue";
import { useRouter, useRoute } from "vue-router";
import { supabase } from "@/supabaseClient";
import { useAuth } from "@/composables/useAuth";
import HealthTagManager from "@/components/HealthTagManager.vue";
import RecipeMarketDetailModal from "@/components/RecipeMarketDetailModal.vue";
import { SOLAR_TERMS_LOOKUP } from "@/constants/solarTerms";
import { BODY_TYPES } from "@/constants/recipeFilters";
import { ADMIN_LOGIN_EMAIL } from "@/utils/loginEmail";
import { clearRecipeMarketCache, profileCache as _profileCache } from "@/composables/usePagePreload";
import {
  Trash2,
  ChevronDown,
  FileText,
  ChefHat,
  User,
  Edit2,
  Check,
  Camera,
  Calendar,
  Activity,
  X,
  Leaf,
  Lock,
  Unlock,
  Image as ImageIcon,
  BookOpen,
  Utensils,
  Settings,
  LogOut,
  UserPlus,
  UserCheck,
  Sparkles,
  Soup,
  ListOrdered,
  Clock,
  Mail,
  ShieldCheck,
  CircleSlash,
  Heart,
  Send,
} from "lucide-vue-next";

const router = useRouter();
const route = useRoute();
const { user, handleLogout, isAdmin } = useAuth();
const viewedUserId = computed(() =>
  String(route.query.uid || user.value?.id || "").trim(),
);
const isOwner = computed(
  () => !!user.value?.id && viewedUserId.value === user.value.id,
);
const loading = ref(true);
const activeTab = ref("plans");
const foldedStates = ref({});
const showAccountMenu = ref(false);

// --- 基础数据 ---
const username = ref("");
const avatar_url = ref("");
const isEditingName = ref(false);
const fileInput = ref(null);
const profile = ref(null);

// --- 简介与隐私 ---
const bio = ref("");
const isEditingBio = ref(false);
const privacySettings = ref({
  plans: true,
  recipes: false,
  herbs: false,
});

// --- 五大板块数据 ---
const carePlans = ref([]);
const savedRecipes = ref([]); // 🌟 混合了 AI 和 广场食谱
const recipeSubTab = ref("market"); // market | ai
const favoriteHerbs = ref([]);
const myWorks = ref([]);
/** 旧版：仅存 profiles.my_recipes JSON（未走 recipes 表） */
const myRecipes = ref([]);
/** 新版：当前用户在 recipes 表中的投稿（含审核状态） */
const dbMyRecipes = ref([]);
const inboxMessages = ref([]);
/** 管理员：待审核队列 */
const pendingModeration = ref([]);
const moderationBusy = ref(false);

// --- 我发布的菜谱：发布弹窗状态 ---
const showNewRecipeModal = ref(false);
const newRecipeName = ref("");
const newRecipeDesc = ref("");
const newRecipeBodyType = ref("");
const newRecipeSolarTerm = ref("");
const newRecipeTimeNumber = ref("");
const newRecipeTimeUnit = ref("分钟"); // 分钟 | 小时
const newRecipeEfficacy = ref("");
// 结构化食材/步骤输入：支持逐项新增/删除
const newRecipeIngredients = ref([{ name: "", amount: "" }]);
const newRecipeSteps = ref([""]);
const newRecipeImageFile = ref(null);
const newRecipeImagePreview = ref("");
const isPublishingRecipe = ref(false);
/** 勾选后写入 recipes 表且 moderation_status=pending，显示「审核中」 */
const publishToSquare = ref(false);

const marketSavedRecipes = computed(() =>
  (savedRecipes.value || []).filter((r) => !r?.is_ai),
);

const aiSavedRecipes = computed(() =>
  (savedRecipes.value || []).filter((r) => !!r?.is_ai),
);

const mergedMyRecipes = computed(() => {
  const db = (dbMyRecipes.value || []).map((r) => ({ ...r, _rowSource: "db" }));
  const leg = (myRecipes.value || []).map((r) => ({
    ...r,
    _rowSource: "legacy",
  }));
  return [...db, ...leg].sort(
    (a, b) =>
      new Date(b.created_at || 0).getTime() -
      new Date(a.created_at || 0).getTime(),
  );
});

function getMyRecipeStatusLabel(r) {
  if (r._rowSource === "legacy") return "个人菜谱";
  const s = r.moderation_status;
  if (s === "pending") return "审核中";
  if (s === "published") return "已发布菜谱";
  return "个人菜谱";
}

function statusLabelClass(label) {
  if (label === "审核中") return "bg-amber-50 text-amber-800 border-amber-100";
  if (label === "已发布菜谱")
    return "bg-emerald-50 text-emerald-800 border-emerald-100";
  return "bg-stone-50 text-stone-600 border-stone-100";
}

function canDeleteMyRecipeEntry(r) {
  if (r._rowSource === "legacy") return true;
  if (r.moderation_status === "pending") return false;
  return true;
}

const solarTermOptions = computed(() => [
  { value: "", label: "不按节气" },
  ...SOLAR_TERMS_LOOKUP.map((t) => ({ value: t.name, label: t.name })),
]);

/** 烹饪时间：数字 + 单位 组合为 "约xx分钟/小时" */
function computedTimeStr() {
  const n = String(newRecipeTimeNumber.value || "").trim();
  if (!n || isNaN(Number(n)) || Number(n) <= 0) return null;
  const u = newRecipeTimeUnit.value === "小时" ? "小时" : "分钟";
  return `约${n}${u}`;
}

// --- 我发布的食谱：详情弹窗 & 删除 ---
const selectedMyRecipe = ref(null);
function openMyRecipe(recipe) {
  selectedMyRecipe.value = recipe;
}
function closeMyRecipe() {
  selectedMyRecipe.value = null;
}

async function cascadeDeletePublishedFromSquare(recipeId) {
  const rid = recipeId;
  await supabase.from("comments").delete().eq("recipe_id", rid);
  await supabase.from("homeworks").delete().eq("recipe_id", rid);
  await supabase.from("favorite_recipes").delete().eq("recipe_id", rid);
  const { error } = await supabase.from("recipes").delete().eq("id", rid);
  if (error) throw error;
}

async function deleteMyRecipeEntry(r) {
  if (!user.value) {
    alert("请先登录后再操作");
    return;
  }
  if (!canDeleteMyRecipeEntry(r)) {
    alert("该食谱正在审核中，请等待审核结束后再删除");
    return;
  }
  if (!confirm("确定要删除这条食谱吗？")) return;

  try {
    if (r._rowSource === "legacy") {
      const next = myRecipes.value.filter((x) => x.id !== r.id);
      const { error } = await supabase
        .from("profiles")
        .update({ my_recipes: next, updated_at: new Date() })
        .eq("id", user.value.id);
      if (error) throw error;
      myRecipes.value = next;
    } else {
      if (r.moderation_status === "published") {
        await cascadeDeletePublishedFromSquare(r.id);
      } else {
        const { error } = await supabase
          .from("recipes")
          .delete()
          .eq("id", r.id)
          .eq("author_user_id", user.value.id);
        if (error) throw error;
      }
      dbMyRecipes.value = dbMyRecipes.value.filter((x) => x.id !== r.id);
      clearRecipeMarketCache();
    }
    if (selectedMyRecipe.value && selectedMyRecipe.value.id === r.id)
      closeMyRecipe();
    saveProfilePayload();
  } catch (e) {
    console.error(e);
    alert(e.message || "删除失败，请稍后重试");
  }
}

async function moderatePendingRecipe(recipe, approved) {
  if (!isAdmin.value || !recipe?.id) return;
  moderationBusy.value = true;
  try {
    const authorId = recipe.author_user_id;
    const nm = recipe.name || "未命名菜谱";
    if (approved) {
      const { error: uErr } = await supabase
        .from("recipes")
        .update({
          moderation_status: "published",
          last_moderation_result: "approved",
          moderated_at: new Date().toISOString(),
        })
        .eq("id", recipe.id)
        .eq("moderation_status", "pending");
      if (uErr) throw uErr;
      const { error: inboxErr } = await supabase.from("inbox_messages").insert({
        user_id: authorId,
        title: "菜谱审核通过",
        body: `您投稿的「${nm}」已通过审核，已在「养生食谱广场」展示。`,
        kind: "moderation_approved",
        recipe_id: recipe.id,
      });
      if (inboxErr)
        console.warn(
          "站内信发送失败（请确认 inbox_messages 表及 RLS 策略已部署）",
          inboxErr,
        );
    } else {
      const { error: uErr } = await supabase
        .from("recipes")
        .update({
          moderation_status: "personal",
          last_moderation_result: "rejected",
          moderated_at: new Date().toISOString(),
        })
        .eq("id", recipe.id)
        .eq("moderation_status", "pending");
      if (uErr) throw uErr;
      const { error: inboxErr } = await supabase.from("inbox_messages").insert({
        user_id: authorId,
        title: "菜谱未通过审核",
        body: `您投稿的「${nm}」未通过审核，已保留在「我的菜谱」中（个人菜谱）。`,
        kind: "moderation_rejected",
        recipe_id: recipe.id,
      });
      if (inboxErr)
        console.warn(
          "站内信发送失败（请确认 inbox_messages 表及 RLS 策略已部署）",
          inboxErr,
        );
    }
    clearRecipeMarketCache();
    await getProfile();
    closeMyRecipe();
    alert(approved ? "已通过审核" : "已驳回");
  } catch (e) {
    console.error(e);
    alert(
      e.message ||
        "操作失败，请确认已在 Supabase 执行迁移 SQL 且管理员 is_admin 已设置",
    );
  } finally {
    moderationBusy.value = false;
  }
}

async function markInboxRead(msg) {
  if (!msg?.id || msg.read_at) return;
  try {
    await supabase
      .from("inbox_messages")
      .update({ read_at: new Date().toISOString() })
      .eq("id", msg.id);
    msg.read_at = new Date().toISOString();
  } catch (e) {
    console.warn(e);
  }
}

function openInboxMessage(msg) {
  markInboxRead(msg);
  const rid = msg.recipe_id;
  if (rid == null) return;
  const r = mergedMyRecipes.value.find((x) => String(x.id) === String(rid));
  if (r) {
    activeTab.value = "my_recipes";
    openMyRecipe(r);
    return;
  }
  const p = pendingModeration.value.find((x) => String(x.id) === String(rid));
  if (p && isAdmin.value) {
    activeTab.value = "mailbox";
    openMyRecipe({ ...p, _rowSource: "db" });
  }
}

function resetNewRecipeForm() {
  newRecipeName.value = "";
  newRecipeDesc.value = "";
  newRecipeBodyType.value = "";
  newRecipeSolarTerm.value = "";
  newRecipeTimeNumber.value = "";
  newRecipeTimeUnit.value = "分钟";
  newRecipeEfficacy.value = "";
  newRecipeIngredients.value = [{ name: "", amount: "" }];
  newRecipeSteps.value = [""];
  newRecipeImageFile.value = null;
  newRecipeImagePreview.value = "";
  publishToSquare.value = false;
}

function openNewRecipeModal(prefill = null) {
  if (!user.value) {
    alert("请先登录后再发布菜谱");
    return;
  }
  resetNewRecipeForm();
  if (prefill) {
    newRecipeName.value = String(prefill.name || "").trim();
    newRecipeDesc.value = String(prefill.description || "").trim();
    newRecipeBodyType.value = String(prefill.bodyType || "").trim();
    newRecipeSolarTerm.value = String(prefill.solarTerm || "").trim();
    newRecipeEfficacy.value = String(prefill.efficacyText || "").trim();

    const prefIngredients = Array.isArray(prefill.ingredients)
      ? prefill.ingredients
      : [];
    newRecipeIngredients.value = prefIngredients.length
      ? prefIngredients.map((i) => ({
          name: String(i?.name || "").trim(),
          amount: String(i?.amount || "").trim(),
        }))
      : [{ name: "", amount: "" }];

    const prefSteps = Array.isArray(prefill.steps) ? prefill.steps : [];
    newRecipeSteps.value = prefSteps.length
      ? prefSteps.map((s) => String(s || "").trim()).filter(Boolean)
      : [""];
  }
  showNewRecipeModal.value = true;
}

function closeNewRecipeModal() {
  if (isPublishingRecipe.value) return;
  showNewRecipeModal.value = false;
}

function onNewRecipeImageSelected(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  if (file.size > 2 * 1024 * 1024) {
    alert("图片太大，请选择小于 2MB 的图片");
    return;
  }
  newRecipeImageFile.value = file;
  newRecipeImagePreview.value = URL.createObjectURL(file);
}

async function handlePublishRecipe() {
  if (!user.value) {
    alert("请先登录后再发布菜谱");
    return;
  }
  if (!newRecipeName.value.trim()) {
    alert("请填写菜谱名称");
    return;
  }
  if (!newRecipeBodyType.value) {
    alert("请选择适宜体质");
    return;
  }

  isPublishingRecipe.value = true;
  try {
    // 1. 先上传图片（如果有）
    let imageUrl = "";
    if (newRecipeImageFile.value) {
      const ext = newRecipeImageFile.value.name.split(".").pop();
      const fileName = `recipes/${Date.now()}_${Math.floor(Math.random() * 1000)}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("image")
        .upload(fileName, newRecipeImageFile.value);
      if (uploadError) throw new Error("图片上传失败，请稍后重试");
      const { data: publicUrlData } = supabase.storage
        .from("image")
        .getPublicUrl(fileName);
      imageUrl = publicUrlData?.publicUrl || "";
    }

    // 2. 解析表单为结构化字段
    const efficacyArr = newRecipeEfficacy.value
      .split(/[,，\s]+/)
      .map((t) => t.trim())
      .filter(Boolean);

    const ingredientsArr = newRecipeIngredients.value
      .map((i) => ({
        name: (i.name || "").trim(),
        amount: (i.amount || "").trim(),
        isHerb: false,
      }))
      .filter((i) => i.name);

    const stepsArr = newRecipeSteps.value
      .map((s) => (s || "").trim())
      .filter(Boolean);

    const displayName =
      (username.value && String(username.value).trim()) ||
      user.value.email ||
      "养生达人";

    // 写入 recipes 表：广场投稿 = pending；仅个人 = personal
    const moderationStatus = publishToSquare.value ? "pending" : "personal";
    const insertPayload = {
      name: newRecipeName.value.trim(),
      description: newRecipeDesc.value.trim() || null,
      image: imageUrl || null,
      body_type: newRecipeBodyType.value,
      solar_term: newRecipeSolarTerm.value || null,
      time: computedTimeStr(),
      efficacy: efficacyArr,
      ingredients: ingredientsArr,
      steps: stepsArr,
      rating: 8.5,
      cooked_count: 0,
      author_user_id: user.value.id,
      author_name: displayName,
      author_avatar_url: avatar_url.value || null,
      moderation_status: moderationStatus,
    };

    const { data: inserted, error: insertError } = await supabase
      .from("recipes")
      .insert(insertPayload)
      .select()
      .single();

    if (insertError) {
      console.error(insertError);
      throw new Error(
        insertError.message ||
          "写入 recipes 失败：请在 Supabase 执行 supabase/migrations 中的 SQL（增加 moderation 等字段）",
      );
    }

    dbMyRecipes.value = [inserted, ...dbMyRecipes.value];
    saveProfilePayload();

    if (publishToSquare.value) {
      alert(
        "已提交审核！请在「我的菜谱」查看「审核中」状态，审核结果将在「信箱」通知。",
      );
    } else {
      alert("菜谱已保存为「个人菜谱」（未发布到食谱广场）。");
    }
    closeNewRecipeModal();
  } catch (e) {
    console.error(e);
    alert(e.message || "发布失败，请稍后重试");
  } finally {
    isPublishingRecipe.value = false;
  }
}

// 会话缓存：再次进入个人中心时先展示上次数据，调理/收藏/作品数不闪 0
// _profileCache 定义在模块级 <script> 块，跨组件实例持久化
function applyProfilePayload(payload) {
  if (!payload) return;
  profile.value = payload.profile;
  username.value = payload.username ?? "";
  avatar_url.value = payload.avatar_url ?? "";
  bio.value = payload.bio ?? "";
  privacySettings.value = { ...payload.privacySettings };
  carePlans.value = payload.carePlans ?? [];
  favoriteHerbs.value = payload.favoriteHerbs ?? [];
  savedRecipes.value = payload.savedRecipes ?? [];
  myWorks.value = payload.myWorks ?? [];
  myRecipes.value = payload.myRecipes ?? [];
  dbMyRecipes.value = payload.dbMyRecipes ?? [];
}
function saveProfilePayload() {
  if (!isOwner.value || !user.value) return;
  _profileCache.userId = viewedUserId.value;
  _profileCache.payload = {
    profile: profile.value,
    username: username.value,
    avatar_url: avatar_url.value,
    bio: bio.value,
    privacySettings: { ...privacySettings.value },
    carePlans: [...carePlans.value],
    favoriteHerbs: [...favoriteHerbs.value],
    savedRecipes: [...savedRecipes.value],
    myWorks: [...myWorks.value],
    myRecipes: [...myRecipes.value],
    dbMyRecipes: [...dbMyRecipes.value],
  };
}

// 辅助：切换展开/收起
function toggleFold(uniqueKey) {
  foldedStates.value[uniqueKey] = !foldedStates.value[uniqueKey];
}

// --- 1. 获取数据：5 个请求并行 + 双源合并 ---
async function getProfile() {
  const uid = viewedUserId.value;
  if (!uid) return;
  const isRevalidate = loading.value === false && _profileCache.userId === uid;
  if (!isRevalidate) loading.value = true;
  try {
    const [
      { data: profileData },
      { data: herbsData },
      { data: favRecsLinkData, error: favRecipesErr },
      { data: worksData },
      { data: dbRecipesData, error: dbRecipesErr },
      { data: inboxData, error: inboxErr },
    ] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", uid).single(),
      supabase
        .from("favorite_herbs")
        .select("*, herb:herbs(*)")
        .eq("user_id", uid)
        .order("created_at", { ascending: false }),
      supabase
        .from("favorite_recipes")
        .select("id, recipe_id, created_at")
        .eq("user_id", uid)
        .order("created_at", { ascending: false }),
      supabase
        .from("homeworks")
        .select("*")
        .eq("user_id", uid)
        .order("created_at", { ascending: false }),
      supabase
        .from("recipes")
        .select("*")
        .eq("author_user_id", uid)
        .order("created_at", { ascending: false }),
      supabase
        .from("inbox_messages")
        .select("*")
        .eq("user_id", uid)
        .order("created_at", { ascending: false }),
    ]);

    if (favRecipesErr) console.warn("加载广场收藏失败", favRecipesErr);
    if (dbRecipesErr)
      console.warn(
        "加载我的 recipes 投稿失败（是否已执行迁移 SQL？）",
        dbRecipesErr,
      );
    dbMyRecipes.value = dbRecipesData || [];
    if (inboxErr)
      console.warn("加载信箱失败（是否已创建 inbox_messages 表？）", inboxErr);
    inboxMessages.value = inboxData || [];

    let aiRecipes = [];
    if (profileData) {
      profile.value = profileData;
      username.value = profileData.username || "";
      avatar_url.value = profileData.avatar_url || "";
      bio.value = profileData.bio || "";
      privacySettings.value = {
        plans: profileData.is_plans_private ?? true,
        recipes: profileData.is_saved_private ?? false,
        herbs: profileData.is_herbs_private ?? false,
      };
      carePlans.value = (profileData.care_plans || []).sort(
        (a, b) => new Date(b.saved_at) - new Date(a.saved_at),
      );
      if (
        profileData.saved_recipes &&
        Array.isArray(profileData.saved_recipes)
      ) {
        aiRecipes = profileData.saved_recipes.map((r) => ({
          ...r,
          id: r.id || `ai-${Date.now()}-${Math.random()}`,
          is_ai: true,
          saved_at: r.saved_at || new Date().toISOString(),
          ingredients: r.ingredients || [],
          steps: r.steps || [],
          tags: r.tags || ["AI推荐"],
        }));
      }
    }

    if (herbsData) {
      favoriteHerbs.value = herbsData.map((item) => ({
        ...item.herb,
        favorite_id: item.id,
        saved_at: item.created_at,
      }));
      const herbNames = favoriteHerbs.value.map((h) => h.name).filter(Boolean);
      if (herbNames.length) {
        const { data: easyData } = await supabase
          .from("herbseasy")
          .select("name, identity_tag")
          .in("name", herbNames);
        if (easyData) {
          const easyMap = Object.fromEntries(easyData.map((e) => [e.name, e.identity_tag]));
          favoriteHerbs.value = favoriteHerbs.value.map((h) => ({
            ...h,
            identity_tag: easyMap[h.name] || null,
          }));
        }
      }
    }

    let marketRecipes = [];
    if (favRecsLinkData && favRecsLinkData.length > 0) {
      const recipeIds = favRecsLinkData.map((f) => f.recipe_id);
      const { data: recipeDetails, error: recipeDetailsErr } = await supabase
        .from("recipes")
        .select("*")
        .in("id", recipeIds);
      if (recipeDetailsErr)
        console.warn("加载广场收藏详情失败", recipeDetailsErr);
      if (recipeDetails) {
        const recipeMap = Object.fromEntries(
          recipeDetails.map((r) => [r.id, r]),
        );
        marketRecipes = favRecsLinkData
          .filter((f) => recipeMap[f.recipe_id])
          .map((f) => ({
            ...recipeMap[f.recipe_id],
            favorite_id: f.id,
            saved_at: f.created_at,
            is_ai: false,
            tags: recipeMap[f.recipe_id].tags || ["广场精选"],
          }));
      }
    }
    savedRecipes.value = [...marketRecipes, ...aiRecipes].sort(
      (a, b) => new Date(b.saved_at) - new Date(a.saved_at),
    );

    if (worksData) myWorks.value = worksData;
    // 旧版 JSON：profiles.my_recipes
    myRecipes.value =
      profileData?.my_recipes && Array.isArray(profileData.my_recipes)
        ? profileData.my_recipes
        : [];

    const userIsAdmin =
      user.value?.email === ADMIN_LOGIN_EMAIL || !!profileData?.is_admin;
    if (userIsAdmin) {
      const { data: pend, error: pendErr } = await supabase
        .from("recipes")
        .select("*")
        .eq("moderation_status", "pending")
        .order("created_at", { ascending: false });
      if (pendErr) console.warn("加载待审核队列失败", pendErr);
      pendingModeration.value = pend || [];
    } else {
      pendingModeration.value = [];
    }

    saveProfilePayload();
  } catch (error) {
    console.error("获取个人信息失败:", error);
  } finally {
    loading.value = false;
  }
}

// --- 保存逻辑 ---
async function saveProfileField(updates) {
  if (!isOwner.value || !user.value) return;
  await supabase
    .from("profiles")
    .update({ ...updates, updated_at: new Date() })
    .eq("id", user.value.id);
}
async function saveName() {
  if (!isOwner.value) {
    isEditingName.value = false;
    return;
  }
  isEditingName.value = false;
  if (!username.value.trim()) username.value = "未命名";
  await saveProfileField({ username: username.value });
}
async function saveBio() {
  if (!isOwner.value) {
    isEditingBio.value = false;
    return;
  }
  isEditingBio.value = false;
  await saveProfileField({ bio: bio.value });
}
async function togglePrivacy(type) {
  if (!isOwner.value) return;
  const fieldMap = {
    plans: "is_plans_private",
    recipes: "is_saved_private",
    herbs: "is_herbs_private",
  };
  privacySettings.value[type] = !privacySettings.value[type];
  await saveProfileField({ [fieldMap[type]]: privacySettings.value[type] });
}

// --- 广场收藏：跳转 RecipeMarket modal ---
function openMarketRecipe(recipe) {
  if (!recipe?.id) return;
  router.push({
    name: "RecipeMarket",
    query: { open_id: recipe.id },
  });
}

function getSavedRecipeCover(recipe) {
  return String(recipe?.image || recipe?.image_url || "").trim();
}

// --- AI 推荐：一键补全为可发布食谱 ---
const bodyTypeValueSet = new Set(
  BODY_TYPES.map((x) => x.value).filter(Boolean),
);

function normalizeAiIngredientsForPublish(raw) {
  const rows = Array.isArray(raw) ? raw : [];
  const mapped = rows
    .map((item) => {
      if (typeof item === "string") return { name: item.trim(), amount: "" };
      const name = String(
        item?.name ??
          item?.ingredient ??
          item?.material ??
          item?.label ??
          item?.text ??
          "",
      ).trim();
      const amount = String(
        item?.amount ?? item?.quantity ?? item?.dosage ?? item?.weight ?? "",
      ).trim();
      return { name, amount };
    })
    .filter((x) => x.name);
  return mapped.length ? mapped : [{ name: "", amount: "" }];
}

function normalizeAiStepsForPublish(raw) {
  const steps = (Array.isArray(raw) ? raw : [])
    .map((s) => String(s || "").trim())
    .filter(Boolean);
  return steps.length ? steps : [""];
}

function inferBodyTypeFromAi(recipe) {
  const direct = String(recipe?.body_type || recipe?.bodyType || "").trim();
  if (direct) return direct;
  const pool = [
    ...(Array.isArray(recipe?.tags) ? recipe.tags : []),
    ...(Array.isArray(recipe?.efficacy) ? recipe.efficacy : []),
  ].map((x) => String(x || "").trim());
  return pool.find((x) => bodyTypeValueSet.has(x)) || "";
}

function openPublishPrefillFromAi(recipe) {
  const tags = (Array.isArray(recipe?.tags) ? recipe.tags : [])
    .map((x) => String(x || "").trim())
    .filter(Boolean);
  const efficacy = (Array.isArray(recipe?.efficacy) ? recipe.efficacy : [])
    .map((x) => String(x || "").trim())
    .filter(Boolean);
  const efficacyText = [...new Set([...efficacy, ...tags])].join(" ");

  openNewRecipeModal({
    name: String(recipe?.name || "").trim(),
    description: String(recipe?.description || "").trim(),
    bodyType: inferBodyTypeFromAi(recipe),
    efficacyText,
    ingredients: normalizeAiIngredientsForPublish(recipe?.ingredients),
    steps: normalizeAiStepsForPublish(recipe?.steps),
  });
}

function goToMarketSimilar(recipe) {
  const recipeName = String(recipe?.name || "").trim();
  const firstTag = (Array.isArray(recipe?.tags) ? recipe.tags : [])
    .map((x) => String(x || "").trim())
    .find(Boolean);
  const keyword = recipeName || firstTag || "";
  router.push({
    name: "RecipeMarket",
    query: keyword ? { q: keyword } : {},
  });
}

// --- 广场收藏：详情弹窗 ---
const showSavedRecipeModal = ref(false);
const savedRecipeModalId = ref(null);

function openSavedRecipeDetail(recipe) {
  savedRecipeModalId.value = recipe.id;
  showSavedRecipeModal.value = true;
}

function closeSavedRecipeDetail() {
  showSavedRecipeModal.value = false;
  savedRecipeModalId.value = null;
}


// --- 药材收藏：图片加载 ---
function getLocalHerbImagePath(herbName) {
  const name = String(herbName || "").trim();
  if (!name) return "/placeholder-herb.svg";
  return `/photo/${encodeURIComponent(name)}.jpg`;
}

function getFavoriteHerbImage(herb) {
  const imageUrl = String(herb?.image_url || "").trim();
  if (imageUrl) return imageUrl;
  return getLocalHerbImagePath(herb?.name);
}

function handleFavoriteHerbImageError(event, herb) {
  const img = event?.target;
  if (!img) return;
  const localPath = getLocalHerbImagePath(herb?.name);
  if (!img.dataset.triedLocal && localPath !== "/placeholder-herb.svg") {
    img.dataset.triedLocal = "1";
    img.src = localPath;
    return;
  }
  img.onerror = null;
  img.src = "/placeholder-herb.svg";
}

// --- 删除逻辑 ---
async function deletePlan(planId) {
  if (!confirm("确定删除这条调理记录吗?")) return;
  const newPlans = carePlans.value.filter((p) => p.id !== planId);
  await supabase
    .from("profiles")
    .update({ care_plans: newPlans })
    .eq("id", user.value.id);
  carePlans.value = newPlans;
}

// 🌟 修复：智能删除 (区分 AI 和 广场)
async function deleteRecipe(recipe) {
  if (!confirm("确定取消收藏该食谱?")) return;

  try {
    if (recipe.is_ai) {
      // 1. 删除 AI 食谱 (更新 profiles 数组)
      // 过滤掉当前这个食谱
      const newAiRecipes = savedRecipes.value
        .filter((r) => r.is_ai && r.id !== recipe.id) // 拿到剩下的 AI 食谱
        .map((r) => {
          // 还原成纯净的 JSON 对象存回数据库 (去掉 is_ai 等临时字段)
          const { is_ai, ...rest } = r;
          return rest;
        });

      await supabase
        .from("profiles")
        .update({ saved_recipes: newAiRecipes })
        .eq("id", user.value.id);

      // 更新前端
      savedRecipes.value = savedRecipes.value.filter(
        (r) => !(r.id === recipe.id && !!r.is_ai === !!recipe.is_ai),
      );
    } else {
      // 2. 删除广场食谱 (删 favorite_recipes 表)
      const { error } = await supabase
        .from("favorite_recipes")
        .delete()
        .eq("id", recipe.favorite_id);
      if (error) throw error;

      // 更新前端
      savedRecipes.value = savedRecipes.value.filter(
        (r) => !(r.id === recipe.id && !!r.is_ai === !!recipe.is_ai),
      );
    }
  } catch (e) {
    console.error(e);
    alert("删除失败");
  }
}

async function deleteHerb(favoriteId) {
  if (!confirm("确定将该药材移出私库吗?")) return;
  const { error } = await supabase
    .from("favorite_herbs")
    .delete()
    .eq("id", favoriteId);
  if (!error)
    favoriteHerbs.value = favoriteHerbs.value.filter(
      (h) => h.favorite_id !== favoriteId,
    );
}

// 删除跟做作业
async function deleteWork(workId) {
  if (!user.value) {
    alert("请先登录后再操作");
    return;
  }
  if (!confirm("确定要删除这条作业吗？")) return;

  try {
    const { error } = await supabase
      .from("homeworks")
      .delete()
      .eq("id", workId)
      .eq("user_id", user.value.id);

    if (error) throw error;

    myWorks.value = myWorks.value.filter((w) => w.id !== workId);
    saveProfilePayload();
  } catch (e) {
    console.error(e);
    alert("删除失败，请稍后重试");
  }
}

// --- 其他 ---
function triggerFileInput() {
  if (!isOwner.value) return;
  fileInput.value.click();
}
async function handleFileChange(event) {
  if (!isOwner.value) return;
  const file = event.target.files[0];
  if (!file) return;
  if (file.size > 1024 * 1024) return alert("图片太大，请选择小于 1MB 的图片");
  const reader = new FileReader();
  reader.onload = async (e) => {
    const base64String = e.target.result;
    avatar_url.value = base64String;
    await saveProfileField({ avatar_url: base64String });
  };
  reader.readAsDataURL(file);
}

function goToHerbDetail(herbName) {
  router.push(`/herb/${herbName}`);
}

// 从「我的作品」跳转到独立的作业详情页
function goToHomeworkDetail(work) {
  if (!work) return;
  router.push({
    name: "WorkDetail",
    params: { id: work.id },
  });
}

async function doLogout() {
  await handleLogout();
  router.push("/");
}

async function doSwitchAccount() {
  await handleLogout();
  router.push({ path: "/", query: { login: "1" } });
}

// 工具函数
function ensureArray(val) {
  return !val ? [] : Array.isArray(val) ? val : [val];
}

/** 将接口/缓存里的食材字段统一成数组（支持 JSON 字符串、类数组对象） */
function normalizeIngredientsInput(raw) {
  if (raw == null || raw === "") return [];
  if (typeof raw === "string") {
    const t = raw.trim();
    if (!t) return [];
    if (t.startsWith("[") || t.startsWith("{")) {
      try {
        return normalizeIngredientsInput(JSON.parse(t));
      } catch {
        return [t];
      }
    }
    return [t];
  }
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "object") {
    const keys = Object.keys(raw);
    if (keys.length && keys.every((k) => /^\d+$/.test(k))) {
      return keys
        .map(Number)
        .sort((a, b) => a - b)
        .map((k) => raw[String(k)]);
    }
  }
  return [raw];
}

/**
 * 把嵌套结构压成可读字符串；禁止对普通对象用 String()，否则会得到 [object Object]
 */
function scalarToLabel(v, depth = 0) {
  if (depth > 8) return "";
  if (v == null || v === "") return "";
  if (typeof v === "string") {
    const t = v.trim();
    if (!t) return "";
    if (t.startsWith("[") || t.startsWith("{")) {
      try {
        return scalarToLabel(JSON.parse(t), depth + 1);
      } catch {
        /* 保持原文 */
      }
    }
    return t;
  }
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (Array.isArray(v)) {
    return v
      .map((x) => scalarToLabel(x, depth + 1))
      .filter(Boolean)
      .join(" ");
  }
  if (typeof v === "object") {
    const preferred =
      v.name ??
      v.ingredient ??
      v.material ??
      v.zh ??
      v.cn ??
      v.label ??
      v.text ??
      v.value ??
      v.食材 ??
      v.药名;
    if (preferred !== undefined && preferred !== null) {
      const inner = scalarToLabel(preferred, depth + 1);
      if (inner) return inner;
    }
    for (const val of Object.values(v)) {
      if (typeof val === "boolean" || val == null) continue;
      const s = scalarToLabel(val, depth + 1);
      if (s) return s;
    }
  }
  return "";
}

function formatIngredientRow(item) {
  if (item == null || item === "") return "";
  if (typeof item === "string") return scalarToLabel(item);
  if (typeof item !== "object") return scalarToLabel(item);
  const name = scalarToLabel(
    item.name ??
      item.ingredient ??
      item.material ??
      item.label ??
      item.title ??
      item.text ??
      item.食材,
  );
  const amount = scalarToLabel(
    item.amount ??
      item.quantity ??
      item.dosage ??
      item.weight ??
      item.dose ??
      item.用量 ??
      item.剂量,
  );
  if (name && amount) return `${name} ${amount}`;
  if (name) return name;
  if (amount) return amount;
  return scalarToLabel(item);
}

/** string[]（AI）或 { name, amount }[]（广场），兼容 JSON 字符串与嵌套字段 */
function formatIngredientsForDisplay(ingredients) {
  return normalizeIngredientsInput(ingredients)
    .map((item) => formatIngredientRow(item))
    .filter(Boolean)
    .join("、");
}
function formatDate(isoString) {
  if (!isoString) return "";
  return new Date(isoString).toLocaleDateString("zh-CN", {
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

onMounted(() => {
  if (
    isOwner.value &&
    user.value &&
    _profileCache.userId === user.value.id &&
    _profileCache.payload
  ) {
    applyProfilePayload(_profileCache.payload);
    loading.value = false;
    getProfile(); // 后台刷新，不阻塞界面
  } else {
    getProfile();
  }
  window.addEventListener("profile-updated", getProfile);
});
watch(viewedUserId, (next, prev) => {
  if (!next || next === prev) return;
  getProfile();
});
onUnmounted(() => {
  window.removeEventListener("profile-updated", getProfile);
});

function toggleAccountMenu() {
  showAccountMenu.value = !showAccountMenu.value;
}

function closeAccountMenu() {
  showAccountMenu.value = false;
}
</script>

<template>
  <div class="min-h-screen bg-[#FDFBF7] pb-24" @click="closeAccountMenu">
    <div
      class="bg-sandalwood text-white pt-12 pb-16 px-4 relative overflow-hidden shadow-lg"
    >
      <div
        class="absolute top-0 right-0 opacity-10 transform translate-x-10 -translate-y-10 pointer-events-none"
      >
        <User class="w-64 h-64" />
      </div>

      <div
        class="relative z-10 flex flex-col items-center sm:flex-row sm:items-start gap-6 max-w-4xl mx-auto"
      >
        <button
          v-if="isOwner"
          type="button"
          class="absolute top-0 right-0 p-2 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center"
          @click.stop="toggleAccountMenu"
          aria-label="账号设置"
        >
          <Settings class="w-5 h-5 text-white" />
        </button>

        <div
          v-if="showAccountMenu"
          class="absolute top-10 right-0 w-36 bg-white text-gray-800 rounded-xl shadow-xl border border-sandalwood/10 py-2 z-20"
          @click.stop
        >
          <button
            type="button"
            class="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-stone-50"
            @click="doLogout"
          >
            <LogOut class="w-4 h-4 text-stone-400" />
            <span>退出登录</span>
          </button>
          <button
            type="button"
            class="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-stone-50"
            @click="doSwitchAccount"
          >
            <UserPlus class="w-4 h-4 text-stone-400" />
            <span>切换账号</span>
          </button>
        </div>

        <input
          type="file"
          ref="fileInput"
          accept="image/*"
          class="hidden"
          @change="handleFileChange"
        />
        <div
          @click="isOwner ? triggerFileInput() : null"
          class="w-24 h-24 rounded-full bg-white/20 flex items-center justify-center border-4 border-white/20 backdrop-blur-md group relative overflow-hidden transition-transform hover:scale-105 shadow-inner shrink-0"
          :class="isOwner ? 'cursor-pointer' : 'cursor-default'"
        >
          <img
            v-if="avatar_url"
            :src="avatar_url"
            class="w-full h-full object-cover"
          />
          <User v-else class="w-12 h-12 text-white/80" />
          <div
            v-if="isOwner"
            class="absolute inset-0 bg-black/30 hidden group-hover:flex items-center justify-center transition-all"
          >
            <Camera class="w-8 h-8 text-white opacity-90" />
          </div>
        </div>

        <div class="flex-1 min-w-0 text-center sm:text-left w-full">
          <div
            class="flex items-center justify-center sm:justify-start gap-2 mb-2"
          >
            <div
              v-if="!isEditingName"
              @click="isOwner ? (isEditingName = true) : null"
              class="group flex items-center gap-2 flex-wrap justify-center sm:justify-start"
              :class="isOwner ? 'cursor-pointer' : 'cursor-default'"
            >
              <h1
                class="text-2xl font-serif font-bold text-white tracking-wide truncate group-hover:opacity-80"
              >
                {{ username || "点击设置昵称" }}
              </h1>
              <span
                v-if="isAdmin"
                class="text-[10px] px-2 py-0.5 rounded-full bg-white/20 border border-white/30 text-white/95 shrink-0"
                >管理员</span
              >
              <Edit2
                class="w-4 h-4 text-white/50 group-hover:text-white transition-colors opacity-0 group-hover:opacity-100"
              />
            </div>
            <div
              v-else
              class="flex items-center gap-2 animate-in fade-in zoom-in duration-200"
            >
              <input
                v-model="username"
                @blur="saveName"
                @keyup.enter="saveName"
                autoFocus
                class="text-xl font-serif font-bold text-sandalwood bg-[#FDFBF7] px-3 py-1 rounded outline-none w-full max-w-[200px]"
              />
              <button
                @click="saveName"
                class="w-8 h-8 flex items-center justify-center bg-white/20 hover:bg-white/30 text-white rounded-full"
              >
                <Check class="w-4 h-4" />
              </button>
            </div>
          </div>

          <div
            class="text-white/80 text-sm font-light leading-relaxed max-w-lg"
          >
            <div
              v-if="!isEditingBio"
              @click="isOwner ? (isEditingBio = true) : null"
              class="group min-h-[1.5em] flex items-center justify-center sm:justify-start gap-2"
              :class="isOwner ? 'cursor-pointer' : 'cursor-default'"
            >
              <span>{{ bio || "写一句简介，记录你的养生心得..." }}</span>
              <Edit2
                class="w-3 h-3 text-white/40 group-hover:text-white/80 opacity-0 group-hover:opacity-100 transition-opacity"
              />
            </div>
            <div v-else class="flex items-center gap-2 animate-in fade-in">
              <textarea
                v-model="bio"
                rows="2"
                @blur="saveBio"
                class="w-full text-sandalwood bg-[#FDFBF7] px-3 py-2 rounded text-sm outline-none resize-none shadow-lg"
                placeholder="写点什么..."
              ></textarea>
            </div>
          </div>

          <div
            class="flex items-center justify-center sm:justify-start gap-6 mt-4 text-xs font-medium text-white/60"
          >
            <div>
              <span class="text-white text-lg font-bold block">{{
                carePlans.length
              }}</span
              >调理
            </div>
            <div>
              <span class="text-white text-lg font-bold block">{{
                savedRecipes.length + favoriteHerbs.length
              }}</span
              >收藏
            </div>
            <div>
              <span class="text-white text-lg font-bold block">{{
                myWorks.length
              }}</span
              >作品
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="-mt-8 px-2 relative z-20 w-full space-y-4 max-w-6xl mx-auto">
      <div
        class="bg-white rounded-xl shadow-card p-1 border border-sandalwood/5 overflow-hidden"
      >
        <HealthTagManager />
      </div>

      <div
        class="bg-white rounded-xl shadow-sm p-1.5 flex overflow-x-auto gap-2 border border-sandalwood/10 scrollbar-hide"
      >
        <button
          v-for="tab in [
            { id: 'plans', icon: FileText, label: '调理方案' },
            { id: 'herbs', icon: Leaf, label: '药材私库' },
            { id: 'recipes', icon: ChefHat, label: '收藏食谱' },
            { id: 'works', icon: ImageIcon, label: '我的作品' },
            { id: 'my_recipes', icon: BookOpen, label: '我的菜谱' },
            { id: 'mailbox', icon: Mail, label: '信箱' },
          ]"
          :key="tab.id"
          @click="activeTab = tab.id"
          class="flex-shrink-0 px-4 py-3 text-sm font-bold font-serif rounded-lg transition-all flex items-center justify-center gap-2 whitespace-nowrap"
          :class="
            activeTab === tab.id
              ? 'bg-sandalwood text-white shadow-md'
              : 'text-gray-500 hover:bg-gray-50'
          "
        >
          <component :is="tab.icon" class="w-4 h-4" /> {{ tab.label }}
        </button>
      </div>

      <div class="min-h-[300px]">
        <div
          v-if="activeTab === 'plans'"
          class="animate-in slide-in-from-bottom-4 duration-500"
        >
          <div class="flex justify-between items-center mb-4 px-2">
            <h3 class="font-bold font-serif text-gray-700">我的调理记录</h3>
            <button
              @click="togglePrivacy('plans')"
              class="text-xs flex items-center gap-1 px-3 py-1.5 rounded-full border transition-all"
              :class="
                privacySettings.plans
                  ? 'bg-gray-100 text-gray-500 border-gray-200'
                  : 'bg-green-50 text-green-700 border-green-200'
              "
            >
              <component
                :is="privacySettings.plans ? Lock : Unlock"
                class="w-3 h-3"
              />
              {{ privacySettings.plans ? "仅自己可见" : "公开可见" }}
            </button>
          </div>

          <div
            v-if="!carePlans.length"
            class="text-center py-20 text-gray-400 bg-white rounded-xl border border-dashed border-sandalwood/10"
          >
            <p>暂无调理记录</p>
            <p class="text-xs mt-2">去和 AI 聊聊身体情况吧</p>
          </div>

          <div
            v-for="plan in carePlans"
            :key="plan.id"
            class="bg-white rounded-xl p-4 shadow-card border border-sandalwood/10 relative group mb-4 font-['KaiTi',cursive]"
          >
            <button
              @click="deletePlan(plan.id)"
              class="absolute top-4 right-4 text-gray-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all p-2 hover:bg-red-50 rounded-full"
            >
              <Trash2 class="w-4 h-4" />
            </button>
            <div
              class="flex items-start mb-4 border-b border-dashed border-gray-100 pb-4"
            >
              <div>
                <h3
                  class="font-['Ma_Shan_Zheng',cursive] text-gray-800 text-lg leading-tight mt-0.5"
                >
                  {{ plan.diagnosis_result }}
                </h3>
                <div
                  class="flex items-center gap-2 mt-2 text-xs text-gray-400 font-mono"
                >
                  <Calendar class="w-3 h-3" /><span>{{
                    formatDate(plan.saved_at)
                  }}</span>
                </div>
              </div>
            </div>
            <div
              class="text-base text-gray-600 mb-5 bg-[#FAF9F6] p-4 rounded-lg leading-relaxed border border-gray-100"
            >
              {{ plan.summary }}
            </div>

            <div v-if="plan.recipes && plan.recipes.length > 0">
              <div
                class="text-sm font-bold text-sandalwood mb-3 flex items-center gap-1 uppercase tracking-wider opacity-80"
              >
                <ChefHat class="w-3.5 h-3.5" /> 推荐食谱
              </div>
              <div class="space-y-3">
                <div
                  v-for="recipe in plan.recipes"
                  :key="recipe.id"
                  class="border border-sandalwood/10 rounded-xl overflow-hidden bg-white shadow-sm transition-all hover:border-sandalwood/30"
                >
                  <div
                    class="flex items-center gap-3 p-3 bg-[#FAF6ED]/30 cursor-pointer"
                    @click="toggleFold(`plan-${plan.id}-recipe-${recipe.id}`)"
                  >
                    <div
                      class="w-10 h-10 rounded-lg bg-white flex items-center justify-center text-xl shrink-0 shadow-sm border border-sandalwood/5"
                    >
                      {{
                        recipe.category === "tea"
                          ? "🍵"
                          : recipe.category === "meal"
                            ? "🥣"
                            : "💊"
                      }}
                    </div>
                    <div class="flex-1 min-w-0">
                      <div class="font-bold text-gray-800 text-base truncate">
                        {{ recipe.name }}
                      </div>
                      <div class="text-sm text-gray-500 truncate mt-0.5">
                        食材：{{
                          formatIngredientsForDisplay(recipe.ingredients)
                        }}
                      </div>
                    </div>
                    <ChevronDown
                      class="w-4 h-4 text-gray-400 transition-transform duration-300"
                      :class="{
                        'rotate-180':
                          foldedStates[`plan-${plan.id}-recipe-${recipe.id}`],
                      }"
                    />
                  </div>
                  <div
                    v-show="foldedStates[`plan-${plan.id}-recipe-${recipe.id}`]"
                    class="bg-white px-4 pb-4 pt-1 border-t border-dashed border-sandalwood/10"
                  >
                    <div class="mt-2 text-sm text-gray-600 space-y-2">
                      <p
                        v-for="(s, i) in ensureArray(recipe.steps)"
                        :key="i"
                        class="leading-relaxed flex gap-2"
                      >
                        <span class="font-bold text-sandalwood/60 shrink-0"
                          >{{ i + 1 }}.</span
                        >
                        <span>{{ s }}</span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div
              class="mt-5 pt-4 border-t border-dashed border-gray-100 grid gap-3"
            >
              <div v-if="plan.acupoints && plan.acupoints.length">
                <div class="text-sm font-bold text-gray-400 mb-2">穴位方案</div>
                <div class="grid grid-cols-1 gap-2">
                  <div
                    v-for="(ac, idx) in plan.acupoints"
                    :key="idx"
                    class="bg-gray-50 border border-gray-100 px-3 py-2 rounded-lg text-base"
                  >
                    <div
                      class="font-bold text-gray-700 mb-1 flex items-center gap-2"
                    >
                      <div class="w-1.5 h-1.5 rounded-full bg-sandalwood"></div>
                      {{ ac.name }}
                    </div>
                    <div
                      v-if="ac.location"
                      class="text-sm text-gray-500 mb-1.5 flex items-start gap-1"
                    >
                      <span class="shrink-0">📍</span> {{ ac.location }}
                    </div>
                    <div
                      v-if="ac.method"
                      class="text-sm text-sandalwood/80 leading-relaxed bg-[#F5EDD8]/40 p-2 rounded flex items-start gap-1"
                    >
                      <span class="shrink-0">👇</span> {{ ac.method }}
                    </div>
                  </div>
                </div>
              </div>
              <div
                v-if="plan.lifestyle && plan.lifestyle.length"
                class="flex gap-2 items-start bg-red-50/50 p-2.5 rounded-lg text-sm"
              >
                <span class="font-bold text-red-400/80 shrink-0">🚫 禁忌：</span
                ><span class="text-gray-600 leading-relaxed">{{
                  ensureArray(plan.lifestyle).join("；")
                }}</span>
              </div>
            </div>
          </div>
        </div>

        <div
          v-else-if="activeTab === 'herbs'"
          class="animate-in slide-in-from-bottom-4 duration-500"
        >
          <div class="flex justify-between items-center mb-4 px-2">
            <h3 class="font-bold font-serif text-gray-700">收藏的药材</h3>
            <button
              @click="togglePrivacy('herbs')"
              class="text-xs flex items-center gap-1 px-3 py-1.5 rounded-full border transition-all"
              :class="
                privacySettings.herbs
                  ? 'bg-gray-100 text-gray-500 border-gray-200'
                  : 'bg-green-50 text-green-700 border-green-200'
              "
            >
              <component
                :is="privacySettings.herbs ? Lock : Unlock"
                class="w-3 h-3"
              />
              {{ privacySettings.herbs ? "仅自己可见" : "公开可见" }}
            </button>
          </div>

          <div class="grid grid-cols-1 gap-4">
            <div
              v-if="!favoriteHerbs.length"
              class="text-center py-20 text-gray-400 bg-white rounded-xl border border-dashed border-sandalwood/10"
            >
              <p>私库空空如也</p>
            </div>
            <div
              v-for="herb in favoriteHerbs"
              :key="herb.favorite_id"
              class="bg-white p-4 rounded-xl shadow-card border border-sandalwood/10 relative group hover:shadow-lg cursor-pointer flex items-center gap-4"
              @click="goToHerbDetail(herb.name)"
            >
              <button
                @click.stop="deleteHerb(herb.favorite_id)"
                class="absolute top-3 right-3 text-gray-300 hover:text-red-400 p-2 hover:bg-red-50 rounded-full transition-colors opacity-0 group-hover:opacity-100 z-10"
              >
                <X class="w-4 h-4" />
              </button>
              <div
                class="w-14 h-14 rounded-lg bg-[#EEF2E6] overflow-hidden shrink-0 border border-[#5A7C65]/20"
              >
                <img
                  :src="getFavoriteHerbImage(herb)"
                  :alt="herb.name"
                  class="w-full h-full object-cover"
                  loading="lazy"
                  decoding="async"
                  @error="(e) => handleFavoriteHerbImageError(e, herb)"
                />
              </div>
              <div class="flex-1 min-w-0">
                <h4 class="font-bold font-serif text-gray-800">{{ herb.name }}</h4>
                <p class="text-xs font-serif text-gray-500 mt-1 line-clamp-2">
                  {{ herb.identity_tag || [herb.nature, herb.taste].filter(Boolean).join(' · ') }}
                </p>
              </div>
              <ChevronDown class="-rotate-90 w-4 h-4 text-gray-300" />
            </div>
          </div>
        </div>

        <!-- ===== 收藏食谱 双子 Tab ===== -->
        <div
          v-else-if="activeTab === 'recipes'"
          class="animate-in slide-in-from-bottom-4 duration-500"
        >
          <!-- 顶栏：子Tab切换（左小块） + 隐私按钮 -->
          <div class="flex items-center justify-between mb-4 px-1">
            <div
              class="inline-flex items-center bg-stone-100 p-1 rounded-lg gap-0.5"
            >
              <button
                @click="recipeSubTab = 'market'"
                class="text-xs px-3 py-1.5 rounded-md font-medium transition-all"
                :class="
                  recipeSubTab === 'market'
                    ? 'bg-white text-sandalwood shadow-sm'
                    : 'text-gray-400 hover:text-gray-600'
                "
              >
                广场收藏
              </button>
              <button
                @click="recipeSubTab = 'ai'"
                class="text-xs px-3 py-1.5 rounded-md font-medium transition-all"
                :class="
                  recipeSubTab === 'ai'
                    ? 'bg-white text-[#8B6914] shadow-sm'
                    : 'text-gray-400 hover:text-gray-600'
                "
              >
                AI推荐
              </button>
            </div>
            <button
              @click="togglePrivacy('recipes')"
              class="text-xs flex items-center gap-1 px-3 py-1.5 rounded-full border transition-all"
              :class="
                privacySettings.recipes
                  ? 'bg-gray-100 text-gray-500 border-gray-200'
                  : 'bg-green-50 text-green-700 border-green-200'
              "
            >
              <component
                :is="privacySettings.recipes ? Lock : Unlock"
                class="w-3 h-3"
              />
              {{ privacySettings.recipes ? "仅自己可见" : "公开可见" }}
            </button>
          </div>

          <!-- 广场收藏 子Tab：3列大图卡片 -->
          <div v-if="recipeSubTab === 'market'">
            <div
              v-if="!marketSavedRecipes.length"
              class="text-center py-20 text-gray-400 bg-white rounded-xl border border-dashed border-sandalwood/10"
            >
              <p>还没有收藏过广场食谱</p>
            </div>
            <div v-else class="grid grid-cols-3 gap-2">
              <div
                v-for="recipe in marketSavedRecipes"
                :key="recipe.id"
                class="group bg-white rounded-xl overflow-hidden shadow-sm border border-stone-100 cursor-pointer hover:shadow-md transition-all duration-300 flex flex-col"
                @click="openSavedRecipeDetail(recipe)"
              >
                <div class="relative h-28 overflow-hidden bg-gray-100">
                  <img
                    v-if="recipe.image"
                    :src="recipe.image"
                    class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div
                    v-else
                    class="w-full h-full flex items-center justify-center text-3xl"
                  >
                    🥣
                  </div>
                  <button
                    @click.stop="deleteRecipe(recipe)"
                    class="absolute top-1 right-1 bg-black/40 text-white/90 rounded-full p-1 opacity-0 group-hover:opacity-100 transition"
                  >
                    <X class="w-3 h-3" />
                  </button>
                  <div v-if="recipe.time" class="absolute bottom-1 left-1">
                    <span
                      class="bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded flex items-center gap-0.5"
                    >
                      <Clock class="w-2.5 h-2.5" />{{ recipe.time }}
                    </span>
                  </div>
                </div>
                <div class="p-2 flex-1 flex flex-col">
                  <h4
                    class="text-xs font-bold text-stone-800 line-clamp-2 mb-1"
                  >
                    {{ recipe.name }}
                  </h4>
                  <p class="text-[10px] text-stone-400 mb-1">
                    {{ recipe.cooked_count || 0 }} 人做过
                  </p>
                  <span
                    class="text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded border border-emerald-100 self-start"
                    >{{ recipe.bodyType || recipe.body_type }}</span
                  >
                </div>
              </div>
            </div>
          </div>

          <!-- AI推荐 子Tab：文字卡 + 医理依据 + 操作按钮 -->
          <div v-else-if="recipeSubTab === 'ai'" class="space-y-3">
            <div
              v-if="!aiSavedRecipes.length"
              class="text-center py-20 text-gray-400 bg-white rounded-xl border border-dashed border-sandalwood/10"
            >
              <p>还没有 AI 推荐的食谱收藏</p>
            </div>
            <div
              v-for="recipe in aiSavedRecipes"
              :key="recipe.id"
              class="bg-white p-4 rounded-xl shadow-sm border border-gray-100 relative group transition-all hover:-translate-y-0.5 hover:shadow-lg font-['KaiTi',cursive]"
            >
              <button
                @click="deleteRecipe(recipe)"
                class="absolute top-3 right-3 text-gray-300 hover:text-red-400 p-1.5 hover:bg-red-50 rounded-full transition opacity-0 group-hover:opacity-100"
              >
                <X class="w-4 h-4" />
              </button>
              <!-- 名称行：角标 + 名称 + 医理依据 -->
              <div class="flex flex-wrap items-baseline gap-2 mb-2 pr-8">
                <span
                  class="text-[10px] bg-[#F5EDD6] text-[#8B6914] border border-[#DEC880] px-2 py-0.5 rounded-full font-medium shrink-0"
                  >AI推荐</span
                >
                <h4 class="font-bold text-gray-800 text-lg shrink-0">
                  {{ recipe.name }}
                </h4>
                <span
                  v-if="recipe.rationale"
                  class="text-xs text-stone-500 line-clamp-1"
                  ><span class="font-medium">医理：</span>{{ recipe.rationale }}</span
                >
              </div>
              <!-- 标签 -->
              <div class="flex flex-wrap gap-1 mb-2">
                <span
                  v-for="tag in ensureArray(recipe.tags)"
                  :key="tag"
                  class="text-[11px] bg-[#EEF2E6] text-[#5A7C65] px-2 py-0.5 rounded-full border border-[#5A7C65]/20 font-medium"
                  >{{ tag }}</span
                >
              </div>
              <!-- 食材 -->
              <div
                class="text-sm text-gray-600 bg-gray-50 p-2.5 rounded-lg leading-relaxed mb-2"
              >
                <span class="font-bold text-gray-800">食材：</span
                >{{ formatIngredientsForDisplay(recipe.ingredients) }}
              </div>
              <!-- 展开步骤 -->
              <button
                @click="toggleFold(`saved-${recipe.id}`)"
                class="w-full text-sm text-center font-bold text-sandalwood bg-sandalwood/5 hover:bg-sandalwood/10 py-1.5 rounded-lg flex items-center justify-center gap-1 transition-colors mb-2"
              >
                {{
                  foldedStates[`saved-${recipe.id}`]
                    ? "收起做法"
                    : "查看详细做法"
                }}
                <ChevronDown
                  class="w-3.5 h-3.5 transition-transform duration-300"
                  :class="{ 'rotate-180': foldedStates[`saved-${recipe.id}`] }"
                />
              </button>
              <div
                v-show="foldedStates[`saved-${recipe.id}`]"
                class="space-y-1.5 pl-2 border-l-2 border-sandalwood/20 mb-3 animate-in fade-in"
              >
                <p
                  v-for="(s, i) in ensureArray(recipe.steps)"
                  :key="i"
                  class="text-sm text-gray-600 leading-relaxed"
                >
                  <span class="font-bold text-sandalwood/60 mr-1"
                    >{{ i + 1 }}.</span
                  >{{ s }}
                </p>
              </div>
              <!-- 操作按钮 -->
              <div class="flex gap-2">
                <button
                  @click="openPublishPrefillFromAi(recipe)"
                  class="flex-1 text-sm py-2 rounded-lg bg-sandalwood/10 text-sandalwood font-medium hover:bg-sandalwood/20 transition flex items-center justify-center gap-1"
                >
                  <Sparkles class="w-3 h-3" />AI一键补全为可发布食谱
                </button>
                <button
                  @click="goToMarketSimilar(recipe)"
                  class="flex-1 text-sm py-2 rounded-lg bg-stone-100 text-stone-600 font-medium hover:bg-stone-200 transition flex items-center justify-center gap-1"
                >
                  <ChefHat class="w-3 h-3" />去广场找相似
                </button>
              </div>
            </div>
          </div>
        </div>

        <div
          v-else-if="activeTab === 'works'"
          class="animate-in slide-in-from-bottom-4 duration-500"
        >
          <div class="flex justify-between items-center mb-4 px-2">
            <h3 class="font-bold font-serif text-gray-700">我的跟做作业</h3>
            <span class="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded"
              >默认为公开</span
            >
          </div>

          <div
            v-if="!myWorks.length"
            class="text-center py-20 text-gray-400 bg-white rounded-xl border border-dashed border-sandalwood/10"
          >
            <p>还没交过作业，快去食谱广场试试吧</p>
          </div>
          <div
            v-else
            class="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2.5"
          >
            <div
              v-for="work in myWorks"
              :key="work.id"
              class="aspect-square bg-gray-100 rounded-lg overflow-hidden relative group cursor-pointer shadow-sm border border-gray-200"
              @click="goToHomeworkDetail(work)"
            >
              <button
                type="button"
                class="absolute top-2 right-2 z-10 bg-black/40 text-white/80 rounded-full p-1.5 shadow-sm opacity-0 group-hover:opacity-100 transition"
                @click.stop="deleteWork(work.id)"
              >
                <Trash2 class="w-4 h-4" />
              </button>
              <img
                :src="work.image_url"
                class="w-full h-full object-cover transition-transform group-hover:scale-110"
              />
              <div
                class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2"
              >
                <p class="text-white text-xs line-clamp-2">
                  {{ work.content || "打卡成功" }}
                </p>
                <span class="text-[10px] text-white/60 mt-1">{{
                  formatDate(work.created_at)
                }}</span>
              </div>
            </div>
          </div>
        </div>

        <div
          v-else-if="activeTab === 'my_recipes'"
          class="animate-in slide-in-from-bottom-4 duration-500"
        >
          <div class="flex justify-between items-center mb-4 px-2">
            <h3 class="font-bold font-serif text-gray-700">我发布的食谱</h3>
            <button
              type="button"
              class="text-xs bg-sandalwood text-white px-3 py-1.5 rounded-full shadow-sm hover:bg-sandalwood/90 flex items-center gap-1"
              @click="openNewRecipeModal"
            >
              <Utensils class="w-3 h-3" /> 发布新菜谱
            </button>
          </div>

          <div
            v-if="!mergedMyRecipes.length"
            class="text-center py-20 text-gray-400 bg-white rounded-xl border border-dashed border-sandalwood/10"
          >
            <p>您还没有发布过原创食谱</p>
          </div>
          <div
            v-else
            class="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4"
          >
            <div
              v-for="recipe in mergedMyRecipes"
              :key="`${recipe._rowSource}-${recipe.id}`"
              class="group bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden border border-stone-100 flex flex-col cursor-pointer relative"
              @click="openMyRecipe(recipe)"
            >
              <button
                type="button"
                class="absolute top-2 right-2 z-10 rounded-full p-1.5 shadow-sm transition"
                :class="
                  canDeleteMyRecipeEntry(recipe)
                    ? 'bg-white/90 text-stone-300 hover:text-red-500 hover:bg-red-50'
                    : 'bg-white/90 text-amber-500 cursor-not-allowed hover:text-amber-600 hover:bg-amber-50'
                "
                :title="
                  !canDeleteMyRecipeEntry(recipe)
                    ? '待审核不可删除'
                    : '删除菜谱'
                "
                @click.stop="deleteMyRecipeEntry(recipe)"
              >
                <CircleSlash
                  v-if="!canDeleteMyRecipeEntry(recipe)"
                  class="w-4 h-4"
                />
                <Trash2 v-else class="w-4 h-4" />
              </button>
              <div class="relative h-36 lg:h-40 overflow-hidden bg-gray-100">
                <img
                  v-if="recipe.image"
                  :src="recipe.image"
                  class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div
                  v-else
                  class="w-full h-full flex items-center justify-center text-4xl"
                >
                  🥗
                </div>
                <div
                  class="absolute bottom-2 left-2 flex gap-2"
                  v-if="recipe.time"
                >
                  <span
                    class="bg-black/60 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-md"
                  >
                    {{ recipe.time }}
                  </span>
                </div>
              </div>
              <div class="p-4 flex-1 flex flex-col">
                <h4 class="text-base font-bold text-gray-800 mb-1 line-clamp-2">
                  {{ recipe.name }}
                </h4>
                <p class="text-xs text-gray-500 mb-2 line-clamp-2">
                  {{ recipe.description || "暂无描述" }}
                </p>
                <div class="flex flex-wrap gap-2 mt-auto">
                  <span
                    class="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded"
                    >原创</span
                  >
                  <span
                    class="text-[10px] px-2 py-0.5 rounded border"
                    :class="statusLabelClass(getMyRecipeStatusLabel(recipe))"
                    >{{ getMyRecipeStatusLabel(recipe) }}</span
                  >
                  <span
                    v-if="recipe.body_type"
                    class="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded"
                  >
                    {{ recipe.body_type }}
                  </span>
                  <span
                    v-if="recipe.created_at"
                    class="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded"
                  >
                    {{ formatDate(recipe.created_at) }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div
          v-else-if="activeTab === 'mailbox'"
          class="animate-in slide-in-from-bottom-4 duration-500"
        >
          <div class="flex justify-between items-center mb-4 px-2">
            <h3 class="font-bold font-serif text-gray-700">信箱</h3>
            <span class="text-xs text-gray-400">站内通知</span>
          </div>

          <div v-if="isAdmin && pendingModeration.length" class="mb-6 px-1">
            <div class="flex items-center gap-2 mb-3">
              <ShieldCheck class="w-4 h-4 text-amber-700" />
              <span class="text-sm font-bold text-gray-800">待审核菜谱</span>
              <span class="text-xs text-gray-400"
                >（来自用户投稿「发布到食谱广场」）</span
              >
            </div>
            <div class="space-y-2">
              <div
                v-for="pr in pendingModeration"
                :key="`pend-${pr.id}`"
                class="bg-amber-50/90 border border-amber-100 rounded-xl p-3 flex items-center gap-3 cursor-pointer hover:border-amber-200 transition"
                @click="openMyRecipe({ ...pr, _rowSource: 'db' })"
              >
                <img
                  v-if="pr.image"
                  :src="pr.image"
                  class="w-14 h-14 rounded-lg object-cover bg-white shrink-0"
                />
                <div
                  v-else
                  class="w-14 h-14 rounded-lg bg-white flex items-center justify-center text-2xl shrink-0"
                >
                  🥗
                </div>
                <div class="flex-1 min-w-0">
                  <div class="font-bold text-gray-800 truncate">
                    {{ pr.name }}
                  </div>
                  <div class="text-xs text-gray-500 truncate">
                    投稿人：{{ pr.author_name || "—" }}
                  </div>
                </div>
                <span class="text-xs font-bold text-amber-800 shrink-0"
                  >去审核</span
                >
              </div>
            </div>
          </div>

          <div
            v-if="
              !inboxMessages.length && !(isAdmin && pendingModeration.length)
            "
            class="text-center py-16 text-gray-400 bg-white rounded-xl border border-dashed border-sandalwood/10"
          >
            <p>暂无站内信</p>
          </div>
          <div v-else class="space-y-2">
            <div
              v-for="msg in inboxMessages"
              :key="msg.id"
              class="bg-white rounded-xl border border-stone-100 p-4 shadow-sm cursor-pointer hover:border-sandalwood/30 transition"
              :class="{ 'opacity-70': msg.read_at }"
              @click="openInboxMessage(msg)"
            >
              <div class="flex justify-between gap-2 items-start">
                <span class="font-bold text-gray-800 text-sm">{{
                  msg.title
                }}</span>
                <span class="text-[10px] text-gray-400 shrink-0">{{
                  formatDate(msg.created_at)
                }}</span>
              </div>
              <p class="text-xs text-gray-600 mt-2 leading-relaxed">
                {{ msg.body }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- 广场收藏：食谱详情弹窗（复用 RecipeMarketDetailModal 组件） -->
  <RecipeMarketDetailModal v-model="showSavedRecipeModal" :recipe-id="savedRecipeModalId" />


  <!-- 我发布的食谱：详情资料卡（样式对齐"食谱推荐"的详情卡） -->
  <Transition
    enter-active-class="transition duration-300 ease-out"
    enter-from-class="opacity-0 translate-y-4"
    enter-to-class="opacity-100 translate-y-0"
    leave-active-class="transition duration-200 ease-in"
    leave-from-class="opacity-100 translate-y-0"
    leave-to-class="opacity-0 translate-y-4"
  >
    <Teleport to="body">
      <div
        v-if="selectedMyRecipe"
        class="fixed inset-0 z-[1300] flex items-center justify-center p-4 sm:p-6 bg-black/40 backdrop-blur-[2px]"
      >
        <div class="absolute inset-0" @click="closeMyRecipe"></div>
        <div
          class="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl h-[90vh] flex flex-col overflow-hidden z-10"
        >
          <button
            @click="closeMyRecipe"
            class="absolute top-4 right-4 z-20 bg-black/20 backdrop-blur-md text-white p-2 rounded-full hover:bg-black/40 transition"
          >
            <X :size="20" />
          </button>

          <div class="flex-1 overflow-y-auto custom-scrollbar bg-white pb-20">
            <div class="h-72 w-full shrink-0 relative">
              <img
                v-if="selectedMyRecipe.image"
                :src="selectedMyRecipe.image"
                class="w-full h-full object-cover"
              />
              <div
                v-else
                class="w-full h-full flex items-center justify-center text-6xl text-gray-300"
              >
                🥗
              </div>
              <div
                class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-white to-transparent h-24"
              ></div>
            </div>

            <div class="p-6 sm:p-8 -mt-6 relative z-10">
              <h2 class="text-3xl font-bold text-stone-900 mb-2">
                {{ selectedMyRecipe.name }}
              </h2>

              <div class="flex flex-wrap items-center gap-2 mb-3">
                <span
                  class="text-[10px] px-2 py-0.5 rounded border"
                  :class="
                    statusLabelClass(getMyRecipeStatusLabel(selectedMyRecipe))
                  "
                  >{{ getMyRecipeStatusLabel(selectedMyRecipe) }}</span
                >
              </div>

              <div
                v-if="
                  selectedMyRecipe._rowSource === 'db' &&
                  selectedMyRecipe.author_name
                "
                class="flex items-center gap-2 mb-6 text-sm text-stone-600 bg-stone-50/80 px-3 py-2 rounded-xl border border-stone-100"
              >
                <img
                  v-if="selectedMyRecipe.author_avatar_url"
                  :src="selectedMyRecipe.author_avatar_url"
                  class="w-9 h-9 rounded-full object-cover border border-stone-200 shrink-0"
                />
                <div
                  v-else
                  class="w-9 h-9 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-xs font-bold shrink-0"
                >
                  {{ selectedMyRecipe.author_name?.[0] }}
                </div>
                <div>
                  <div class="text-[10px] text-stone-400">发布者</div>
                  <div class="font-medium text-stone-800">
                    {{ selectedMyRecipe.author_name }}
                  </div>
                </div>
              </div>

              <div
                v-if="
                  isAdmin &&
                  selectedMyRecipe._rowSource === 'db' &&
                  selectedMyRecipe.moderation_status === 'pending'
                "
                class="flex flex-col sm:flex-row gap-2 mb-8"
              >
                <button
                  type="button"
                  class="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-bold disabled:opacity-50"
                  :disabled="moderationBusy"
                  @click="moderatePendingRecipe(selectedMyRecipe, true)"
                >
                  通过审核
                </button>
                <button
                  type="button"
                  class="flex-1 py-2.5 rounded-xl bg-stone-200 text-stone-800 text-sm font-bold disabled:opacity-50"
                  :disabled="moderationBusy"
                  @click="moderatePendingRecipe(selectedMyRecipe, false)"
                >
                  不通过
                </button>
              </div>

              <div
                class="flex items-center gap-4 mb-8 bg-stone-50 p-4 rounded-xl border border-stone-100"
              >
                <div class="text-center px-4 border-r border-stone-200">
                  <div class="text-3xl font-bold text-amber-500">
                    {{ selectedMyRecipe.rating ?? "--" }}
                  </div>
                  <div class="text-[10px] text-stone-400">综合评分</div>
                </div>
                <div class="flex-1 pl-2">
                  <div class="text-sm text-stone-600 mb-2">
                    <span class="font-bold text-emerald-600">{{
                      selectedMyRecipe.cooked_count || 0
                    }}</span>
                    人已做过
                  </div>
                  <div class="flex flex-wrap gap-2 text-[11px] text-stone-400">
                    <span
                      v-if="selectedMyRecipe.time"
                      class="inline-flex items-center gap-1 bg-white px-2 py-1 rounded-full border border-stone-100"
                    >
                      <Clock :size="12" /> {{ selectedMyRecipe.time }}
                    </span>
                    <span
                      v-if="selectedMyRecipe.solar_term"
                      class="inline-flex items-center gap-1 bg-amber-50 text-amber-700 px-2 py-1 rounded-full border border-amber-100"
                    >
                      {{ selectedMyRecipe.solar_term }}
                    </span>
                    <span
                      v-if="selectedMyRecipe.created_at"
                      class="inline-flex items-center gap-1 bg-stone-50 px-2 py-1 rounded-full border border-stone-100"
                    >
                      创建于 {{ formatDate(selectedMyRecipe.created_at) }}
                    </span>
                  </div>
                </div>
              </div>

              <div class="grid grid-cols-2 gap-4 mb-6">
                <div class="bg-stone-50 p-3 rounded-xl border border-stone-100">
                  <span class="text-xs text-stone-400 block mb-1"
                    >适宜体质</span
                  >
                  <span
                    class="font-medium text-emerald-700 flex items-center gap-1"
                  >
                    <UserCheck :size="14" />
                    {{ selectedMyRecipe.body_type || "—" }}
                  </span>
                </div>
                <div class="bg-stone-50 p-3 rounded-xl border border-stone-100">
                  <span class="text-xs text-stone-400 block mb-1"
                    >主要功效</span
                  >
                  <span
                    class="font-medium text-amber-700 flex items-center gap-1"
                  >
                    <Sparkles :size="14" />
                    {{
                      selectedMyRecipe.efficacy &&
                      selectedMyRecipe.efficacy.length
                        ? selectedMyRecipe.efficacy.join("/")
                        : "—"
                    }}
                  </span>
                </div>
              </div>

              <p
                v-if="selectedMyRecipe.description"
                class="text-stone-600 leading-relaxed mb-8 bg-stone-50 p-4 rounded-xl border border-stone-100"
              >
                {{ selectedMyRecipe.description }}
              </p>

              <div class="mb-8">
                <h3 class="text-lg font-bold mb-4 flex items-center gap-2">
                  <Soup :size="20" /> 所需食材
                </h3>
                <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div
                    v-for="(ing, idx) in selectedMyRecipe.ingredients || []"
                    :key="idx"
                    class="flex items-center justify-between p-2 rounded-lg border border-stone-100 bg-white"
                  >
                    <span class="text-stone-700">{{ ing.name }}</span>
                    <span class="text-xs text-stone-400">{{ ing.amount }}</span>
                  </div>
                  <div
                    v-if="
                      !(
                        selectedMyRecipe.ingredients &&
                        selectedMyRecipe.ingredients.length
                      )
                    "
                    class="text-sm text-stone-400"
                  >
                    暂无食材信息
                  </div>
                </div>
              </div>

              <div class="mb-10">
                <h3 class="text-lg font-bold mb-4 flex items-center gap-2">
                  <ListOrdered :size="20" /> 烹饪步骤
                </h3>
                <div
                  v-if="selectedMyRecipe.steps && selectedMyRecipe.steps.length"
                  class="space-y-6"
                >
                  <div
                    v-for="(step, idx) in selectedMyRecipe.steps"
                    :key="idx"
                    class="flex gap-4"
                  >
                    <div
                      class="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-sm font-bold mt-0.5"
                    >
                      {{ idx + 1 }}
                    </div>
                    <p class="text-stone-600 leading-relaxed">{{ step }}</p>
                  </div>
                </div>
                <div
                  v-else
                  class="text-sm text-stone-400 bg-stone-50 p-4 rounded-xl border border-stone-100"
                >
                  暂无步骤信息
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </Transition>

  <!-- 发布新菜谱弹窗 -->
  <Transition
    enter-active-class="transition duration-200 ease-out"
    enter-from-class="opacity-0 scale-95"
    enter-to-class="opacity-100 scale-100"
    leave-active-class="transition duration-150 ease-in"
    leave-from-class="opacity-100 scale-100"
    leave-to-class="opacity-0 scale-95"
  >
    <Teleport to="body">
      <div
        v-if="showNewRecipeModal"
        class="fixed inset-0 z-[1500] flex items-start justify-center bg-black/45 backdrop-blur-sm px-3 sm:px-4 pt-20 sm:pt-24 pb-4 sm:pb-6 overflow-y-auto"
      >
        <div class="absolute inset-0" @click="closeNewRecipeModal"></div>
        <div
          class="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[calc(100vh-7rem)] sm:max-h-[calc(100vh-8rem)] flex flex-col overflow-hidden"
        >
          <div
            class="flex items-center justify-between px-4 py-3 border-b border-gray-100"
          >
            <h3 class="font-bold text-lg text-gray-800">发布新菜谱</h3>
            <button
              type="button"
              class="text-gray-400 hover:text-gray-600"
              @click="closeNewRecipeModal"
            >
              <X class="w-5 h-5" />
            </button>
          </div>

          <div class="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1"
                >菜谱名称</label
              >
              <input
                v-model="newRecipeName"
                type="text"
                class="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-sandalwood/20 focus:border-sandalwood/60"
                placeholder="例如：四神健脾养胃粥"
              />
            </div>

            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1"
                >一句简介（可选）</label
              >
              <textarea
                v-model="newRecipeDesc"
                rows="2"
                class="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-sandalwood/20 focus:border-sandalwood/60"
                placeholder="简单介绍这道菜适合什么人、有什么功效"
              ></textarea>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-medium text-gray-500 mb-1"
                  >适宜体质</label
                >
                <select
                  v-model="newRecipeBodyType"
                  class="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sandalwood/20 focus:border-sandalwood/60"
                >
                  <option
                    v-for="opt in BODY_TYPES"
                    :key="opt.value || 'all'"
                    :value="opt.value"
                    :disabled="!opt.value"
                  >
                    {{ opt.label }}
                  </option>
                </select>
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-500 mb-1"
                  >对应节气（可选）</label
                >
                <select
                  v-model="newRecipeSolarTerm"
                  class="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sandalwood/20 focus:border-sandalwood/60"
                >
                  <option
                    v-for="opt in solarTermOptions"
                    :key="opt.value"
                    :value="opt.value"
                  >
                    {{ opt.label }}
                  </option>
                </select>
              </div>
            </div>

            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1"
                >烹饪时间（可选）</label
              >
              <div class="flex gap-2">
                <input
                  v-model="newRecipeTimeNumber"
                  type="number"
                  min="1"
                  step="1"
                  class="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-sandalwood/20 focus:border-sandalwood/60"
                  placeholder="填写时长数字"
                />
                <select
                  v-model="newRecipeTimeUnit"
                  class="w-24 px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sandalwood/20 focus:border-sandalwood/60"
                >
                  <option value="分钟">分钟</option>
                  <option value="小时">小时</option>
                </select>
              </div>
              <p
                v-if="newRecipeTimeNumber"
                class="text-[10px] text-gray-400 mt-1"
              >
                将显示为：{{ computedTimeStr() }}
              </p>
            </div>

            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1"
                >主要功效标签（可选）</label
              >
              <input
                v-model="newRecipeEfficacy"
                type="text"
                class="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-sandalwood/20 focus:border-sandalwood/60"
                placeholder="例如：健脾养胃 清热降火（用空格或逗号分隔）"
              />
            </div>

            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1"
                >食材清单</label
              >
              <div class="space-y-2">
                <div
                  v-for="(ing, idx) in newRecipeIngredients"
                  :key="idx"
                  class="grid grid-cols-[1.2fr_1fr_auto] gap-2 items-center"
                >
                  <input
                    v-model="ing.name"
                    type="text"
                    class="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-sandalwood/20 focus:border-sandalwood/60"
                    placeholder="食材名称，如：山药"
                  />
                  <input
                    v-model="ing.amount"
                    type="text"
                    class="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-sandalwood/20 focus:border-sandalwood/60"
                    placeholder="用量，如20克"
                  />
                  <button
                    type="button"
                    class="text-xs text-gray-400 hover:text-red-500 px-2 py-1 flex items-center gap-1"
                    @click="newRecipeIngredients.splice(idx, 1)"
                    v-if="newRecipeIngredients.length > 1"
                  >
                    <Trash2 class="w-3 h-3" /> 删除
                  </button>
                </div>
                <button
                  type="button"
                  class="mt-1 inline-flex items-center px-3 py-1.5 rounded-full border border-gray-300 text-xs text-gray-600 hover:bg-gray-50"
                  @click="newRecipeIngredients.push({ name: '', amount: '' })"
                >
                  + 添加食材
                </button>
              </div>
            </div>

            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1"
                >详细步骤</label
              >
              <div class="space-y-2">
                <div
                  v-for="(step, idx) in newRecipeSteps"
                  :key="idx"
                  class="flex items-start gap-2"
                >
                  <span class="mt-2 text-xs text-gray-400 w-5 text-right"
                    >{{ idx + 1 }}.</span
                  >
                  <textarea
                    v-model="newRecipeSteps[idx]"
                    rows="2"
                    class="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-sandalwood/20 focus:border-sandalwood/60"
                    :placeholder="`填写第 ${idx + 1} 步的做法`"
                  ></textarea>
                  <button
                    type="button"
                    class="mt-2 text-xs text-gray-400 hover:text-red-500 px-2 py-1 flex items-center gap-1"
                    @click="newRecipeSteps.splice(idx, 1)"
                    v-if="newRecipeSteps.length > 1"
                  >
                    <Trash2 class="w-3 h-3" /> 删除
                  </button>
                </div>
                <button
                  type="button"
                  class="mt-1 inline-flex items-center px-3 py-1.5 rounded-full border border-gray-300 text-xs text-gray-600 hover:bg-gray-50"
                  @click="newRecipeSteps.push('')"
                >
                  + 添加步骤
                </button>
              </div>
            </div>

            <div
              class="flex items-start gap-2 p-3 rounded-xl border border-amber-100 bg-amber-50/50"
            >
              <input
                id="publishSquare"
                v-model="publishToSquare"
                type="checkbox"
                class="mt-1 rounded border-gray-300 text-sandalwood focus:ring-sandalwood/30"
              />
              <label
                for="publishSquare"
                class="text-xs text-gray-700 leading-relaxed cursor-pointer select-none"
              >
                <span class="font-bold text-amber-900">发布到食谱广场</span>
                <span class="block text-gray-500 mt-0.5"
                  >勾选后进入「审核中」，通过后将出现在养生食谱广场；不勾选则为「个人菜谱」。</span
                >
              </label>
            </div>

            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1"
                >菜谱配图（可选）</label
              >
              <div class="flex items-center gap-3">
                <div
                  class="w-20 h-20 rounded-xl bg-gray-100 flex items-center justify-center overflow-hidden border border-gray-200 text-gray-400 text-xs"
                >
                  <img
                    v-if="newRecipeImagePreview"
                    :src="newRecipeImagePreview"
                    class="w-full h-full object-cover"
                  />
                  <span v-else>暂无图片</span>
                </div>
                <label
                  class="inline-flex items-center px-3 py-2 rounded-full border border-gray-300 text-xs font-medium text-gray-700 cursor-pointer bg-white hover:bg-gray-50"
                >
                  选择图片
                  <input
                    type="file"
                    accept="image/*"
                    class="hidden"
                    @change="onNewRecipeImageSelected"
                  />
                </label>
              </div>
            </div>
          </div>

          <div
            class="px-4 py-3 border-t border-gray-100 flex justify-end gap-3 bg-gray-50"
          >
            <button
              type="button"
              class="px-4 py-2 rounded-full text-xs font-medium text-gray-500 hover:bg-gray-100"
              @click="closeNewRecipeModal"
              :disabled="isPublishingRecipe"
            >
              取消
            </button>
            <button
              type="button"
              class="px-5 py-2 rounded-full text-xs font-bold text-white bg-sandalwood hover:bg-sandalwood/90 disabled:opacity-60 disabled:cursor-not-allowed"
              @click="handlePublishRecipe"
              :disabled="isPublishingRecipe"
            >
              {{ isPublishingRecipe ? "发布中..." : "发布菜谱" }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </Transition>
</template>

<style scoped>
.bg-sandalwood {
  background-color: #a9805b;
}
.text-sandalwood {
  color: #a9805b;
}
.border-sandalwood\/10 {
  border-color: rgba(169, 128, 91, 0.1);
}
.border-sandalwood\/5 {
  border-color: rgba(169, 128, 91, 0.05);
}
.shadow-card {
  box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.05);
}
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

/* 复用食谱详情弹窗的滚动条样式 */
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: #d6d3d1;
  border-radius: 20px;
}
</style>

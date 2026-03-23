# 中药材百科 · 数字化中药养生

Vue 3 + Tailwind CSS 的中药材百科界面，木质色调与中医美学风格。

## 技术栈

- **Vue 3**（Composition API、`<script setup>`）
- **Tailwind CSS**
- **Lucide Vue**（图标）
- 详情页 3D 区为 CSS 线框占位，可自行接入 TresJS/Three.js

## 视觉与配置

- 背景：宣纸白 `#FDFBF7`
- 主色：檀木褐 `#8B5A2B`
- 点缀：朱砂红 `#C44E46`
- 辅助：竹青绿 `#5D7A47`
- 图片 CDN：`src/config.js` 中的 `CDN_URL`（默认 `https://cdn.example.com/`）

## 功能概览

1. **首页（药材瀑布流）**  
   吸顶玻璃拟态搜索栏、横向胶囊筛选、响应式瀑布流（手机 2 列 / 桌面 4 列）、药材卡片（图片懒加载、占位）、仿纸卡片样式。

2. **详情页**  
   上半部分金棕色线框形旋转占位（可换为 TresJS 模型）；下半部分性味归经、功效、用法用量、禁忌。

3. **全局 AI 养生导师**  
   右下角卷轴图标悬浮按钮，点击展开「AI 养生导师」聊天窗口，信笺淡黄气泡风格（当前为模拟回复）。

4. **useHerbData 组合式（模拟 Redis 缓存）**  
   `useHerbList` / `useHerbDetail`：优先读 `localStorage`，过期或不存在时走模拟 API 并写回缓存（含时间戳）。

## 快速开始

```bash
# 安装依赖
npm install

# 开发
npm run dev

# 构建
npm run build

# 预览构建结果
npm run preview
```

开发服默认：**http://localhost:5173**。**请务必用开发服务访问，不要直接双击 index.html 打开。**（正确运行方式（必做）
在项目根目录 c:\Users\16539\Desktop\web 打开终端（PowerShell 或 CMD），依次执行：
npm installnpm run dev
等终端出现类似：
  ➜  Local:   http://localhost:5173/
再用浏览器打开：http://localhost:5173
（不要直接双击 index.html，也不要开 file:///... 的地址。））

若页面空白：按 F12 打开开发者工具，在 Console 查看是否有报错；并确认已执行 `npm install` 且 `npm run dev` 成功。

## 项目结构（概要）

```
src/
├── api/herbs.js          # 模拟药材 API、缓存 key / TTL
├── composables/useHerbData.js
├── components/
│   ├── AiCompanion.vue   # AI 养生导师悬浮窗
│   └── HerbCard.vue      # 药材卡片
├── views/
│   ├── HomeView.vue      # 首页
│   └── HerbDetailView.vue
├── router/index.js
├── config.js             # CDN_URL 等
├── styles/index.css
├── main.js
└── App.vue
```

## 说明

- **药材图片**：`herb.image` 与 `CDN_URL` 拼接；若加载失败则用 `public/placeholder-herb.svg`。可将 `CDN_URL` 与 `herb.image` 改为真实资源。
- **AI 回复**：当前为前端模拟，可替换为真实大模型 API。
- **3D**：详情页现为 CSS 占位。若需 TresJS，可安装 `@tresjs/core`、`three`，并在 `HerbDetailView.vue` 中接入 `TresCanvas` 与 3D 模型。

## 用户投稿食谱 · 审核 · 站内信箱（Supabase）

1. 在 **Supabase Dashboard → SQL Editor** 中执行 `supabase/migrations/20260320120000_recipe_moderation_inbox.sql`（增加 `recipes` 审核字段、`inbox_messages` 站内信表、`profiles.is_admin` 等）。
2. **管理员账号（测试）**  
   - 在 **Authentication → Users** 创建用户：邮箱 **`123456@tcm.local`**，密码 **`123456`**（Supabase 要求合法邮箱格式；前端在登录框输入 **`123456`** 会自动补全为 `123456@tcm.local`）。  
   - 登录后个人中心会显示 **「管理员」** 标签；也可在 `profiles` 中将该用户 `is_admin = true`（可选）。  
   - 登录页底部有低调的 **「管理员登录（测试）」**，可一键填入并登录。
3. **流程**：个人中心发布菜谱时可勾选 **「发布到食谱广场」** → 状态为 **审核中** → 管理员在 **「信箱」** 中处理 **待审核** → 用户收到 **站内信**；通过后菜谱出现在 **养生膳食广场**，并展示投稿者头像与昵称。

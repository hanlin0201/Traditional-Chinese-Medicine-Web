# 中药材百科 · 数字化中药养生

Vue 3 + Tailwind CSS 的中药材百科界面，木质色调与中医美学风格。

# 项目说明

## 本地运行

```bash
npm install
npm run dev
启动后在浏览器访问终端输出的本地地址（通常为http://localhost:5173）。

代码结构
text

web/
├─ src/
│  ├─ components/          # 通用组件与首页功能组件（百子柜、养生避雷针等）
│  ├─ views/               # 路由页面（首页、药材详情、穴位、食谱、个人中心等）
│  ├─ composables/         # 复用逻辑（数据加载、预加载、缓存）
│  ├─ constants/           # 常量与静态配置
│  ├─ utils/               # 工具函数
│  ├─ router/              # 路由配置
│  ├─ styles/              # 全局样式
│  ├─ App.vue              # 根组件
│  └─ main.js              # 入口文件
├─ public/                 # 静态资源
├─ supabase/               # Supabase 相关函数与迁移脚本
├─ scripts/                # 数据生成/维护脚本
├─ package.json            # 依赖与脚本
└─ vite.config.js          # Vite 配置
主要页面对应关系
首页：src/views/MenuIndexView.vue
药材列表：src/views/HomeView.vue
药材详情：src/views/HerbDetailView.vue
穴位页面：src/views/AcupointView.vue
食谱广场：src/views/RecipeMarket.vue
个人中心：src/views/ProfileView.vue



特殊说明：
## 用户投稿食谱 · 审核 · 站内信箱（Supabase）

1. **管理员账号（测试）**
   - 在 **Authentication → Users** 创建用户：邮箱 **`123456@tcm.local`**，密码 **`123456`**（Supabase 要求合法邮箱格式；前端在登录框输入 **`123456`** 会自动补全为 `123456@tcm.local`）。
   - 登录后个人中心会显示 **「管理员」** 标签；也可在 `profiles` 中将该用户 `is_admin = true`（可选）。
   - 登录页底部有低调的 **「管理员登录（测试）」**，可一键填入并登录。
2. **流程**：个人中心发布菜谱时可勾选 **「发布到食谱广场」** → 状态为 **审核中** → 管理员在 **「信箱」** 中处理 **待审核** → 用户收到 **站内信**；通过后菜谱出现在 **养生膳食广场**，并展示投稿者头像与昵称。


## AI 接口说明

### 调用链路

```

前端 AiCompanion.vue
↓ fetch（流式 SSE）
Supabase Edge Function（supabase/functions/tcm-chat/index.ts）
↓ fetch + Authorization: Bearer
硅基流动 SiliconFlow API（https://api.siliconflow.cn/v1/chat/completions）

```

### 模型与供应商

| 项目 | 值 |
|------|-----|
| 供应商 | 硅基流动 SiliconFlow |
| 模型 | `Qwen/Qwen2.5-72B-Instruct` |
| 协议 | OpenAI-compatible Chat Completions API（流式 SSE） |
```

# 食谱封面图批量生成（方案 B）

本地脚本：用 OpenAI 生成 prompt + DALL·E 3 生成图片，上传到 Supabase Storage 并更新 `recipes.image`，直接覆盖占位图。

## 你需要先完成

1. **复制 `.env.example` 为 `.env`**，并填写：
   - `SUPABASE_URL`：与前端一致（如 `https://htrtcaswqydnfvgwernh.supabase.co`）
   - `SUPABASE_SERVICE_ROLE_KEY`：在 Supabase 控制台 → 项目 → Settings → API 中复制 **service_role** 的 key（不要用 anon key）
   - **二选一**：
     - `OPENAI_API_KEY`：在 [OpenAI API Keys](https://platform.openai.com/api-keys) 创建（用于 GPT + DALL·E）
     - `ZHIPU_API_KEY`：在 [智谱开放平台](https://open.bigmodel.cn) 登录 → API Keys 创建（用于 GLM + CogView-4，国内可用）
   - 若两个都填，脚本优先使用 OpenAI；只填智谱则用智谱。

2. **安装依赖**（若尚未安装）：
   ```bash
   npm install
   ```

## 试跑（建议先限制 1～2 条）

```bash
npm run recipe-images -- --style "中国风工笔，温暖食物摄影" --limit 2
```

或直接：

```bash
node scripts/generate-recipe-images.js --style "中国风工笔，温暖食物摄影" --limit 2
```

确认生成、上传、数据库更新都正常后，再全量运行（去掉 `--limit`）。

## 全量运行

```bash
npm run recipe-images -- --style "中国风工笔，温暖食物摄影"
```

仅处理当前为占位图（如 Unsplash）或空图的食谱：

```bash
npm run recipe-images -- --style "..." --only-placeholders
```

## 参数说明

| 参数 | 说明 |
|------|------|
| `--style` / `-s` | 风格描述，会传给 LLM 用于生成图像 prompt |
| `--only-placeholders` | 只处理 image 为空或为 Unsplash 的食谱 |
| `--limit` / `-n` | 最多处理条数，试跑时建议 1 或 2 |

不传 `--style` 时使用环境变量 `RECIPE_IMAGE_STYLE`，若也未设置则使用默认风格。

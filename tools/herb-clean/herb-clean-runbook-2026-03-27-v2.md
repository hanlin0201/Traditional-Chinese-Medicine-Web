# Supabase 执行与回滚说明（v2）

## 1) 执行清洗（可回滚）

- 在 Supabase SQL Editor 执行：`tools/herb-clean-apply-safe-2026-03-27-v2.sql`
- 脚本会先创建备份表：`herbs_backup_20260327_clean_v2`，再全量更新

## 2) 验收重点

- 功效与作用分点是否统一为 `(1)(2)...`
- 分点标红、换行是否符合预期
- 你点名药材（如阿胶、半春莲、布狗尾、败酱草等）是否修正

## 3) 不符合预期时回滚

- 在 Supabase SQL Editor 执行：`tools/herb-clean-rollback-2026-03-27-v2.sql`
- 回滚会用 `herbs_backup_20260327_clean_v2` 全量恢复 herbs 表
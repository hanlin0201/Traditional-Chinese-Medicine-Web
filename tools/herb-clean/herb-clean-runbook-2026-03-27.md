# Supabase 执行与回滚说明

## 1) 执行清洗（可回滚）

- 在 Supabase SQL Editor 打开并执行：`tools/herb-clean-apply-safe-2026-03-27.sql`
- 该脚本会先创建备份表：`herbs_backup_20260327_clean_v1`，再执行清洗更新

## 2) 验收

- 在前端重点查看你最关心的药材详情页（禁忌/性味归经/功效分行）
- 若效果符合预期，可保留备份表一段时间后再删

## 3) 不符合预期时回滚

- 在 Supabase SQL Editor 执行：`tools/herb-clean-rollback-2026-03-27.sql`
- 回滚脚本会从 `herbs_backup_20260327_clean_v1` 全量恢复 `herbs`

## 4) 版本建议

- 本次备份名带日期版本，避免与后续清洗冲突
- 下次再清洗时请生成新的备份表名（例如 v2）

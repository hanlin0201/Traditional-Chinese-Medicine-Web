-- 全量清洗回滚脚本
-- 说明：将 herbs 恢复为执行清洗前状态

begin;
update public.herbs as h
set
  created_at = b.created_at,
  name = b.name,
  alias = b.alias,
  classification = b.classification,
  taste = b.taste,
  channel = b.channel,
  usage = b.usage,
  tips = b.tips,
  effect = b.effect,
  image_url = b.image_url
from public.herbs_backup_20260327_clean_v1 as b
where h.id = b.id;
commit;

-- 可选：确认回滚后再删除备份表
-- drop table public.herbs_backup_20260327_clean_v1;
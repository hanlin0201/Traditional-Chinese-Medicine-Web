-- 全量清洗回滚脚本 v2
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
from public.herbs_backup_20260327_clean_v2 as b
where h.id = b.id;
commit;
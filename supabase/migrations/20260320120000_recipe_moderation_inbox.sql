-- 食谱审核 + 站内信箱 + 管理员标记
-- 请在 Supabase Dashboard → SQL Editor 中执行本文件（或 supabase db push）
-- 管理员账号：在 Authentication 中创建用户，邮箱建议为 123456@tcm.local，密码 123456
-- 然后执行： update public.profiles set is_admin = true where id = '<该用户 uuid>';

-- 1) profiles：管理员标记
alter table public.profiles
  add column if not exists is_admin boolean not null default false;

-- 2) recipes：发布者 + 审核状态（原有广场食谱统一视为已发布）
-- 若报错 "Could not find the 'description' column"，请先执行本块以补全列
alter table public.recipes
  add column if not exists description text,
  add column if not exists author_user_id uuid references auth.users (id) on delete set null,
  add column if not exists author_name text,
  add column if not exists author_avatar_url text,
  add column if not exists moderation_status text not null default 'published'
    check (moderation_status in ('personal', 'pending', 'published')),
  add column if not exists last_moderation_result text
    check (last_moderation_result is null or last_moderation_result in ('approved', 'rejected')),
  add column if not exists moderated_at timestamptz;

comment on column public.recipes.moderation_status is 'personal=仅个人；pending=待审核；published=已在广场展示';
comment on column public.recipes.last_moderation_result is '最近一次审核结果（站内信依据）';

-- 已有数据：视为官方/广场食谱
update public.recipes
set moderation_status = 'published'
where author_user_id is null;

-- 3) 站内信箱
create table if not exists public.inbox_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  body text not null,
  kind text not null default 'system'
    check (kind in ('moderation_approved', 'moderation_rejected', 'system')),
  recipe_id bigint,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists inbox_messages_user_created_idx
  on public.inbox_messages (user_id, created_at desc);

alter table public.inbox_messages enable row level security;

-- 用户只能读自己的站内信
drop policy if exists "inbox_select_own" on public.inbox_messages;
create policy "inbox_select_own"
  on public.inbox_messages for select
  using (auth.uid() = user_id);

-- 用户可标记已读
drop policy if exists "inbox_update_own_read" on public.inbox_messages;
create policy "inbox_update_own_read"
  on public.inbox_messages for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 插入：本人（预留）或管理员
drop policy if exists "inbox_insert_self" on public.inbox_messages;
create policy "inbox_insert_self"
  on public.inbox_messages for insert
  with check (auth.uid() = user_id);

drop policy if exists "inbox_insert_admin" on public.inbox_messages;
create policy "inbox_insert_admin"
  on public.inbox_messages for insert
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and coalesce(p.is_admin, false) = true
    )
  );

-- 测试管理员：JWT email 为 123456@tcm.local 时可代发站内信（无需 profiles.is_admin）
drop policy if exists "inbox_insert_admin_jwt_email" on public.inbox_messages;
create policy "inbox_insert_admin_jwt_email"
  on public.inbox_messages for insert
  with check (coalesce(auth.jwt() ->> 'email', '') = '123456@tcm.local');

-- 4) recipes 表的 RLS：各项目可能已有策略，此处不自动修改 recipes 的 RLS，
--    请在 Dashboard 中按需配置（或保持 recipes 表原有权限不变）。

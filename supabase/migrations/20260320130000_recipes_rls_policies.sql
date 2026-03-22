-- recipes 表 RLS 策略（解决 "new row violates row-level security policy"）
-- 在 Supabase Dashboard → SQL Editor 中执行

-- 确保 recipes 启用 RLS（若已启用则无影响）
alter table public.recipes enable row level security;

-- 所有人可读：已发布或 moderation_status 为空的食谱（广场展示）
drop policy if exists "recipes_select_published" on public.recipes;
create policy "recipes_select_published"
  on public.recipes for select
  using (moderation_status = 'published' or moderation_status is null);

-- 作者可读自己的食谱（个人菜谱、审核中）
drop policy if exists "recipes_select_own" on public.recipes;
create policy "recipes_select_own"
  on public.recipes for select
  using (auth.uid() = author_user_id);

-- 管理员可读待审核队列
drop policy if exists "recipes_select_admin_pending" on public.recipes;
create policy "recipes_select_admin_pending"
  on public.recipes for select
  using (
    moderation_status = 'pending'
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and coalesce(p.is_admin, false) = true
    )
  );

-- 作者可插入自己的食谱（author_user_id 必须为当前用户）
drop policy if exists "recipes_insert_author" on public.recipes;
create policy "recipes_insert_author"
  on public.recipes for insert
  with check (auth.uid() = author_user_id);

-- 作者可更新/删除自己的食谱
drop policy if exists "recipes_update_own" on public.recipes;
create policy "recipes_update_own"
  on public.recipes for update
  using (auth.uid() = author_user_id)
  with check (auth.uid() = author_user_id);

drop policy if exists "recipes_delete_own" on public.recipes;
create policy "recipes_delete_own"
  on public.recipes for delete
  using (auth.uid() = author_user_id);

-- 管理员可更新待审食谱（通过/驳回）
drop policy if exists "recipes_update_admin_pending" on public.recipes;
create policy "recipes_update_admin_pending"
  on public.recipes for update
  using (
    moderation_status = 'pending'
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and coalesce(p.is_admin, false) = true
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and coalesce(p.is_admin, false) = true
    )
  );

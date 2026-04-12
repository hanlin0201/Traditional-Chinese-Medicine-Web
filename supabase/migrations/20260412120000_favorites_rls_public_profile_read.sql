-- 他人查看个人主页时，需能读取「收藏食谱 / 药材私库」关联行（与 profiles.is_saved_private、is_herbs_private 一致）
-- 在 Supabase Dashboard → SQL Editor 执行，或 supabase db push
-- 若表上已有同名策略，会先删除再创建

-- ========== favorite_recipes ==========
alter table public.favorite_recipes enable row level security;

drop policy if exists "favorite_recipes_select_own" on public.favorite_recipes;
create policy "favorite_recipes_select_own"
  on public.favorite_recipes for select
  using (auth.uid() = user_id);

-- 主人将「收藏食谱」设为公开时，任意访客（含 anon）可读其收藏关联（食谱正文仍受 recipes 策略约束）
drop policy if exists "favorite_recipes_select_when_saved_public" on public.favorite_recipes;
create policy "favorite_recipes_select_when_saved_public"
  on public.favorite_recipes for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = favorite_recipes.user_id
        and coalesce(p.is_saved_private, false) = false
    )
  );

drop policy if exists "favorite_recipes_insert_own" on public.favorite_recipes;
create policy "favorite_recipes_insert_own"
  on public.favorite_recipes for insert
  with check (auth.uid() = user_id);

drop policy if exists "favorite_recipes_delete_own" on public.favorite_recipes;
create policy "favorite_recipes_delete_own"
  on public.favorite_recipes for delete
  using (auth.uid() = user_id);

-- ========== favorite_herbs ==========
alter table public.favorite_herbs enable row level security;

drop policy if exists "favorite_herbs_select_own" on public.favorite_herbs;
create policy "favorite_herbs_select_own"
  on public.favorite_herbs for select
  using (auth.uid() = user_id);

drop policy if exists "favorite_herbs_select_when_herbs_public" on public.favorite_herbs;
create policy "favorite_herbs_select_when_herbs_public"
  on public.favorite_herbs for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = favorite_herbs.user_id
        and coalesce(p.is_herbs_private, false) = false
    )
  );

drop policy if exists "favorite_herbs_insert_own" on public.favorite_herbs;
create policy "favorite_herbs_insert_own"
  on public.favorite_herbs for insert
  with check (auth.uid() = user_id);

drop policy if exists "favorite_herbs_delete_own" on public.favorite_herbs;
create policy "favorite_herbs_delete_own"
  on public.favorite_herbs for delete
  using (auth.uid() = user_id);

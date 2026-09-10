-- Nayo Money CMS：目前實際 Schema 對應版
-- 請在 Supabase SQL Editor 執行一次。
-- 不會刪除既有文章、分類、水晶、手環或 site_settings 資料。

create extension if not exists pgcrypto;

-- 1. 管理員判斷函式：符合目前 admins.user_id schema
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admins a where a.user_id = auth.uid()
  );
$$;

grant execute on function public.is_admin() to authenticated;

-- 2. 手環作品需要的缺數欄位（目前 CSV Schema 沒有，安全新增）
alter table public.products add column if not exists missing_numbers text;

-- 3. 信用卡優惠 CMS 表（如果尚未建立才建立）
create table if not exists public.promotions (
  id uuid primary key default gen_random_uuid(),
  bank text not null default '',
  badge text not null default '',
  title text not null default '',
  subtitle text,
  image text,
  bullets jsonb not null default '[]'::jsonb,
  meta jsonb not null default '[]'::jsonb,
  deadline text,
  url text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 4. RLS：site_settings 前台可讀，只有管理員可寫
alter table public.site_settings enable row level security;
grant select on public.site_settings to anon, authenticated;
grant insert, update, delete on public.site_settings to authenticated;
drop policy if exists "site_settings_public_read" on public.site_settings;
create policy "site_settings_public_read" on public.site_settings
for select to anon, authenticated using (true);
drop policy if exists "site_settings_admin_insert" on public.site_settings;
create policy "site_settings_admin_insert" on public.site_settings
for insert to authenticated with check (public.is_admin());
drop policy if exists "site_settings_admin_update" on public.site_settings;
create policy "site_settings_admin_update" on public.site_settings
for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "site_settings_admin_delete" on public.site_settings;
create policy "site_settings_admin_delete" on public.site_settings
for delete to authenticated using (public.is_admin());

-- 5. CMS 內容表：公開讀取，只有管理員可 CRUD
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['posts','categories','crystals','products','promotions'] LOOP
    EXECUTE format('GRANT SELECT ON public.%I TO anon', t);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);

    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_public_read', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO anon, authenticated USING (true)', t || '_public_read', t);

    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_admin_insert', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (public.is_admin())', t || '_admin_insert', t);

    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_admin_update', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin())', t || '_admin_update', t);

    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_admin_delete', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (public.is_admin())', t || '_admin_delete', t);
  END LOOP;
END $$;

-- 6. admins：保留目前 user_id schema，只允許登入者讀自己的紀錄
alter table public.admins enable row level security;
grant select on public.admins to authenticated;
drop policy if exists "admins_self_read" on public.admins;
create policy "admins_self_read" on public.admins
for select to authenticated using (user_id = auth.uid());

-- 7. 確保目前四個 Blog 分類存在；categories.type 為必要欄位
insert into public.categories(name, slug, description, type, sort_order, is_active)
values
('信用卡回饋','credit-card','信用卡優惠、回饋與申辦條件整理。','blog',1,true),
('小資理財','finance','小資族理財、ETF、投資與日常財務整理。','blog',2,true),
('旅行 × 生活','lifestyle','旅行、消費與生活理財。','blog',3,true),
('生命靈數 × 水晶','crystal','生命靈數、缺數與水晶筆記。','blog',4,true)
on conflict (slug) do update set
  name=excluded.name,
  description=excluded.description,
  type=excluded.type,
  sort_order=excluded.sort_order,
  is_active=excluded.is_active;

-- 8. 四篇示範文章：只有不存在相同 slug 才建立，不覆蓋既有文章
insert into public.posts(category_id,title,slug,excerpt,content,status,published_at,seo_title,seo_description)
select c.id,v.title,v.slug,v.excerpt,v.content,'published',now(),v.seo_title,v.seo_description
from (values
('credit-card','信用卡回饋怎麼看？先抓回饋率與上限','credit-card-reward-basics','整理信用卡回饋最容易忽略的門檻、上限與適用通路。','<p>這是一篇 Nayo 的示範文章，可直接在後台編輯、發布或刪除。</p>','信用卡回饋怎麼看？回饋率、門檻與上限整理','從回饋率、門檻與上限開始，建立自己的信用卡比較方式。'),
('finance','小資理財從哪裡開始？先把現金流整理好','small-investing-start','從收入、固定支出與可投資金額開始，建立適合自己的理財節奏。','<p>這是一篇 Nayo 的示範文章，可直接在後台編輯、發布或刪除。</p>','小資理財怎麼開始？現金流整理入門','小資理財入門，從現金流與每月可投資金額開始。'),
('lifestyle','旅行怎麼花得更聰明？信用卡與預算一起規劃','travel-smart-budget','旅行前先規劃預算，再搭配信用卡回饋，讓旅費花得更有效率。','<p>這是一篇 Nayo 的示範文章，可直接在後台編輯、發布或刪除。</p>','旅行理財：信用卡回饋與旅費預算規劃','旅行預算與信用卡回饋一起規劃，讓旅費更有效率。'),
('crystal','生命靈數與水晶入門：從缺數開始認識自己','life-number-crystal-intro','從生命靈數與缺數概念開始，認識 Nayo Crystal 的內容架構。','<p>這是一篇 Nayo 的示範文章，可直接在後台編輯、發布或刪除。</p>','生命靈數與水晶入門｜缺數解析','從生命靈數與缺數開始認識水晶內容。')
) as v(cat_slug,title,slug,excerpt,content,seo_title,seo_description)
join public.categories c on c.slug=v.cat_slug
where not exists(select 1 from public.posts p where p.slug=v.slug);

-- 9. 最後檢查
select 'admins' as table_name, count(*) as row_count from public.admins
union all select 'categories', count(*) from public.categories
union all select 'posts', count(*) from public.posts
union all select 'crystals', count(*) from public.crystals
union all select 'products', count(*) from public.products
union all select 'promotions', count(*) from public.promotions;

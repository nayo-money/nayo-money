-- Nayo CMS 最終權限＋資料對應版
-- 這份 SQL 針對目前實際資料表：admins.user_id、site_settings.key/value、categories.type、crystals.image_url、products.image_url。
-- 不刪除既有資料；只建立/更新 RLS、權限、必要欄位與示範分類/文章。

-- 1. 管理員判斷函式：使用目前實際的 admins.user_id
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admins a
    where a.user_id = auth.uid()
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- 2. admins：只允許登入者讀自己的管理員紀錄
alter table public.admins enable row level security;
grant select on public.admins to authenticated;
drop policy if exists "admins_self_read" on public.admins;
create policy "admins_self_read"
on public.admins
for select to authenticated
using (user_id = auth.uid());

-- 3. site_settings：前台可讀，管理員可新增/修改/刪除
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

-- 4. 一般 CMS 表：公開讀取；只有管理員可以 CRUD
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

-- 5. products 目前實際 Schema 沒有 missing_numbers，但手環作品後台需要這個欄位。
alter table public.products add column if not exists missing_numbers text;

-- 6. 確保目前四個分類與實際 type 欄位一致
insert into public.categories(name, slug, description, type, sort_order, is_active)
values
('信用卡回饋','credit-card','信用卡優惠、回饋與申辦條件整理。','blog',1,true),
('小資理財','finance','小資族理財、ETF、投資與日常財務整理。','blog',2,true),
('旅行 × 生活','lifestyle','旅行、消費與生活理財。','blog',3,true),
('生命靈數 × 水晶','crystal','生命靈數、缺數與水晶筆記。','blog',4,true)
on conflict (slug) do update
set name=excluded.name,
    description=excluded.description,
    type=excluded.type,
    sort_order=excluded.sort_order,
    is_active=excluded.is_active;

-- 7. 四篇示範文章：只有不存在相同 slug 時才建立，不覆蓋你自己已有文章
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

-- 8. 首頁信用卡優惠：只有不存在同標題時才建立
insert into public.promotions(bank,badge,title,subtitle,image,bullets,meta,deadline,url,sort_order)
select * from (values
('台新銀行','新方案升級','Richart卡','Chill刷最高10%回饋','',
 '["宜睿 NT$1,700 多選多即享券","SNOOPY 20 吋輕量旅行李箱","SNOOPY 藍牙耳機款","Disegno 20+28 吋城市漫步旅行箱"]'::jsonb,
 '["即日起至2026/08/31","使用下方連結申辦","核卡30天內，刷滿NT$3,000元","2026/9/10(含)前完成核卡","謹慎理財 信用至上"]'::jsonb,
 '期限：2026/08/31','#',1),
('國泰世華','新戶優惠','CUBE卡','指定通路最高3.3%回饋','',
 '["指定消費享小樹點回饋","海外消費享加碼優惠","新戶首刷禮依活動公告","指定通路加碼回饋"]'::jsonb,
 '["活動期間依官方公告","新戶需符合申辦資格","回饋上限依方案而定","實際條件以銀行公告為準","謹慎理財 信用至上"]'::jsonb,
 '活動期限依公告','#',2),
('中國信託','熱門卡','LINE Pay卡','日常消費回饋一次看','',
 '["LINE Pay 指定消費享回饋","新戶禮依活動公告","指定通路有加碼","回饋規則依當期方案"]'::jsonb,
 '["活動期間依官方公告","需符合新戶／指定資格","回饋上限依活動規則","申辦前請確認最新條件","謹慎理財 信用至上"]'::jsonb,
 '活動期限依公告','#',3),
('玉山銀行','熱門回饋','Unicard','百大特店最高回饋','',
 '["百大特店依方案享回饋","行動支付指定通路加碼","新戶優惠依活動公告","回饋門檻與上限依方案"]'::jsonb,
 '["活動期間依官方公告","需符合指定消費條件","回饋上限依活動公告","申辦前確認最新活動","謹慎理財 信用至上"]'::jsonb,
 '活動期限依公告','#',4)
) as x(bank,badge,title,subtitle,image,bullets,meta,deadline,url,sort_order)
where not exists(select 1 from public.promotions p where p.title=x.title);

-- 9. 建議：執行完後檢查
select 'admins' as table_name, count(*) as row_count from public.admins
union all select 'categories', count(*) from public.categories
union all select 'posts', count(*) from public.posts
union all select 'crystals', count(*) from public.crystals
union all select 'products', count(*) from public.products
union all select 'promotions', count(*) from public.promotions;

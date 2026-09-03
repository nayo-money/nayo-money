-- Nayo CMS v3 migration
-- 1) Credit-card promotions table
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

alter table public.promotions enable row level security;
grant select on public.promotions to anon, authenticated;
grant insert, update, delete on public.promotions to authenticated;

drop policy if exists "promotions_public_read" on public.promotions;
create policy "promotions_public_read" on public.promotions
for select to anon, authenticated using (true);

drop policy if exists "promotions_admin_insert" on public.promotions;
create policy "promotions_admin_insert" on public.promotions
for insert to authenticated
with check (exists(select 1 from public.admins where public.admins.user_id=auth.uid()));

drop policy if exists "promotions_admin_update" on public.promotions;
create policy "promotions_admin_update" on public.promotions
for update to authenticated
using (exists(select 1 from public.admins where public.admins.user_id=auth.uid()))
with check (exists(select 1 from public.admins where public.admins.user_id=auth.uid()));

drop policy if exists "promotions_admin_delete" on public.promotions;
create policy "promotions_admin_delete" on public.promotions
for delete to authenticated
using (exists(select 1 from public.admins where public.admins.user_id=auth.uid()));

-- 2) Seed the four current blog categories if they do not already exist.
insert into public.categories(name,slug,description,sort_order)
values
('信用卡回饋','credit-card','信用卡優惠、回饋與申辦條件整理。',1),
('小資理財','finance','小資族理財、ETF、投資與日常財務整理。',2),
('旅行 × 生活','lifestyle','旅行、消費與生活理財。',3),
('生命靈數 × 水晶','crystal','生命靈數、缺數與水晶筆記。',4)
on conflict (slug) do update set name=excluded.name,description=excluded.description,sort_order=excluded.sort_order;

-- 3) Seed four sample published posts, one for each category.
insert into public.posts(category_id,title,slug,excerpt,content,status,published_at,seo_title,seo_description)
select c.id,
       v.title,v.slug,v.excerpt,v.content,'published',now(),v.seo_title,v.seo_description
from (values
 ('credit-card','信用卡回饋怎麼看？先抓回饋率與上限','credit-card-reward-basics','整理信用卡回饋最容易忽略的門檻、上限與適用通路。','<p>這是一篇 Nayo 的示範文章，可在後台繼續編輯。</p>','信用卡回饋怎麼看？回饋率、門檻與上限整理','從回饋率、門檻與上限開始，建立自己的信用卡比較方式。'),
 ('finance','小資理財從哪裡開始？先把現金流整理好','small-investing-start','從收入、固定支出與可投資金額開始，建立適合自己的理財節奏。','<p>這是一篇 Nayo 的示範文章，可在後台繼續編輯。</p>','小資理財怎麼開始？現金流整理入門','小資理財入門，從現金流與每月可投資金額開始。'),
 ('lifestyle','旅行怎麼花得更聰明？信用卡與預算一起規劃','travel-smart-budget','旅行前先規劃預算，再搭配信用卡回饋，讓旅費花得更有效率。','<p>這是一篇 Nayo 的示範文章，可在後台繼續編輯。</p>','旅行理財：信用卡回饋與旅費預算規劃','旅行預算與信用卡回饋一起規劃，讓旅費更有效率。'),
 ('crystal','生命靈數與水晶入門：從缺數開始認識自己','life-number-crystal-intro','從生命靈數與缺數概念開始，認識 Nayo Crystal 的內容架構。','<p>這是一篇 Nayo 的示範文章，可在後台繼續編輯。</p>','生命靈數與水晶入門｜缺數解析','從生命靈數與缺數開始認識水晶內容。')
) as v(slug_cat,title,slug,excerpt,content,seo_title,seo_description)
join public.categories c on c.slug=v.slug_cat
where not exists(select 1 from public.posts p where p.slug=v.slug);

-- 4) Seed the existing four homepage credit-card cards into the new CMS table.
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

-- 5) Count cards in CMS overview.

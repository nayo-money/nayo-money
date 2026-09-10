-- Nayo Money｜信用卡優惠後台欄位升級
-- 只新增 promotions 欄位，不修改既有前台程式。

alter table public.promotions add column if not exists category text default '';
alter table public.promotions add column if not exists gift_title text default '首刷禮';
alter table public.promotions add column if not exists gifts jsonb not null default '[]'::jsonb;
alter table public.promotions add column if not exists tags jsonb not null default '[]'::jsonb;
alter table public.promotions add column if not exists reward_display_mode text default 'text';
alter table public.promotions add column if not exists reward_type text default '獎金';
alter table public.promotions add column if not exists reward_value text default '';
alter table public.promotions add column if not exists reward_label text default '價值';
alter table public.promotions add column if not exists reward_image text default '';
alter table public.promotions add column if not exists button_text text default '立即申辦';
alter table public.promotions add column if not exists eligibility text default '';
alter table public.promotions add column if not exists conditions jsonb not null default '[]'::jsonb;
alter table public.promotions add column if not exists display_mode text default 'text';
alter table public.promotions add column if not exists detail_content text default '';
alter table public.promotions add column if not exists detail_image text default '';

-- 將舊資料帶入新欄位，避免原本的優惠重點／條件消失。
update public.promotions
set gifts = case when jsonb_typeof(bullets) = 'array' then bullets else '[]'::jsonb end
where gifts = '[]'::jsonb and bullets is not null;

update public.promotions
set conditions = case when jsonb_typeof(meta) = 'array' then meta else '[]'::jsonb end
where conditions = '[]'::jsonb and meta is not null;

update public.promotions
set tags = case when coalesce(badge,'') <> '' then jsonb_build_array(badge) else '[]'::jsonb end
where tags = '[]'::jsonb;

-- 確認欄位
select column_name, data_type
from information_schema.columns
where table_schema='public' and table_name='promotions'
order by ordinal_position;

-- 既有資料預設使用文字模式。
update public.promotions set reward_display_mode='text' where coalesce(reward_display_mode,'')='';
update public.promotions set gift_title='首刷禮' where coalesce(gift_title,'')='';

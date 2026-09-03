-- Nayo CMS / Supabase setup
-- Run this once in Supabase SQL Editor.
-- It uses the public anon/publishable key safely; no service-role key is required.

create extension if not exists pgcrypto;

create table if not exists public.admins (
  id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admins a where a.id = auth.uid()
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

alter table public.admins enable row level security;
drop policy if exists "admins self read" on public.admins;
create policy "admins self read" on public.admins
for select to authenticated using (id = auth.uid());

create table if not exists public.site_settings (
  id boolean primary key default true check (id = true),
  site_name text not null default 'Nayo 娜攸',
  site_tagline text not null default '生活理財 × 水晶',
  profile_name text not null default '娜攸',
  profile_image text,
  hero_image text,
  hero_title text not null default '把理財變成，喜歡的生活。',
  hero_highlight text not null default '喜歡的生活',
  hero_description text not null default '分享信用卡回饋、小資理財、旅行生活，也記錄生命靈數與水晶。',
  primary_label text not null default '逛理財 Blog',
  primary_url text not null default '/blog',
  secondary_label text not null default '探索 Nayo Crystal',
  secondary_url text not null default '/crystal',
  about_text text not null default '理財讓生活有更多選擇，而生命靈數與水晶，是我探索生活與自己的另一種方式。',
  updated_at timestamptz not null default now()
);
insert into public.site_settings(id) values(true) on conflict (id) do nothing;

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.categories(id) on delete set null,
  title text not null,
  slug text not null unique,
  excerpt text,
  content text not null default '',
  cover_image text,
  status text not null default 'draft' check (status in ('draft','published')),
  seo_title text,
  seo_description text,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.crystals (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  image text,
  life_numbers text,
  meaning text,
  color text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  image text,
  missing_numbers text,
  description text,
  price numeric,
  purchase_url text,
  instagram_url text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- If these tables already existed, add the CMS columns without deleting old data.
alter table public.site_settings add column if not exists site_name text default 'Nayo 娜攸';
alter table public.site_settings add column if not exists site_tagline text default '生活理財 × 水晶';
alter table public.site_settings add column if not exists profile_name text default '娜攸';
alter table public.site_settings add column if not exists profile_image text;
alter table public.site_settings add column if not exists hero_image text;
alter table public.site_settings add column if not exists hero_title text default '把理財變成，喜歡的生活。';
alter table public.site_settings add column if not exists hero_highlight text default '喜歡的生活';
alter table public.site_settings add column if not exists hero_description text default '分享信用卡回饋、小資理財、旅行生活，也記錄生命靈數與水晶。';
alter table public.site_settings add column if not exists primary_label text default '逛理財 Blog';
alter table public.site_settings add column if not exists primary_url text default '/blog';
alter table public.site_settings add column if not exists secondary_label text default '探索 Nayo Crystal';
alter table public.site_settings add column if not exists secondary_url text default '/crystal';
alter table public.site_settings add column if not exists about_text text default '';
alter table public.site_settings add column if not exists updated_at timestamptz default now();

alter table public.categories add column if not exists description text;
alter table public.categories add column if not exists sort_order integer default 0;
alter table public.categories add column if not exists created_at timestamptz default now();
alter table public.categories add column if not exists updated_at timestamptz default now();

alter table public.posts add column if not exists category_id uuid;
alter table public.posts add column if not exists excerpt text;
alter table public.posts add column if not exists content text default '';
alter table public.posts add column if not exists cover_image text;
alter table public.posts add column if not exists status text default 'draft';
alter table public.posts add column if not exists seo_title text;
alter table public.posts add column if not exists seo_description text;
alter table public.posts add column if not exists published_at timestamptz;
alter table public.posts add column if not exists created_at timestamptz default now();
alter table public.posts add column if not exists updated_at timestamptz default now();

alter table public.crystals add column if not exists image text;
alter table public.crystals add column if not exists life_numbers text;
alter table public.crystals add column if not exists meaning text;
alter table public.crystals add column if not exists color text;
alter table public.crystals add column if not exists sort_order integer default 0;
alter table public.crystals add column if not exists created_at timestamptz default now();
alter table public.crystals add column if not exists updated_at timestamptz default now();

alter table public.products add column if not exists image text;
alter table public.products add column if not exists missing_numbers text;
alter table public.products add column if not exists description text;
alter table public.products add column if not exists price numeric;
alter table public.products add column if not exists purchase_url text;
alter table public.products add column if not exists instagram_url text;
alter table public.products add column if not exists sort_order integer default 0;
alter table public.products add column if not exists created_at timestamptz default now();
alter table public.products add column if not exists updated_at timestamptz default now();

alter table public.site_settings enable row level security;
alter table public.categories enable row level security;
alter table public.posts enable row level security;
alter table public.crystals enable row level security;
alter table public.products enable row level security;

-- Public website reads only public content.
drop policy if exists "site settings public read" on public.site_settings;
create policy "site settings public read" on public.site_settings for select using (true);

drop policy if exists "categories public read" on public.categories;
create policy "categories public read" on public.categories for select using (true);

drop policy if exists "posts public read" on public.posts;
create policy "posts public read" on public.posts for select using (status = 'published' or public.is_admin());

drop policy if exists "crystals public read" on public.crystals;
create policy "crystals public read" on public.crystals for select using (true);

drop policy if exists "products public read" on public.products;
create policy "products public read" on public.products for select using (true);

-- Only admins can write CMS data.
do $$ declare t text; begin
  foreach t in array array['site_settings','categories','posts','crystals','products'] loop
    execute format('drop policy if exists %I on public.%I', 'admin_all_'||t, t);
    execute format('create policy %I on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())', 'admin_all_'||t, t);
  end loop;
end $$;

-- Storage bucket for CMS images.
insert into storage.buckets (id, name, public)
values ('site-images','site-images',true)
on conflict (id) do update set public = true;

drop policy if exists "site images public read" on storage.objects;
create policy "site images public read" on storage.objects
for select using (bucket_id = 'site-images');

drop policy if exists "site images admin insert" on storage.objects;
create policy "site images admin insert" on storage.objects
for insert to authenticated with check (bucket_id = 'site-images' and public.is_admin());

drop policy if exists "site images admin update" on storage.objects;
create policy "site images admin update" on storage.objects
for update to authenticated using (bucket_id = 'site-images' and public.is_admin()) with check (bucket_id = 'site-images' and public.is_admin());

drop policy if exists "site images admin delete" on storage.objects;
create policy "site images admin delete" on storage.objects
for delete to authenticated using (bucket_id = 'site-images' and public.is_admin());

-- Example after creating your Supabase Auth user:
-- insert into public.admins(id) values ('YOUR-AUTH-USER-UUID');

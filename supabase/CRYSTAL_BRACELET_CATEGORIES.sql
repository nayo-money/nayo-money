-- Nayo Crystal：手環作品分類條
-- 只新增 products.category，不修改既有資料
alter table public.products
  add column if not exists category text;

-- 確認 products 可供公開網站讀取（若已有同名 policy，不會重複建立）
grant select on public.products to anon, authenticated;

drop policy if exists "products_public_read" on public.products;
create policy "products_public_read"
on public.products
for select
to anon, authenticated
using (status = 'published');

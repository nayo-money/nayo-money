-- Nayo 商品資料欄位一次補齊
-- 請在 Supabase SQL Editor 執行一次。

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS missing_numbers text;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS category text;

ALTER TABLE public.products
  ALTER COLUMN price TYPE text
  USING price::text;

GRANT SELECT ON public.products TO anon, authenticated;

DROP POLICY IF EXISTS "products_public_read" ON public.products;
CREATE POLICY "products_public_read"
ON public.products
FOR SELECT
TO anon, authenticated
USING (status = 'published');

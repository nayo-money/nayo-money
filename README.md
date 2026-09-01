# Nayo 娜攸｜生活理財 × 水晶 — Complete CMS

This is the replacement project for the existing `nayo-money` repository.

## Included
- Next.js App Router
- Supabase SSR/Auth
- Admin login protected by `admins` + `is_admin()`
- Homepage settings: profile name, profile image, hero image, titles, buttons and links
- Image upload to Supabase Storage (`site-images`)
- Blog CRUD: draft/publish, slug, HTML content, cover image and SEO fields
- Crystal CRUD
- Bracelet/product CRUD with purchase/Instagram links
- Category CRUD
- Responsive horizontal card carousels
- Blog sitemap/robots metadata
- No service-role key or database password in source

## Vercel environment variables
Set only:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Never commit service-role/secret keys or database passwords.

## Supabase
The existing tables can be kept. Run `supabase/SETUP.sql` in SQL Editor to add the storage bucket and ensure the policies are present.

## Deployment
The repository intentionally does NOT include the old `pnpm-lock.yaml`. Vercel can install from `package.json`.

# Nayo 新版部署步驟

## 1. Supabase

1. 打開 Supabase → SQL Editor。
2. 執行 `supabase/SETUP.sql` 一次。
3. 到 Authentication → Users 建立你的管理員 Email / Password。
4. 複製該 User 的 UUID。
5. 在 SQL Editor 執行：

```sql
insert into public.admins(id)
values ('你的 Auth User UUID')
on conflict (id) do nothing;
```

## 2. Vercel

Environment Variables 保留：

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

兩個都至少要有 Production；建議 Preview 也一起勾選。

不要放 service-role key、database password 或其他 secret 到前端。

## 3. GitHub

你的舊專案曾經有 `pnpm-lock.yaml`，而 package.json 已經換成新版 Next.js 依賴。若 GitHub 的 `main` / `next-migration` 還留著舊的 `pnpm-lock.yaml`，請把它刪掉並 commit。

這份版本另外提供 `vercel.json`，明確指定使用 `npm install`，避免再被舊 pnpm lockfile 卡住。

## 4. 部署後

打開 `/admin`：

- 輸入 Supabase Auth 的 Email / Password
- 登入後會檢查 `public.is_admin()`
- 只有 `public.admins` 裡的帳號能進後台

後台目前可管理：

- 首頁：網站名稱、大頭貼、首頁主圖、主標題、說明、按鈕與連結
- Blog：新增 / 編輯 / 刪除 / 草稿 / 發布 / SEO / 封面圖
- 分類：新增 / 編輯 / 刪除
- 水晶：名稱、生命靈數、寓意、代表色、圖片
- 手環作品：缺數、介紹、價格、圖片、購買連結、Instagram 連結

圖片會上傳到 Supabase Storage 的 `site-images` bucket。

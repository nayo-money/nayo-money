# 建置錯誤修正

已修正 `app/api/bank-offers/sync/route.ts` 中 GET handler 前方被寫成字面 `\\n` 的問題，改為實際換行。

注意：此修正針對使用者回報的第 52 行語法錯誤；尚未在你的 Vercel 專案或正式 Supabase 環境完成建置／整合測試。請先在 GitHub 分支提交並讓 Vercel Preview 建置，不要直接覆蓋正式站。

# NayoMoney 快速選卡｜官方資料蒐集版

## 這版做了什麼
- 保留原本網站與「快速選卡」介面，不增加信用卡比較功能。
- 搜尋會把已核對的 `bank_offers` 官方優惠和既有 `promotions` 一起納入。
- 顯示官方來源連結與最近核對日期；聯盟申辦連結存在 `application_url`，和銀行來源網址分開。
- 新增 `/api/bank-offers/sync` 抓取端點：依資料庫中的銀行官網來源清單抓取頁面，產生待審核候選資料。
- 抓取結果不會自動當成已驗證優惠發布，避免只因網頁提到「蝦皮」就錯誤宣稱某張卡有回饋。

## 部署步驟
1. 在 Supabase SQL Editor 執行 `supabase/QUICK_CARD_OFFICIAL_INGESTION.sql`。
2. 在 Vercel Project Settings → Environment Variables 新增：
   - `SUPABASE_SERVICE_ROLE_KEY`：Supabase service role key（只能放在伺服器端，絕不可加 `NEXT_PUBLIC_`）。
   - `BANK_OFFER_SYNC_SECRET`：自訂一組長且隨機的密鑰。
3. 上傳本 ZIP 內容到 GitHub 專案，commit/push，等待 Vercel 部署完成。
4. 部署後可用具備密鑰的 POST 請求觸發抓取：`POST https://你的網域/api/bank-offers/sync`，Header：`Authorization: Bearer 你的密鑰`。
5. 檢查 Supabase 的 `bank_offer_candidates`。候選資料需人工核對活動期間、卡別、通路、回饋比例、上限、登錄/新戶條件及排除項目，再整理到 `bank_offers`，設 `verification_status='verified'` 並填 `verified_at`，才會顯示在快速選卡。

## 重要限制
- 這是可部署的第一階段資料蒐集架構，不是宣稱已涵蓋全台所有銀行，也不是每張卡都能無人值守地解析。銀行官網可能使用 JavaScript、反爬蟲或分散的活動辦法頁面，部分來源需另寫解析器或人工核對。
- 此版本的抓取器會保存頁面標題、文字與關鍵字候選，不會自動推斷回饋百分比或卡片資格；候選資料不會直接公開顯示。
- 目前沒有把候選審核介面加進既有 CMS；審核請在 Supabase 管理介面進行。聯盟申辦網址請填在 `bank_offers.application_url`，銀行官方條款網址填在 `source_url`。
- 不會覆蓋既有 `promotions` 資料。若原本 Supabase schema 未更新，官方優惠查詢會因未建表而暫時略過，既有網站仍可正常顯示。

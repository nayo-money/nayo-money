# NayoMoney 快速選卡｜修正版說明（部署前請先閱讀）

## 重要：這不是「全自動核實回饋」版本
這份程式保留既有 `promotions` 查詢，另提供銀行官方頁面候選資料蒐集。抓到「蝦皮」等字詞，不代表銀行真的提供該通路回饋。候選資料不會自動發布；需核對卡別、回饋比例、上限、活動期間、登錄條件及排除項目後，才可建立 `bank_offers` 已核實資料。

## 本版安全設計
- 不會在程式碼中放入 service role key。
- 同步 API 僅接受 `POST` 並要求 `Authorization: Bearer <BANK_OFFER_SYNC_SECRET>`。
- `GET /api/bank-offers/sync` 僅回傳端點說明，不會啟動抓取。
- 既有 `promotions` 表及其資料不由此 SQL 修改或刪除。
- 若尚未建立 `bank_offers` 表，快速選卡頁會略過官方優惠資料查詢；原有 `promotions` 查詢仍保留。

## 部署前必做
1. 先備份 Supabase 專案／資料庫，並確認目前正式站 Git commit。
2. 先在測試 Supabase 專案檢查並執行 `supabase/QUICK_CARD_OFFICIAL_INGESTION.sql`。不要在未檢查的正式資料庫直接執行。
3. 只有確認程式確實需要同步功能時，才在 Vercel 設定：
   - `SUPABASE_SERVICE_ROLE_KEY`：Supabase service role key，只能用於伺服器端，絕不可使用 `NEXT_PUBLIC_` 前綴。
   - `BANK_OFFER_SYNC_SECRET`：長且隨機的自訂密鑰。
4. 重新部署後，使用受保護的 POST 請求測試同步端點。
5. 在 Supabase 檢查 `bank_offer_candidates` 是否有候選資料。銀行網站可能阻擋抓取或使用動態頁面，因此不保證每個來源都抓得到。
6. 核對優惠後，才將資料新增／更新至 `bank_offers` 並設 `verification_status='verified'`、填入 `verified_at`。申辦聯盟網址放 `application_url`，官方條款網址放 `source_url`。

## 尚未包含的功能
- 不包含 CMS 候選資料審核介面。
- 不會自動解析及核實回饋比例、回饋上限或資格條件。
- 不會自動取得或產生聯盟行銷網址。
- 不保證所有銀行頁面都可被抓取。

## 回滾原則
若部署後出現問題，優先在 Vercel 將 Production 回滾到先前正常的部署；不要刪除資料表或清空資料作為排錯方式。

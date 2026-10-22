# NayoMoney 官方信用卡回饋蒐集流程（修正版）

## 這個版本實際做到什麼
- 另設官方來源、候選資料、已核實優惠三張資料表，不修改既有 `promotions`（首刷禮）資料。
- `POST /api/bank-offers/sync` 會抓取已啟用來源的網頁，保存頁面文字與偵測到的通路關鍵字，產生「待審核候選」。
- 快速選卡頁只讀取 `bank_offers` 中 `verification_status='verified'` 的資料。
- `GET /api/bank-offers/sync` 只顯示端點資訊，不會啟動蒐集。

## 重要限制（請先看）
**這不是全自動辨識回饋的完成品。** 目前蒐集器會擷取官方網頁文字並偵測通路關鍵字，不會可靠地自動判定每張卡的回饋比例、月上限、活動期限、登錄資格或排除條件；這些候選資料仍需人工核實。部分銀行頁面使用動態載入或阻擋機器人，可能抓取失敗。

此 ZIP 尚未包含候選資料審核介面，也沒有內建排程器；同步必須由管理者透過受保護的 POST 端點觸發，或另行設定安全的排程服務。不要把候選資料直接當成正式回饋發布。

## 部署前必要步驟
1. 備份正式網站目前的 Git commit 與 Supabase 資料庫。
2. 先在測試 Supabase 專案執行 `supabase/QUICK_CARD_OFFICIAL_INGESTION.sql`，不要未檢查就直接在正式資料庫執行。
3. 在伺服器環境變數設定：`SUPABASE_SERVICE_ROLE_KEY`（只能放伺服器端）與 `BANK_OFFER_SYNC_SECRET`（自訂長且隨機的密鑰）。
4. 確認測試資料庫有來源清單後，呼叫 `POST /api/bank-offers/sync`，並在 Header 傳送 `Authorization: Bearer <BANK_OFFER_SYNC_SECRET>`。
5. 到 Supabase 的 `bank_offer_candidates` 檢查擷取結果。核對卡別、回饋率、上限、期限、登錄要求與排除條件後，才建立／更新 `bank_offers` 並標記 `verification_status='verified'`。
6. `application_url` 可填入你自己的申辦／聯盟連結；`source_url` 應保留銀行官方活動來源。

## 不會做的事
- 不會刪除或覆蓋既有首刷禮資料。
- 不會把偵測到「蝦皮」字樣直接當成蝦皮回饋。
- 不會自動產生你的申辦／聯盟連結。
- 不會保證每個銀行網站都能成功抓取。

## 回滾
若部署後出現問題，先在 Vercel 回滾到先前正常部署。不要用刪除資料表或清空資料的方式排錯。

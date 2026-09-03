# CKEditor 5 文章編輯器

本版 Blog 文章後台使用官方 CKEditor 5 Classic WYSIWYG 編輯器 48.5.0，透過官方 Cloud CDN 載入開源功能。

功能包含：
- 字型、字級、文字顏色、背景色
- 段落、H2/H3/H4
- 粗體、斜體、底線、刪除線、上下標、程式碼
- 對齊、縮排、項目符號、編號清單
- 連結、表格、引用、程式碼區塊、水平線
- 圖片插入、替代文字、圖說、尺寸與版面
- 圖片直接上傳到 Supabase Storage `site-images`
- Media Embed
- 特殊字元
- 尋找與取代
- 清除格式
- HTML 原始碼編輯
- 顯示區塊
- Office / Word 貼上

## Vercel 必要設定

在 Vercel → Settings → Environment Variables 新增：

`NEXT_PUBLIC_CKEDITOR_LICENSE_KEY`

CKEditor 5 官方目前提供 Cloud CDN 免費商業方案，適合小型專案；申請後將取得的 license key 填入此環境變數，再重新部署。

注意：CKEditor 官方說明 Cloud CDN 不接受 `GPL` 字串作為授權金鑰。若你的專案要採 GPL 開源授權，應使用符合 GPL 條件的自架（npm/ZIP）版本並依官方授權條款使用。

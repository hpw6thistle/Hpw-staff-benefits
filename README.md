# 員工特約優惠網站 — 乾淨原始碼

這份原始碼供建立**新專案**使用。

## 網站功能
- `index.html`：首頁、分類導覽、商店查詢與篩選、優惠卡片。
- `script.js`：搜尋、職級、地區、分類篩選與頁面切換。
- `style.css`：響應式排版、優惠卡片、深色模式。
- `theme.js`：依系統偏好切換深淺色，並儲存使用者選擇。
- `data.js`、`counties.js`：商店與地區資料。
- `admin.html`、`admin.js`：Excel 下載、匯入、預覽與匯出。
- `scripts/validate-data.cjs`：資料格式驗證，可用 Node.js 執行。
- `assets/`：網站實際使用的圖片與圖示。

## 新專案部署前
1. 將 ZIP 解壓縮後，建立**新的** GitHub 倉庫並上傳檔案（ZIP 不含 `.git`）。
2. 使用 GitHub Pages 或其他靜態網站託管服務發布；入口為 `index.html`。
3. 設定新站網址後，檢查 canonical、Open Graph 圖片絕對網址、分享預覽及對外連結。
4. 測試桌機、手機、首頁、分類、關鍵字、職級、地區、深淺色切換及 資料 維護。
5. 執行 `node scripts/validate-data.cjs` 驗證資料。
6. 透過 PR 審查合併正式分支，啟用 2FA，並限制協作者權限。部署工作流程若需 GitHub Actions，請採最小權限（`permissions: contents: read`）。

## 注意事項
- 這是靜態前端；不含後端或密碼保護。請勿將密碼、API Key 或存取權杖放進前端檔案。
- Excel 維護頁僅產生下載檔，正式商店資料仍需經審查更新 `data.js`。
- 部分字型及 ExcelJS 依賴外部 CDN，離線使用需另外處理。
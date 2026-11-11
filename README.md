# 海霸王員工特約商店查詢系統

純 HTML、CSS、JavaScript。無須安裝套件、編譯或使用後端；解壓縮後以瀏覽器開啟 `index.html` 即可使用。以 HTTPS 的 GitHub Pages 開啟時可使用瀏覽器的剪貼簿功能；若瀏覽器拒絕存取，頁面會提供手動複製。

```text
haipawang-perks/
├── .nojekyll          GitHub Pages 直接發布靜態檔
├── index.html        員工查詢頁
├── style.css         響應式版型與色彩
├── script.js         搜尋、篩選、卡片、地圖連結與複製
├── data.js           有註解的 10 間範例門市、15 筆示範優惠
├── admin.html        HR／福委會 Excel CSV 維護頁
├── admin.js          CSV 匯出、驗證、預覽與產生 data.js
├── assets/
│   ├── mark.svg      示意站徽
│   └── tickets.svg   首頁票券插圖
└── README.md
```

## 在 GitHub Pages 發布

1. 解壓縮後，把資料夾**裡面**的檔案上傳至 GitHub 儲存庫的 `main` 分支根目錄，讓 `index.html` 與 `.nojekyll` 都在根目錄。也可一併放進 `docs/`，但第 2 步要改選 `/docs`。
2. 在儲存庫開啟 **Settings → Pages**，在 **Build and deployment** 的 Source 選 **Deploy from a branch**，選 `main` 與 `/(root)`，按 **Save**。
3. 等 Pages 顯示網址後按 **Visit site**。之後提交新版 `data.js` 到同一分支即可更新。

參考：[GitHub Pages 發布來源設定](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)。

公開 Pages 的優惠與優惠碼會隨前端檔案供訪客讀取，私有儲存庫也不代表網站私有。若正式資料限員工使用，請改用公司內網或有登入管控的靜態託管；已使用 GitHub Enterprise Cloud 的組織，可評估 [私有 Pages](https://docs.github.com/en/enterprise-cloud@latest/pages/getting-started-with-github-pages/changing-the-visibility-of-your-github-pages-site)。維護頁只在本機產檔，不會修改網站；不需要讓員工看到時，可把 `admin.html`、`admin.js` 留在內部，並移除首頁頁尾的「資料維護」連結。

## 資料維護

- **職級優惠：**搜尋旁的「員工職級」預設顯示通用優惠。選擇職級後，同一門市只會顯示一張卡，優先採用該職級未到期的優惠，沒有時顯示通用優惠。僅限其他職級的門市不會出現在結果。下拉選項由資料自動產生；「一般員工、基層主管、中高階主管」為示範名稱。
- **Excel 欄位「適用職級」：**留空代表通用。要為同一家店新增專屬優惠，請複製原列、沿用門市 ID，再填入職級、優惠、代碼及效期。每間門市每個職級各限一列，通用也各限一列。職級選單只用於查詢；正式兌換時，請依公司流程核驗資格。

- **少量修改：**用文字編輯器開啟 `data.js`，依檔頭註解修改。新增門市時填寫新的門市 ID；同門市的職級優惠沿用原 ID。期限使用西元 `YYYY-MM-DD`；以台灣時間計算，到期當日仍有效，過期的通用優惠會標示「已到期」並停用複製。
- **Excel 批次維護：**開啟 `admin.html` → 匯出目前資料或空白範本 → 在 Excel 從文字／CSV 以 UTF-8 匯入 → 編輯 → 另存 **CSV UTF-8（逗號分隔）** → 回到維護頁匯入與預覽 → 下載新 `data.js`。請用**文字格式**保留電話、門市 ID 和優惠碼的前導零；有效期限以文字輸入較穩妥。此流程使用 Excel 相容的 CSV，不接受直接上傳 `.xlsx`。
- CSV 是**整批替換**，更新時請先匯出全表再編輯。用新版替換前，保留舊檔並重新開啟查詢頁確認。必填：門市 ID、店名、類別、地區、優惠、地址，以及「集團品牌」「範例資料」的是／否；其餘欄位可留空。
- 所有優惠、效期與代碼皆為示意。集團品牌門市資訊取自[海霸王官方 LINE 門市資料](https://page.line.me/jko7697l/signboard/77910066218432)，上線前請確認店名、地址、電話和營運狀態。其他店名為虛構，未建立地圖連結。正式資料需先確認合作條件及公開範圍，再將「範例資料」改為「否」。

## Google 地圖串接

本版已使用 [Google Maps URLs](https://developers.google.com/maps/documentation/urls/get-started)。員工點門市卡的「Google 地圖」後，可在 Google Maps 查看地點與規劃路線。連結以店名與地址搜尋，不需 API Key、後端或要求員工分享定位。

| 需求 | 建議做法 |
|---|---|
| 讓員工快速找門市 | 保留本版地圖連結。上線前逐筆檢查是否指向正確分館。 |
| 同址有不同集團品牌或名稱相近 | 填入每家門市的 `placeId`。例如餐廳與旅館同址時，各自使用對應的 Place ID。 |
| 卡片或詳情頁需要內嵌地圖 | 可改用 [Maps Embed API](https://developers.google.com/maps/documentation/embed/quickstart)。官方目前說明 Embed 請求免費，但仍需 Cloud 專案、啟用計費及 API Key；請以網站來源和 API 類型限制 Key，並採點擊或延遲載入。 |
| 需要依篩選結果顯示全站地圖與多個圖釘 | 另評估 Maps JavaScript API 的用量、費率與維護成本；門市清單仍以 HR 維護的資料為準。 |

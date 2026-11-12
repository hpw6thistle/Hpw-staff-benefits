(() => {
  "use strict";
  if (document.body.hidden) return;
  const columns = [
    ["id","門市 ID"], ["name","店名"], ["category","類別"], ["region","地區"], ["owned","集團品牌"],
    ["offer","優惠內容"], ["expires","有效期限"], ["address","地址"], ["phone","電話"],
    ["notes","注意事項"], ["placeId","Google Maps Place ID"], ["demo","範例資料"], ["grade","適用職級"], ["website","官網網址"]
  ];
  const required = ["id", "name", "category", "region", "offer", "address"];
  const allowedCategories = ["餐飲美食", "旅遊住宿", "生活購物"];
  const header = columns.map(([, label]) => label);
  const bools = new Set(["owned", "demo"]);
  const $ = id => document.getElementById(id);
  const original = window.HAIPAWANG_STORES;
  let imported = null;
  let importVersion = 0;

  // 依 CSV 引號規則處理逗號、雙引號與欄位中的換行。
  function parseCSV(source) {
    const rows = [];
    let row = [], field = "", state = "start";
    const flushField = () => { row.push(field); field = ""; state = "start"; };
    const flushRow = () => { flushField(); rows.push(row); row = []; };
    const value = source.replace(/^\uFEFF/, "");
    for (let i = 0; i < value.length; i++) {
      const char = value[i];
      if (state === "quoted") {
        if (char === '"') {
          if (value[i + 1] === '"') { field += '"'; i++; }
          else state = "closed";
        } else field += char;
      } else if (char === ",") flushField();
      else if (char === "\r" || char === "\n") {
        if (char === "\r" && value[i + 1] === "\n") i++;
        flushRow();
      } else if (state === "closed") throw new Error("第 " + (rows.length + 1) + " 筆：引號後應接逗號或換行。");
      else if (char === '"') {
        if (state !== "start") throw new Error("第 " + (rows.length + 1) + " 筆：欄位引號位置不正確。");
        state = "quoted";
      } else { field += char; state = "plain"; }
    }
    if (state === "quoted") throw new Error("CSV 有欄位的雙引號未關閉。");
    if (row.length || state !== "start") flushRow();
    return rows;
  }

  const formulaPrefix = value => /^\s*[=+\-@]/u.test(value) || /^[\t\r\n]/u.test(value);
  const protect = value => formulaPrefix(value) || value.startsWith("'") ? "'" + value : value;
  const unprotect = value => value.startsWith("'") && (formulaPrefix(value.slice(1)) || value.startsWith("''")) ? value.slice(1) : value;
  const quote = value => '"' + String(value).replaceAll('"', '""') + '"';

  function exportCSV(stores) {
    const rows = [header, ...stores.map(store => columns.map(([key]) => bools.has(key) ? (store[key] ? "是" : "否") : protect(String(key === "website" ? store.website || store.url || "" : store[key] ?? ""))))];
    return "\uFEFF" + rows.map(row => row.map(quote).join(",")).join("\r\n") + "\r\n";
  }

  function normalizeDate(value) {
    if (!value) return "";
    const parts = value.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
    if (!parts) return null;
    const [, y, m, d] = parts;
    const iso = [y, m.padStart(2, "0"), d.padStart(2, "0")].join("-");
    const date = new Date(iso + "T00:00:00Z");
    return Number(y) >= 1900 && !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === iso ? iso : null;
  }

  function checkCSV(source) {
    const rows = parseCSV(source);
    const titles = rows.shift()?.map(value => value.trim()) || [];
    const optional = ["適用職級", "官網網址"];
    const expected = header.filter(label => !optional.includes(label) || titles.includes(label));
    // 舊版 CSV 的優惠碼欄位可略過，匯出的檔案只含現行欄位。
    const legacyColumns = new Set(["優惠碼或結帳資訊", "複製項目名稱"]);
    const currentTitles = titles.filter(label => !legacyColumns.has(label));
    if (currentTitles.length !== expected.length || new Set(titles).size !== titles.length || expected.some(label => !currentTitles.includes(label))) {
      return { errors: ["欄位標題不完整或重複。請使用下載的範本並保留所有欄位。"] };
    }
    const errors = [], stores = [], seen = new Set();
    const indexes = columns.map(([,label]) => titles.indexOf(label));
    rows.forEach((row, index) => {
      if (row.every(value => !value.trim())) return;
      const fail = message => errors.push("第 " + (index + 2) + " 筆（含標題）： " + message);
      if (row.length !== titles.length) { fail("欄位數量與標題不同。"); return; }
      const store = {};
      columns.forEach(([key,label], i) => {
        const value = unprotect(row[indexes[i]] ?? "").trim();
        if (bools.has(key)) {
          if (!["是", "否"].includes(value)) fail("「" + label + "」請填「是」或「否」。");
          store[key] = value === "是";
        } else store[key] = value;
        if (required.includes(key) && !value) fail("「" + label + "」不可空白。");
      });
      if (store.id && !/^[a-zA-Z0-9_-]+$/.test(store.id)) fail("門市 ID 只接受英數字、底線及連字號。");
      if (!["", "員工", "主管"].includes(store.grade)) fail("適用職級只接受「員工」、「主管」或留空。");
      if (store.website) {
        try {
          if (!/^https?:\/\/[^/\s\\]/i.test(store.website)) throw new Error();
          const url = new URL(store.website);
          if (!["https:", "http:"].includes(url.protocol) || url.username || url.password) throw new Error();
        } catch { fail("官網網址請填完整的 HTTP 或 HTTPS 網址。"); }
      }
      const key = JSON.stringify([store.id.toLowerCase(), store.grade]);
      if (seen.has(key)) fail("同一門市的適用職級重複：" + store.id + "（" + (store.grade || "通用") + "）。");
      seen.add(key);
      if (store.category && !allowedCategories.includes(store.category)) fail("類別請填：" + allowedCategories.join("、") + "。");
      if (store.region && !/^[\p{Script=Han}]{2,4}[縣市]$/u.test(store.region)) fail("地區請填完整縣市名，例如「台北市」。");
      store.region = store.region.replaceAll("臺", "台");
      store.expires = normalizeDate(store.expires);
      if (store.expires === null) fail("有效期限請填有效西元日期（YYYY-MM-DD），或留空。");
      if (store.placeId && !/^[a-zA-Z0-9_-]+$/.test(store.placeId)) fail("Place ID 請貼上 Google 提供的 ID，勿填地圖網址。");
      stores.push(store);
    });
    if (!stores.length && !errors.length) errors.push("CSV 沒有店家資料，請至少填寫一筆再匯入。");
    return { stores, errors };
  }

  function download(name, content, type) {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const link = document.createElement("a");
    link.href = url;
    link.download = name;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  function preview(stores) {
    const list = document.createDocumentFragment();
    for (const store of stores.slice(0, 12)) {
      const row = document.createElement("tr");
      for (const value of [store.name, store.category, store.region, store.grade || "全職級通用", store.offer, store.expires || "未提供"]) {
        const cell = document.createElement("td");
        cell.textContent = value;
        row.append(cell);
      }
      list.append(row);
    }
    $("preview-body").replaceChildren(list);
    $("preview-label").textContent = stores.length > 12 ? "預覽前 12 筆" : "預覽 " + stores.length + " 筆";
    $("preview").open = true;
    $("preview").hidden = false;
  }

  function setErrors(errors) {
    const items = errors.slice(0, 20).map(message => {
      const item = document.createElement("li");
      item.textContent = message;
      return item;
    });
    $("import-errors").replaceChildren(...items);
    $("import-errors").hidden = !items.length;
  }

  $("export").disabled = !Array.isArray(original);
  $("export").addEventListener("click", () => download("haipawang-stores.csv", exportCSV(original), "text/csv;charset=utf-8"));
  $("template").addEventListener("click", () => download("haipawang-template.csv", exportCSV([]), "text/csv;charset=utf-8"));
  $("csv").addEventListener("change", async event => {
    const token = ++importVersion;
    const file = event.target.files[0];
    imported = null;
    $("download").disabled = true;
    $("save-status").textContent = "完成匯入後即可下載";
    $("preview").hidden = true;
    setErrors([]);
    if (!file) { $("import-status").textContent = "尚未選取檔案"; return; }
    $("import-status").textContent = "檢查中…";
    let result;
    try {
      if (file.size > 5 * 1024 * 1024) throw new Error("檔案超過 5 MB，請檢查是否為正確的店家 CSV。");
      let source;
      try { source = new TextDecoder("utf-8", { fatal: true }).decode(await file.arrayBuffer()); }
      catch { throw new Error("無法讀取 UTF-8 文字，請從 Excel 另存為 CSV UTF-8。"); }
      result = checkCSV(source);
    } catch (error) { result = { errors: [error.message] }; }
    if (token !== importVersion) return;
    if (result.errors.length) {
      $("import-status").textContent = "匯入未完成：有 " + result.errors.length + " 個問題" + (result.errors.length > 20 ? "（以下顯示前 20 個）" : "") + "。";
      setErrors(result.errors);
      return;
    }
    imported = result.stores;
    $("import-status").textContent = "已驗證 " + imported.length + " 筆";
    preview(imported);
    $("download").disabled = false;
    $("save-status").textContent = "可以下載";
  });
  $("download").addEventListener("click", () => {
    if (!imported) return;
    const comments = "/*\n * 海霸王員工特約商店：一個 { ... } 代表一個門市優惠。\n * 新增時複製完整的一筆，兩筆之間要有逗號；保留雙引號、括號及檔尾分號。\n * id：門市的識別值，用英數字、連字號或底線；name：員工看到的店名（可含分店名）。\n * grade：留空表示通用；有職級專屬優惠時複製同一門市列，沿用 id，填上「員工」或「主管」。\n * 同一 id 與 grade 的組合只能有一筆。選擇職級時，未到期的專屬優惠優先顯示。\n * category：餐飲美食／生活購物／旅遊住宿。\n * region：縣市全名，例如「台北市」；篩選器會從資料自動產生。\n * owned：集團品牌填 true，外部合作商店填 false（不加引號）。\n * offer：主要優惠；expires：西元 YYYY-MM-DD；到期當日仍有效，空白代表未提供。\n * address：門市地址；phone：門市電話（可空白，請保留前面的 0）。\n * website：官網網址，可留空。\n * notes：限制與使用方式；placeId：Google Maps Place ID（可留空）。\n * demo：範例填 true。確認優惠、公開授權與門市資訊後，正式資料填 false。\n * 無內容的文字欄位用 \"\"；保留欄位名稱。要用 Excel 批次維護，開啟 admin.html。\n */";
    const source = JSON.stringify(imported, null, 2).replaceAll("<", "\\u003c");
    download("data.js", comments + "\nwindow.HAIPAWANG_STORES = " + source + ";\n", "text/javascript;charset=utf-8");
    $("save-status").textContent = "已下載，請替換 GitHub 上的檔案";
  });
})();

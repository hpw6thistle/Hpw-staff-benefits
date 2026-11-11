(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const data = window.HAIPAWANG_STORES;
  const stores = Array.isArray(data) ? data : [];
  const elements = { search: $("search"), grade: $("grade"), region: $("region"), owned: $("owned"), cards: $("cards") };
  const categoryOrder = ["餐飲美食", "旅遊住宿", "生活購物", "休閒娛樂", "醫療保健"];
  const categories = ["", ...new Set([...categoryOrder, ...stores.map(s => s.category).filter(Boolean)])];
  const regionOrder = ["台北市", "新北市", "桃園市", "台中市", "高雄市"];
  let category = "";
  let toastTimer;

  // 建立節點時使用 textContent，讓資料中的 HTML 符號只會以文字顯示。
  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function icon(name) {
    const ns = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(ns, "svg");
    const use = document.createElementNS(ns, "use");
    svg.setAttribute("class", "icon");
    svg.setAttribute("aria-hidden", "true");
    use.setAttribute("href", "#i-" + name);
    svg.append(use);
    return svg;
  }

  function regionName(value) {
    return String(value ?? "").trim().replaceAll("臺", "台");
  }

  function normalize(value) {
    return String(value ?? "").normalize("NFKC").toLocaleLowerCase("zh-TW").replaceAll("臺", "台");
  }

  function taipeiToday() {
    const parts = new Intl.DateTimeFormat("en", { timeZone: "Asia/Taipei", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
    const value = (key) => parts.find(part => part.type === key).value;
    return [value("year"), value("month"), value("day")].join("-");
  }

  function mapLink(store) {
    const url = new URL("https://www.google.com/maps/search/");
    url.searchParams.set("api", "1");
    url.searchParams.set("query", [store.name, store.address].filter(Boolean).join(", "));
    if (store.placeId) url.searchParams.set("query_place_id", store.placeId);
    return url.href;
  }

  function notify(message) {
    clearTimeout(toastTimer);
    $("toast").textContent = message;
    toastTimer = setTimeout(() => { $("toast").textContent = ""; }, 2300);
  }

  async function copyText(value, button, label) {
    let copied = false;
    try {
      await navigator.clipboard.writeText(value);
      copied = true;
    } catch {
      const input = el("textarea");
      input.value = value;
      input.readOnly = true;
      input.style.cssText = "position:fixed;left:-9999px;top:0";
      document.body.append(input);
      input.select();
      try { copied = document.execCommand("copy"); } catch { /* 可改為手動複製 */ }
      input.remove();
      if (button.isConnected) button.focus({ preventScroll: true });
    }
    if (!copied) {
      $("copy-value").value = value;
      $("copy-dialog").showModal();
      $("copy-value").select();
      return;
    }
    button.replaceChildren(icon("copy"), "已複製");
    notify("已複製" + label);
    clearTimeout(button.restoreTimer);
    button.restoreTimer = setTimeout(() => button.replaceChildren(icon("copy"), label === "優惠碼" ? "複製代碼" : "複製" + label), 1800);
  }

  function storeCard(store, today) {
    const card = el("article", "card");
    const body = el("div", "card-body");
    const head = el("div", "card-head");
    const tags = el("div", "tags");
    tags.append(el("span", "tag category", store.category), el("span", "tag", regionName(store.region)));
    if (store.owned) tags.append(el("span", "tag", "集團品牌"));
    if (store.demo) tags.append(el("span", "tag demo-tag", "範例"));
    head.append(tags, el("h2", "", store.name));

    const offer = el("div", "offer");
    offer.append(el("span", store.grade ? "offer-grade" : "offer-scope", store.grade || "全職級通用"), el("strong", "", store.offer));
    const meta = el("div", "meta");
    const isExpired = Boolean(store.expires && store.expires < today);
    const expires = el("p", "expiry" + (isExpired ? " expired" : ""));
    if (store.expires) {
      const date = el("time", "", store.expires.replaceAll("-", "/"));
      date.dateTime = store.expires;
      expires.append(el("span", "", isExpired ? "已到期" : "有效至"), date);
    } else expires.textContent = "有效期限請洽門市";
    const address = el("address");
    address.append(icon("pin"), store.address || "地址請洽門市");
    meta.append(address);
    const phone = String(store.phone || "").trim();
    if (phone) {
      const contact = el("p");
      const number = el("a", "", phone);
      const [base, ext] = phone.split(/(?:分機|ext\.?|#)/i);
      number.href = "tel:" + base.replace(/[^\d+]/g, "") + (ext ? ";ext=" + ext.replace(/\D/g, "") : "");
      contact.append(icon("phone"), number);
      meta.append(contact);
    }

    body.append(head, offer, meta);
    if (store.notes) body.append(el("p", "notes", store.notes));
    const stub = el("div", "ticket-stub");
    const actions = el("div", "stub-row");
    actions.append(expires);
    if (store.address && (!store.demo || store.owned)) {
      const link = el("a", "action");
      link.href = mapLink(store);
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.setAttribute("aria-label", "在 Google 地圖開啟 " + store.name + "（新分頁）");
      link.append(icon("external"), "Google 地圖");
      actions.append(link);
    }
    stub.append(actions);
    if (store.code && !isExpired) {
      const label = store.codeLabel || "優惠碼";
      const codeRow = el("div", "stub-row code-row");
      const codeInfo = el("div", "code-info");
      const isCode = label === "優惠碼" || /^[0-9A-Za-z][0-9A-Za-z._-]*$/.test(store.code);
      codeInfo.append(el("span", "", label), el(isCode ? "code" : "span", "code-value", store.code));
      const copy = el("button", "action copy");
      copy.type = "button";
      copy.append(icon("copy"), label === "優惠碼" ? "複製代碼" : "複製" + label);
      copy.addEventListener("click", () => copyText(store.code, copy, label));
      codeRow.append(codeInfo, copy);
      stub.append(codeRow);
    }
    card.append(body, stub);
    return card;
  }

  function render() {
    const terms = normalize(elements.search.value).trim().split(/\s+/u).filter(Boolean);
    const region = elements.region.value;
    const owned = elements.owned.checked;
    const today = taipeiToday();
    const grade = elements.grade.value;
    const applicable = new Map();
    // 先決定每間店適用的優惠，再搜尋。通用優惠不會蓋過所選職級的優惠。
    for (const store of stores) {
      const targeted = grade && store.grade === grade && (!store.expires || store.expires >= today);
      if (targeted || (!store.grade && !applicable.has(store.id))) applicable.set(store.id, store);
    }
    const filtered = [...applicable.values()].filter(store => {
      if (category && store.category !== category) return false;
      if (region && regionName(store.region) !== region) return false;
      if (owned && !store.owned) return false;
      const haystack = normalize([store.name, store.offer, store.address, store.notes, store.region].join(" "));
      return terms.every(term => haystack.includes(term));
    });
    const fragment = document.createDocumentFragment();
    filtered.forEach(store => fragment.append(storeCard(store, today)));
    elements.cards.replaceChildren(fragment);
    $("count").textContent = filtered.length === applicable.size
      ? filtered.length + " 間商店"
      : filtered.length + " / " + applicable.size + " 間商店";
    $("clear-top").hidden = !(terms.length || category || region || owned || grade);
    $("empty").hidden = filtered.length > 0;
    $("categories").querySelectorAll("button").forEach(button => {
      button.setAttribute("aria-pressed", String(button.value === category));
    });
  }

  function reset() {
    category = "";
    elements.search.value = "";
    elements.grade.value = "";
    elements.region.value = "";
    elements.owned.checked = false;
    render();
    elements.search.focus();
  }

  if (!Array.isArray(data)) {
    $("count").textContent = "商店資料未載入";
    $("empty-title").textContent = "目前無法載入商店資料";
    $("empty-text").textContent = "請重新整理；若仍無法載入，請聯絡資料維護人員。";
    $("clear-empty").hidden = true;
    $("empty").hidden = false;
    Object.values(elements).forEach(node => { if ("disabled" in node) node.disabled = true; });
    return;
  }

  $("demo").hidden = !stores.some(store => store.demo);
  for (const grade of new Set(stores.map(store => store.grade).filter(Boolean))) {
    const option = el("option", "", grade);
    option.value = grade;
    elements.grade.append(option);
  }
  const regions = [...new Set(stores.map(store => regionName(store.region)).filter(Boolean))];
  const ordered = [...regionOrder.filter(region => regions.includes(region)), ...regions.filter(region => !regionOrder.includes(region)).sort((a,b) => a.localeCompare(b, "zh-TW"))];
  for (const region of ordered) {
    const option = el("option", "", region);
    option.value = region;
    elements.region.append(option);
  }
  for (const label of categories) {
    const chip = el("button", "chip");
    chip.type = "button";
    chip.value = label;
    chip.textContent = label || "全部類別";
    chip.addEventListener("click", () => { category = label; render(); });
    $("categories").append(chip);
  }
  elements.search.addEventListener("input", render);
  elements.grade.addEventListener("change", render);
  elements.region.addEventListener("change", render);
  elements.owned.addEventListener("change", render);
  $("clear-top").addEventListener("click", reset);
  $("clear-empty").addEventListener("click", reset);
  render();
})();

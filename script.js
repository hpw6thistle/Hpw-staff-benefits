(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const data = window.HAIPAWANG_STORES;
  const stores = Array.isArray(data) ? data : [];
  const elements = { search: $("keyword"), grade: $("grade"), region: $("region"), owned: $("owned"), cards: $("cards") };
  const combinedCategory = "休閒醫療";
  const leisureCategories = new Set(["休閒娛樂", "醫療保健", "休閒與醫療", combinedCategory]);
  const categoryOrder = ["餐飲美食", "旅遊住宿", "生活購物", combinedCategory];
  const categories = ["", ...new Set([...categoryOrder, ...stores.map(s => displayCategory(s.category)).filter(Boolean)])];
  const quickCategories = [
    { name: "集團品牌專屬", owned: true, icon: "brand" },
    { name: "餐飲美食", category: "餐飲美食", icon: "dining" },
    { name: "旅遊住宿", category: "旅遊住宿", icon: "stay" },
    { name: "生活購物", category: "生活購物", icon: "shopping" },
    { name: combinedCategory, category: combinedCategory, icon: "wellness" },
  ];
  const regionOrder = ["台北市", "新北市", "桃園市", "台中市", "高雄市"];
  let category = "";
  let view;

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

  function displayCategory(value) {
    return leisureCategories.has(value) ? combinedCategory : value;
  }

  function matchesCategory(store, selected) {
    return !selected || displayCategory(store.category) === selected;
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

  function storeCard(store, today) {
    const card = el("article", "card");
    const body = el("div", "card-body");
    const head = el("div", "card-head");
    const tags = el("div", "tags");
    tags.append(el("span", "tag category", displayCategory(store.category)));
    if (store.owned) tags.append(el("span", "brand-badge", "集團品牌"));
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
    const bottom = el("div", "card-bottom");
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
    if (store.notes) bottom.append(el("p", "notes", store.notes));
    bottom.append(stub);
    card.append(body, bottom);
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
      const current = applicable.get(store.id);
      if (targeted || (!store.grade && (!current || (!grade && current.grade))) || (!grade && !current)) {
        applicable.set(store.id, store);
      }
    }
    const filtered = [...applicable.values()].filter(store => {
      if (!matchesCategory(store, category)) return false;
      if (region && regionName(store.region) !== region) return false;
      if (owned && !store.owned) return false;
      const haystack = normalize([store.name, store.offer, store.address, store.notes, store.region].join(" "));
      return terms.every(term => haystack.includes(term));
    });
    const fragment = document.createDocumentFragment();
    filtered.forEach(store => fragment.append(storeCard(store, today)));
    elements.cards.replaceChildren(fragment);
    $("count").textContent = filtered.length === applicable.size
      ? "共 " + filtered.length + " 間商店"
      : "找到 " + filtered.length + " 間，共 " + applicable.size + " 間商店";
    $("clear-top").hidden = !(terms.length || category || region || owned || grade);
    $("empty").hidden = filtered.length > 0;
    $("categories").querySelectorAll("button").forEach(button => {
      button.setAttribute("aria-pressed", String(button.value === category));
    });
  }

  function applyFilters(filters = {}) {
    const selected = displayCategory(filters.category);
    category = categories.includes(selected) ? selected : "";
    elements.search.value = filters.keyword || "";
    elements.grade.value = filters.grade || "";
    elements.region.value = filters.region || "";
    elements.owned.checked = Boolean(filters.owned);
    if (Array.isArray(data)) render();
  }

  function currentFilters() {
    return { category, keyword: elements.search.value, grade: elements.grade.value, region: elements.region.value, owned: elements.owned.checked };
  }

  function saveFilters() {
    if (view === "search") window.history.replaceState({ benefits: currentFilters() }, "");
  }

  function viewFromHash() {
    return window.location.hash === "#search" ? "search" : "home";
  }

  function displayView(next, { focus = false } = {}) {
    view = next;
    $("landing-view").hidden = next === "search";
    $("directory").hidden = next === "home";
    document.title = (next === "search" ? "特約商店查詢" : "員工專屬福利手冊") + "｜海霸王";
    if (focus) {
      if (next === "home" && window.location.hash === "#quick-title") {
        $("quick-title").focus({ preventScroll: true });
        $("quick-title").scrollIntoView({ behavior: "instant" });
      } else {
        window.scrollTo({ top: 0, behavior: "instant" });
        $(next === "search" ? "search-title" : "landing-title").focus({ preventScroll: true });
      }
    }
  }

  function navigate(next, { filters } = {}) {
    const changed = next !== view;
    if (changed) saveFilters();
    if (next === "search" && (changed || filters)) applyFilters(filters);
    const state = next === "search" ? { benefits: currentFilters() } : {};
    const hash = next === "search" ? "#search" : "#home";
    // 視圖切換才新增一筆紀錄；篩選與同頁操作用 replaceState，返回鍵可一次回到首頁。
    if (changed) window.history.pushState(state, "", hash);
    else window.history.replaceState(state, "", hash);
    displayView(next, { focus: changed });
  }

  function restoreView(focus) {
    const next = viewFromHash();
    if (next === "home" && view === "home") return;
    if (next === "search") applyFilters(window.history.state?.benefits);
    displayView(next, { focus });
  }

  // 首屏高度扣除實際的頁首高度。
  if ("ResizeObserver" in window) {
    const chrome = $("site-chrome");
    const fitPage = () => {
      document.documentElement.style.setProperty("--site-chrome-height", chrome.getBoundingClientRect().height + "px");
    };
    fitPage();
    new window.ResizeObserver(fitPage).observe(chrome);
  }

  function bindLink(id, action) {
    $(id).addEventListener("click", event => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button > 0) return;
      event.preventDefault();
      action();
    });
  }


  function renderQuickLinks() {
    for (const entry of quickCategories) {
      const total = new Set(stores.filter(store => entry.owned ? store.owned : matchesCategory(store, entry.category)).map(store => store.id)).size;
      const link = el("a", "quick-tile");
      link.href = "#search";
      const label = el("span", "quick-tile-label");
      label.append(icon(entry.icon), el("strong", "", entry.name), el("small", "", total + " 間門市"));
      const arrow = el("span", "quick-tile-arrow", "→");
      arrow.setAttribute("aria-hidden", "true");
      link.append(label, arrow);
      link.addEventListener("click", event => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button > 0) return;
        event.preventDefault();
        navigate("search", { filters: { owned: entry.owned, category: entry.category } });
      });
      $("quick-categories").append(link);
    }
  }

  function reset() {
    applyFilters();
    saveFilters();
    elements.search.focus();
  }

  bindLink("home-link", () => navigate("home"));
  bindLink("enter-search", () => navigate("search", { filters: {} }));
  $("guide-link").addEventListener("click", () => $("guide-dialog").showModal());
  window.addEventListener("popstate", () => restoreView(true));
  window.addEventListener("hashchange", () => {
    if (viewFromHash() !== view) restoreView(true);
  });
  renderQuickLinks();

  if (!Array.isArray(data)) {
    $("count").textContent = "商店資料未載入";
    $("empty-title").textContent = "目前無法載入商店資料";
    $("empty-text").textContent = "請重新整理，或聯絡資料維護人員。";
    $("clear-empty").hidden = true;
    $("empty").hidden = false;
    Object.values(elements).forEach(node => { if ("disabled" in node) node.disabled = true; });
    displayView(viewFromHash());
    return;
  }

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
    chip.addEventListener("click", () => { category = label; render(); saveFilters(); });
    $("categories").append(chip);
  }
  elements.search.addEventListener("input", render);
  elements.search.addEventListener("change", saveFilters);
  for (const control of [elements.grade, elements.region, elements.owned]) {
    control.addEventListener("change", () => { render(); saveFilters(); });
  }
  $("clear-top").addEventListener("click", reset);
  $("clear-empty").addEventListener("click", reset);
  restoreView(false);
})();

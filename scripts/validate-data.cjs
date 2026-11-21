#!/usr/bin/env node
"use strict";
const fs = require("node:fs");
const vm = require("node:vm");
const assert = require("node:assert/strict");
const source = fs.readFileSync("data.js", "utf8");
const context = { window: {} };
vm.runInNewContext(source, context, { filename: "data.js", timeout: 2000 });
const rows = context.window.HAIPAWANG_STORES;
assert.ok(Array.isArray(rows) && rows.length > 0, "商店資料必須是非空陣列");
const categories = new Set(["餐飲美食", "旅遊住宿", "生活購物"]);
const grades = new Set(["", "員工", "主管"]);
const keys = new Set();
for (const [i, row] of rows.entries()) {
  const label = "第 " + (i + 1) + " 筆";
  assert.ok(row.status === undefined || ["active", "inactive"].includes(row.status), label + " 的上架狀態不正確");
  for (const key of ["id", "name", "category", "region", "offer", "expires", "address", "phone", "notes", "placeId", "grade", "website"]) {
    assert.equal(typeof row[key], "string", label + " 的 " + key + " 必須是字串");
  }
  for (const key of ["owned", "demo"]) assert.equal(typeof row[key], "boolean", label + " 的 " + key + " 必須是布林值");
  assert.match(row.id, /^[A-Za-z0-9_-]+$/, label + " 的 ID 格式不正確");
  assert.ok(row.name.trim() && row.offer.trim(), label + " 缺少名稱或優惠");
  assert.ok(categories.has(row.category), label + " 的類別不正確");
  assert.ok(grades.has(row.grade), label + " 的職級不正確");
  if (row.expires) {
    assert.match(row.expires, /^\d{4}-\d{2}-\d{2}$/, label + " 的日期格式不正確");
    const d = new Date(row.expires + "T00:00:00Z");
    assert.ok(!Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === row.expires, label + " 的日期無效");
  }
  if (row.website) {
    const url = new URL(row.website);
    assert.ok(["https:", "http:"].includes(url.protocol) && !url.username && !url.password, label + " 的網址不安全");
  }
  const idGrade = row.id.toLowerCase() + "::" + row.grade;
  assert.ok(!keys.has(idGrade), label + " 的門市 ID 與職級重複");
  keys.add(idGrade);
}
console.log("資料驗證通過：" + rows.length + " 筆優惠");

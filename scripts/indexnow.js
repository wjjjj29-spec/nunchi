#!/usr/bin/env node
// IndexNow 제출 (Bing·Yandex 등): node scripts/indexnow.js            → 사이트맵 전체
//                                node scripts/indexnow.js <url> ...  → 지정한 URL만
const fs = require("fs"), path = require("path");
const KEY = fs.readFileSync(path.join(__dirname, "..", "growth", ".indexnow_key"), "utf8").trim();
(async () => {
  let urls = process.argv.slice(2);
  if (!urls.length) urls = [...fs.readFileSync(path.join(__dirname, "..", "site", "sitemap.xml"), "utf8").matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
  for (let i = 0; i < urls.length; i += 9000) {
    const r = await fetch("https://api.indexnow.org/indexnow", { method: "POST", headers: { "content-type": "application/json; charset=utf-8" },
      body: JSON.stringify({ host: "hellonunchi.com", key: KEY, keyLocation: `https://hellonunchi.com/${KEY}.txt`, urlList: urls.slice(i, i + 9000) }) });
    console.log(`IndexNow ${urls.slice(i, i + 9000).length} urls → ${r.status} ${await r.text()}`.trim());
  }
})();

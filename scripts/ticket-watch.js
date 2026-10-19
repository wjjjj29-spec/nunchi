#!/usr/bin/env node
// 한국 공연 티켓 신규 공지 수집기 (브라우저 불필요). Melon Ticket(JSON) + NOL World(Next.js RSC) + Yes24 English(HTML)
//  node scripts/ticket-watch.js            → growth/tickets/seen.json 과 비교해 새 공연만 growth/tickets/new-YYYYMMDD.json 에 저장
//  node scripts/ticket-watch.js --init     → 현재 목록을 seen 으로 저장만 (첫 실행)
//  node scripts/ticket-watch.js --print    → 수집 결과 전체 출력
const fs = require("fs"), path = require("path");
const DIR = path.join(__dirname, "..", "growth", "tickets"); fs.mkdirSync(DIR, { recursive: true });
const SEEN = path.join(DIR, "seen.json");
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36";
const get = async (url, headers = {}) => { const r = await fetch(url, { headers: { "User-Agent": UA, ...headers }, redirect: "follow" }); if (!r.ok) throw new Error(`${r.status} ${url}`); return r.text(); };
const clean = s => String(s || "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();

async function melon() {
  const out = [];
  for (const [genre, type] of [["GENRE_CON_ALL", "concert"], ["GENRE_FAN_ALL", "fanmeeting"]]) {
    const t = await get(`https://ticket.melon.com/performance/ajax/prodList.json?commCode=&sortType=NEW&perfGenreCode=${genre}&perfThemeCode=&filterCode=FILTER_ALL&v=1`, { Referer: "https://ticket.melon.com/concert/index.htm" });
    const d = JSON.parse(t).data || [];
    for (const x of d) out.push({ source: "melon", type, id: `melon:${x.prodId}`, title: clean(x.title), place: clean(x.placeName), region: clean(x.regionName), period: clean(x.periodInfo), url: `https://ticket.melon.com/performance/index.htm?prodId=${x.prodId}`, poster: x.posterImg ? "https://ticket.melon.com" + x.posterImg : "" });
  }
  return out;
}
async function nol() {
  const html = await get("https://world.nol.com/en/ticket/genre/CONCERT/products");
  const chunks = [...html.matchAll(/self\.__next_f\.push\(\[1,"((?:[^"\\]|\\.)*)"\]\)/g)].map(m => m[1]);
  let s = chunks.join(""); try { s = JSON.parse('"' + s + '"'); } catch { s = s.replace(/\\"/g, '"').replace(/\\n/g, " "); }
  const out = [], seen = new Set();
  for (const m of s.matchAll(/"goodsKey":"([^"]+)","goodsCode":"(\d+)","goodsName":"((?:[^"\\]|\\.)*)"/g)) {
    const code = m[2]; if (seen.has(code)) continue; seen.add(code);
    const tail = s.slice(m.index, m.index + 1500);
    const place = (tail.match(/"placeName":"((?:[^"\\]|\\.)*)"/) || [])[1] || "";
    const period = (tail.match(/"(?:playStartDate|startDate|playDate)":"([^"]+)"/) || [])[1] || "";
    const period2 = (tail.match(/"(?:playEndDate|endDate)":"([^"]+)"/) || [])[1] || "";
    out.push({ source: "nol", type: "concert", id: `nol:${code}`, title: clean(m[3]), place: clean(place), region: "", period: [period, period2].filter(Boolean).join(" - "), url: `https://world.nol.com/en/ticket/goods/${code}`, poster: "" });
  }
  return out;
}
async function yes24() {
  const html = await get("https://ticket.yes24.com/English/");
  const out = [], seen = new Set();
  for (const m of html.matchAll(/href="(\/English\/Perf\/(\d+))"[^>]*>([\s\S]*?)<\/a>/g)) {
    const id = m[2], title = clean(m[3]); if (!title || seen.has(id)) continue; seen.add(id);
    out.push({ source: "yes24", type: "concert", id: `yes24:${id}`, title, place: "", region: "", period: "", url: `https://ticket.yes24.com${m[1]}`, poster: "" });
  }
  return out;
}

(async () => {
  const results = await Promise.allSettled([melon(), nol(), yes24()]);
  const all = results.flatMap(r => r.status === "fulfilled" ? r.value : []);
  results.forEach((r, i) => { if (r.status === "rejected") console.error(["melon", "nol", "yes24"][i], "FAILED:", r.reason.message); });
  const seen = fs.existsSync(SEEN) ? JSON.parse(fs.readFileSync(SEEN, "utf8")) : {};
  const fresh = all.filter(x => !seen[x.id]);
  const now = new Date().toISOString();
  if (process.argv.includes("--print")) console.log(JSON.stringify(all, null, 1));
  for (const x of all) seen[x.id] = seen[x.id] || { first: now, title: x.title };
  fs.writeFileSync(SEEN, JSON.stringify(seen, null, 1));
  if (process.argv.includes("--init")) { console.log(`init: ${all.length} items (melon ${all.filter(x=>x.source==="melon").length}, nol ${all.filter(x=>x.source==="nol").length}, yes24 ${all.filter(x=>x.source==="yes24").length})`); return; }
  if (fresh.length) { const f = path.join(DIR, `new-${now.slice(0, 10).replace(/-/g, "")}.json`); fs.writeFileSync(f, JSON.stringify(fresh, null, 1)); console.log(`${fresh.length} new → ${f}`); fresh.slice(0, 20).forEach(x => console.log(`- [${x.source}] ${x.title} | ${x.place} | ${x.period} | ${x.url}`)); }
  else console.log("no new listings");
  // 구독자 메일: Worker(/api/tickets/push)로 신규 공연 전송. 토큰은 growth/tickets/.push_secret (없으면 생략)
  const SECRET = path.join(DIR, ".push_secret");
  if (fresh.length && fs.existsSync(SECRET)) {
    const r = await fetch("https://api.hellonunchi.com/api/tickets/push", { method: "POST", headers: { authorization: `Bearer ${fs.readFileSync(SECRET, "utf8").trim()}`, "content-type": "application/json" }, body: JSON.stringify(fresh) });
    console.log("push:", r.status, await r.text());
  }
})().catch(e => { console.error("ERR", e.message); process.exit(1); });

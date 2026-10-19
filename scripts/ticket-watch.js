#!/usr/bin/env node
// 한국 공연 티켓 신규 공지 수집기 (브라우저 불필요). Melon 티켓오픈 안내(HTML) + Melon 목록(JSON) + NOL World(RSC) + Yes24 English(HTML)
// 새 공지는 Gemini로 영어 요약(오픈 시간·대상·외국인 구매 가능 여부) 후 Worker(/api/tickets/push)로 보내 구독자에게 메일
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

// 멜론 "티켓 오픈 안내": 정확한 예매 오픈 시간이 있는 공지 (콘서트·팬미팅)
async function melonOpen() {
  const out = [], ids = new Set();
  for (const g of ["GENRE_CON_ALL", "GENRE_FAN_ALL"]) for (let p = 1; p <= 3; p++) {
    const html = await get(`https://ticket.melon.com/csoon/ajax/listTicketOpen.htm?orderType=2&pageIndex=${p}&schGcode=${g}&schText=&schDt=`, { Referer: "https://ticket.melon.com/csoon/index.htm" });
    for (const m of html.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/g)) {
      const id = (m[1].match(/csoonId=(\d+)/) || [])[1]; if (!id || ids.has(id)) continue; ids.add(id);
      const parts = m[1].replace(/<[^>]+>/g, "|").split("|").map(clean).filter(Boolean);
      const title = (parts.find(s => /티켓\s*오픈\s*안내/.test(s)) || "").replace(/\s*티켓\s*오픈\s*안내\s*$/, "");
      const open = (parts.find(s => /^\d{4}\.\d{2}\.\d{2}/.test(s)) || "");
      out.push({ source: "melon-open", type: g === "GENRE_FAN_ALL" ? "fanmeeting" : "concert", id: `melonopen:${id}`, title, place: "", region: "", period: open, url: `https://ticket.melon.com/csoon/detail.htm?csoonId=${id}`, poster: "" });
    }
  }
  return out;
}
const pageText = html => clean(html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, "").replace(/<br\s*\/?>|<\/p>|<\/li>|<\/tr>|<\/dd>|<\/dt>/g, "\n").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&#39;/g, "'").replace(/&amp;/g, "&"));
async function noticeText(x) {
  if (x.source === "melon-open") { const s = pageText(await get(x.url)); const i = s.indexOf("티켓오픈일정"), j = s.indexOf("기획사 정보"); return s.slice(i < 0 ? 0 : i, j > i ? j : i + 3000).slice(0, 3500); }
  if (x.source === "nol" || x.source === "yes24") { try { const s = pageText(await get(x.url)); return s.slice(0, 3000); } catch { return ""; } }
  return "";
}

// SNS 큐: 유명 그룹(아이돌 나이 도구에 있는 그룹)·시상식·페스티벌 공지 → Threads 글 초안 (growth/tickets/social-queue.json)
// 게시는 밤 9시 답글 세션(예약 작업)이 큐에서 꺼내 올림
const QUEUE = path.join(DIR, "social-queue.json");
const EXTRA_BIG = ["DAY6", "NCT", "EXO", "SHINee", "ATEEZ", "RIIZE", "ZEROBASEONE", "BOYNEXTDOOR", "TREASURE", "MONSTA X", "BTOB", "MAMAMOO", "Red Velvet", "KISS OF LIFE", "QWER", "N.Flying", "THE BOYZ", "P1Harmony", "TWS", "NMIXX", "fromis_9", "Kep1er", "Taeyeon", "Big Bang", "WINNER", "iKON", "CNBLUE", "FTISLAND", "Super Junior", "Girls' Generation", "2NE1", "WayV", "Hearts2Hearts", "KiiiKiii", "CORTIS", "ALLDAY PROJECT"];
const BIG = (() => { try { const src = fs.readFileSync(path.join(__dirname, "..", "site", "tools", "kpop-idol-age-calculator", "index.html"), "utf8"); const G = eval("(" + src.match(/const G=(\{[\s\S]*?\});\n/)[1] + ")"); return Object.keys(G).filter(g => g !== "Solo").concat((G.Solo?.[1] || []).map(m => m[0] || m.name).filter(Boolean)).concat(EXTRA_BIG); } catch { return EXTRA_BIG; } })();
const nk = s => String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
const kst = iso => { const d = new Date(iso); return isNaN(d) ? "" : d.toLocaleString("en-US", { timeZone: "Asia/Seoul", weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }); };
const VERD = { easy: "Yes, it sells to overseas fans", possible: "Possible, with some steps", hard: "Not easily", unknown: "Not stated yet" };
function socialPost(x) {
  const i = x.info || {}; if (i.kpop === false) return null;
  const hay = nk([x.title, i.title_en, ...(i.artists || [])].join(" "));
  const big = BIG.some(g => nk(g).length >= 3 && hay.includes(nk(g))) || /award|festival/i.test(i.event_type || "");
  if (!big) return null;
  const opens = (i.opens || []).filter(o => o.kst_iso).slice(0, 2).map(o => `• ${o.label_en}: ${kst(o.kst_iso)} KST${o.who_en ? ` (${o.who_en})` : ""}`);
  const lines = [`🎫 ${i.title_en || x.title}`, [i.venue_en, i.city_en].filter(Boolean).join(", ") + (i.show_dates_en ? ` · ${i.show_dates_en}` : ""), "", ...(opens.length ? ["Tickets open:", ...opens, ""] : []),
    `Can overseas fans buy? ${VERD[i.foreigners?.verdict] || VERD.unknown}.${i.foreigners?.note_en ? " " + i.foreigners.note_en : ""}`, "", "Free English alerts for your artists: hellonunchi.com/tickets"];
  let text = lines.filter((l, k, a) => !(l === "" && a[k - 1] === "")).join("\n");
  if (text.length > 490) text = text.replace(/Can overseas fans buy\? ([^.]*\.)[^\n]*/, "Can overseas fans buy? $1");
  return text.slice(0, 495);
}

// hellonunchi-social 저장소의 queue/threads.json 에 추가하고 push (봇이 상태를 커밋하므로 pull --rebase 먼저)
function apiQueue(entries) {
  const { execFileSync } = require("child_process");
  const REPO = path.join(__dirname, "..", "..", "hellonunchi-social"), F = path.join(REPO, "queue", "threads.json");
  if (!fs.existsSync(F)) return;
  const git = (...a) => execFileSync("git", ["-C", REPO, ...a], { stdio: "pipe" }).toString();
  git("pull", "--rebase", "-q");
  const cur = JSON.parse(fs.readFileSync(F, "utf8"));
  const kst = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 19) + "+09:00";
  for (const e of entries) if (!cur.some(c => c.id === "tk_" + e.id)) cur.push({ id: "tk_" + e.id, when: kst, topic: "K-pop", parts: [{ text: e.text, image: "https://hellonunchi.com/social/tickets-alert.jpg" }], status: "pending" });
  fs.writeFileSync(F, JSON.stringify(cur, null, 1) + "\n");
  git("add", "queue/threads.json"); git("-c", "user.name=hellonunchi-watch", "-c", "user.email=wjjjj29@gmail.com", "commit", "-qm", `queue: ${entries.length} ticket post(s)`); git("push", "-q");
  console.log("api queued:", entries.map(e => e.id).join(", "));
}
// Gemini 영어 요약 (키: growth/tickets/.gemini_key)
const GEMINI = path.join(DIR, ".gemini_key");
const PROMPT = `You write ticket alerts in English for overseas K-pop fans who cannot read Korean.
From the ticket listing below, return ONLY JSON with this shape:
{"kpop": true|false (K-pop, K-indie, Korean artist fan event or Korean music award; false for classical, kids, musicals, foreign jazz),
 "artists": ["English names of the performers, romanized if no English name"],
 "title_en": "short English title",
 "event_type": "concert|fan meeting|festival|award show|other",
 "venue_en": "venue in English (e.g. KSPO DOME, Gocheok Sky Dome, Olympic Hall)", "city_en": "Seoul|Busan|...",
 "show_dates_en": "e.g. Nov 14–15, 2026 · 6 PM",
 "price_en": "e.g. ₩65,000 (about $47) reserved seats",
 "opens": [{"label_en": "e.g. Fan club pre-sale", "kst_iso": "2026-10-19T20:00:00+09:00", "who_en": "who can buy in this round"}],
 "foreigners": {"verdict": "easy|possible|hard|unknown", "note_en": "1–2 sentences: can someone abroad without a Korean phone number buy? Mention global sale site if stated. If a round needs Korean ID, Melon subscription or Korean phone verification, say so."},
 "need_to_know_en": ["max 4 short bullets: ticket limits, ID check, membership needed, age rating"]}
Use only facts in the text. Unknown fields: empty string or empty list. Source site: `;
async function summarize(x, text) {
  if (!fs.existsSync(GEMINI)) return null;
  const body = { contents: [{ parts: [{ text: `${PROMPT}${x.source}\nListing title: ${x.title}\nPlace: ${x.place}\nPeriod/open: ${x.period}\n\n${text}` }] }], generationConfig: { responseMimeType: "application/json", temperature: 0.2 } };
  for (let i = 0; i < 2; i++) {
    const r = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent", { method: "POST", headers: { "x-goog-api-key": fs.readFileSync(GEMINI, "utf8").trim(), "content-type": "application/json" }, body: JSON.stringify(body) });
    if (r.ok) { const d = await r.json(); try { return JSON.parse(d.candidates[0].content.parts[0].text); } catch { return null; } }
    await new Promise(s => setTimeout(s, 5000));
  }
  return null;
}

(async () => {
  const names = ["melon", "melon-open", "nol", "yes24"];
  const results = await Promise.allSettled([melon(), melonOpen(), nol(), yes24()]);
  const all = results.flatMap(r => r.status === "fulfilled" ? r.value : []);
  results.forEach((r, i) => { if (r.status === "rejected") console.error(names[i], "FAILED:", r.reason.message); });
  const seen = fs.existsSync(SEEN) ? JSON.parse(fs.readFileSync(SEEN, "utf8")) : {};
  const fresh = all.filter(x => !seen[x.id]);
  const now = new Date().toISOString();
  if (process.argv.includes("--print")) console.log(JSON.stringify(all, null, 1));
  const DRY = process.argv.includes("--dry"); // --dry: 기록·발송 없이 최근 공지 3개만 요약해서 출력
  const ONLY = (process.argv.find(a => a.startsWith("--only=")) || "").slice(7); // --only=<csoonId>: 그 공지만 요약
  if (DRY) { for (const x of all.filter(x => x.source === "melon-open" && (!ONLY || x.id === `melonopen:${ONLY}`)).slice(0, 3)) { x.info = await summarize(x, await noticeText(x)); console.log(JSON.stringify(x, null, 1)); console.log("--- social:\n" + (socialPost(x) || "(not big)")); } return; }
  for (const x of all) seen[x.id] = seen[x.id] || { first: now, title: x.title };
  fs.writeFileSync(SEEN, JSON.stringify(seen, null, 1));
  if (process.argv.includes("--init")) { console.log(`init: ${all.length} items`, names.map(n => `${n} ${all.filter(x => x.source === n).length}`).join(", ")); return; }
  if (!fresh.length) { console.log("no new listings"); return; }
  // 메일 대상: 멜론 오픈 공지 + 글로벌 사이트(NOL·Yes24). 멜론 목록(JSON)은 이미 판매 중인 상품이라 기록만
  const send = fresh.filter(x => x.source !== "melon");
  for (const x of send) { try { x.info = await summarize(x, await noticeText(x)); } catch (e) { console.error("summarize", x.id, e.message); } await new Promise(s => setTimeout(s, 1500)); }
  const f = path.join(DIR, `new-${now.slice(0, 10).replace(/-/g, "")}.json`);
  const prev = fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, "utf8")) : [];
  fs.writeFileSync(f, JSON.stringify([...prev, ...fresh], null, 1));
  console.log(`${fresh.length} new (${send.length} to alert) → ${f}`);
  send.forEach(x => console.log(`- [${x.source}] ${x.info?.title_en || x.title} | kpop=${x.info?.kpop} | ${x.info?.artists?.join(", ") || ""} | ${x.url}`));
  // SNS 큐에 쌓기
  const q = fs.existsSync(QUEUE) ? JSON.parse(fs.readFileSync(QUEUE, "utf8")) : [];
  for (const x of send) { const text = socialPost(x); if (text && !q.some(e => e.id === x.id)) { q.push({ id: x.id, created: now, firstOpen: (x.info?.opens || []).map(o => o.kst_iso).filter(Boolean).sort()[0] || "", text, posted: false }); console.log("social queued:", x.id); } }
  fs.writeFileSync(QUEUE, JSON.stringify(q, null, 1));
  // 공식 API 큐(~/원준프로젝트/hellonunchi-social)로 바로 넘김 → GitHub Actions가 30분 안에 Threads 게시
  const fresh4api = q.filter(e => !e.posted && !e.apiQueued && e.created === now);
  if (fresh4api.length) { try { apiQueue(fresh4api); fresh4api.forEach(e => { e.apiQueued = now; }); fs.writeFileSync(QUEUE, JSON.stringify(q, null, 1)); } catch (e) { console.error("api queue", e.message); } }
  // 구독자 메일: 토큰은 growth/tickets/.push_secret (없으면 생략)
  const SECRET = path.join(DIR, ".push_secret");
  const items = send.filter(x => !x.info || x.info.kpop !== false);
  if (items.length && fs.existsSync(SECRET)) {
    const r = await fetch("https://api.hellonunchi.com/api/tickets/push", { method: "POST", headers: { authorization: `Bearer ${fs.readFileSync(SECRET, "utf8").trim()}`, "content-type": "application/json" }, body: JSON.stringify(items) });
    console.log("push:", r.status, await r.text());
  }
})().catch(e => { console.error("ERR", e.message); process.exit(1); });

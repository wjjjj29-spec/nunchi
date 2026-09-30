// 글에 답글(링크) 달고 프로필 고정: node threads_reply_pin.js <ctxPrefix> <postUrl> <replyText>
const http = require("http");
const get = u => new Promise((res, rej) => http.get(u, r => { let d = ""; r.on("data", c => d += c); r.on("end", () => res(JSON.parse(d))); }).on("error", rej));
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function cdp(wsUrl) { const ws = new WebSocket(wsUrl); let id = 0; const p = {}; await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && p[m.id]) { p[m.id](m); delete p[m.id]; } };
  const send = (method, params = {}) => Promise.race([new Promise(r => { const i = ++id; p[i] = r; ws.send(JSON.stringify({ id: i, method, params })); }), sleep(20000).then(() => ({ timeout: method }))]);
  return { send, close: () => ws.close() }; }
(async () => {
  const [ctxPrefix, url, ...rest] = process.argv.slice(2); const reply = rest.join(" ");
  const ver = await get("http://127.0.0.1:9222/json/version"); const b = await cdp(ver.webSocketDebuggerUrl);
  const tg = await b.send("Target.getTargets"); const ctx = [...new Set(tg.result.targetInfos.map(t => t.browserContextId))].find(c => c.startsWith(ctxPrefix));
  const nt = await b.send("Target.createTarget", { url, browserContextId: ctx }); b.close(); await sleep(7000);
  const t = (await get("http://127.0.0.1:9222/json/list")).find(x => x.id === nt.result.targetId); const c = await cdp(t.webSocketDebuggerUrl);
  const ev = async expr => { const r = await c.send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true }); return r.result ? r.result.result.value : r; };
  const tap = async (x, y) => { for (const type of ["mouseMoved", "mousePressed", "mouseReleased"]) await c.send("Input.dispatchMouseEvent", { type, x, y, button: "left", clickCount: 1 }); };
  const center = sel => ev(`(()=>{const e=${sel}; if(!e) return null; e.scrollIntoView({block:'center'}); const r=e.getBoundingClientRect(); return [r.x+r.width/2,r.y+r.height/2]})()`);
  console.log("me:", await ev(`[...document.querySelectorAll('a[href^="/@"]')].map(a=>a.getAttribute('href'))[0]`));
  // 1) 답글: 첫 게시물의 '답글' 버튼
  let p = await center(`[...document.querySelectorAll('[role=button]')].find(e=>e.offsetParent&&/^답글/.test(e.getAttribute('aria-label')||''))`);
  console.log("reply btn:", p); if (p) { await tap(p[0], p[1]); await sleep(2000); }
  const ok = await ev(`(()=>{const ce=document.querySelector('[role=dialog] [contenteditable=true]'); if(!ce) return false; ce.focus(); return true})()`); console.log("reply editor:", ok);
  if (ok) { await c.send("Input.insertText", { text: reply }); await sleep(800);
    p = await center(`[...document.querySelectorAll('[role=dialog] [role=button]')].find(e=>e.innerText.trim()==='게시')`); await tap(p[0], p[1]);
    for (let i = 0; i < 10; i++) { await sleep(2500); const st = await ev(`({dialog:!!document.querySelector('[role=dialog]'), toast:[...document.querySelectorAll('[role=alert],[role=status]')].map(e=>e.innerText.trim()).filter(Boolean).slice(0,2)})`); console.log("reply state:", JSON.stringify(st)); if (st && !st.dialog && !(st.toast||[]).some(x=>/게시 중/.test(x))) break; } }
  await sleep(3000);
  // 2) 고정: 첫 게시물 '더 보기' 메뉴
  p = await center(`[...document.querySelectorAll('[role=button]')].find(e=>e.offsetParent&&(e.getAttribute('aria-label')||'')==='더 보기'&&e.closest('[data-pressable-container]'))`) || await center(`[...document.querySelectorAll('[role=button]')].filter(e=>e.offsetParent&&(e.getAttribute('aria-label')||'')==='더 보기')[1]`);
  console.log("more btn:", p); if (p) { await tap(p[0], p[1]); await sleep(1500); }
  const items = await ev(`[...document.querySelectorAll('[role=menuitem],[role=menu] [role=button],[role=dialog] [role=button]')].filter(e=>e.offsetParent).map(e=>e.innerText.trim()).filter(Boolean).slice(0,15)`); console.log("menu:", JSON.stringify(items));
  p = await center(`[...document.querySelectorAll('[role=menuitem],[role=menu] [role=button],[role=dialog] [role=button]')].find(e=>e.offsetParent&&/프로필에 고정/.test(e.innerText))`);
  console.log("pin item:", p); if (p) { await tap(p[0], p[1]); await sleep(2500); console.log("after pin:", JSON.stringify(await ev(`[...document.querySelectorAll('[role=alert],[role=status]')].map(e=>e.innerText.trim()).filter(Boolean).slice(0,2)`))); }
  c.close();
})().catch(e => { console.error("ERR", e.message); process.exit(1); });

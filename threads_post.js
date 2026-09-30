// Threads 글 게시: node threads_post.js <browserContextId 앞자리> <imagePath|-> <text>   (\n = 줄바꿈). 글 올린 뒤 프로필에서 게시 확인.
const http = require("http"); const fs = require("fs");
const get = u => new Promise((res, rej) => http.get(u, r => { let d = ""; r.on("data", c => d += c); r.on("end", () => res(JSON.parse(d))); }).on("error", rej));
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function cdp(wsUrl) { const ws = new WebSocket(wsUrl); let id = 0; const p = {}; await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && p[m.id]) { p[m.id](m); delete p[m.id]; } };
  const send = (method, params = {}) => Promise.race([new Promise(r => { const i = ++id; p[i] = r; ws.send(JSON.stringify({ id: i, method, params })); }), sleep(20000).then(() => ({ timeout: method }))]);
  return { send, close: () => ws.close() }; }
(async () => {
  const [ctxPrefix, img, ...rest] = process.argv.slice(2); const text = rest.join(" ").replace(/\\n/g, "\n");
  const ver = await get("http://127.0.0.1:9222/json/version"); const b = await cdp(ver.webSocketDebuggerUrl);
  const tg = await b.send("Target.getTargets"); const ctx = [...new Set(tg.result.targetInfos.map(t => t.browserContextId))].find(c => c.startsWith(ctxPrefix));
  if (!ctx) throw new Error("context not found"); const nt = await b.send("Target.createTarget", { url: "https://www.threads.com/", browserContextId: ctx }); b.close();
  await sleep(6000); const list = await get("http://127.0.0.1:9222/json/list"); const t = list.find(x => x.id === nt.result.targetId); const c = await cdp(t.webSocketDebuggerUrl);
  const ev = async expr => { const r = await c.send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true }); return r.result ? r.result.result.value : r; };
  const tap = async (x, y) => { for (const type of ["mouseMoved", "mousePressed", "mouseReleased"]) await c.send("Input.dispatchMouseEvent", { type, x, y, button: "left", clickCount: 1 }); };
  console.log("me:", await ev(`[...document.querySelectorAll('a[href^="/@"]')].map(a=>a.getAttribute('href'))[0]`));
  const pos = await ev(`(()=>{window.scrollTo(0,0);const e=[...document.querySelectorAll('div[tabindex],[role=button]')].find(e=>e.offsetParent&&e.innerText.trim()==='새로운 스레드');const r=e.getBoundingClientRect();return [r.x+r.width/2,r.y+r.height/2]})()`);
  await tap(pos[0], pos[1]); await sleep(2000);
  console.log("editor:", await ev(`(()=>{const ce=document.querySelector('[role=dialog] [contenteditable=true]'); if(!ce) return false; ce.focus(); return true})()`));
  const lines = text.split("\n"); for (let i = 0; i < lines.length; i++) { if (lines[i]) await c.send("Input.insertText", { text: lines[i] }); if (i < lines.length - 1) { await c.send("Input.dispatchKeyEvent", { type: "keyDown", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13, text: "\r" }); await c.send("Input.dispatchKeyEvent", { type: "keyUp", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13 }); } }
  if (img && img !== "-") { await c.send("DOM.enable"); const doc = await c.send("DOM.getDocument", { depth: 0 }); const q = await c.send("DOM.querySelector", { nodeId: doc.result.root.nodeId, selector: "[role=dialog] input[type=file]" }); await c.send("DOM.setFileInputFiles", { nodeId: q.result.nodeId, files: [img] }); await sleep(4000); }
  console.log("preview:", JSON.stringify(await ev(`(()=>{const d=document.querySelector('[role=dialog]');const ce=d.querySelector('[contenteditable=true]');return {len:ce.innerText.length, paras:ce.innerText.split('\\n').filter(Boolean).length, imgs:[...d.querySelectorAll('img')].filter(i=>/blob/.test(i.src)).length}})()`)));
  const post = await ev(`(()=>{const p=[...document.querySelectorAll('[role=dialog] [role=button]')].find(e=>e.innerText.trim()==='게시');const r=p.getBoundingClientRect();return [r.x+r.width/2,r.y+r.height/2]})()`);
  await tap(post[0], post[1]);
  for (let i = 0; i < 12; i++) { await sleep(2500); const st = await ev(`({dialog:!!document.querySelector('[role=dialog]'), toast:[...document.querySelectorAll('[role=alert],[role=status]')].map(e=>e.innerText.trim()).filter(Boolean).slice(0,2)})`); console.log("state:", JSON.stringify(st)); if (st && !st.dialog) break; }
  await sleep(3000); await c.send("Page.navigate", { url: "https://www.threads.com/@hellonunchi" }); await sleep(6000);
  console.log("posts:", JSON.stringify(await ev(`[...new Set([...document.querySelectorAll('a[href*="/@hellonunchi/post/"]')].map(a=>a.getAttribute('href')))]`)));
  c.close();
})().catch(e => { console.error("ERR", e.message); process.exit(1); });

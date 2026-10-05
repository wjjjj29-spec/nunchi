// 인스타 웹 게시: node ig_post.js <targetId> "<caption, \n 줄바꿈>" <img1> [img2 ...]   (로그인된 탭, 여러 장이면 캐러셀)
const http = require("http");
const get = u => new Promise((res, rej) => http.get(u, r => { let d = ""; r.on("data", c => d += c); r.on("end", () => res(JSON.parse(d))); }).on("error", rej));
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const [tid, caption, ...imgs] = process.argv.slice(2); const cap = caption.replace(/\\n/g, "\n");
  const t = (await get("http://127.0.0.1:9222/json/list")).find(x => x.id.startsWith(tid)); const ws = new WebSocket(t.webSocketDebuggerUrl); let id = 0; const p = {};
  await new Promise(r => ws.onopen = r); ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && p[m.id]) { p[m.id](m); delete p[m.id]; } };
  const send = (method, params = {}) => new Promise(r => { const i = ++id; p[i] = r; ws.send(JSON.stringify({ id: i, method, params })); });
  const ev = async expr => { let r; for (let k = 0; k < 5; k++) { r = await send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true }); if (r.result) break; await sleep(1500); } if (!r.result) throw new Error("eval failed: " + JSON.stringify(r.error || r).slice(0, 120)); if (r.result.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description); return r.result.result.value; };
  const tap = async (x, y) => { for (const type of ["mouseMoved", "mousePressed", "mouseReleased"]) await send("Input.dispatchMouseEvent", { type, x, y, button: "left", clickCount: 1 }); };
  const btn = async re => ev(`(()=>{const e=[...document.querySelectorAll('[role=dialog] [role=button],[role=dialog] button,[role=dialog] div[tabindex]')].filter(e=>e.offsetParent&&${re}.test(e.innerText.trim())).pop(); if(!e) return null; const r=e.getBoundingClientRect(); return [r.x+r.width/2,r.y+r.height/2]})()`);
  const waitBtn = async (re, ms = 30000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { const b = await btn(re); if (b) return b; await sleep(1000); } return null; };
  // 1) 새 게시물 열기
  let open = await ev(`!![...document.querySelectorAll('[role=dialog]')].find(d=>/새 게시물 만들기/.test(d.innerText))`);
  if (!open) { const pos = await ev(`(()=>{const s=[...document.querySelectorAll('svg[aria-label]')].find(s=>s.getClientRects().length&&/새로운 게시물|만들기/.test(s.getAttribute('aria-label'))); const b=s.closest('a,[role=link],[role=button]')||s; const r=b.getBoundingClientRect(); return [r.x+r.width/2,r.y+r.height/2]})()`); await tap(pos[0], pos[1]); await sleep(2500);
    const sub = await ev(`(()=>{const e=[...document.querySelectorAll('a,[role=link],[role=button],div[tabindex]')].find(e=>e.offsetParent&&/^게시물$/.test(e.innerText.trim())); if(!e) return null; const r=e.getBoundingClientRect(); return [r.x+r.width/2,r.y+r.height/2]})()`); if (sub) { await tap(sub[0], sub[1]); await sleep(2000); } }
  // 2) 파일 지정
  await send("DOM.enable"); const doc = await send("DOM.getDocument", { depth: -1, pierce: true });
  const q = await send("DOM.querySelectorAll", { nodeId: doc.result.root.nodeId, selector: "[role=dialog] input[type=file][multiple]" });
  const nid = q.result.nodeIds.pop(); if (!nid) throw new Error("no multi file input");
  await send("DOM.setFileInputFiles", { nodeId: nid, files: imgs }); console.log("files set:", imgs.length);
  // 3) 자르기 → 다음, 필터 → 다음
  for (let step = 0; step < 2; step++) { const n = await waitBtn("/^다음$/"); if (!n) throw new Error("no 다음 at step " + step); await sleep(1200); await tap(n[0], n[1]); await sleep(2500); }
  // 4) 캡션
  const ce = await ev(`(()=>{const e=[...document.querySelectorAll('[role=dialog] [contenteditable=true]')].find(e=>e.getClientRects().length); if(!e) return null; e.focus(); const r=e.getBoundingClientRect(); return [r.x+r.width/2,r.y+r.height/2]})()`);
  if (!ce) throw new Error("no caption box"); await tap(ce[0], ce[1]); await sleep(300);
  const lines = cap.split("\n"); for (let i = 0; i < lines.length; i++) { if (lines[i]) await send("Input.insertText", { text: lines[i] }); if (i < lines.length - 1) { await send("Input.dispatchKeyEvent", { type: "keyDown", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13, modifiers: 8, text: "\r" }); await send("Input.dispatchKeyEvent", { type: "keyUp", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13, modifiers: 8 }); } }
  await sleep(800);
  console.log("caption chars:", await ev(`[...document.querySelectorAll('[role=dialog] [contenteditable=true]')].find(e=>e.getClientRects().length).innerText.length`));
  // 5) 공유
  const sh = await waitBtn("/^공유하기$/"); if (!sh) throw new Error("no 공유하기"); await tap(sh[0], sh[1]);
  const t0 = Date.now(); let done = "";
  while (Date.now() - t0 < 120000) { await sleep(3000); done = await ev(`(()=>{const d=[...document.querySelectorAll('[role=dialog]')].map(d=>d.innerText).join(' '); const m=d.match(/게시물이 공유되었습니다|공유되었습니다|문제가 발생|다시 시도/); return m?m[0]:''})()`); if (done) break; }
  console.log("result:", done || "timeout");
  const close = await ev(`(()=>{const s=[...document.querySelectorAll('svg[aria-label="닫기"]')].find(s=>s.getClientRects().length); if(!s) return null; const b=s.closest('[role=button],button')||s; const r=b.getBoundingClientRect(); return [r.x+r.width/2,r.y+r.height/2]})()`); if (close) await tap(close[0], close[1]);
  ws.close();
})().catch(e => { console.error("ERR", e.message); process.exit(1); });

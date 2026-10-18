#!/usr/bin/env node
// 남의 글에 좋아요 + 답글: node threads_reply.js <tabPrefix> <postUrl> '<reply>'   (env NOLIKE=1 이면 좋아요 생략, DRYRUN=1 이면 입력까지만)
// 같은 창(탭)을 재사용해야 백그라운드 탭 멈춤이 덜하다. 탭은 hellonunchi 컨텍스트의 별도 창.
const http = require("http");
const get = u => new Promise((res, rej) => http.get(u, r => { let d = ""; r.on("data", c => d += c); r.on("end", () => res(JSON.parse(d))); }).on("error", rej));
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const [tid, url, ...rest] = process.argv.slice(2); const reply = rest.join(" ").replace(/\\n/g, "\n");
  const t = (await get("http://127.0.0.1:9222/json/list")).find(x => x.id.startsWith(tid)); if (!t) throw new Error("tab not found");
  const ws = new WebSocket(t.webSocketDebuggerUrl); let id = 0; const P = {};
  await new Promise(r => ws.onopen = r); ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && P[m.id]) { P[m.id](m); delete P[m.id]; } };
  const send = (method, params = {}) => Promise.race([new Promise(r => { const i = ++id; P[i] = r; ws.send(JSON.stringify({ id: i, method, params })); }), sleep(20000).then(() => ({ timeout: method }))]);
  const ev = async x => { const r = await send("Runtime.evaluate", { expression: x, returnByValue: true, awaitPromise: true }); if (r.timeout) throw new Error("eval timeout"); return r.result.result.value; };
  const tap = async (x, y) => { for (const type of ["mouseMoved", "mousePressed", "mouseReleased"]) await send("Input.dispatchMouseEvent", { type, x, y, button: "left", clickCount: 1 }); };
  const center = sel => ev(`(()=>{const e=${sel}; if(!e) return null; e.scrollIntoView({block:'center'}); const r=e.getBoundingClientRect(); return [r.x+r.width/2,r.y+r.height/2]})()`);
  await send("Page.enable"); await send("Page.bringToFront"); await send("Emulation.setFocusEmulationEnabled", { enabled: true }); // 창이 뒤에 있으면 전송 클릭이 무시됨
  const onMsg = ws.onmessage; ws.onmessage = e => { const m = JSON.parse(e.data); if (m.method === "Page.javascriptDialogOpening") send("Page.handleJavaScriptDialog", { accept: true }); onMsg(e); };
  await send("Page.navigate", { url }); await sleep(6000);
  const me = await ev(`[...document.querySelectorAll('a[href^="/@"]')].map(a=>a.getAttribute('href')).find(h=>/hellonunchi/.test(h))||''`);
  if (!/hellonunchi/.test(me)) throw new Error("not logged in as hellonunchi");
  // 이미 내가 답글 단 글이면 건너뜀
  if (await ev(`[...document.querySelectorAll('a[href="/@hellonunchi"]')].length > 3`)) { console.log("SKIP: already replied?"); }
  // 첫 게시물(원글)의 좋아요
  if (!process.env.NOLIKE) {
    const p = await center(`([...${"[...document.querySelectorAll('[data-pressable-container]')][0].querySelectorAll('svg')"}].find(s=>(s.getAttribute('aria-label')||s.querySelector('title')?.textContent)==='좋아요')||{}).closest?.('[role=button]')`);
    if (p) { await tap(p[0], p[1]); await sleep(1200); console.log("liked"); }
  }
  // 상세 페이지 하단의 인라인 답글 입력창 사용 (없으면 '답글' 아이콘 → 다이얼로그)
  let inline = true;
  let p = await center(`[...document.querySelectorAll('[contenteditable=true]')].find(e=>!e.closest('[role=dialog]'))`);
  if (!p) { inline = false;
    p = await center(`([...[...document.querySelectorAll('[data-pressable-container]')][0].querySelectorAll('svg')].find(s=>(s.getAttribute('aria-label')||s.querySelector('title')?.textContent)==='답글')||{}).closest?.('[role=button]')`);
    if (!p) throw new Error("no reply button"); }
  await tap(p[0], p[1]); await sleep(1500);
  const ok = await ev(`(()=>{const ce=[...document.querySelectorAll('[contenteditable=true]')].find(e=>${inline ? "!e.closest('[role=dialog]')" : "e.closest('[role=dialog]')"}); if(!ce) return false; ce.focus(); return true})()`);
  if (!ok) throw new Error("no reply editor");
  const scope = inline ? "document" : "document.querySelector('[role=dialog]')";
  const lines = reply.split("\n");
  for (let i = 0; i < lines.length; i++) { if (lines[i]) await send("Input.insertText", { text: lines[i] }); if (i < lines.length - 1) { await send("Input.dispatchKeyEvent", { type: "keyDown", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13, text: "\r", modifiers: 8 }); await send("Input.dispatchKeyEvent", { type: "keyUp", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13, modifiers: 8 }); } }
  await sleep(800);
  const typed = await ev(`[...document.querySelectorAll('[contenteditable=true]')].map(e=>e.innerText).find(x=>x.trim())||''`);
  console.log("typed:", JSON.stringify(typed.slice(0, 80)));
  if (process.env.DRYRUN) { console.log("DRYRUN stop"); ws.close(); return; }
  p = inline
    ? await center(`(()=>{const ce=[...document.querySelectorAll('[contenteditable=true]')].find(e=>!e.closest('[role=dialog]')&&e.innerText.trim()); const r=ce.getBoundingClientRect(); return [...document.querySelectorAll('[role=button]')].filter(b=>[...b.querySelectorAll('svg')].some(s=>(s.querySelector('title')?.textContent||s.getAttribute('aria-label'))==='답글')).filter(b=>{const q=b.getBoundingClientRect(); return q.x>r.x+r.width-10 && q.y>r.y-20 && q.y<r.y+r.height+60}).pop()})()`)
    : await center(`[...${scope}.querySelectorAll('[role=button]')].find(e=>e.offsetParent&&e.innerText.trim()==='게시'&&e.getAttribute('aria-disabled')!=='true')`);
  if (!p) throw new Error("no post button"); await tap(p[0], p[1]);
  let done = false; for (let i = 0; i < 10; i++) { await sleep(2000); const st = await ev(`({dialog:[...document.querySelectorAll('[contenteditable=true]')].some(e=>e.innerText.trim().length>5), toast:[...document.querySelectorAll('[role=alert],[role=status]')].map(e=>e.innerText.trim()).filter(Boolean).slice(0,2)})`); if (!st.dialog) { console.log("posted", JSON.stringify(st.toast)); done = true; break; } }
  if (!done) throw new Error("post not confirmed (text still in editor)");
  ws.close();
})().catch(e => { console.error("ERR", e.message); process.exit(1); });

// Search Console 색인 생성 요청 자동화: node gsc_index.js <targetId> <url1> <url2> ...   (속성 페이지가 열린 로그인 탭)
const http = require("http");
const get = u => new Promise((res, rej) => http.get(u, r => { let d = ""; r.on("data", c => d += c); r.on("end", () => res(JSON.parse(d))); }).on("error", rej));
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const [tid, ...urls] = process.argv.slice(2);
  const t = (await get("http://127.0.0.1:9222/json/list")).find(x => x.id.startsWith(tid)); const ws = new WebSocket(t.webSocketDebuggerUrl); let id = 0; const p = {};
  await new Promise(r => ws.onopen = r); ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && p[m.id]) { p[m.id](m); delete p[m.id]; } };
  const send = (method, params = {}) => new Promise(r => { const i = ++id; p[i] = r; ws.send(JSON.stringify({ id: i, method, params })); });
  const ev = async expr => { const r = await send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true }); if (r.result.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description); return r.result.result.value; };
  const tap = async (x, y) => { for (const type of ["mouseMoved", "mousePressed", "mouseReleased"]) await send("Input.dispatchMouseEvent", { type, x, y, button: "left", clickCount: 1 }); };
  const key = async (k, code, vk, mods = 0, extra = {}) => { await send("Input.dispatchKeyEvent", { type: "keyDown", key: k, code, windowsVirtualKeyCode: vk, modifiers: mods, ...extra }); await send("Input.dispatchKeyEvent", { type: "keyUp", key: k, code, windowsVirtualKeyCode: vk, modifiers: mods }); };
  const leafPos = txt => ev(`(()=>{const l=[...document.querySelectorAll('*')].find(e=>e.offsetParent&&e.children.length===0&&e.textContent.trim()===${JSON.stringify(txt)}); if(!l) return null; const b=l.closest('[role=button],button')||l; b.scrollIntoView({block:'center'}); const r=b.getBoundingClientRect(); return [r.x+r.width/2,r.y+r.height/2]})()`);
  const waitFor = async (fn, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { const v = await fn(); if (v) return v; await sleep(2000); } return null; };
  for (const url of urls) {
    // 열린 다이얼로그 닫기
    let c = await leafPos("닫기"); if (c) { await tap(c[0], c[1]); await sleep(1000); }
    const box = await ev(`(()=>{const i=[...document.querySelectorAll('input[type=text]')].find(e=>e.offsetParent&&/URL 검사/.test(e.getAttribute('aria-label')||e.placeholder||'')); if(!i) return null; i.focus(); const r=i.getBoundingClientRect(); return [r.x+r.width/2,r.y+r.height/2]})()`);
    if (!box) { console.log("no search box"); break; }
    await tap(box[0], box[1]); await sleep(400); await key("a", "KeyA", 65, 4, { commands: ["selectAll"] }); await key("Backspace", "Backspace", 8);
    await send("Input.insertText", { text: url }); await key("Enter", "Enter", 13, 0, { text: "\r" });
    const btn = await waitFor(() => leafPos("색인 생성 요청"), 60000);
    if (!btn) { console.log("NO BUTTON:", url, "|", (await ev("document.body.innerText")).match(/URL이 Google에[^\n]*|오류[^\n]*|할당량[^\n]*/)?.[0]); continue; }
    const status = (await ev("document.body.innerText")).match(/URL이 Google에[^\n]*/)?.[0] || "";
    await tap(btn[0], btn[1]);
    const res = await waitFor(async () => { const t = await ev(`[...document.querySelectorAll('[role=dialog],[role=alertdialog]')].map(d=>d.innerText).join('\\n')`); const m = t.match(/색인 생성 요청됨|이미 제출|할당량[^\n]*|오류[^\n]*|요청이 거부[^\n]*/); return m && m[0]; }, 90000);
    console.log(url.replace("https://hellonunchi.com", ""), "|", status, "→", res || "timeout");
    c = await leafPos("닫기"); if (c) { await tap(c[0], c[1]); } await sleep(1500);
  }
  ws.close();
})().catch(e => { console.error("ERR", e.message); process.exit(1); });

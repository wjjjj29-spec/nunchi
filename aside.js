#!/usr/bin/env node
// Aside(Chrome) 직접 제어 헬퍼 — MCP 연결이 끊겼을 때 사용. 의존성 없음(Node 22+ 내장 WebSocket, DevTools 포트 9222).
//  node aside.js list                         탭·iframe 타깃 목록
//  node aside.js open <url>                   새 탭
//  node aside.js goto <key> <url>             탭 이동
//  node aside.js eval <key> <js>              JS 실행(표현식/await 가능), 결과 JSON
//  node aside.js click <key> <cssSelector>    클릭
//  key = 목록의 번호 또는 URL 일부. iframe 타깃도 key로 지정 가능(cross-origin 프레임 안에서 실행).
const http = require("http");
const get = u => new Promise((res, rej) => http.get(u, r => { let d = ""; r.on("data", c => d += c); r.on("end", () => res(JSON.parse(d))); }).on("error", rej));
const put = u => new Promise((res, rej) => { const r = http.request(u, { method: "PUT" }, r => { let d = ""; r.on("data", c => d += c); r.on("end", () => res(d)); }); r.on("error", rej); r.end(); });
async function cdp(wsUrl) {
  const ws = new WebSocket(wsUrl); let id = 0; const pending = {};
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pending[m.id]) { pending[m.id](m); delete pending[m.id]; } };
  const send = (method, params = {}) => new Promise(res => { const i = ++id; pending[i] = res; ws.send(JSON.stringify({ id: i, method, params })); });
  return { send, close: () => ws.close() };
}
(async () => {
  const [cmd, a, ...rest] = process.argv.slice(2);
  const targets = (await get("http://127.0.0.1:9222/json/list")).filter(t => t.type === "page" || t.type === "iframe");
  const pick = key => /^\d+$/.test(key) ? targets[+key] : /^[0-9A-F]{8,}$/.test(key) ? targets.find(t => t.id.startsWith(key)) : targets.find(t => t.url.includes(key)); // key: 번호 | targetId 앞자리(대문자 hex) | URL 일부
  if (cmd === "list") { targets.forEach((t, i) => console.log(i, t.id.slice(0, 8), t.type.padEnd(6), (t.title || "").slice(0, 40).padEnd(40), t.url.slice(0, 100))); return; }
  if (cmd === "newctx") { // 별도 쿠키 저장소(시크릿 창처럼)로 새 창 열기 — 기존 로그인 세션을 건드리지 않고 다른 계정 로그인용
    const ver = await get("http://127.0.0.1:9222/json/version"); const c = await cdp(ver.webSocketDebuggerUrl);
    const ctx = await c.send("Target.createBrowserContext"); const t = await c.send("Target.createTarget", { url: a, browserContextId: ctx.result.browserContextId, newWindow: true });
    console.log("opened in new context", t.result.targetId); c.close(); return; }
  if (cmd === "openctx") { // 특정 브라우저 컨텍스트(list의 ctx id)에 새 탭: node aside.js openctx <browserContextId> <url>
    const ver = await get("http://127.0.0.1:9222/json/version"); const c = await cdp(ver.webSocketDebuggerUrl);
    const t = await c.send("Target.createTarget", { url: rest[0], browserContextId: a }); console.log("opened", t.result.targetId); c.close(); return; }
  if (cmd === "open") { const t = await put("http://127.0.0.1:9222/json/new?" + encodeURIComponent(a)); console.log("opened", t.slice(0, 200)); return; }
  const t = pick(a); if (!t) { console.error("target not found:", a); process.exit(1); }
  const c = await cdp(t.webSocketDebuggerUrl);
  try {
    if (cmd === "goto") { await c.send("Page.enable"); await c.send("Page.navigate", { url: rest[0] }); await new Promise(r => setTimeout(r, 2500)); const r = await c.send("Runtime.evaluate", { expression: "location.href", returnByValue: true }); console.log("now at", r.result.result.value); }
    else if (cmd === "eval") { const r = await c.send("Runtime.evaluate", { expression: rest.join(" "), awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) console.log("EXC", JSON.stringify(r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text)); else console.log(JSON.stringify(r.result.result.value, null, 1)); }
    else if (cmd === "click") { const js = `(()=>{const e=document.querySelector(${JSON.stringify(rest[0])}); if(!e) return "not found"; e.scrollIntoView({block:"center"}); e.click(); return "clicked "+(e.innerText||e.value||"").trim().slice(0,40);})()`; const r = await c.send("Runtime.evaluate", { expression: js, returnByValue: true }); console.log(r.result.result.value); }
    else if (cmd === "tap") { // 실제 마우스 이벤트 클릭 (Google 등 합성 click을 무시하는 페이지용)
      const js = `(()=>{const e=document.querySelector(${JSON.stringify(rest[0])}); if(!e) return null; e.scrollIntoView({block:"center"}); const r=e.getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2};})()`;
      const r = await c.send("Runtime.evaluate", { expression: js, returnByValue: true }); const p = r.result.result.value; if (!p) { console.log("not found"); return; }
      await c.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: p.x, y: p.y }); await c.send("Input.dispatchMouseEvent", { type: "mousePressed", x: p.x, y: p.y, button: "left", clickCount: 1 }); await c.send("Input.dispatchMouseEvent", { type: "mouseReleased", x: p.x, y: p.y, button: "left", clickCount: 1 }); console.log("tapped", p); }
    else if (cmd === "upload") { // 파일 입력에 로컬 파일 지정: node aside.js upload <key> <cssSelector> <absPath>
      await c.send("DOM.enable"); const doc = await c.send("DOM.getDocument", { depth: 0 }); const q = await c.send("DOM.querySelector", { nodeId: doc.result.root.nodeId, selector: rest[0] });
      if (!q.result.nodeId) { console.log("input not found"); return; } const r = await c.send("DOM.setFileInputFiles", { nodeId: q.result.nodeId, files: [rest[1]] }); console.log(r.error ? "ERR " + JSON.stringify(r.error) : "file set: " + rest[1]); }
    else if (cmd === "type") { // 실제 키 입력처럼 텍스트 삽입(포커스된 요소에): node aside.js type <key> <text>  (\n = 줄바꿈)
      const text = rest.join(" ").replace(/\\n/g, "\n"); for (const line of text.split("\n")) { if (line) await c.send("Input.insertText", { text: line }); if (line !== text.split("\n").at(-1)) { await c.send("Input.dispatchKeyEvent", { type: "keyDown", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13, text: "\r" }); await c.send("Input.dispatchKeyEvent", { type: "keyUp", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13 }); } } console.log("typed", text.length); }
    else if (cmd === "key") { // 키 입력: node aside.js key <key> <KeyName> [mod]  예) key 0 a cmd / key 0 Backspace
      const k = rest[0], mods = (rest[1] || "").split("+").filter(Boolean); const m = mods.reduce((n, x) => n | ({ alt: 1, ctrl: 2, cmd: 4, meta: 4, shift: 8 }[x] || 0), 0);
      const codes = { Backspace: 8, Enter: 13, Escape: 27, Tab: 9, a: 65 }; const vk = codes[k] || k.toUpperCase().charCodeAt(0);
      await c.send("Input.dispatchKeyEvent", { type: "keyDown", key: k, code: k.length === 1 ? "Key" + k.toUpperCase() : k, windowsVirtualKeyCode: vk, modifiers: m, commands: (k === "a" && m === 4) ? ["selectAll"] : undefined });
      await c.send("Input.dispatchKeyEvent", { type: "keyUp", key: k, code: k.length === 1 ? "Key" + k.toUpperCase() : k, windowsVirtualKeyCode: vk, modifiers: m }); console.log("key", k, mods.join("+")); }
    else if (cmd === "dialog") { // 떠 있는 JS 다이얼로그(페이지 나가기 확인 등) 처리: node aside.js dialog <key> accept|dismiss
      const r = await c.send("Page.handleJavaScriptDialog", { accept: rest[0] === "accept" }); console.log(r.error ? "no dialog: " + r.error.message : "dialog " + rest[0]); }
    else if (cmd === "hover") { const x = +rest[0], y = +rest[1]; await c.send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y }); console.log("hover", x, y); }
    else if (cmd === "shot") { // 스크린샷 저장: node aside.js shot <key> <outPath>
      const r = await c.send("Page.captureScreenshot", { format: "jpeg", quality: 60 }); require("fs").writeFileSync(rest[0], Buffer.from(r.result.data, "base64")); console.log("saved", rest[0]); }
    else if (cmd === "tapxy") { const x = +rest[0], y = +rest[1]; await c.send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y }); await c.send("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", clickCount: 1 }); await c.send("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", clickCount: 1 }); console.log("tapped", x, y); }
    else console.log("unknown command");
  } finally { c.close(); }
})().catch(e => { console.error("ERR", e.message); process.exit(1); });

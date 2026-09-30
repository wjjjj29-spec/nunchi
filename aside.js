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
  const pick = key => /^\d+$/.test(key) ? targets[+key] : targets.find(t => t.url.includes(key));
  if (cmd === "list") { targets.forEach((t, i) => console.log(i, t.type.padEnd(6), (t.title || "").slice(0, 40).padEnd(40), t.url.slice(0, 100))); return; }
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
    else if (cmd === "tapxy") { const x = +rest[0], y = +rest[1]; await c.send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y }); await c.send("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", clickCount: 1 }); await c.send("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", clickCount: 1 }); console.log("tapped", x, y); }
    else console.log("unknown command");
  } finally { c.close(); }
})().catch(e => { console.error("ERR", e.message); process.exit(1); });

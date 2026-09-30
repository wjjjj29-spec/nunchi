// Threads 프로필 소개 입력: node threads_bio.js <targetId> "<bio, \n 줄바꿈>"
const http = require("http");
const get = u => new Promise((res, rej) => http.get(u, r => { let d = ""; r.on("data", c => d += c); r.on("end", () => res(JSON.parse(d))); }).on("error", rej));
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const [tid, ...rest] = process.argv.slice(2); const bio = rest.join(" ").replace(/\\n/g, "\n");
  const t = (await get("http://127.0.0.1:9222/json/list")).find(x => x.id.startsWith(tid)); const ws = new WebSocket(t.webSocketDebuggerUrl); let id = 0; const p = {};
  await new Promise(r => ws.onopen = r); ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && p[m.id]) { p[m.id](m); delete p[m.id]; } };
  const send = (method, params = {}) => new Promise(r => { const i = ++id; p[i] = r; ws.send(JSON.stringify({ id: i, method, params })); });
  const ev = async expr => { const r = await send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true }); if (r.result.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description); return r.result.result.value; };
  const tap = async (x, y) => { for (const type of ["mouseMoved", "mousePressed", "mouseReleased"]) await send("Input.dispatchMouseEvent", { type, x, y, button: "left", clickCount: 1 }); };
  const clickText = async (re, scope = "document", last = false) => { const pos = await ev(`(()=>{const s=${scope}; if(!s) return null; const els=[...s.querySelectorAll('[role=button],div[tabindex],button')].filter(e=>e.offsetParent&&${re}.test(e.innerText.trim())); const e=${last ? "els.pop()" : "els[0]"}; if(!e) return null; e.scrollIntoView({block:'center'}); const r=e.getBoundingClientRect(); return [r.x+r.width/2,r.y+r.height/2]})()`); if (!pos) throw new Error("no button " + re); await tap(pos[0], pos[1]); return pos; };
  await send("Page.enable"); await send("Page.navigate", { url: "https://www.threads.com/@hellonunchi" }); await sleep(6000);
  await clickText("/^프로필 편집$/"); await sleep(2500);
  const D = "document.querySelector('[role=dialog]')";
  await clickText("/^소개/", D); await sleep(1500);
  const ph = await ev(`document.activeElement.placeholder||document.activeElement.tagName`); console.log("focused:", ph);
  await send("Input.dispatchKeyEvent", { type: "keyDown", key: "a", code: "KeyA", modifiers: 4, commands: ["selectAll"] }); await send("Input.dispatchKeyEvent", { type: "keyUp", key: "a", code: "KeyA", modifiers: 4 });
  await send("Input.dispatchKeyEvent", { type: "keyDown", key: "Backspace", code: "Backspace", windowsVirtualKeyCode: 8 }); await send("Input.dispatchKeyEvent", { type: "keyUp", key: "Backspace", code: "Backspace", windowsVirtualKeyCode: 8 });
  for (const [i, line] of bio.split("\n").entries()) { if (line) await send("Input.insertText", { text: line }); if (i < bio.split("\n").length - 1) { await send("Input.dispatchKeyEvent", { type: "keyDown", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13, text: "\r" }); await send("Input.dispatchKeyEvent", { type: "keyUp", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13 }); } }
  console.log("len:", await ev(`${D}.querySelector('textarea').value.length`));
  await clickText("/^완료$/", D); await sleep(1500);
  console.log("dialog now:", (await ev(`${D}.innerText`)).replace(/\n+/g, " | ").slice(0, 120));
  await clickText("/^완료$/", D, true); await sleep(4000);
  await send("Page.navigate", { url: "https://www.threads.com/@hellonunchi" }); await sleep(6000);
  console.log("profile:", (await ev(`(()=>{const t=document.body.innerText; const i=t.indexOf('Nunchi 눈치'); return t.slice(i,i+220)})()`)).replace(/\n+/g, " | "));
  ws.close();
})().catch(e => { console.error("ERR", e.message); process.exit(1); });

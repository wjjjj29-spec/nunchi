// 레딧 설정 모달 편집: node rd_profile.js <tab> <rowLabel> <newValue>
const http = require("http");
const get = u => new Promise((res, rej) => http.get(u, r => { let d = ""; r.on("data", c => d += c); r.on("end", () => res(JSON.parse(d))); }).on("error", rej));
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const [tid, label, ...v] = process.argv.slice(2); const value = v.join(" ");
  const t = (await get("http://127.0.0.1:9222/json/list")).find(x => x.id.startsWith(tid)); const ws = new WebSocket(t.webSocketDebuggerUrl); let id = 0; const p = {};
  await new Promise(r => ws.onopen = r); ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && p[m.id]) { p[m.id](m); delete p[m.id]; } };
  const send = (method, params = {}) => new Promise(r => { const i = ++id; p[i] = r; ws.send(JSON.stringify({ id: i, method, params })); });
  const ev = async expr => { const r = await send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true }); if (r.result.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description); return r.result.result.value; };
  const tap = async (x, y) => { for (const type of ["mouseMoved", "mousePressed", "mouseReleased"]) await send("Input.dispatchMouseEvent", { type, x, y, button: "left", clickCount: 1 }); };
  const DEEP = `const deep=(root,acc=[])=>{for(const e of root.querySelectorAll('*')){acc.push(e); if(e.shadowRoot) deep(e.shadowRoot,acc);} return acc;}; const vis=e=>e.getClientRects().length>0;`;
  await send("Page.bringToFront"); await send("Emulation.setFocusEmulationEnabled", { enabled: true });
  // 1) 행의 라벨 → 같은 행(li / 가까운 조상) 안의 버튼/anchor 클릭
  const row = await ev(`(()=>{${DEEP} const b=deep(document).find(e=>e.tagName==='BUTTON'&&vis(e)&&(e.getAttribute('aria-label')||'').includes(${JSON.stringify(label)})); if(!b) return null; b.scrollIntoView({block:'center'}); const q=b.getBoundingClientRect(); return {btn:b.getAttribute('aria-label'), x:q.x+q.width/2, y:q.y+q.height/2, rowRight:q.x+q.width/2, rowY:q.y+q.height/2}})()`);
  console.log("row", JSON.stringify(row)); if (!row) process.exit(1);
  await tap(row.x, row.y); await sleep(1500);
  let dlg = await ev(`(()=>{${DEEP} const d=deep(document).filter(e=>vis(e)&&(/dialog/i.test(e.getAttribute('role')||'')||/DIALOG/.test(e.tagName))); return d.length})()`);
  if (!dlg) { await tap(row.rowRight, row.rowY); await sleep(1500); dlg = await ev(`(()=>{${DEEP} return deep(document).filter(e=>vis(e)&&(/dialog/i.test(e.getAttribute('role')||'')||/DIALOG/.test(e.tagName))).length})()`); }
  console.log("dialogs", dlg); if (!dlg) { console.log("no dialog"); process.exit(1); }
  // 2) 다이얼로그 안 input/textarea
  const f = await ev(`(()=>{${DEEP} const f=deep(document).find(e=>/^(INPUT|TEXTAREA)$/.test(e.tagName)&&vis(e)&&e.type!=='hidden'&&e.getBoundingClientRect().y>80); if(!f) return null; f.focus(); const r=f.getBoundingClientRect(); return {tag:f.tagName, val:f.value, x:r.x+r.width/2, y:r.y+r.height/2}})()`);
  console.log("field", JSON.stringify(f)); if (!f) process.exit(1);
  await tap(f.x, f.y); await sleep(200);
  await send("Input.dispatchKeyEvent", { type: "keyDown", key: "a", code: "KeyA", modifiers: 4, commands: ["selectAll"] }); await send("Input.dispatchKeyEvent", { type: "keyUp", key: "a", code: "KeyA", modifiers: 4 });
  await send("Input.dispatchKeyEvent", { type: "keyDown", key: "Backspace", code: "Backspace", windowsVirtualKeyCode: 8 }); await send("Input.dispatchKeyEvent", { type: "keyUp", key: "Backspace", code: "Backspace", windowsVirtualKeyCode: 8 });
  await send("Input.insertText", { text: value }); await sleep(500);
  console.log("now", await ev(`(()=>{${DEEP} const f=deep(document).find(e=>/^(INPUT|TEXTAREA)$/.test(e.tagName)&&vis(e)&&e.type!=='hidden'&&e.getBoundingClientRect().y>80); return f&&f.value})()`));
  // 3) 저장 버튼
  const s = await ev(`(()=>{${DEEP} const b=deep(document).find(e=>e.tagName==='BUTTON'&&vis(e)&&/^(저장|Save)$/.test((e.innerText||'').trim())); if(!b) return {names:deep(document).filter(e=>e.tagName==='BUTTON'&&vis(e)).map(e=>(e.innerText||e.getAttribute('aria-label')||'').trim())}; const r=b.getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2,disabled:b.disabled}})()`);
  console.log("save", JSON.stringify(s)); if (s.x) { await tap(s.x, s.y); await sleep(2500); }
  await send("Page.reload"); await sleep(5000);
  console.log("after:", await ev(`(()=>{${DEEP} return deep(document).filter(e=>vis(e)&&e.children.length===0&&/^(SPAN|P|DIV)$/.test(e.tagName)).map(e=>(e.innerText||'').trim()).filter(t=>t&&t.length<120).slice(0,25).join(' | ')})()`));
  ws.close();
})().catch(e => { console.error("ERR", e.message); process.exit(1); });

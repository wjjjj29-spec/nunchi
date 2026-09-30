// 레딧 설정 페이지(shadow DOM) 조작 헬퍼: node reddit_helper.js <targetId> <cmd> [args]
//  find <text>          텍스트/aria-label로 요소 중심 좌표 (shadow DOM 관통)
//  click <text>         찾아서 실제 클릭
//  fill <sel-text> <v>  모달 안 input/textarea에 값 입력(실제 키 입력)
//  dump                 모달(dialog) 안 보이는 텍스트·입력·버튼
const http = require("http");
const get = u => new Promise((res, rej) => http.get(u, r => { let d = ""; r.on("data", c => d += c); r.on("end", () => res(JSON.parse(d))); }).on("error", rej));
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const [tid, cmd, ...rest] = process.argv.slice(2);
  const t = (await get("http://127.0.0.1:9222/json/list")).find(x => x.id.startsWith(tid)); const ws = new WebSocket(t.webSocketDebuggerUrl); let id = 0; const p = {};
  await new Promise(r => ws.onopen = r); ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && p[m.id]) { p[m.id](m); delete p[m.id]; } };
  const send = (method, params = {}) => new Promise(r => { const i = ++id; p[i] = r; ws.send(JSON.stringify({ id: i, method, params })); });
  const ev = async expr => { const r = await send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true }); if (r.result.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description); return r.result.result.value; };
  const tap = async (x, y) => { for (const type of ["mouseMoved", "mousePressed", "mouseReleased"]) await send("Input.dispatchMouseEvent", { type, x, y, button: "left", clickCount: 1 }); };
  const DEEP = `const deep=(root,acc=[])=>{for(const e of root.querySelectorAll('*')){acc.push(e); if(e.shadowRoot) deep(e.shadowRoot,acc);} return acc;};`;
  const findJS = txt => `(()=>{${DEEP} const q=${JSON.stringify(txt)}; const els=deep(document).filter(e=>/^(BUTTON|A|INPUT|TEXTAREA|LABEL|SPAN|DIV|LI|FACEPLATE-TRACKER|SHREDDIT-.*)$/.test(e.tagName)&&e.getClientRects().length&&((e.getAttribute('aria-label')||'')===q||(e.innerText||'').trim()===q||(e.getAttribute('placeholder')||'')===q||(e.getAttribute('name')||'')===q)); const e=els.find(x=>/^(BUTTON|A|INPUT|TEXTAREA)$/.test(x.tagName))||els[0]; if(!e) return null; e.scrollIntoView({block:'center'}); const r=e.getBoundingClientRect(); return {tag:e.tagName, x:r.x+r.width/2, y:r.y+r.height/2}})()`;
  if (cmd === "find") console.log(JSON.stringify(await ev(findJS(rest.join(" ")))));
  else if (cmd === "click") { const r = await ev(findJS(rest.join(" "))); if (!r) { console.log("not found"); process.exit(1); } await tap(r.x, r.y); console.log("clicked", r.tag, Math.round(r.x), Math.round(r.y)); }
  else if (cmd === "fill") { const [sel, ...v] = rest; const r = await ev(findJS(sel)); if (!r) { console.log("input not found"); process.exit(1); } await tap(r.x, r.y); await sleep(200);
    await ev(`(()=>{${DEEP} const e=deep(document).find(e=>/^(INPUT|TEXTAREA)$/.test(e.tagName)&&e.getClientRects().length&&(e.getAttribute('aria-label')===${JSON.stringify(sel)}||e.getAttribute('placeholder')===${JSON.stringify(sel)}||e.getAttribute('name')===${JSON.stringify(sel)})); if(e){e.focus(); e.select&&e.select();}})()`);
    await send("Input.dispatchKeyEvent", { type: "keyDown", key: "a", code: "KeyA", modifiers: 4, commands: ["selectAll"] }); await send("Input.dispatchKeyEvent", { type: "keyUp", key: "a", code: "KeyA", modifiers: 4 });
    await send("Input.dispatchKeyEvent", { type: "keyDown", key: "Backspace", code: "Backspace", windowsVirtualKeyCode: 8 }); await send("Input.dispatchKeyEvent", { type: "keyUp", key: "Backspace", code: "Backspace", windowsVirtualKeyCode: 8 });
    await send("Input.insertText", { text: v.join(" ") }); console.log("filled", sel); }
  else if (cmd === "upload") { // shadow DOM 안 file input에 파일 지정: upload <absPath>
    const r = await send("Runtime.evaluate", { expression: `(()=>{${DEEP} return deep(document).filter(e=>e.tagName==='INPUT'&&e.type==='file').pop()})()` });
    const oid = r.result.result.objectId; if (!oid) { console.log("no file input"); process.exit(1); }
    const x = await send("DOM.setFileInputFiles", { objectId: oid, files: [rest[0]] }); console.log(x.error ? "ERR " + x.error.message : "file set"); }
  else if (cmd === "dump") console.log(JSON.stringify(await ev(`(()=>{${DEEP} const all=deep(document); const dlg=all.filter(e=>/dialog/i.test(e.getAttribute('role')||'')||/DIALOG|MODAL/.test(e.tagName)).filter(e=>e.getClientRects().length); const scope=dlg.length?deep(dlg[dlg.length-1]):all; const items=[]; for(const e of scope){ if(!e.getClientRects().length) continue; if(/^(INPUT|TEXTAREA)$/.test(e.tagName)) items.push('IN:'+e.tagName+':'+(e.getAttribute('aria-label')||e.placeholder||e.name||'')+'='+(e.value||'').slice(0,40)); else if(/^(BUTTON|A)$/.test(e.tagName)) items.push('BTN:'+((e.innerText||e.getAttribute('aria-label')||'').trim().slice(0,30))); else if(/^(H1|H2|H3|P|LABEL|SPAN)$/.test(e.tagName)&&e.children.length===0){const t=(e.innerText||'').trim(); if(t&&t.length<120) items.push('T:'+t);} } return {dialogs:dlg.length, items:[...new Set(items)].slice(0,40)}})()`), null, 1));
  ws.close();
})().catch(e => { console.error("ERR", e.message); process.exit(1); });

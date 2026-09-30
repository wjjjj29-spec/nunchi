// Threads 예약 게시: node threads_schedule.js <targetId앞자리> <posts.json> [startIndex] [endIndex]
// posts.json: [{date:"2026-10-01", time:"21:00", text, image, reply}]  reply는 같은 스레드의 두 번째 글(링크용)로 붙는다.
const http = require("http"); const fs = require("fs");
const get = u => new Promise((res, rej) => http.get(u, r => { let d = ""; r.on("data", c => d += c); r.on("end", () => res(JSON.parse(d))); }).on("error", rej));
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function cdp(wsUrl) { const ws = new WebSocket(wsUrl); let id = 0; const p = {}; await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && p[m.id]) { p[m.id](m); delete p[m.id]; } };
  const send = (method, params = {}) => Promise.race([new Promise(r => { const i = ++id; p[i] = r; ws.send(JSON.stringify({ id: i, method, params })); }), sleep(20000).then(() => ({ timeout: method }))]);
  return { send, close: () => ws.close() }; }
(async () => {
  const [tid, file, s = "0", e = "99"] = process.argv.slice(2); const posts = JSON.parse(fs.readFileSync(file, "utf8")).slice(+s, +e + 1);
  const t = (await get("http://127.0.0.1:9222/json/list")).find(x => x.id.startsWith(tid)); if (!t) throw new Error("tab not found"); const c = await cdp(t.webSocketDebuggerUrl);
  const ev = async expr => { const r = await c.send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true }); if (r.timeout) throw new Error("eval timeout"); if (r.result.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description || "eval error"); return r.result.result.value; };
  const tap = async (x, y) => { for (const type of ["mouseMoved", "mousePressed", "mouseReleased"]) await c.send("Input.dispatchMouseEvent", { type, x, y, button: "left", clickCount: 1 }); };
  const center = async (js) => { const p = await ev(`(()=>{const e=(${js}); if(!e) return null; e.scrollIntoView({block:'center'}); const r=e.getBoundingClientRect(); return [r.x+r.width/2, r.y+r.height/2]})()`); await sleep(300); return p; };
  const clickText = async (txt, scope = "document") => { const p = await center(`[...${scope}.querySelectorAll('[role=button],[role=menuitem],div[tabindex],button')].find(e=>e.offsetParent&&e.innerText.trim()===${JSON.stringify(txt)})`); if (!p) throw new Error("no button " + txt); await tap(p[0], p[1]); return p; };
  const typeText = async text => { const lines = text.split("\n"); for (let i = 0; i < lines.length; i++) { if (lines[i]) await c.send("Input.insertText", { text: lines[i] }); if (i < lines.length - 1) { await c.send("Input.dispatchKeyEvent", { type: "keyDown", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13, text: "\r" }); await c.send("Input.dispatchKeyEvent", { type: "keyUp", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13 }); } } };
  const D = "document.querySelector('[role=dialog]')";
  for (const post of posts) {
    console.log("\n==", post.date, post.time, post.text.slice(0, 40));
    if (process.env.RESUME && await ev(`!!document.querySelector('[role=gridcell]')`)) { console.log("resume from calendar"); } else {
    await ev("window.scrollTo(0,0)");
    if (await ev(`!!${D}`)) { // 남아 있는 작성창 정리: 취소 → 삭제 확인
      for (let i = 0; i < 3 && await ev(`!!${D}`); i++) { const p = await center(`(()=>{const b=[...document.querySelectorAll('[role=dialog] [role=button],[role=dialog] button')].filter(e=>e.offsetParent); return b.find(e=>/^(저장 안 함|삭제|버리기)$/.test(e.innerText.trim())) || b.find(e=>e.innerText.trim()==='취소')})()`); if (!p) { await c.send("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 }); await c.send("Input.dispatchKeyEvent", { type: "keyUp", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 }); } else await tap(p[0], p[1]); await sleep(1200); }
      console.log("cleared old dialog:", !await ev(`!!${D}`)); }
    await clickText("새로운 스레드"); await sleep(2000);
    if (!await ev(`(()=>{const ce=${D}.querySelector('[contenteditable=true]'); if(!ce) return false; ce.focus(); return true})()`)) throw new Error("no editor");
    await typeText(post.text);
    if (post.image) { await c.send("DOM.enable"); const doc = await c.send("DOM.getDocument", { depth: 0 }); const q = await c.send("DOM.querySelector", { nodeId: doc.result.root.nodeId, selector: "[role=dialog] input[type=file]" }); await c.send("DOM.setFileInputFiles", { nodeId: q.result.nodeId, files: [post.image] }); await sleep(3500); }
    if (post.reply) { await clickText("스레드에 추가", D); await sleep(1200);
      const ok = await ev(`(()=>{const ces=[...${D}.querySelectorAll('[contenteditable=true]')]; const ce=ces[ces.length-1]; if(ces.length<2) return false; ce.focus(); return true})()`); if (!ok) throw new Error("no second editor"); await c.send("Input.insertText", { text: post.reply }); await sleep(500); }
    // 예약
    let p = await center(`[...${D}.querySelectorAll('[role=button]')].find(e=>e.offsetParent&&(e.getAttribute('aria-label')||'')==='더 보기')`); await tap(p[0], p[1]); await sleep(1200);
    p = await center(`[...document.querySelectorAll('[role=menuitem],[role=button],div[tabindex]')].find(e=>e.offsetParent&&/^예약/.test(e.innerText.trim()))`); if (!p) throw new Error("no 예약 menu"); await tap(p[0], p[1]); await sleep(1500);
    }
    const day = String(+post.date.split("-")[2]);
    if (!await ev(`document.body.innerText.includes(${JSON.stringify(post.date.slice(0,4)+"년 "+(+post.date.slice(5,7))+"월")})`)) throw new Error("calendar month mismatch");
    const dayLabel = `${post.date.slice(0,4)}년 ${+post.date.slice(5,7)}월 ${day}일`;
    p = await center(`[...document.querySelectorAll('[role=gridcell]')].filter(e=>e.offsetParent&&e.innerText.startsWith(${JSON.stringify(dayLabel)}))[0]`); if (!p) throw new Error("no day cell " + day); await tap(p[0], p[1]); await sleep(600);
    const [hh, mm] = post.time.split(":");
    const ins = await ev(`[...document.querySelectorAll('input[type=text]')].filter(e=>e.offsetParent&&/^\\d{2}$/.test(e.value)).map(e=>{const r=e.getBoundingClientRect(); return [r.x+r.width/2,r.y+r.height/2]})`); if (ins.length < 2) throw new Error("no time inputs");
    for (const [i, v] of [[0, hh], [1, mm]]) { await tap(ins[i][0], ins[i][1]); await ev(`(()=>{const e=document.activeElement; if(e&&e.select) e.select();})()`); await c.send("Input.insertText", { text: v }); await sleep(300); }
    const tv = await ev(`[...document.querySelectorAll('input[type=text]')].filter(e=>e.offsetParent&&/^\\d{1,2}$/.test(e.value)).map(e=>e.value)`); console.log("time set:", tv.join(":"));
    p = await center(`[...document.querySelectorAll('[role=button]')].find(e=>e.offsetParent&&e.innerText.trim()==='완료'&&e.getAttribute('aria-disabled')!=='true')`); if (!p) throw new Error("no enabled 완료"); await tap(p[0], p[1]); await sleep(1200);
    const label = await ev(`(()=>{const b=[...${D}.querySelectorAll('[role=button]')].filter(e=>e.offsetParent).map(e=>e.innerText.trim()); return b.filter(x=>/게시|예약/.test(x))})()`); console.log("dialog buttons:", label.join(","));
    const sched = await ev(`(()=>{return ${D}.innerText.match(/\\d{1,2}월 \\d{1,2}일[^\\n]*|\\d{4}[^\\n]*\\d{1,2}:\\d{2}[^\\n]*/)?.[0]||''})()`); console.log("scheduled label:", sched);
    if (process.env.DRYRUN) { console.log("DRYRUN: dialog text:", JSON.stringify((await ev(`${D}.innerText`)).replace(/\n{2,}/g,"\n").slice(0,200))); console.log("visible after 완료:", JSON.stringify(await ev(`[...document.querySelectorAll('[role=gridcell],input[type=text]')].filter(e=>e.offsetParent).length`))); c.close(); return; }
    if (!label.includes("예약")) throw new Error("schedule not applied (button still 게시)");
    p = await center(`[...${D}.querySelectorAll('[role=button]')].find(e=>e.offsetParent&&/^(예약|게시)$/.test(e.innerText.trim()))`); await tap(p[0], p[1]);
    for (let i = 0; i < 12; i++) { await sleep(2500); const st = await ev(`({dialog:!!${D}, toast:[...document.querySelectorAll('[role=alert],[role=status]')].map(e=>e.innerText.trim()).filter(Boolean).slice(0,2)})`); console.log("state:", JSON.stringify(st)); if (!st.dialog && !(st.toast || []).some(x => /중\.\.\./.test(x))) break; }
    await sleep(3000);
  }
  c.close(); console.log("\ndone");
})().catch(e => { console.error("ERR", e.message); process.exit(1); });

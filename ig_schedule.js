#!/usr/bin/env node
// Meta Business Suite 컴포저로 인스타(+FB 페이지) 캐러셀 예약. 사용: node ig_schedule.js <tabIdPrefix> <posts.json> [from] [to]
// posts.json: [{ date:"2026-10-21", hour:9, pm:true, minute:0, images:[abs...], text:"본문(해시태그 제외)", tags:"#a #b" }]
// 해시태그 자동완성 팝업이 입력을 먹기 때문에 본문과 태그를 나눠서, 태그는 한 글자씩 넣고 끝에 비해시태그 문자로 닫는다.
const http = require("http"), fs = require("fs");
const get = u => new Promise((res, rej) => http.get(u, r => { let d = ""; r.on("data", c => d += c); r.on("end", () => res(JSON.parse(d))); }).on("error", rej));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const COMPOSER = "https://business.facebook.com/latest/composer?asset_id=1429718256880774&business_id=954325333706717";
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
(async () => {
  const [tid, file, from = 0, to = 99] = process.argv.slice(2);
  const posts = JSON.parse(fs.readFileSync(file, "utf8")).slice(+from, +to);
  const t = (await get("http://127.0.0.1:9222/json/list")).find(x => x.id.startsWith(tid));
  const ws = new WebSocket(t.webSocketDebuggerUrl); let id = 0; const P = {}, L = [];
  await new Promise(r => ws.onopen = r);
  ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && P[m.id]) { P[m.id](m); delete P[m.id]; } else if (m.method) L.forEach(f => f(m)); };
  const send = (method, params = {}) => new Promise(r => { const i = ++id; P[i] = r; ws.send(JSON.stringify({ id: i, method, params })); });
  const ev = async x => { const r = await send("Runtime.evaluate", { expression: x, returnByValue: true, awaitPromise: true }); if (r.error) throw new Error("cdp " + JSON.stringify(r.error)); if (r.result.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description || "eval"); return r.result.result.value; };
  const waitFor = async (x, ms = 20000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { const v = await ev(`!!(${x})`); if (v) return v; } catch (e) { if (process.env.DEBUG) console.log("ev err", e.message.slice(0,120)); } await sleep(500); } throw new Error("timeout: " + x.slice(0, 80)); };
  const tap = async sel => { const p = await ev(`(()=>{const e=${sel}; if(!e) return null; e.scrollIntoView({block:"center"}); const b=e.getBoundingClientRect(); return [b.x+b.width/2,b.y+b.height/2]})()`); if (!p) throw new Error("no el: " + sel.slice(0, 80)); for (const type of ["mouseMoved", "mousePressed", "mouseReleased"]) await send("Input.dispatchMouseEvent", { type, x: p[0], y: p[1], button: "left", clickCount: 1 }); await sleep(400); };
  const key = async (k, vk, text) => { await send("Input.dispatchKeyEvent", { type: "keyDown", key: k, code: k, windowsVirtualKeyCode: vk, text }); await send("Input.dispatchKeyEvent", { type: "keyUp", key: k, code: k, windowsVirtualKeyCode: vk }); };
  const btn = txt => `[...document.querySelectorAll('[role=button],button')].find(e=>e.offsetParent&&e.innerText.trim()===${JSON.stringify(txt)}&&e.getAttribute('aria-disabled')!=='true')`;
  const editor = `document.querySelector('[contenteditable=true]')`;
  await send("Page.enable"); await send("DOM.enable");
  L.push(m => { if (m.method === "Page.javascriptDialogOpening") send("Page.handleJavaScriptDialog", { accept: true }); }); // 페이지 이탈 확인창 자동 수락 await send("Page.setInterceptFileChooserDialog", { enabled: true });
  for (const p of posts) {
    if (!process.env.SKIP_UPLOAD) { await send("Page.navigate", { url: COMPOSER }); await sleep(3000); }
    await waitFor(btn("사진/동영상 추가"), 45000);
    // 1) 이미지: 파일 선택창을 가로채서 넣기
    if (!process.env.SKIP_UPLOAD) {
    const chooser = new Promise(r => L.push(m => { if (m.method === "Page.fileChooserOpened") r(m.params); }));
    await tap(btn("사진/동영상 추가"));
    const fc = await Promise.race([chooser, sleep(8000).then(() => null)]); if (!fc) throw new Error("file chooser not opened");
    await send("DOM.setFileInputFiles", { backendNodeId: fc.backendNodeId, files: p.images });
    } // SKIP_UPLOAD=1: 이미지는 aside MCP upload_file로 미리 올린 상태 (MCP가 파일선택 가로채기를 쥐고 있을 때)
    await waitFor(`[...document.querySelectorAll('[role=button],button')].filter(e=>/사진 삭제/.test((e.getAttribute('aria-label')||'')+e.innerText)).length>=${p.images.length} && ![...document.querySelectorAll('[role=listitem] [role=progressbar], li [role=progressbar]')].length`, 90000);
    // 2) 캡션
    await tap(editor); await sleep(300);
    for (const line of p.text.split("\n")) { if (line) await send("Input.insertText", { text: line }); await key("Enter", 13, "\r"); }
    await ev(`(()=>{const e=${editor}; e.focus(); const r=document.createRange(); r.selectNodeContents(e); r.collapse(false); const s=getSelection(); s.removeAllRanges(); s.addRange(r);})()`);
    for (const ch of p.tags + " ✨") { await send("Input.insertText", { text: ch }); await sleep(45); }
    await sleep(700); await key("Escape", 27);
    const cap = await ev(`${editor}.innerText`);
    if (!cap.includes(p.tags.split(" ").at(-1))) throw new Error("caption tags broken: " + cap.slice(-120));
    // 3) 예약 스위치 + 날짜(FB, IG 두 칸) + 시간
    await tap(`document.querySelector('input[aria-label="날짜 및 시간 설정"]')||[...document.querySelectorAll('[role=switch]')].find(e=>(e.getAttribute('aria-label')||'')==='날짜 및 시간 설정')`);
    await waitFor(`[...document.querySelectorAll('input')].filter(e=>/2026/.test(e.value)).length===2`);
    const d = new Date(p.date + "T00:00:00Z"); const label = `${DAYS[d.getUTCDay()]}, ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
    for (const k of [0, 1]) {
      await tap(`[...document.querySelectorAll('input')].filter(e=>/2026/.test(e.value))[${k}]`);
      await waitFor(`!!document.querySelector('[aria-label="${label}"]')`, 5000);
      await tap(`document.querySelector('[aria-label="${label}"]')`);
    }
    for (const k of [0, 1]) {
      const base = k * 3;
      const sp = i => `[...document.querySelectorAll('[role=spinbutton]')][${base + i}]`;
      if (+(await ev(`${sp(0)}.getAttribute('aria-valuenow')`)) !== (p.pm ? 1 : 0)) { await tap(sp(0)); await key(p.pm ? "ArrowUp" : "ArrowDown", p.pm ? 38 : 40); }
      await tap(sp(1)); for (const c of String(p.hour).padStart(2, "0")) await key(c, 48 + +c, c);
      await tap(sp(2)); for (const c of String(p.minute || 0).padStart(2, "0")) await key(c, 48 + +c, c);
    }
    const state = await ev(`[...document.querySelectorAll('input')].filter(e=>/2026/.test(e.value)).map(e=>e.value).join(',')+' | '+[...document.querySelectorAll('[role=spinbutton]')].map(e=>e.getAttribute('aria-valuenow')).join(',')`);
    console.log(p.date, "→", state);
    const want = `${d.getUTCFullYear()}년 ${d.getUTCMonth() + 1}월 ${d.getUTCDate()}일`;
    if (process.env.DRYRUN) { console.log("DRYRUN stop"); continue; }
    if (!state.startsWith(`${want},${want}`)) throw new Error("date not applied: " + state);
    // 4) 예약
    await tap(btn("예약"));
    await waitFor(`document.body.innerText.includes('게시물이 예약되었습니다')`, 40000);
    console.log("scheduled", p.date, (await ev(`(document.body.innerText.match(/2026\\. \\d+\\. \\d+\\. 오[전후] \\d+:\\d+/)||[''])[0]`)));
    try { await tap(btn("나중에 하기")); } catch {}
    await sleep(1500);
  }
  ws.close();
})().catch(e => { console.error("ERR", e.message); process.exit(1); });

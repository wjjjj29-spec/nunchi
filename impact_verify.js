// Impact(Airalo) 웹사이트 소유권 인증을 실제 마우스 클릭으로 진행. node impact_verify.js
const http = require("http");
const get = u => new Promise((res, rej) => http.get(u, r => { let d = ""; r.on("data", c => d += c); r.on("end", () => res(JSON.parse(d))); }).on("error", rej));
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const targets = await get("http://127.0.0.1:9222/json/list");
  const t = targets.find(x => x.type === "page" && x.url.includes("checklist-instance"));
  if (!t) throw new Error("Impact checklist tab not found");
  const ws = new WebSocket(t.webSocketDebuggerUrl); let id = 0; const pending = {};
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pending[m.id]) { pending[m.id](m); delete pending[m.id]; } };
  const send = (method, params = {}) => new Promise(res => { const i = ++id; pending[i] = res; ws.send(JSON.stringify({ id: i, method, params })); });
  const ev = async expr => { const r = await send("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description || "eval error"); return r.result.result.value; };
  const tap = async (x, y) => { await send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y }); await send("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", clickCount: 1 }); await send("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", clickCount: 1 }); };
  // 좌표 계산: iframe 오프셋 + 요소 중심
  const coords = (sel, test) => ev(`(()=>{const fr=[...document.querySelectorAll('iframe')].find(f=>/media-kit/.test(f.src)); const d=fr.contentDocument; const fo=fr.getBoundingClientRect(); const el=[...d.querySelectorAll(${JSON.stringify(sel)})].find(e=>e.offsetParent && (${test})); if(!el) return null; el.scrollIntoView({block:'center'}); const r=el.getBoundingClientRect(); return {x:fo.x+r.x+r.width/2, y:fo.y+r.y+r.height/2, text:(el.innerText||el.textContent).trim().slice(0,40)};})()`);
  const texts = () => ev(`(()=>{const fr=[...document.querySelectorAll('iframe')].find(f=>/media-kit/.test(f.src)); const d=fr.contentDocument; const t=[...d.querySelectorAll('p,span,div,h2,h3,button')].filter(e=>e.children.length===0&&e.offsetParent).map(e=>e.textContent.trim()).filter(t=>t&&t.length<120&&!/[{};]/.test(t)); return [...new Set(t)];})()`);
  const log = (...a) => console.log(...a);
  // 0) 채널 목록의 '인증' 버튼이 보이면 먼저 누른다
  let c = await coords("button", "e.innerText.trim()==='인증'");
  if (c) { log("click 인증", c.text); await tap(c.x, c.y); await sleep(1500); }
  // 1) 인증 방법 드롭다운
  c = await coords("button", "/인증 방법 선택|인증$/.test(e.innerText) && !/웹사이트 인증/.test(e.innerText)");
  if (c && /인증 방법 선택/.test(c.text)) { log("open method select"); await tap(c.x, c.y); await sleep(1000);
    // 2) 메타 태그 옵션 (드롭다운은 iframe 안 리스트박스)
    let o = await coords("*", "e.children.length<=1 && /메타 태그를 붙여넣어 인증/.test(e.textContent)");
    if (!o) { // 리스트박스가 iframe 밖(메인 문서)에 뜨는 경우
      const m = await ev(`(()=>{const el=[...document.querySelectorAll('*')].find(e=>e.children.length<=1 && /메타 태그를 붙여넣어 인증/.test(e.textContent) && e.offsetParent); if(!el) return null; const r=el.getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2,text:el.textContent.trim().slice(0,40)};})()`);
      o = m;
    }
    log("meta option:", o); if (o) { await tap(o.x, o.y); await sleep(800); }
  }
  // 3) 웹사이트 인증 버튼
  c = await coords("button", "e.innerText.trim()==='웹사이트 인증'");
  log("verify btn:", c); if (c) { await tap(c.x, c.y); await sleep(9000); }
  const out = await texts();
  log(JSON.stringify(out.filter(t => /인증|확인|실패|성공|채널|hellonunchi/.test(t)).slice(0, 15), null, 1));
  ws.close();
})().catch(e => { console.error("ERR", e.message); process.exit(1); });

// 레딧 글에 댓글 달기: node reddit_comment.js <targetId> <postId> "<text>"   (로그인된 Aside 탭 사용, shadow DOM 대응)
const http = require("http");
const get = u => new Promise((res, rej) => http.get(u, r => { let d = ""; r.on("data", c => d += c); r.on("end", () => res(JSON.parse(d))); }).on("error", rej));
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const [tid, postId, ...rest] = process.argv.slice(2); const text = rest.join(" ");
  const t = (await get("http://127.0.0.1:9222/json/list")).find(x => x.id.startsWith(tid)); const ws = new WebSocket(t.webSocketDebuggerUrl); let id = 0; const p = {};
  await new Promise(r => ws.onopen = r); ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && p[m.id]) { p[m.id](m); delete p[m.id]; } };
  const send = (method, params = {}) => Promise.race([new Promise(r => { const i = ++id; p[i] = r; ws.send(JSON.stringify({ id: i, method, params })); }), sleep(20000).then(() => ({ timeout: method }))]);
  const ev = async expr => { const r = await send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true }); if (r.timeout) throw new Error("eval timeout"); if (r.result.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description); return r.result.result.value; };
  const tap = async (x, y) => { for (const type of ["mouseMoved", "mousePressed", "mouseReleased"]) await send("Input.dispatchMouseEvent", { type, x, y, button: "left", clickCount: 1 }); };
  const DEEP = `const deep=(root,acc=[])=>{for(const e of root.querySelectorAll('*')){acc.push(e); if(e.shadowRoot) deep(e.shadowRoot,acc);} return acc;};`;
  await send("Page.enable"); await send("Page.navigate", { url: "https://www.reddit.com/comments/" + postId + "/" }); await sleep(7000);
  let pos = await ev(`(()=>{${DEEP} const ta=deep(document).filter(e=>e.tagName==='TEXTAREA'&&e.getAttribute('placeholder')==='대화에 참여해보세요'&&e.getClientRects().length)[0]; if(!ta) return null; ta.scrollIntoView({block:'center'}); const r=ta.getBoundingClientRect(); return [r.x+r.width/2,r.y+r.height/2]})()`);
  if (!pos) throw new Error("no comment box"); await tap(pos[0], pos[1]); await sleep(2500);
  const focused = await ev(`(()=>{let a=document.activeElement; while(a&&a.shadowRoot&&a.shadowRoot.activeElement) a=a.shadowRoot.activeElement; return a&&a.getAttribute('contenteditable')==='true'})()`);
  if (!focused) throw new Error("editor not focused");
  await send("Input.insertText", { text }); await sleep(1000);
  const len = await ev(`(()=>{${DEEP} const ed=deep(document).find(e=>e.getAttribute('contenteditable')==='true'&&e.getClientRects().length); return ed&&ed.innerText.length})()`); console.log("typed", len);
  pos = await ev(`(()=>{${DEEP} const b=deep(document).filter(e=>e.tagName==='BUTTON'&&e.getClientRects().length&&(e.innerText||'').trim()==='댓글'&&!e.disabled).pop(); if(!b) return null; const r=b.getBoundingClientRect(); return [r.x+r.width/2,r.y+r.height/2]})()`);
  if (!pos) throw new Error("no submit button"); await tap(pos[0], pos[1]); await sleep(6000);
  const mine = await ev(`fetch('https://www.reddit.com/comments/${postId}.json?limit=80',{credentials:'include'}).then(r=>r.json()).then(d=>d[1].data.children.filter(c=>c.kind==='t1'&&c.data.author==='hellonunchi').map(c=>'https://www.reddit.com'+c.data.permalink))`);
  console.log("posted:", JSON.stringify(mine)); ws.close();
})().catch(e => { console.error("ERR", e.message); process.exit(1); });

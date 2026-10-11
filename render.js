#!/usr/bin/env node
// HTML → 이미지 렌더러 (Aside CDP 9222). 사용자 탭을 건드리지 않게 별도 컨텍스트의 백그라운드 탭에서 찍고 닫는다.
//  node render.js jobs.json        jobs = [{ html: "/abs/file.html", out: "/abs/out.png", w: 1080, h: 1350 }, ...]
const http = require("http");
const fs = require("fs");
const get = u => new Promise((res, rej) => http.get(u, r => { let d = ""; r.on("data", c => d += c); r.on("end", () => res(JSON.parse(d))); }).on("error", rej));
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function cdp(wsUrl) {
  const ws = new WebSocket(wsUrl); let id = 0; const pending = {};
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pending[m.id]) { pending[m.id](m); delete pending[m.id]; } };
  const send = (method, params = {}) => new Promise(res => { const i = ++id; pending[i] = res; ws.send(JSON.stringify({ id: i, method, params })); });
  return { send, close: () => ws.close() };
}
(async () => {
  const jobs = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
  const ver = await get("http://127.0.0.1:9222/json/version"); const b = await cdp(ver.webSocketDebuggerUrl);
  const ctx = (await b.send("Target.createBrowserContext")).result.browserContextId;
  const tid = (await b.send("Target.createTarget", { url: "about:blank", browserContextId: ctx, background: true })).result.targetId;
  await sleep(500);
  const t = (await get("http://127.0.0.1:9222/json/list")).find(x => x.id === tid);
  const p = await cdp(t.webSocketDebuggerUrl);
  await p.send("Page.enable"); await p.send("Runtime.enable");
  for (const j of jobs) {
    await p.send("Emulation.setDeviceMetricsOverride", { width: j.w, height: j.h, deviceScaleFactor: 1, mobile: false });
    await p.send("Page.navigate", { url: "file://" + j.html });
    // 폰트·이미지 로딩 대기
    for (let i = 0; i < 60; i++) {
      const r = await p.send("Runtime.evaluate", { expression: "document.readyState==='complete' && document.fonts.status==='loaded' && [...document.images].every(i=>i.complete)", returnByValue: true });
      if (r.result?.result?.value) break; await sleep(250);
    }
    await sleep(300);
    const shot = await p.send("Page.captureScreenshot", { format: j.out.endsWith(".png") ? "png" : "jpeg", quality: 92, clip: { x: 0, y: 0, width: j.w, height: j.h, scale: 1 }, captureBeyondViewport: false });
    fs.writeFileSync(j.out, Buffer.from(shot.result.data, "base64")); console.log("saved", j.out);
  }
  p.close(); await b.send("Target.closeTarget", { targetId: tid }); await b.send("Target.disposeBrowserContext", { browserContextId: ctx }); b.close();
})().catch(e => { console.error(e); process.exit(1); });

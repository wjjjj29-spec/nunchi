// Nunchi Tickets: 구독 저장 + 신규 공연 매칭 메일 발송 (Cloudflare Workers 무료 + Resend 무료)
//  POST /api/tickets/signup   tickets 폼 → KV 저장 + 환영 메일 → /tickets/?sent=1
//  GET  /api/tickets/unsub?e=&t=   구독 해지
//  POST /api/tickets/push     Bearer PUSH_SECRET. 맥 ticket-watch.js 가 신규 공연 배열 전송 → 매칭 구독자에게 메일
const norm = s => String(s || "").toLowerCase().replace(/[^a-z0-9가-힣]/g, "");
const esc = s => String(s || "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
// 멜론 제목은 한글이 많아서 영문 → 한글 이름 보강 (필요할 때 추가)
const ALIAS = { straykids: ["스트레이키즈"], newjeans: ["뉴진스"], day6: ["데이식스"], seventeen: ["세븐틴"], bts: ["방탄소년단"], aespa: ["에스파"], ive: ["아이브"], lesserafim: ["르세라핌"], txt: ["투모로우바이투게더"], enhypen: ["엔하이픈"], nct: ["엔시티"], blackpink: ["블랙핑크"], twice: ["트와이스"], ateez: ["에이티즈"], riize: ["라이즈"], illit: ["아일릿"], zerobaseone: ["제로베이스원"], boynextdoor: ["보이넥스트도어"], btob: ["비투비"], iu: ["아이유"], taeyeon: ["태연"], itzy: ["있지"], monstax: ["몬스타엑스"], shinee: ["샤이니"], exo: ["엑소"], nflying: ["엔플라잉"], qwer: ["큐더블유이알"] };
const keys = a => { const k = norm(a); return [k, ...(ALIAS[k] || []).map(norm)].filter(x => x.length >= 2); };
const token = () => [...crypto.getRandomValues(new Uint8Array(16))].map(b => b.toString(16).padStart(2, "0")).join("");
const unsubUrl = (env, s) => `${env.API}/api/tickets/unsub?e=${encodeURIComponent(s.email)}&t=${s.token}`;
const SRC = { melon: "Melon Ticket", nol: "NOL (Interpark Global)", yes24: "Yes24 Global" };

async function send(env, s, subject, html, text) {
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${env.RESEND_KEY}`, "content-type": "application/json" },
    body: JSON.stringify({
      from: env.FROM, to: [s.email], reply_to: env.REPLY_TO, subject, text,
      html: `<div style="font:15px/1.6 system-ui,sans-serif;max-width:560px;color:#1b1b1b">${html}<p style="color:#888;font-size:12px;margin-top:28px">Nunchi Tickets · hellonunchi.com · <a href="${unsubUrl(env, s)}" style="color:#888">Unsubscribe</a></p></div>`,
      headers: { "List-Unsubscribe": `<${unsubUrl(env, s)}>` },
    }),
  });
  if (!r.ok) throw new Error(`resend ${r.status} ${await r.text()}`);
}

async function signup(req, env) {
  const f = await req.formData();
  const done = Response.redirect(`${env.SITE}/tickets/?sent=1`, 303);
  if (f.get("_honey")) return done;
  const email = String(f.get("email") || "").trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return new Response("Please go back and check your email address.", { status: 400 });
  const artists = String(f.get("artists") || "").split(/[,/\n;]+/).map(s => s.trim()).filter(Boolean).slice(0, 10);
  const old = await env.SUBS.get(email, "json");
  const s = { email, artists, country: String(f.get("country") || "").slice(0, 60), types: f.getAll("types").map(String), token: old?.token || token(), created: old?.created || new Date().toISOString(), sent: old?.sent || [] };
  await env.SUBS.put(email, JSON.stringify(s));
  await send(env, s, "You're on the Nunchi Tickets list",
    `<p>Hi! You'll get an email when a show by <b>${esc(artists.join(", "))}</b> is listed on Melon Ticket, NOL (Interpark) or Yes24.</p><p>Want to change your artists? Just reply to this email.</p>`,
    `You'll get an email when a show by ${artists.join(", ")} is listed. Reply to change your artists.\nUnsubscribe: ${unsubUrl(env, s)}`).catch(e => console.log(e.message));
  // 운영자 알림 (hello@ → Gmail)
  if (!old) await send(env, { ...s, email: env.REPLY_TO }, `Nunchi Tickets signup: ${email}`, `<p>${esc(email)} · ${esc(s.country)}<br>${esc(artists.join(", "))}<br>${esc(s.types.join(", "))}</p>`, `${email} | ${s.country} | ${artists.join(", ")}`).catch(e => console.log(e.message));
  return done;
}

async function push(req, env) {
  if (!env.PUSH_SECRET || req.headers.get("authorization") !== `Bearer ${env.PUSH_SECRET}`) return new Response("unauthorized", { status: 401 });
  const items = await req.json(); let mails = 0, cursor;
  do {
    const page = await env.SUBS.list({ cursor }); cursor = page.list_complete ? null : page.cursor;
    for (const k of page.keys) {
      const s = await env.SUBS.get(k.name, "json"); if (!s) continue;
      const hits = items.filter(x => !s.sent.includes(x.id)
        && (x.type !== "fanmeeting" || s.types.includes("fanmeeting"))
        && s.artists.some(a => keys(a).some(q => norm(x.title).includes(q))));
      if (!hits.length) continue;
      const rows = hits.map(x => `<li style="margin-bottom:12px"><b>${esc(x.title)}</b><br>${esc([x.place, x.period].filter(Boolean).join(" · "))}<br><a href="${esc(x.url)}">Open on ${SRC[x.source] || x.source}</a></li>`).join("");
      try {
        await send(env, s, `Just listed in Korea: ${hits[0].title}${hits.length > 1 ? ` (+${hits.length - 1} more)` : ""}`,
          `<p>New shows for the artists you follow:</p><ul style="padding-left:18px">${rows}</ul><p>Before the sale opens: make your account on the global site, save your card, and check the exact sale time on the listing page (it's in KST).</p>`,
          hits.map(x => `${x.title} | ${x.place} | ${x.period} | ${x.url}`).join("\n") + `\n\nUnsubscribe: ${unsubUrl(env, s)}`);
        s.sent = [...s.sent, ...hits.map(x => x.id)].slice(-500); await env.SUBS.put(s.email, JSON.stringify(s)); mails++;
      } catch (e) { console.log(e.message); }
    }
  } while (cursor);
  return Response.json({ items: items.length, mails });
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url), p = url.pathname;
    if (p === "/api/tickets/signup" && req.method === "POST") return signup(req, env);
    if (p === "/api/tickets/push" && req.method === "POST") return push(req, env);
    if (p === "/api/tickets/unsub") {
      const e = (url.searchParams.get("e") || "").toLowerCase(), s = await env.SUBS.get(e, "json");
      if (s && s.token === url.searchParams.get("t")) await env.SUBS.delete(e);
      return new Response(`<!doctype html><meta name=viewport content="width=device-width"><p style="font:16px system-ui;padding:40px">You're unsubscribed from Nunchi Tickets. <a href="${env.SITE}/tickets/">Back</a></p>`, { headers: { "content-type": "text/html; charset=utf-8" } });
    }
    return new Response("not found", { status: 404 });
  },
};

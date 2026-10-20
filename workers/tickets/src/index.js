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
  // 다른 아이돌 페이지에서 또 가입하면 아티스트를 합침 (기존 구독 유지)
  const merged = [...new Set([...(old?.artists || []), ...artists].map(a => a.trim()).filter(Boolean))].slice(0, 20);
  const s = { email, artists: merged, country: String(f.get("country") || old?.country || "").slice(0, 60), types: [...new Set([...(old?.types || []), ...f.getAll("types").map(String)])], src: old?.src || String(f.get("src") || "tickets").slice(0, 60), token: old?.token || token(), created: old?.created || new Date().toISOString(), sent: old?.sent || [] };
  await env.SUBS.put(email, JSON.stringify(s));
  await send(env, s, "You're on the Nunchi Tickets list",
    `<p>Hi! You'll get an email when a show by <b>${esc(merged.join(", "))}</b> is listed on Melon Ticket, NOL (Interpark) or Yes24.</p><p>Want to change your artists? Just reply to this email.</p>`,
    `You'll get an email when a show by ${merged.join(", ")} is listed. Reply to change your artists.\nUnsubscribe: ${unsubUrl(env, s)}`).catch(e => console.log(e.message));
  // 운영자 알림 (hello@ → Gmail)
  if (!old) await send(env, { ...s, email: env.REPLY_TO }, `Nunchi Tickets signup: ${email}`, `<p>${esc(email)} · ${esc(s.country)} · from ${esc(s.src)}<br>${esc(merged.join(", "))}<br>${esc(s.types.join(", "))}</p>`, `${email} | ${s.country} | ${artists.join(", ")}`).catch(e => console.log(e.message));
  return done;
}

// 구독자가 적은 도시 → 시간대 (아시아를 먼저 검사: "manila" 안의 "la" 오매칭 방지)
const TZ = [
  [/manila|philippines|singapore|malaysia|kuala|hong ?kong|taiwan|taipei|china|beijing|shanghai|perth|macau/i, "Asia/Singapore"],
  [/jakarta|indonesia|bangkok|thailand|vietnam|hanoi|ho chi minh|saigon|cambodia|laos/i, "Asia/Bangkok"],
  [/tokyo|japan|osaka/i, "Asia/Tokyo"], [/india|delhi|mumbai|bangalore|chennai/i, "Asia/Kolkata"], [/dubai|uae|abu dhabi/i, "Asia/Dubai"],
  [/sydney|melbourne|brisbane|canberra|australia/i, "Australia/Sydney"], [/auckland|wellington|new zealand/i, "Pacific/Auckland"],
  [/london|\buk\b|england|ireland|dublin|scotland|wales|portugal|lisbon/i, "Europe/London"],
  [/istanbul|turkey|greece|athens|finland|helsinki|romania|ukraine|kyiv/i, "Europe/Istanbul"],
  [/paris|france|berlin|germany|spain|madrid|barcelona|italy|rome|milan|amsterdam|netherlands|brussels|belgium|vienna|austria|sweden|stockholm|norway|oslo|denmark|copenhagen|poland|warsaw|prague|czech|switzerland|zurich|hungary|budapest/i, "Europe/Paris"],
  [/sao paulo|brazil|rio/i, "America/Sao_Paulo"], [/buenos aires|argentina/i, "America/Argentina/Buenos_Aires"], [/santiago|chile/i, "America/Santiago"],
  [/lima|peru|bogota|colombia|ecuador|quito/i, "America/Bogota"], [/mexico/i, "America/Mexico_City"],
  [/los angeles|\bla\b|san francisco|seattle|vancouver|california|portland|las vegas|san diego/i, "America/Los_Angeles"],
  [/denver|phoenix|calgary|edmonton|utah|arizona/i, "America/Denver"],
  [/chicago|texas|dallas|houston|austin|minneapolis|winnipeg/i, "America/Chicago"],
  [/new york|nyc|boston|toronto|montreal|miami|washington|atlanta|philadelphia|ottawa|florida|new jersey|usa|united states|canada/i, "America/New_York"],
];
const tzFor = c => (TZ.find(([re]) => re.test(c || "")) || [])[1];
const fmt = (iso, timeZone) => { const d = new Date(iso); return isNaN(d) ? "" : d.toLocaleString("en-US", { timeZone, weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }); };
const VERDICT = { easy: ["#1f7a3a", "Yes, sold to overseas fans"], possible: ["#b26a00", "Possible, with some steps"], hard: ["#b3261e", "Hard from abroad"], unknown: ["#666", "Not stated yet"] };
const SRC = { "melon-open": "Melon Ticket", melon: "Melon Ticket", nol: "NOL World (Interpark Global)", yes24: "Yes24 Global" };
const TRIP = "https://www.trip.com/hotels/seoul-hotels-list-274/?Allianceid=10984688&SID=333206686&trip_sub1=ticket_alert";

function card(x, s) {
  const i = x.info || {}, tz = tzFor(s.country);
  const opens = (i.opens || []).filter(o => o.kst_iso).map(o => `<li style="margin:4px 0"><b>${esc(o.label_en)}</b>: ${esc(fmt(o.kst_iso, "Asia/Seoul"))} KST${tz ? ` <span style="color:#666">(${esc(fmt(o.kst_iso, tz))} your time)</span>` : ""}${o.who_en ? `<br><span style="color:#555">${esc(o.who_en)}</span>` : ""}</li>`).join("");
  const [vc, vt] = VERDICT[i.foreigners?.verdict] || VERDICT.unknown;
  const facts = [i.venue_en && `📍 ${esc(i.venue_en)}${i.city_en ? `, ${esc(i.city_en)}` : ""}`, i.show_dates_en && `🗓 ${esc(i.show_dates_en)}`, i.price_en && `💰 ${esc(i.price_en)}`].filter(Boolean).join("<br>") || esc([x.place, x.period].filter(Boolean).join(" · "));
  const notes = (i.need_to_know_en || []).map(n => `<li>${esc(n)}</li>`).join("");
  const melonTip = x.source.startsWith("melon") ? `<p style="margin:8px 0 0;color:#555;font-size:13px">Tip: some Melon shows also sell on <a href="https://tkglobal.melon.com/main/index.htm?langCd=EN">Melon Ticket Global</a> (English, no Korean phone needed). Search the artist there first.</p>` : "";
  const seoulish = /seoul|incheon|goyang|ilsan|^$/i.test(i.city_en || "");
  return `<div style="border:1px solid #e6e0d4;border-radius:14px;padding:18px 20px;margin:0 0 18px;background:#fffdf8">
  <div style="font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:#8a7f6a">${esc((i.artists || []).join(" · ") || i.event_type || "New listing")}</div>
  <h2 style="margin:4px 0 10px;font-size:20px;line-height:1.3">${esc(i.title_en || x.title)}</h2>
  <p style="margin:0 0 12px">${facts}</p>
  ${opens ? `<p style="margin:0 0 4px;font-weight:600">When tickets open</p><ul style="margin:0 0 12px;padding-left:18px">${opens}</ul>` : ""}
  <p style="margin:0 0 4px;font-weight:600">Can overseas fans buy? <span style="color:${vc}">${vt}</span></p>
  ${i.foreigners?.note_en ? `<p style="margin:0 0 12px;color:#333">${esc(i.foreigners.note_en)}</p>` : ""}
  ${notes ? `<p style="margin:0 0 4px;font-weight:600">Good to know</p><ul style="margin:0 0 12px;padding-left:18px">${notes}</ul>` : ""}
  <p style="margin:0"><a href="${esc(x.url)}">Official page on ${SRC[x.source] || x.source}</a>${x.source.startsWith("melon") ? " (Korean)" : ""}${seoulish ? ` · <a href="${TRIP}">Hotels in Seoul</a>` : ""} · <a href="${env_SITE}/guide/incheon-airport-to-seoul/">Airport to Seoul</a></p>${melonTip}
</div>`;
}
let env_SITE = "https://hellonunchi.com";
const firstOpen = x => (x.info?.opens || []).map(o => o.kst_iso).filter(Boolean).sort()[0];

async function push(req, env) {
  if (!env.PUSH_SECRET || req.headers.get("authorization") !== `Bearer ${env.PUSH_SECRET}`) return new Response("unauthorized", { status: 401 });
  env_SITE = env.SITE;
  const items = await req.json(); let mails = 0, cursor;
  const hay = x => norm([x.title, x.info?.title_en, ...(x.info?.artists || [])].join(" "));
  do {
    const page = await env.SUBS.list({ cursor }); cursor = page.list_complete ? null : page.cursor;
    for (const k of page.keys) {
      const s = await env.SUBS.get(k.name, "json"); if (!s) continue;
      const hits = items.filter(x => !s.sent.includes(x.id)
        && (x.type !== "fanmeeting" || s.types.includes("fanmeeting"))
        && s.artists.some(a => keys(a).some(q => hay(x).includes(q))));
      if (!hits.length) continue;
      const h = hits[0], fo = firstOpen(h);
      const subject = `🎫 ${h.info?.title_en || h.title}${fo ? `: tickets open ${fmt(fo, "Asia/Seoul")} KST` : ""}${hits.length > 1 ? ` (+${hits.length - 1} more)` : ""}`;
      const text = hits.map(x => [x.info?.title_en || x.title, x.info?.venue_en, x.info?.show_dates_en, ...(x.info?.opens || []).map(o => `${o.label_en}: ${fmt(o.kst_iso, "Asia/Seoul")} KST (${o.who_en})`), x.info?.foreigners?.note_en, x.url].filter(Boolean).join("\n")).join("\n\n");
      try {
        await send(env, s, subject, `<p>New in Korea for the artists you follow:</p>${hits.map(x => card(x, s)).join("")}<p style="color:#555">Times are Korea time (KST)${tzFor(s.country) ? ", with your local time in brackets" : ""}. Reply to this email if anything is unclear and a Korean on our team will answer.</p>`, text + `\n\nUnsubscribe: ${unsubUrl(env, s)}`);
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
    // 멜론은 GitHub 러너 IP를 막아서(423) 수집기가 이 중계를 통해 가져감. 멜론 티켓 도메인만, 토큰 필요
    if (p === "/api/tickets/proxy") {
      if (!env.PUSH_SECRET || req.headers.get("authorization") !== `Bearer ${env.PUSH_SECRET}`) return new Response("unauthorized", { status: 401 });
      let u; try { u = new URL(url.searchParams.get("u") || ""); } catch { return new Response("bad url", { status: 400 }); }
      if (u.protocol !== "https:" || u.hostname !== "ticket.melon.com") return new Response("host not allowed", { status: 403 });
      // 멜론이 일부 Cloudflare 출구 IP만 막아서(423) 몇 번 재시도하면 대부분 통과
      let status = 0, body = "", ctype = "text/plain", lastErr = "";
      for (let i = 0; i < 6; i++) {
        try {
          const r = await fetch(u.toString(), { headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/130 Safari/537.36", "Accept-Language": "ko-KR,ko;q=0.9", Referer: req.headers.get("x-referer") || "https://ticket.melon.com/" } });
          status = r.status; ctype = r.headers.get("content-type") || ctype; body = await r.text();
          if (status !== 423) break;
        } catch (e) { lastErr = String(e); }
        await new Promise(s => setTimeout(s, 500));
      }
      if (!status) return new Response("upstream error: " + lastErr, { status: 502 });
      return new Response(body, { status, headers: { "content-type": ctype } });
    }
    if (p === "/api/tickets/unsub") {
      const e = (url.searchParams.get("e") || "").toLowerCase(), s = await env.SUBS.get(e, "json");
      if (s && s.token === url.searchParams.get("t")) await env.SUBS.delete(e);
      return new Response(`<!doctype html><meta name=viewport content="width=device-width"><p style="font:16px system-ui;padding:40px">You're unsubscribed from Nunchi Tickets. <a href="${env.SITE}/tickets/">Back</a></p>`, { headers: { "content-type": "text/html; charset=utf-8" } });
    }
    return new Response("not found", { status: 404 });
  },
};

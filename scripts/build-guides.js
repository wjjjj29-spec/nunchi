#!/usr/bin/env node
// Guides: growth/guides/<slug>.json → site/guide/<slug>/index.html + 카드뉴스(4:5) + 썸네일(1200x630) + /guide/ 허브
//  node scripts/build-guides.js            HTML만
//  node scripts/build-guides.js --render   카드·썸네일 이미지까지 (Aside 9222 필요)
const fs = require("fs"), path = require("path"), { execFileSync } = require("child_process");
const ROOT = path.join(__dirname, ".."), SITE = path.join(ROOT, "site"), SRC = path.join(ROOT, "growth/guides");
const TMP = path.join(SRC, "_render"), ORIGIN = "https://hellonunchi.com", VER = "20261011";
const ROOM = { visit: ["Visit", "#2c5f8a", "#6aa3d6"], live: ["Live", "#c98f1c", "#e0b04a"], love: ["Love", "#c03a2b", "#e26a5a"], learn: ["Learn", "#3e7c59", "#6fb08a"] };
const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const strip = s => String(s).replace(/<[^>]+>/g, "");
const guides = fs.readdirSync(SRC).filter(f => f.endsWith(".json")).map(f => JSON.parse(fs.readFileSync(path.join(SRC, f), "utf8")))
  .sort((a, b) => (a.order || 0) - (b.order || 0));

// ---------------------------------------------------------------- card news (1080x1350)
const FONTS = `<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&family=Noto+Sans+KR:wght@500;700&display=swap" rel="stylesheet">`;
const LOGO = path.join(SITE, "img/logo-mark.png");
const cardCss = acc => `<style>
*{box-sizing:border-box;margin:0}
html,body{width:W;height:H;overflow:hidden}
body{background:#f6f1e7;color:#1b1b1b;font-family:Inter,"Noto Sans KR",sans-serif;-webkit-font-smoothing:antialiased;position:relative}
.serif{font-family:Fraunces,"Noto Serif KR",Georgia,serif;text-wrap:balance}
.nw{white-space:nowrap}
.bar{position:absolute;left:0;top:0;bottom:0;width:18px;background:${acc}}
.foot{position:absolute;left:84px;right:72px;bottom:64px;display:flex;align-items:center;gap:16px}
.foot img{width:58px;height:58px}
.foot .nm{font-family:Fraunces,serif;font-weight:700;font-size:40px;letter-spacing:-.01em}
.foot .r{margin-left:auto;font-size:26px;color:#8a847b;font-weight:500}
.ko{font-family:"Noto Sans KR",sans-serif}
</style>`;
const foot = (right) => `<div class="foot"><img src="file://${LOGO}"><span class="nm">Nunchi</span><span class="r">${right}</span></div>`;
const nw = s => String(s).replace(/Wi-Fi\S*/g, m => `<span class="nw">${m}</span>`);
function slideHtml(g, s, i, n) {
  s = Object.assign({}, s, { title: nw(s.title) });
  const [room, acc] = ROOM[g.room];
  const css = cardCss(acc).replace("W", "1080px").replace("H", "1350px");
  const head = `<!doctype html><html><head><meta charset="utf-8">${FONTS}${css}<style>`;
  if (s.type === "cover") return head + `
.ph{position:absolute;left:0;top:0;width:1080px;height:790px;object-fit:cover}
.chip{position:absolute;left:56px;top:56px;background:rgba(246,241,231,.92);color:#1b1b1b;font-weight:700;font-size:22px;letter-spacing:.14em;padding:12px 20px;border-radius:999px}
.pn{position:absolute;left:0;right:0;top:790px;bottom:0;padding:58px 84px 0}
.eb{color:${acc};font-weight:700;font-size:24px;letter-spacing:.14em;text-transform:uppercase;margin-bottom:20px}
h1{font-size:${s.size || 84}px;line-height:1.02;letter-spacing:-.025em;font-weight:700}
.sub{font-size:31px;color:#4a4641;margin-top:20px;line-height:1.35}
</style></head><body>
<img class="ph" src="file://${s.photo}"><div class="chip">NUNCHI GUIDE</div>
<div class="pn"><div class="eb">${room} · ${esc(g.kicker)}</div><h1 class="serif">${s.title}</h1>${s.sub ? `<p class="sub">${s.sub}</p>` : ""}</div>
${foot("Swipe →")}</body></html>`;
  if (s.type === "end") return head + `
body{background:#1b1b1b;color:#f6f1e7}
.in{position:absolute;left:84px;right:84px;top:120px;bottom:180px;display:flex;flex-direction:column;justify-content:center;align-items:flex-start}
.k{color:${ROOM[g.room][2]};font-weight:700;font-size:24px;letter-spacing:.14em;text-transform:uppercase;margin-bottom:34px}
h1{font-size:112px;line-height:1;letter-spacing:-.03em;font-weight:700}
p{font-size:40px;line-height:1.45;color:#cfc7ba;margin-top:44px}
.url{margin-top:56px;display:inline-block;border:2px solid ${ROOM[g.room][2]};color:#f6f1e7;border-radius:999px;padding:22px 34px;font-size:32px;font-weight:600}
.foot img{filter:invert(1) hue-rotate(180deg)} .foot .r{color:#8f877b}
</style></head><body><div class="bar" style="background:${ROOM[g.room][2]}"></div>
<div class="in"><div class="k">${esc(s.kicker || "Save this for your trip")}</div><h1 class="serif">${s.title}</h1><p>${s.text}</p><span class="url">hellonunchi.com/guide/${g.slug}</span></div>
${foot("@hellonunchi")}</body></html>`;
  // point
  return head + `
.top{position:absolute;left:84px;right:72px;top:84px;display:flex;align-items:center;gap:22px}
.num{font-family:Fraunces,serif;font-weight:600;font-size:40px;color:${acc}}
.rule{flex:1;height:2px;background:#ddd4c4}
.tp{font-size:22px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#8a847b}
.in{position:absolute;left:84px;right:84px;top:160px;bottom:170px;display:flex;flex-direction:column;justify-content:center}
.big{font-family:Fraunces,serif;font-weight:700;font-size:${s.bigSize || 168}px;line-height:1;letter-spacing:-.03em;color:#1b1b1b}
.big .cur{font-family:Inter,sans-serif;font-weight:700;font-size:.62em;vertical-align:.32em;margin-right:.06em;letter-spacing:0}
.bigs{font-size:34px;color:#4a4641;margin:18px 0 0}
h2{font-size:${s.size || 76}px;line-height:1.04;letter-spacing:-.022em;font-weight:700;margin-top:${s.big ? 64 : 0}px}
ul{list-style:none;padding:0;margin-top:48px;border-top:2px solid #ddd4c4}
li{font-size:38px;line-height:1.36;color:#2b2926;padding:30px 0;border-bottom:2px solid #ddd4c4;display:flex;gap:22px}
li b{color:#1b1b1b}
li i{font-style:normal;color:${acc};font-weight:700;flex:none;width:30px}
</style></head><body><div class="bar"></div>
<div class="top"><span class="num">${String(i).padStart(2, "0")}</span><span class="rule"></span><span class="tp">${esc(g.kicker)}</span></div>
<div class="in">${s.big ? `<div class="big">${String(s.big).replace(/₩/g, '<span class="cur">₩</span>')}</div>${s.bigSub ? `<p class="bigs">${s.bigSub}</p>` : ""}` : ""}<h2 class="serif">${s.title}</h2>
${s.points ? `<ul>${s.points.map(p => `<li><i>—</i><span>${p}</span></li>`).join("")}</ul>` : ""}</div>
${foot(`${i} / ${n - 1}`)}</body></html>`;
}
function thumbHtml(g) {
  const [room, acc] = ROOM[g.room];
  const css = cardCss(acc).replace("W", "1200px").replace("H", "630px");
  return `<!doctype html><html><head><meta charset="utf-8">${FONTS}${css}<style>
.bar{width:14px}
.ph{position:absolute;right:0;top:0;width:640px;height:630px;object-fit:cover}
.pn{position:absolute;left:14px;top:0;width:546px;height:630px;padding:58px 46px 0 56px}
.eb{color:${acc};font-weight:700;font-size:18px;letter-spacing:.16em;text-transform:uppercase;margin-bottom:22px}
h1{font-size:${g.thumbSize || 54}px;line-height:1.04;letter-spacing:-.025em;font-weight:700}
.foot{left:70px;bottom:46px;right:auto}.foot img{width:44px;height:44px}.foot .nm{font-size:30px}
</style></head><body><div class="bar"></div>
<div class="pn"><div class="eb">${room} · Guide</div><h1 class="serif">${nw(g.thumbTitle || g.cards[0].title)}</h1></div>
<img class="ph" src="file://${g.heroSrc}">${foot("")}</body></html>`;
}

// ---------------------------------------------------------------- pages
const head = ({ title, desc, url, img, ld, room }) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${url}">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,700&family=Inter:wght@400;500;600;700&family=Noto+Sans+KR:wght@500;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/assets/nunchi.css?v=${VER}"><meta property="og:url" content="${url}"><meta property="og:type" content="article">
<meta name="theme-color" content="#f6f1e7"><link rel="icon" href="/img/favicon.png" type="image/png"><link rel="apple-touch-icon" href="/img/apple-touch-icon.png">
<meta property="og:title" content="${esc(title.replace(/ \| Nunchi$/, ""))}"><meta property="og:description" content="${esc(desc)}"><meta property="og:image" content="${img}"><meta name="twitter:card" content="summary_large_image">
${ld.map(o => `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, "\\u003c")}</script>`).join("\n")}
<meta name="google-adsense-account" content="ca-pub-8862930962343176"><script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-8862930962343176" crossorigin="anonymous"></script>
<meta name="apple-itunes-app" content="app-id=6816771391">
</head>
<body data-root="/" data-room="${room}">
<main class="wrap narrow guide">
`;
const FOOT = `</main>
<script src="/assets/nunchi.js?v=${VER}"></script>
<script>
document.querySelectorAll(".g-cards").forEach(w=>{const s=w.querySelector(".g-strip"),c=w.querySelector(".g-count"),n=s.children.length;
const at=()=>Math.round(s.scrollLeft/s.children[0].getBoundingClientRect().width*1)+1;
s.addEventListener("scroll",()=>{c.textContent=Math.min(at(),n)+" / "+n},{passive:true});
w.querySelectorAll("[data-go]").forEach(b=>b.onclick=()=>s.scrollBy({left:(+b.dataset.go)*s.children[0].getBoundingClientRect().width+(+b.dataset.go)*12,behavior:"smooth"}));});
</script>
</body>
</html>
`;
const JUSEYO = `<section class="juseyo"><img src="/img/juseyo-icon.png" alt="Juseyo app icon" width="56" height="56" loading="lazy"><div><b>Say it in Korean when you get there</b><span>Juseyo is our survival-Korean app: the exact sentences for the café, taxi, pharmacy and phone shop, with native audio. Free to start, works offline.</span></div><a class="btn" href="https://apps.apple.com/app/juseyo/id6816771391" target="_blank" rel="noopener">Get Juseyo on iPhone</a></section>`;
const fmtDate = d => new Date(d + "T00:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

function page(g) {
  const url = `${ORIGIN}/guide/${g.slug}/`, [room] = ROOM[g.room];
  const words = strip(g.body).split(/\s+/).length, mins = Math.max(3, Math.round(words / 220));
  const ld = [
    { "@context": "https://schema.org", "@type": "Article", headline: g.h1, description: g.desc, image: [`${ORIGIN}/guide/${g.slug}/thumb.jpg`, `${ORIGIN}/guide/${g.slug}/hero.jpg`],
      datePublished: g.published, dateModified: g.updated || g.published, author: { "@type": "Organization", name: "Nunchi", url: ORIGIN + "/about/" },
      publisher: { "@type": "Organization", name: "Nunchi", logo: { "@type": "ImageObject", url: ORIGIN + "/img/icon-512.png" } }, mainEntityOfPage: url },
    { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
      { "@type": "ListItem", position: 1, name: "Nunchi", item: ORIGIN + "/" }, { "@type": "ListItem", position: 2, name: "Guides", item: ORIGIN + "/guide/" }, { "@type": "ListItem", position: 3, name: g.short }] },
  ];
  if (g.faq) ld.push({ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: g.faq.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: strip(a) } })) });
  const n = g.cards.length;
  const others = guides.filter(o => o.slug !== g.slug);
  return head({ title: g.title, desc: g.desc, url, img: `${ORIGIN}/guide/${g.slug}/thumb.jpg`, ld, room: g.room }) + `
  <div class="crumbs"><a href="/">Nunchi</a> › <a href="/guide/">Guides</a> › ${esc(g.short)}</div>
  <header class="g-head">
    <div class="eyebrow">${room} · Guide</div>
    <h1>${g.h1}</h1>
    <p class="dek">${g.dek}</p>
    <div class="g-meta"><span>${mins} min read</span><span>Checked ${fmtDate(g.updated || g.published)}</span></div>
  </header>
  <figure class="g-hero"><img src="/guide/${g.slug}/hero.jpg" alt="${esc(g.heroAlt)}" width="1600" height="1063" fetchpriority="high"></figure>

  <section class="g-cards" aria-label="${esc(g.short)} at a glance">
    <div class="g-cards-top"><b>At a glance</b><span class="g-count">1 / ${n}</span><button type="button" data-go="-1" aria-label="Previous card">←</button><button type="button" data-go="1" aria-label="Next card">→</button></div>
    <div class="g-strip">${g.cards.map((c, i) => `<img src="/guide/${g.slug}/cards/${String(i + 1).padStart(2, "0")}.jpg" alt="${esc(strip(c.title) + (c.points ? ": " + c.points.map(strip).join("; ") : c.text ? ": " + strip(c.text) : ""))}" width="1080" height="1350" loading="${i < 2 ? "eager" : "lazy"}">`).join("")}</div>
  </section>

  <div class="g-short"><b>The short version</b><ul>${g.tldr.map(t => `<li>${t}</li>`).join("")}</ul></div>

  <article class="g-body">
${g.body}
  </article>
${g.tool ? `
  <a class="g-tool" href="${g.tool.href}"><span class="tag">Free tool</span><b>${g.tool.title}</b><span>${g.tool.text}</span><i aria-hidden="true">→</i></a>` : ""}
${g.faq ? `
  <section class="faq"><h2>Questions people ask</h2>
${g.faq.map(([q, a]) => `    <details><summary>${esc(q)}</summary><p>${a}</p></details>`).join("\n")}
  </section>` : ""}

  ${JUSEYO}

  <section class="g-sources"><h2>Sources</h2><ul>${g.sources.map(([t, u]) => `<li><a href="${u}" rel="noopener" target="_blank">${t}</a></li>`).join("")}</ul>
  <p class="note">Prices and rules change. We check every guide against official sources; last checked ${fmtDate(g.updated || g.published)}. Spot something out of date? <a href="/contact/">Tell us</a>.</p></section>
${others.length ? `
  <section class="related"><h2>More guides</h2><div class="g-grid">${others.map(tile).join("")}</div></section>` : ""}
` + FOOT;
}
const tile = o => `<a class="g-tile" href="/guide/${o.slug}/"><img src="/guide/${o.slug}/thumb.jpg" alt="" width="1200" height="630" loading="lazy"><span class="tag">${ROOM[o.room][0]} · Guide</span><b>${o.short}</b><span>${o.card}</span></a>`;

function hub() {
  const url = ORIGIN + "/guide/";
  const ld = [{ "@context": "https://schema.org", "@type": "CollectionPage", name: "Korea travel guides", url, hasPart: guides.map(g => ({ "@type": "Article", headline: g.h1, url: `${ORIGIN}/guide/${g.slug}/` })) }];
  return head({ title: "Korea Travel Guides — short, checked, no fluff | Nunchi", desc: "Short Korea guides for travellers: seeing a doctor, getting from Incheon Airport to Seoul, eSIM or SIM. Checked against official sources, with real prices.", url, img: `${ORIGIN}/guide/${guides[0].slug}/thumb.jpg`, ld, room: "visit" }).replace('class="wrap narrow guide"', 'class="wrap guide"') + `
  <div class="crumbs"><a href="/">Nunchi</a> › Guides</div>
  <header class="g-head hub"><div class="eyebrow">Guides</div><h1>Korea, explained briefly</h1>
  <p class="dek">The questions every first trip runs into, answered in a few minutes. Real prices, official sources, and what a Korean friend would tell you.</p></header>
  <div class="g-grid big">${guides.map(tile).join("")}</div>
` + FOOT;
}

// ---------------------------------------------------------------- write
fs.mkdirSync(TMP, { recursive: true });
const jobs = [];
for (const g of guides) {
  const dir = path.join(SITE, "guide", g.slug); fs.mkdirSync(path.join(dir, "cards"), { recursive: true });
  fs.writeFileSync(path.join(dir, "index.html"), page(g));
  g.cards.forEach((c, i) => {
    const f = path.join(TMP, `${g.slug}-${i + 1}.html`); fs.writeFileSync(f, slideHtml(g, c, i + 1, g.cards.length));
    jobs.push({ html: f, out: path.join(dir, "cards", String(i + 1).padStart(2, "0") + ".jpg"), w: 1080, h: 1350 });
  });
  const tf = path.join(TMP, `${g.slug}-thumb.html`); fs.writeFileSync(tf, thumbHtml(g));
  jobs.push({ html: tf, out: path.join(dir, "thumb.jpg"), w: 1200, h: 630 });
  // 웹용 히어로: 1600px JPEG
  const hero = path.join(dir, "hero.jpg");
  if (!fs.existsSync(hero) || fs.statSync(hero).mtimeMs < fs.statSync(g.heroSrc).mtimeMs)
    execFileSync("python3", ["-c", `from PIL import Image;im=Image.open(${JSON.stringify(g.heroSrc)}).convert("RGB");im=im.resize((1600,round(im.height*1600/im.width)),Image.LANCZOS);im.save(${JSON.stringify(hero)},quality=84,optimize=True,progressive=True)`]);
}
fs.mkdirSync(path.join(SITE, "guide"), { recursive: true });
fs.writeFileSync(path.join(SITE, "guide/index.html"), hub());
// 홈 화면 Guides 섹션
const HOME = path.join(SITE, "index.html"), home = fs.readFileSync(HOME, "utf8");
fs.writeFileSync(HOME, home.replace(/<!--guides-->[\s\S]*?<!--\/guides-->/, `<!--guides-->
  <div class="g-home-head"><h2>Guides</h2><a href="/guide/">All guides →</a></div>
  <div class="g-grid">${guides.slice(0, 3).map(tile).join("")}</div>
  <!--/guides-->`));
fs.writeFileSync(path.join(TMP, "jobs.json"), JSON.stringify(jobs, null, 1));
console.log(`guides: ${guides.length} pages + hub`);
if (process.argv.includes("--render")) execFileSync("node", [path.join(ROOT, "render.js"), path.join(TMP, "jobs.json")], { stdio: "inherit" });

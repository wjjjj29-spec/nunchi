#!/usr/bin/env node
// 롱테일 나이 페이지: /idols/<slug>/ (K-pop 아이돌 100명) + /korean-age/born-<year>/ (1950–2025) + 허브 2개
// 데이터: tools/kpop-idol-age-calculator 의 G 객체(단일 출처). 실행: node scripts/build-age-pages.js
const fs = require("fs"), path = require("path");
const SITE = path.join(__dirname, "..", "site"), ORIGIN = "https://hellonunchi.com", VER = "20261019b";
const NOW = new Date("2026-10-15T00:00:00Z"), Y = NOW.getUTCFullYear(), CHECKED = "15 October 2026";
const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const slug = s => s.toLowerCase().replace(/[()]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

// ---------------------------------------------------------------- data
const src = fs.readFileSync(path.join(SITE, "tools/kpop-idol-age-calculator/index.html"), "utf8");
const G = eval("(" + src.match(/const G=(\{[\s\S]*?\});\n/)[1] + ")");
const MALE = new Set(["BTS", "Stray Kids", "ENHYPEN", "TXT", "SEVENTEEN"]);
const SOLO_MALE = new Set(["G-Dragon", "Zico"]);
const IDOLS = [];
for (const g in G) for (const m of G[g][1]) {
  const male = g === "Solo" ? SOLO_MALE.has(m[0]) : MALE.has(g);
  IDOLS.push({ name: m[0], dob: m[1], group: g, debut: m[2] || G[g][0], male, slug: slug(m[0]) });
}
const ANIMALS = [["Rat", "쥐"], ["Ox", "소"], ["Tiger", "호랑이"], ["Rabbit", "토끼"], ["Dragon", "용"], ["Snake", "뱀"], ["Horse", "말"], ["Goat", "양"], ["Monkey", "원숭이"], ["Rooster", "닭"], ["Dog", "개"], ["Pig", "돼지"]];
const animalOfYear = y => ANIMALS[((y - 1900) % 12 + 12) % 12];
// 설날(음력 1월 1일) — 띠 경계. 아이돌 생년 범위만
const SEOLLAL = { 1985: "02-20", 1986: "02-09", 1987: "01-29", 1988: "02-17", 1989: "02-06", 1990: "01-27", 1991: "02-15", 1992: "02-04", 1993: "01-23", 1994: "02-10", 1995: "01-31", 1996: "02-19", 1997: "02-07", 1998: "01-28", 1999: "02-16", 2000: "02-05", 2001: "01-24", 2002: "02-12", 2003: "02-01", 2004: "01-22", 2005: "02-09", 2006: "01-29", 2007: "02-18", 2008: "02-07", 2009: "01-26", 2010: "02-14" };
const animalOfDate = dob => { const y = +dob.slice(0, 4), md = dob.slice(5); return animalOfYear(SEOLLAL[y] && md < SEOLLAL[y] ? y - 1 : y); };
const SIGNS = [["Capricorn", "01-19"], ["Aquarius", "02-18"], ["Pisces", "03-20"], ["Aries", "04-19"], ["Taurus", "05-20"], ["Gemini", "06-20"], ["Cancer", "07-22"], ["Leo", "08-22"], ["Virgo", "09-22"], ["Libra", "10-22"], ["Scorpio", "11-21"], ["Sagittarius", "12-21"], ["Capricorn", "12-31"]];
const westSign = dob => SIGNS.find(([, end]) => dob.slice(5) <= end)[0];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const fmt = d => `${+d.slice(8, 10)} ${MONTHS[+d.slice(5, 7) - 1]} ${d.slice(0, 4)}`;
const intlAge = (dob, at = NOW) => { const b = new Date(dob + "T00:00:00Z"); let a = at.getUTCFullYear() - b.getUTCFullYear(); if (at.getUTCMonth() < b.getUTCMonth() || (at.getUTCMonth() === b.getUTCMonth() && at.getUTCDate() < b.getUTCDate())) a--; return a; };
const K = h => `<span lang="ko" class="ko">${h}</span>`;

// ---------------------------------------------------------------- shared shell
const head = ({ title, desc, url, ld, room, img, noindex }) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${url}">${noindex ? '\n<meta name="robots" content="noindex,follow">' : ""}
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,700&family=Inter:wght@400;500;600;700&family=Noto+Sans+KR:wght@500;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/assets/nunchi.css?v=${VER}"><meta property="og:url" content="${url}"><meta property="og:type" content="website">
<meta name="theme-color" content="#f6f1e7"><link rel="icon" href="/img/favicon.png" type="image/png"><link rel="apple-touch-icon" href="/img/apple-touch-icon.png">
<meta property="og:title" content="${esc(title.replace(/ \| Nunchi$/, ""))}"><meta property="og:description" content="${esc(desc)}"><meta property="og:image" content="${ORIGIN}/img/${img}">
${ld.map(o => `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, "\\u003c")}</script>`).join("\n")}
${noindex ? "" : `<meta name="google-adsense-account" content="ca-pub-8862930962343176"><script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-8862930962343176" crossorigin="anonymous"></script>`}
<meta name="apple-itunes-app" content="app-id=6816771391">
</head>
<body data-root="/" data-room="${room}">
<main class="wrap narrow">
`;
const FOOT = (extra = "") => `</main>
<script src="/assets/nunchi.js?v=${VER}"></script>${extra}
</body>
</html>
`;
const crumbs = items => ({ "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: items.map(([name, item], i) => Object.assign({ "@type": "ListItem", position: i + 1, name }, item ? { item: ORIGIN + item } : {})) });
const faqLd = faq => ({ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a.replace(/<[^>]+>/g, "") } })) });
const faqHtml = faq => `<section class="faq"><h2>Questions people ask</h2>\n${faq.map(([q, a]) => `    <details><summary>${esc(q)}</summary><p>${a}</p></details>`).join("\n")}\n  </section>`;
// 오늘 날짜로 나이를 다시 계산하는 작은 스크립트 (정적 값은 빌드일 기준 폴백)
const LIVE = `\n<script>(function(){var t=new Date();document.querySelectorAll("[data-dob]").forEach(function(e){var b=new Date(e.dataset.dob+"T00:00:00"),a=t.getFullYear()-b.getFullYear();if(t.getMonth()<b.getMonth()||(t.getMonth()===b.getMonth()&&t.getDate()<b.getDate()))a--;var k=e.dataset.k;if(k==="intl")e.textContent=a;else if(k==="kor")e.textContent=t.getFullYear()-b.getFullYear()+1;else if(k==="year")e.textContent=t.getFullYear()-b.getFullYear();else if(k==="next"){var n=new Date(t.getFullYear(),b.getMonth(),b.getDate());if(n<new Date(t.getFullYear(),t.getMonth(),t.getDate()))n.setFullYear(t.getFullYear()+1);var d=Math.round((n-new Date(t.getFullYear(),t.getMonth(),t.getDate()))/864e5);e.textContent=d===0?"Today":d+" days";}});})();</script>`;
const write = (rel, html) => { const d = path.join(SITE, rel); fs.mkdirSync(d, { recursive: true }); fs.writeFileSync(path.join(d, "index.html"), html); };
const urls = [];

// 티켓 알림 가입 박스 (아이돌 페이지 → api.hellonunchi.com Worker)
const alertBox = m => { const solo = m.group === "Solo", who = solo ? m.name : m.group, artists = solo ? m.name : `${m.group}, ${m.name}`;
  return `<form class="panel tk-box" method="POST" action="https://api.hellonunchi.com/api/tickets/signup" onsubmit="if(window.gtag)gtag('event','tickets_signup_start',{src:'idol'})">
    <input type="hidden" name="artists" value="${esc(artists)}"><input type="hidden" name="types" value="fanmeeting"><input type="hidden" name="src" value="idol:${m.slug}">
    <input type="text" name="_honey" style="display:none" tabindex="-1" autocomplete="off">
    <span class="tag">Free · Ticket alerts</span>
    <b>Know the moment ${esc(who)} tickets open in Korea</b>
    <span class="tk-sub">Concerts and fan meetings, summed up in English: the open time in your time zone, who can buy in each round, and whether overseas fans can get in.</span>
    <div class="tk-row"><input type="email" name="email" required placeholder="you@example.com" aria-label="Email"><input type="text" name="country" placeholder="Your city" aria-label="City"><button class="btn" type="submit">Alert me</button></div>
    <span class="disc">Free, one-click unsubscribe. <a href="/tickets/">How it works</a></span>
  </form>`; };
// ---------------------------------------------------------------- idol pages
const byGroup = g => IDOLS.filter(m => m.group === g).sort((a, b) => a.dob.localeCompare(b.dob));
for (const m of IDOLS) {
  const url = `${ORIGIN}/idols/${m.slug}/`, by = +m.dob.slice(0, 4);
  const ia = intlAge(m.dob), ka = Y - by + 1, ya = Y - by;
  const [an, ak] = animalOfDate(m.dob), sign = westSign(m.dob);
  const solo = m.group === "Solo", grp = solo ? "solo artist" : m.group;
  const members = solo ? [] : byGroup(m.group), rank = members.findIndex(x => x.name === m.name);
  const role = solo ? "" : rank === 0 ? `the eldest member of ${m.group}` : rank === members.length - 1 ? `the maknae (youngest member) of ${m.group}` : `number ${rank + 1} of ${members.length} in ${m.group} by age`;
  const sameYear = IDOLS.filter(x => x !== m && +x.dob.slice(0, 4) === by);
  const debutY = m.debut ? +m.debut.slice(0, 4) : null;
  const callF = m.male ? "oppa (오빠)" : "unnie (언니)", callM = m.male ? "hyung (형)" : "noona (누나)";
  const desc = `${m.name}${solo ? "" : ` (${m.group})`} was born on ${fmt(m.dob)}: ${ia} in international age and ${ka} in Korean age in ${Y}. Birthday countdown, zodiac, debut year and ${solo ? "fellow" : "member"} ages.`;
  const faq = [
    [`How old is ${m.name} in ${Y}?`, `${m.name} was born on ${fmt(m.dob)}, so ${m.name} is ${ia} in international age as of ${CHECKED} and ${ka} in traditional Korean age (${ya} in "year age").`],
    [`What is ${m.name}'s Korean age?`, `${ka} in ${Y}. Korean age counts you as one at birth and adds a year every 1 January, so it is one or two years above international age. Since June 2023 official documents use international age.`],
    [`When is ${m.name}'s birthday?`, `${fmt(m.dob).replace(/ \d{4}$/, "")}. ${m.name} was born in ${by}, the year of the ${an} (${ak}띠).`],
  ];
  if (!solo) faq.push([`Is ${m.name} the oldest or the youngest in ${m.group}?`, rank === 0 ? `${m.name} is the oldest member of ${m.group}.` : rank === members.length - 1 ? `${m.name} is the maknae, the youngest member of ${m.group}.` : `Neither. ${m.name} is number ${rank + 1} of ${members.length} by age; ${members[0].name} is the oldest and ${members.at(-1).name} is the maknae.`]);
  const ld = [crumbs([["Nunchi", "/"], ["K-pop idol ages", "/idols/"], [m.name]]), faqLd(faq)];
  const body = `
  <div class="crumbs"><a href="/">Nunchi</a> › <a href="/idols/">K-pop idol ages</a> › ${esc(m.name)}</div>
  <section class="tool-head">
    <div class="eyebrow">Love · K-pop age</div>
    <h1>${esc(m.name)} age: Korean age, birthday and zodiac</h1>
    <p>${esc(m.name)}${solo ? ", the solo artist," : ` of ${esc(m.group)}`} was born on <b>${fmt(m.dob)}</b>. That makes ${esc(m.name)} <b><span data-dob="${m.dob}" data-k="intl">${ia}</span></b> in international age and <b><span data-dob="${m.dob}" data-k="kor">${ka}</span></b> in Korean age.</p>
  </section>
  <div class="result-grid">
    <div class="stat"><div class="k">International age</div><div class="v"><span data-dob="${m.dob}" data-k="intl">${ia}</span></div><div class="d">Passport age, used officially since 2023</div></div>
    <div class="stat"><div class="k">Korean age</div><div class="v"><span data-dob="${m.dob}" data-k="kor">${ka}</span></div><div class="d">Fan cafés and older profiles</div></div>
    <div class="stat"><div class="k">Next birthday</div><div class="v"><span data-dob="${m.dob}" data-k="next">${fmt(m.dob).replace(/ \d{4}$/, "")}</span></div><div class="d">${fmt(m.dob).replace(/ \d{4}$/, "")}</div></div>
    <div class="stat"><div class="k">Zodiac</div><div class="v" style="font-size:26px">${an} ${K(ak + "띠")}</div><div class="d">${sign} by star sign</div></div>
    ${debutY ? `<div class="stat"><div class="k">Debut</div><div class="v">${debutY}</div><div class="d">${fmt(m.debut)}, ${Y - debutY} years ago</div></div>` : ""}
    ${role ? `<div class="stat"><div class="k">In ${esc(m.group)}</div><div class="v" style="font-size:24px">${rank === 0 ? "Eldest" : rank === members.length - 1 ? "Maknae" : `#${rank + 1} of ${members.length}`}</div><div class="d">By birth date</div></div>` : ""}
  </div>
${!solo ? `
  <h2>${esc(m.group)} members by age</h2>
  <table><thead><tr><th>Member</th><th>Born</th><th>Age</th><th>Korean age</th></tr></thead><tbody>
${members.map(x => `    <tr${x === m ? ' class="hl"' : ""}><td>${x === m ? `<b>${esc(x.name)}</b>` : `<a href="/idols/${x.slug}/">${esc(x.name)}</a>`}</td><td>${fmt(x.dob)}</td><td class="num"><span data-dob="${x.dob}" data-k="intl">${intlAge(x.dob)}</span></td><td class="num"><span data-dob="${x.dob}" data-k="kor">${Y - +x.dob.slice(0, 4) + 1}</span></td></tr>`).join("\n")}
  </tbody></table>
  <p>${esc(m.name)} is ${role}. In Korean groups, age order matters: the eldest often looks after everyone, and the maknae gets teased and spoiled in equal measure.</p>` : ""}

  ${alertBox(m)}

  <h2>What would you call ${esc(m.name)}?</h2>
  <p>In Korean you don't use the name alone for someone older. If you are younger than ${esc(m.name)}, a woman would say <b>${callF}</b> and a man would say <b>${callM}</b>. If you are older, ${esc(m.name)} would be calling <i>you</i> that. Born the same year? You're 동갑 (dong-gap), and first names are fine.</p>
  <a class="g-tool" href="/tools/what-do-i-call-them/"><span class="tag">Free tool</span><b>Oppa, unnie, hyung or noona?</b><span>Enter two birthdays and get the right word, including the 빠른년생 exception.</span><i aria-hidden="true">→</i></a>
${sameYear.length ? `
  <h2>Also born in ${by}</h2>
  <div class="chips">${sameYear.map(x => `<a class="chip" href="/idols/${x.slug}/">${esc(x.name)} <span>${esc(x.group === "Solo" ? "solo" : x.group)}</span></a>`).join("")}</div>` : ""}
  <p class="note"><a href="/korean-age/born-${by}/">Everyone born in ${by}: Korean age, zodiac and school year →</a></p>

  ${faqHtml(faq)}
  <p class="note">Birth and debut dates from agency profiles. Ages update automatically; last checked ${CHECKED}. <a href="/contact/">Spot a mistake?</a></p>
  <section class="related"><div class="grid">
    <a class="card" href="/tools/kpop-idol-age-calculator/"><span class="tag">Love</span><b>K-pop Idol Age Calculator</b><span>Compare any idol with your own age.</span></a>
    <a class="card" href="/idols/"><span class="tag">Love</span><b>All K-pop idol ages</b><span>${IDOLS.length} idols by group, eldest to maknae.</span></a>
  </div></section>
`;
  write(`idols/${m.slug}`, head({ title: `${m.name} Age ${Y}: Korean Age, Birthday & Zodiac${solo ? "" : ` (${m.group})`} | Nunchi`, desc, url, ld, room: "love", img: "idol-age.jpg", noindex: true }) + body + FOOT(LIVE));
  // noindex: 같은 틀로 만든 페이지라 애드센스 저가치 위험, 사이트맵엔 허브만
}
// hub
{
  const url = ORIGIN + "/idols/";
  const groups = Object.keys(G);
  const body = `
  <div class="crumbs"><a href="/">Nunchi</a> › K-pop idol ages</div>
  <section class="tool-head"><div class="eyebrow">Love · K-pop age</div><h1>K-pop idol ages, eldest to maknae</h1>
  <p>Birthdays, international age and Korean age for ${IDOLS.length} idols in ${groups.length - 1} groups plus solo artists. Ages update to today.</p></section>
${groups.map(g => `  <h2>${esc(g === "Solo" ? "Solo artists" : g)}</h2>
  <div class="chips">${(g === "Solo" ? IDOLS.filter(x => x.group === g) : byGroup(g)).map(x => `<a class="chip" href="/idols/${x.slug}/">${esc(x.name)} <span><span data-dob="${x.dob}" data-k="intl">${intlAge(x.dob)}</span></span></a>`).join("")}</div>`).join("\n")}
  <a class="g-tool" href="/tools/kpop-idol-age-calculator/"><span class="tag">Free tool</span><b>Compare your age with any idol</b><span>Who's older, by how much, and what you'd call them.</span><i aria-hidden="true">→</i></a>
`;
  write("idols", head({ title: `K-pop Idol Ages ${Y}: ${IDOLS.length} Idols by Group, Korean Age | Nunchi`, desc: `Ages and birthdays of ${IDOLS.length} K-pop idols: BTS, BLACKPINK, Stray Kids, NewJeans, aespa, TWICE, IVE and more, in international and Korean age, eldest to maknae.`, url, ld: [crumbs([["Nunchi", "/"], ["K-pop idol ages"]])], room: "love", img: "idol-age.jpg" }) + body + FOOT(LIVE));
  urls.push("idols/");
}

// ---------------------------------------------------------------- birth-year pages
const Y0 = 1950, Y1 = 2025;
for (let by = Y0; by <= Y1; by++) {
  const url = `${ORIGIN}/korean-age/born-${by}/`;
  const ka = Y - by + 1, ya = Y - by, ia0 = Y - by - 1, ia1 = Y - by;
  const [an, ak] = animalOfYear(by), [pan, pak] = animalOfYear(by - 1);
  const yy = String(by).slice(2), uni = by + 19, school1 = by + 7;
  const idols = IDOLS.filter(x => +x.dob.slice(0, 4) === by);
  const ppareun = by <= 2002;
  // 2026 학년: 초1 = 만 7살 되는 해 3월 입학
  const grade = Y - school1 + 1;
  const schoolNow = grade < 1 ? null : grade <= 6 ? `elementary school year ${grade} (${K(`초${grade}`)})` : grade <= 9 ? `middle school year ${grade - 6} (${K(`중${grade - 6}`)})` : grade <= 12 ? `high school year ${grade - 9} (${K(`고${grade - 9}`)})` : null;
  const desc = `Born in ${by}? In ${Y} your Korean age is ${ka}, your international age is ${ia0} or ${ia1} depending on your birthday, and you are a ${yy}년생, year of the ${an}.`;
  const faq = [
    [`How old is someone born in ${by} in Korean age?`, `${ka} in ${Y}. Korean age is the current year minus the birth year, plus one.`],
    [`What is the international age of someone born in ${by}?`, `${ia0} until their birthday in ${Y}, then ${ia1}.`],
    [`What zodiac animal is ${by}?`, `The ${an} (${ak}띠). If you were born in January or early February, before Lunar New Year, Koreans count you as the ${pan} (${pak}띠) instead.`],
  ];
  const ld = [crumbs([["Nunchi", "/"], ["Korean age by birth year", "/korean-age/"], [`Born in ${by}`]]), faqLd(faq)];
  const near = [by - 2, by - 1, by + 1, by + 2].filter(y => y >= Y0 && y <= Y1);
  const body = `
  <div class="crumbs"><a href="/">Nunchi</a> › <a href="/korean-age/">Korean age by birth year</a> › Born in ${by}</div>
  <section class="tool-head">
    <div class="eyebrow">Live · Korean age</div>
    <h1>Born in ${by}: your Korean age in ${Y}</h1>
    <p>If you were born in ${by}, you are <b>${ka}</b> in Korean age in ${Y}, and <b>${ia0}</b> or <b>${ia1}</b> in international age depending on whether your birthday has passed.</p>
  </section>
  <div class="result-grid">
    <div class="stat"><div class="k">Korean age</div><div class="v">${ka}</div><div class="d">Everyone born in ${by}, all year</div></div>
    <div class="stat"><div class="k">International age</div><div class="v">${ia0} → ${ia1}</div><div class="d">Before → after your ${Y} birthday</div></div>
    <div class="stat"><div class="k">Year age</div><div class="v">${ya}</div><div class="d">${K("연 나이")}: alcohol, cigarettes, military</div></div>
    <div class="stat"><div class="k">You are a</div><div class="v" style="font-size:28px">${K(yy + "년생")}</div><div class="d">"${yy}-nyeonsaeng", how Koreans say it</div></div>
    <div class="stat"><div class="k">Zodiac</div><div class="v" style="font-size:26px">${an} ${K(ak + "띠")}</div><div class="d">${pan} if born before Lunar New Year</div></div>
  </div>

  <h2>Which age do Koreans actually use?</h2>
  <p>Since June 2023, laws and official documents use international age, so your passport age is your legal age in Korea too. But people still ask <i>"몇 년생이에요?"</i> (what year were you born?) instead of "how old are you?". Answer <b>${K(yy + "년생이에요")}</b> and everyone knows exactly where you fit, because in Korea the birth year, not the birthday, decides who is older.</p>
  <p>Year age (${ya} in ${Y}) still decides when you can buy alcohol and cigarettes (from year age 19) and when men are called up for military service.</p>

  <h2>The ${yy}-year-olds at school</h2>
  <p>Korean children born in ${by} started elementary school in March ${school1}${by + 19 <= Y ? ` and, if they went straight to university, entered in ${uni} as <b>${K(String(uni).slice(2) + "학번")}</b> (${String(uni).slice(2)} "hakbeon", the university entry year Koreans use as a second age label)` : `${schoolNow ? ` and in ${Y} are in ${schoolNow}` : ""}`}.</p>
${ppareun ? `  <div class="tip"><span class="eye" aria-hidden="true"></span><div><b>빠른년생: the January–February exception</b><p>Until 2009, children born in January and February started school a year early with the previous year's class. So someone born in early ${by} may call themselves a ${String(by - 1).slice(2)}년생 and be friends, not juniors, with people born in ${by - 1}. It's called 빠른년생 (ppareun nyeonsaeng) and it still confuses Korean friend groups.</p></div></div>` : ""}

  <h2>Who's older: oppa, unnie, hyung or noona?</h2>
  <p>Anyone born before ${by} is older than you in Korea, even if their birthday is in December and yours is in January. Someone born in ${by} too is your 동갑 (same age), and you can drop the honorifics.</p>
  <a class="g-tool" href="/tools/what-do-i-call-them/"><span class="tag">Free tool</span><b>What do I call them?</b><span>Two birthdays in, the right word out.</span><i aria-hidden="true">→</i></a>
${idols.length ? `
  <h2>K-pop idols born in ${by}</h2>
  <div class="chips">${idols.map(x => `<a class="chip" href="/idols/${x.slug}/">${esc(x.name)} <span>${esc(x.group === "Solo" ? "solo" : x.group)}</span></a>`).join("")}</div>` : ""}

  <h2>Know your exact birthday?</h2>
  <a class="g-tool" href="/tools/korean-age-calculator/"><span class="tag">Free tool</span><b>Korean Age Calculator</b><span>All three ages to the day, and where each one is still used.</span><i aria-hidden="true">→</i></a>

  ${faqHtml(faq)}
  <p class="note">Other years: ${near.map(y => `<a href="/korean-age/born-${y}/">${y}</a>`).join(" · ")} · <a href="/korean-age/">all years</a></p>
`;
  write(`korean-age/born-${by}`, head({ title: `Born in ${by}: Korean Age in ${Y} (and International Age) | Nunchi`, desc, url, ld, room: "live", img: "korean-age.jpg", noindex: true }) + body + FOOT());
  // noindex: 사이트맵 제외
}
{
  const url = ORIGIN + "/korean-age/";
  const decades = []; for (let d = 2020; d >= 1950; d -= 10) decades.push(d);
  const body = `
  <div class="crumbs"><a href="/">Nunchi</a> › Korean age by birth year</div>
  <section class="tool-head"><div class="eyebrow">Live · Korean age</div><h1>Korean age by birth year (${Y})</h1>
  <p>Pick your birth year to see your Korean age, international age, zodiac animal and what Koreans would call your year.</p></section>
${decades.map(d => `  <h2>${d}s</h2>\n  <div class="chips">${Array.from({ length: 10 }, (_, i) => d + i).filter(y => y >= Y0 && y <= Y1).reverse().map(y => `<a class="chip" href="/korean-age/born-${y}/">${y} <span>${Y - y + 1}</span></a>`).join("")}</div>`).join("\n")}
  <a class="g-tool" href="/tools/korean-age-calculator/"><span class="tag">Free tool</span><b>Korean Age Calculator</b><span>Your exact ages from your birthday.</span><i aria-hidden="true">→</i></a>
`;
  write("korean-age", head({ title: `Korean Age by Birth Year ${Y}: Chart from 1950 to 2025 | Nunchi`, desc: `Korean age chart for ${Y}: every birth year from 1950 to 2025 with Korean age, international age and zodiac animal.`, url, ld: [crumbs([["Nunchi", "/"], ["Korean age by birth year"]])], room: "live", img: "korean-age.jpg" }) + body + FOOT());
  urls.push("korean-age/");
}

// ---------------------------------------------------------------- sitemap
const smPath = path.join(SITE, "sitemap.xml"); let sm = fs.readFileSync(smPath, "utf8");
sm = sm.replace(/  <url><loc>https:\/\/hellonunchi\.com\/(idols|korean-age)\/[^\n]*\n/g, "");
sm = sm.replace("</urlset>", urls.map(u => `  <url><loc>${ORIGIN}/${u}</loc><lastmod>2026-10-15</lastmod><priority>0.6</priority></url>`).join("\n") + "\n</urlset>");
fs.writeFileSync(smPath, sm);
console.log(`idols: ${IDOLS.length} + hub, birth years: ${Y1 - Y0 + 1} + hub, sitemap +${urls.length}`);

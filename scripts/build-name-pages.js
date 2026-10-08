#!/usr/bin/env node
/* Programmatic SEO pages: /names/<slug>/ for every first name in site/assets/hangul-names.js,
   plus the /names/ A–Z hub. Also refreshes the /names/ block in site/sitemap.xml and the
   slug list injected into site/tools/my-name-in-hangul/index.html.

   Rerun:  node scripts/build-name-pages.js        (from the nunchi/ folder; no dependencies)
   Safe to rerun: it wipes and rewrites site/names/ and only touches the marked parts of the other two files. */
"use strict";
const fs = require("fs"), path = require("path"), vm = require("vm");

const SITE = path.join(__dirname, "..", "site");
const ORIGIN = "https://hellonunchi.com";
const LASTMOD = "2026-10-05";
const VER = "20261005";
const CHECKED = "October 2026";

// ---------------------------------------------------------------- data
const SRC = fs.readFileSync(path.join(SITE, "assets/hangul-names.js"), "utf8");
const ctx = { window: {} }; vm.runInNewContext(SRC, ctx);
const HN = ctx.window.HANGUL_NAMES;

// Parse the DICT literal ourselves so we know each entry's comment section and order.
const dictBody = SRC.slice(SRC.indexOf("const DICT = {"), SRC.indexOf("};", SRC.indexOf("const DICT = {")));
const ENTRIES = []; let section = "";
for (const line of dictBody.split("\n")) {
  const m = line.match(/\/\/ ---- (.*?) ----/); if (m) { section = m[1]; continue; }
  for (const mm of line.matchAll(/([a-z\u00e0-\u00ff]+)(\d*):"([^"]+)"/g)) ENTRIES.push({ key: mm[1], n: mm[2], hangul: mm[3], section, i: ENTRIES.length });
}
const isSurnameSection = s => /surname/i.test(s);

// Surnames that sit in the "other languages" lines (Chinese / Vietnamese family names): not first-name pages.
const SKIP_SURNAMES = new Set(["chen", "wang", "zhang", "liu", "yang", "huang", "zhao", "li", "nguyen"]);
// First names that live in the surname section of the dictionary, plus surnames widely used as given names.
const GIVEN_FROM_SURNAME_SECTION = new Set(["brooklyn", "kwame", "gwen", "marta",
  "taylor", "morgan", "bailey", "parker", "mitchell", "nelson", "jackson", "howard", "bennett", "reed", "perry", "brooks", "allen", "lewis"]);

const DISPLAY = { francois: "François", joao: "João", jose: "José", sinead: "Sinéad", roisin: "Róisín", padraig: "Pádraig",
  oisin: "Oisín", ciaran: "Ciarán", siobhan: "Siobhán", esme: "Esmé", joaquin: "Joaquín", dafydd: "Dafydd" };
const ALT_LABEL = { isabella: "the Spanish or Italian Isabella", chloe: "the French Chloé", martin: "the French Martin (mar-TAN)" };

// Language of the pronunciation Korean follows (default: English).
const LANG = {};
const tag = (lang, names) => names.split(" ").forEach(n => LANG[n] = lang);
tag("Irish", "siobhan niamh saoirse aoife caoimhe sinead eoin oisin ciaran tadhg roisin padraig aisling sean");
tag("Welsh", "rhys sian dafydd gwen");
tag("Spanish", "joaquin javier jorge jose guillermo ximena juan carlos luis miguel diego pablo sergio ana lucia sofia camila valentina mateo santiago marta");
tag("Portuguese", "joao thiago");
tag("French", "xavier guillaume jacques francois pierre jean louise camille manon antoine nicolas hugo louis isabelle");
tag("German", "hans klaus lukas jonas leon greta lena");
tag("Italian", "marco luca giulia francesca alessandro matteo giovanni");
tag("Russian", "ivan dmitri olga natasha sergei anastasia");
tag("Arabic", "mohammed muhammad ahmed ali omar fatima aisha hassan");
tag("Japanese", "yuki haruto sakura hina ren aoi kenji naoki");
tag("Chinese", "wei ming");
tag("Hindi", "raj priya arjun ananya rahul aditya neha vikram");
tag("Vietnamese", "minh linh anh thao huong");
tag("Akan (Ghana)", "kwame");
// Language notes: a base line plus clauses only for the letters this name actually has.
const listJoin = a => a.length < 2 ? a.join("") : a.slice(0, -1).join(", ") + " and " + a[a.length - 1];
const note = (base, cl, fallback, tail = "") => base + (cl.filter(Boolean).length ? ": " + listJoin(cl.filter(Boolean)) : fallback || "") + "." + tail;
const LANG_NOTE = {
  Irish: s => note("It is an Irish (Gaelic) name, and Irish spelling hides the sound", [/^s[ei]/.test(s) && "s before e or i is a sh sound", /bh/.test(s) && "bh is a v or w sound", /mh/.test(s) && "mh is a v sound", /dh/.test(s) && "dh is silent", "several vowels are silent"], "", " Korean writes what you hear, not the letters."),
  Welsh: s => note("It is a Welsh name, and Welsh spelling has its own rules", [/dd/.test(s) && "dd is the th in 'this'", /rh/.test(s) && "rh is an r", /^rh?y/.test(s) && "y is an 'ee' sound", /^si[aeiou]/.test(s) && "si before a vowel is a sh sound"], "", " Korean writes the Welsh sound."),
  Spanish: s => note("Korean writes Spanish names by their Spanish sound", ["vowels are read as written", /j/.test(s) && "j is an h sound (ㅎ)", /^x/.test(s) && "the Mexican x is an h sound (ㅎ)", /ll/.test(s) && "ll is a y sound", /r/.test(s) && "the r is pronounced (ㄹ/르) instead of being dropped as in English"]),
  Portuguese: s => note("Korean follows the Brazilian Portuguese sound", [/ti|thi/.test(s) && "t before i sounds like 'ch'", /o$/.test(s) && "a final o sounds like 'u'", /ao/.test(s) && "the nasal ão becomes 앙"]),
  French: (s, H) => note("Korean writes French names the French way", [/^h/.test(s) && "the h is silent", /u/.test(s) && /ㅟ|위/.test(H) && "u is the French 'ü' sound, written 위", /[aeiou]se$/.test(s) && "s between vowels is a z sound (즈)", /[sxtdzr]$/.test(s) && !/[스트드즈르]$/.test(H) && "the final consonant is silent", /(an|en|on|in)(?![aeiou])/.test(s) && "nasal vowels like 'an/on' end in ㅇ or ㄴ", /oi/.test(s) && "oi is a 'wa' sound", /ll/.test(s) && "ll is a y sound", /r/.test(s) && /르/.test(H) && "the r is pronounced (르)"], ", following French sounds rather than English ones"),
  German: s => note("Korean follows the German sound", [/j/.test(s) && "j is a y sound (Jonas → 요나스)", /w/.test(s) && "w is a v sound", "vowels are read as written"]),
  Italian: s => note("Korean follows the Italian sound", ["every vowel is pronounced", /g[ie]/.test(s) && "gi/ge are j sounds", /([bcdfglmnprstvz])\1/.test(s) && "double consonants are written once"]),
  Russian: () => "The Korean spelling comes from the Russian (Cyrillic) form, so it follows Russian pronunciation rather than the English letters.",
  Arabic: () => "Arabic names reach Korean through different romanizations, so Korean media spellings can vary; this is the common one.",
  Japanese: s => note("Korean writes Japanese names with its own Japanese table", [/^(k|t|ch)/.test(s) && "k, t and ch at the start of a word become ㄱ, ㄷ and ㅈ (Kenji → 겐지)", "each Japanese syllable maps to one Hangul syllable", "long vowels are not marked"]),
  Chinese: () => "Chinese names are written from the Mandarin (pinyin) sound using Korea's official pinyin table, not from the Korean reading of the characters.",
  Hindi: s => note("Korean follows the Hindi sound", ["vowels are read as written", /r/.test(s) && "the r is pronounced (ㄹ/르) rather than dropped as in English", /th|dh/.test(s) && "th/dh are breathy t/d sounds, not the English th"]),
  Vietnamese: () => "Korean has an official Vietnamese table: nh, ng and the vowel marks map to specific Hangul, which is why the spelling looks unexpected.",
  "Akan (Ghana)": () => "It is an Akan name from Ghana; Korean writes the kw cluster as one sound, 콰.",
};

// Hand-checked, name-specific extras (a meaning the Hangul spelling happens to have in Korean, etc.).
const FUN = {
  mia: "미아 is also the Korean word for a lost child (迷兒). Koreans notice, but it's still a well-liked name.",
  eugene: "유진 (Yu-jin) is also a popular Korean given name, so Koreans may assume you have a Korean name.",
  sarah: "세라 (Se-ra) also exists as a Korean given name, so it sounds familiar to Korean ears.",
  sara: "세라 (Se-ra) also exists as a Korean given name, so it sounds familiar to Korean ears.",
  noah: "노아 is also how Korean Bibles write Noah, as in 노아의 방주 (Noah's ark).",
  joe: "조 is also a common Korean family name (Cho/Jo), so 조 alone can sound like a surname.",
  minh: "민 is also a Korean family name and a very common syllable in Korean given names (민준, 민지).",
  jean: "장 is also one of the most common Korean family names (Jang), and a common word (장 = market, sauce, chapter).",
  bob: "밥 means cooked rice, or a meal, in Korean. 밥 먹었어? (\"Have you eaten?\") is a standard greeting, so expect jokes.",
  jim: "짐 means luggage or a burden in Korean. Friends will find this funnier than you do.",
  sam: "샘 means a spring (of water) in Korean, and 샘내다 means to be jealous.",
  hugh: "휴 is also the Korean sigh of relief (휴~), and 休 (rest) as in 휴가, vacation.",
  leigh: "리 is how North Korea writes the family name 이 (Lee), so it can read like a surname.",
  carl: "칼 means knife in Korean.",
  nick: "Calling Nick over, friends say 닉아, which comes out as 니가, the casual word for \"you\". It's a small, reliable joke.",
  zara: "자라 is the Korean word for a soft-shelled turtle.",
  tim: "팀 is also the Korean loanword for team (우리 팀, our team).",
  finn: "핀 is also the Korean loanword for a pin, like a hairpin (머리핀).",
};

// ---------------------------------------------------------------- pick the names
const byKey = {};
for (const e of ENTRIES) {
  if (!/^[a-z]+$/.test(e.key)) continue;                         // accented duplicates (siobhán)
  const surn = isSurnameSection(e.section);
  if (surn && !GIVEN_FROM_SURNAME_SECTION.has(e.key) && !byKey[e.key]) continue;
  if (SKIP_SURNAMES.has(e.key)) continue;
  if (!byKey[e.key]) {
    if (surn && !GIVEN_FROM_SURNAME_SECTION.has(e.key)) continue;
    byKey[e.key] = { slug: e.key, hangul: e.hangul, order: e.i, section: e.section, alts: [] };
  } else if (e.hangul !== byKey[e.key].hangul && !byKey[e.key].alts.includes(e.hangul)) byKey[e.key].alts.push(e.hangul);
}
const NAMES = Object.values(byKey).sort((a, b) => a.slug.localeCompare(b.slug));
const SKIPPED = ENTRIES.filter(e => !byKey[e.key] || (!/^[a-z]+$/.test(e.key))).map(e => e.key + e.n);

// ---------------------------------------------------------------- Hangul helpers
const CHO = ["ㄱ","ㄲ","ㄴ","ㄷ","ㄸ","ㄹ","ㅁ","ㅂ","ㅃ","ㅅ","ㅆ","ㅇ","ㅈ","ㅉ","ㅊ","ㅋ","ㅌ","ㅍ","ㅎ"];
const CHO_R = ["g","kk","n","d","tt","r","m","b","pp","s","ss","","j","jj","ch","k","t","p","h"];
const JUNG = ["ㅏ","ㅐ","ㅑ","ㅒ","ㅓ","ㅔ","ㅕ","ㅖ","ㅗ","ㅘ","ㅙ","ㅚ","ㅛ","ㅜ","ㅝ","ㅞ","ㅟ","ㅠ","ㅡ","ㅢ","ㅣ"];
const JUNG_R = ["a","ae","ya","yae","eo","e","yeo","ye","o","wa","wae","oe","yo","u","wo","we","wi","yu","eu","ui","i"];
const JONG = ["","ㄱ","ㄲ","ㄳ","ㄴ","ㄵ","ㄶ","ㄷ","ㄹ","ㄺ","ㄻ","ㄼ","ㄽ","ㄾ","ㄿ","ㅀ","ㅁ","ㅂ","ㅄ","ㅅ","ㅆ","ㅇ","ㅈ","ㅊ","ㅋ","ㅌ","ㅍ","ㅎ"];
const JONG_R = ["","k","k","k","n","n","n","t","l","k","m","l","l","l","l","l","m","p","p","t","t","ng","t","t","k","t","p","t"];
const KEYS = { "ㅂ":"q","ㅈ":"w","ㄷ":"e","ㄱ":"r","ㅅ":"t","ㅛ":"y","ㅕ":"u","ㅑ":"i","ㅐ":"o","ㅔ":"p","ㅁ":"a","ㄴ":"s","ㅇ":"d","ㄹ":"f","ㅎ":"g","ㅗ":"h","ㅓ":"j","ㅏ":"k","ㅣ":"l",
  "ㅋ":"z","ㅌ":"x","ㅊ":"c","ㅍ":"v","ㅠ":"b","ㅜ":"n","ㅡ":"m","ㅃ":"Q","ㅉ":"W","ㄸ":"E","ㄲ":"R","ㅆ":"T","ㅒ":"O","ㅖ":"P",
  "ㅘ":"hk","ㅙ":"ho","ㅚ":"hl","ㅝ":"nj","ㅞ":"np","ㅟ":"nl","ㅢ":"ml","ㄳ":"rt","ㄵ":"sw","ㄶ":"sg","ㄺ":"fr","ㄻ":"fa","ㄼ":"fq","ㄽ":"ft","ㄾ":"fx","ㄿ":"fv","ㅀ":"fg","ㅄ":"qt" };
const VOWEL_SAY = { "ㅏ":"a as in 'father'","ㅐ":"e as in 'bed'","ㅔ":"e as in 'bed'","ㅓ":"u as in 'sun'","ㅗ":"o as in 'go' (no w)","ㅜ":"oo as in 'food'","ㅡ":"a short, flat 'eu'","ㅣ":"ee as in 'see'",
  "ㅑ":"ya","ㅕ":"yuh","ㅛ":"yo","ㅠ":"you","ㅖ":"ye","ㅒ":"ye","ㅘ":"wa","ㅝ":"wuh","ㅞ":"we","ㅟ":"wee","ㅚ":"we","ㅙ":"we","ㅢ":"eu-ee" };

function decompose(h) {
  return [...h].map(ch => {
    const c = ch.charCodeAt(0) - 0xAC00;
    if (c < 0 || c > 11171) return null;
    return { s: ch, cho: CHO[Math.floor(c / 588)], jung: JUNG[Math.floor((c % 588) / 28)], jong: JONG[c % 28] };
  }).filter(Boolean);
}
const compose = (cho, jung, jong) => String.fromCharCode(0xAC00 + (CHO.indexOf(cho) * 21 + JUNG.indexOf(jung)) * 28 + JONG.indexOf(jong || ""));
// Revised Romanization, syllable by syllable (as RR does for personal names: no assimilation), ㄹㄹ → ll.
function romanSyls(syls) {
  return syls.map((y, i) => {
    const prev = syls[i - 1];
    const on = y.cho === "ㄹ" && prev && prev.jong === "ㄹ" ? "l" : CHO_R[CHO.indexOf(y.cho)];
    return on + JUNG_R[JUNG.indexOf(y.jung)] + JONG_R[JONG.indexOf(y.jong)];
  });
}
const onsetSound = (y, i, syls) => {
  const prev = syls[i - 1];
  if (y.cho === "ㅇ") return "silent";
  if (y.cho === "ㄹ") return prev && prev.jong === "ㄹ" ? "l" : (i === 0 ? "r/l" : "r (tap)");
  return CHO_R[CHO.indexOf(y.cho)];
};
const hasFinal = h => { const c = h.charCodeAt(h.length - 1) - 0xAC00; return c >= 0 && c % 28 !== 0; };
const isEpenthetic = y => y.jung === "ㅡ";   // in loanword names ㅡ is (almost) always the inserted filler vowel

// ---------------------------------------------------------------- text builders
const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const disp = slug => DISPLAY[slug] || cap(slug);
const K = h => `<span lang="ko">${h}</span>`;

function pronTips(n) {
  const S = n.syls, H = n.hangul, tips = [];
  const add = (p, t) => tips.push({ p, t });
  S.forEach((y, i) => {
    if (/[ㄲㄸㅃㅆㅉ]/.test(y.cho)) add(1, `${K(y.cho)} in ${K(y.s)} is a tense consonant: no puff of air, said with a tight throat, sharper than an English ${CHO_R[CHO.indexOf(y.cho)][0]}.`);
  });
  // ㄹ
  const r0 = S[0].cho === "ㄹ";
  const rMid = S.findIndex((y, i) => i > 0 && y.cho === "ㄹ" && !S[i - 1].jong);
  const rr = S.findIndex((y, i) => i > 0 && y.cho === "ㄹ" && S[i - 1].jong === "ㄹ");
  const rFin = S.findIndex((y, i) => y.jong === "ㄹ" && !(S[i + 1] && S[i + 1].cho === "ㄹ"));
  if (rMid >= 0) add(2, `${K("ㄹ")} between two vowels (${K(S[rMid - 1].s + S[rMid].s)}) is one quick tap of the tongue, like the tt in American "butter": closer to a soft d than an English r.`);
  if (r0) add(2, `The opening ${K("ㄹ")} is a single light tap, halfway between an English r and l. Never roll it.`);
  if (rr >= 0) add(3, `The double ${K("ㄹ")} in ${K(S[rr - 1].s + S[rr].s)} is a clear English l, as in "hello", not an r.`);
  if (rFin >= 0) add(4, `${K("ㄹ")} at the bottom of ${K(S[rFin].s)} is an l: the tongue touches just behind the teeth and stays there.`);
  // ㄴ + ㄹ assimilation
  const nl = S.findIndex((y, i) => y.jong === "ㄴ" && S[i + 1] && S[i + 1].cho === "ㄹ");
  if (nl >= 0) add(2, `${K("ㄴ")} followed by ${K("ㄹ")} is said as ㄹㄹ, so ${K(S[nl].s + S[nl + 1].s)} sounds like "${romanSyls([{ ...S[nl], jong: "ㄹ" }, S[nl + 1]]).join("").replace(/lr/, "ll")}".`);
  // filler ㅡ
  const ep = S.filter((y, i) => isEpenthetic(y) && !(i === 0 && S.length === 1));
  if (ep.length) add(3, `${listJoin(ep.map(y => K(y.s)))} ${ep.length > 1 ? "carry" : "carries"} the filler vowel ${K("ㅡ")} (eu). Keep ${ep.length > 1 ? "them" : "it"} short and light, almost just the consonant.`);
  const last = S[S.length - 1];
  if (/(sh|ch|ge)$/.test(n.slug) && /^[시치지]$/.test(last.s)) add(3, `The final ${K(last.s)} stands for the English "${n.slug.match(/(sh|ch|ge)$/)[1]}" sound. Say the i very lightly.`);
  // vowels
  const eo = S.filter(y => y.jung === "ㅓ");
  if (eo.length) add(4, `${K("ㅓ")} (eo) in ${listJoin([...new Set(eo.map(y => y.s))].map(K))} is the open "uh" of "sun", not an "o".`);
  if (S.some(y => y.jung === "ㅐ") && S.some(y => y.jung === "ㅔ")) add(5, `${K("ㅐ")} and ${K("ㅔ")} sound the same in modern Seoul speech: the e in "bed".`);
  else if (S.some(y => y.jung === "ㅐ")) add(5, `${K("ㅐ")} (ae) is said like the e in "bed" by most Koreans today, a little more closed than the a in "cat".`);
  const glide = S.find(y => /[ㅘㅝㅞㅟㅚㅙㅢ]/.test(y.jung));
  if (glide) add(4, `${K(glide.jung)} in ${K(glide.s)} is one gliding vowel: ${VOWEL_SAY[glide.jung]}, in a single beat.`);
  if (S.some(y => y.jung === "ㅗ")) add(6, `${K("ㅗ")} is a pure "o" with rounded lips. Don't add the w-glide English puts in "go".`);
  // finals
  const stop = S.find(y => /^[ㄱㅅㅂㄷ]$/.test(y.jong));
  if (stop) add(3, `The final ${K(stop.jong)} in ${K(stop.s)} is unreleased: stop the sound (${JONG_R[JONG.indexOf(stop.jong)]}) without a puff of air.${stop.jong === "ㅅ" ? " It is a t sound here, not s." : ""}`);
  const ng = S.find(y => y.jong === "ㅇ");
  if (ng) add(5, `${K("ㅇ")} at the bottom of ${K(ng.s)} is "ng" as in "sing". At the top of a syllable ${K("ㅇ")} is silent.`);
  const silentO = S.findIndex((y, i) => i > 0 && y.cho === "ㅇ");
  if (!ng && silentO >= 0) add(6, `${K("ㅇ")} at the top of ${K(S[silentO].s)} is silent, so ${K(S[silentO].s)} is just the vowel: ${romanSyls([S[silentO]])[0]}.`);
  // first consonant
  const f = S[0].cho;
  if (/[ㅋㅌㅍㅊ]/.test(f)) add(5, `${K(f)} at the start is aspirated: a clear puff of air, like the ${CHO_R[CHO.indexOf(f)]} in "${{ "ㅋ": "kite", "ㅌ": "top", "ㅍ": "pie", "ㅊ": "church" }[f]}".`);
  if (/[ㄱㄷㅂㅈ]/.test(f)) add(5, `${K(f)} at the start is soft and unvoiced, halfway between ${{ "ㄱ": "k and g", "ㄷ": "t and d", "ㅂ": "p and b", "ㅈ": "ch and j" }[f]}.`);
  if (S.length >= 3) add(7, `Give all ${S.length} syllables the same weight. Korean has no strong stress, so it's ${n.say}, evenly.`);
  if (S.length === 2) add(7, `Two even beats, ${n.say}: Korean doesn't stress one syllable over the other the way English does.`);
  if (S.length === 1) add(7, `It's a single syllable in Korean, so say it in one short beat: ${n.say}.`);
  tips.sort((a, b) => a.p - b.p);
  return tips.map(t => t.t);
}

function whyNotes(n) {
  const s = n.slug, S = n.syls, H = n.hangul, en = n.lang === "English", notes = [];
  const has = j => S.some(y => y.cho === j || y.jong === j);
  if (en) {
    if (/[aeiou]gh/.test(s)) notes.push(`The gh is silent, so it leaves no trace in Hangul.`);
    if (/[aeiou]h$/.test(s)) notes.push(`The final h is silent and is dropped.`);
    if (/ph/.test(s) && has("ㅍ")) notes.push(`ph is an f sound, and Korean has no f, so it becomes ${K("ㅍ")} (p).`);
    else if (/f/.test(s) && has("ㅍ")) notes.push(`Korean has no f sound, so f becomes ${K("ㅍ")} (p), said with a puff of air.`);
    if (/v/.test(s) && has("ㅂ")) notes.push(`There is no v in Korean either: v becomes ${K("ㅂ")} (b).`);
    if (/th/.test(s)) {
      if (s.startsWith("th") && S[0].cho === "ㅌ") notes.push(`The th in ${n.name} is a plain t sound in English, so it's simply ${K("ㅌ")} (t).`);
      else if (!has("ㅅ") && has("ㄷ")) notes.push(`The soft th (as in "the") has no Korean match, so it becomes ${K("ㄷ")} (d).`);
      else if (has("ㅅ")) notes.push(`Korean has no th, so th becomes ${K("ㅅ")} (s), the closest sound.`);
    }
    if (/ch/.test(s) && has("ㅋ") && !has("ㅊ")) notes.push(`The ch in ${n.name} is a k sound, so Korean uses ${K("ㅋ")} (k), not ${K("ㅊ")}.`);
    if (/ph/.test(s) && !has("ㅍ") && has("ㅂ")) notes.push(`Here the ph is said as a v, and Korean has no v, so it becomes ${K("ㅂ")} (b).`);
    if (/z/.test(s) && has("ㅈ")) notes.push(`Korean has no z, so z becomes ${K("ㅈ")} (j).`);
    else if (/[^s]se?$|[^s]s$/.test(s) && S[S.length - 1].s === "즈") notes.push(`The final s is a z sound in English, so it's written ${K("즈")} (jeu).`);
    if (/x/.test(s)) notes.push(`x is two sounds, k and s, so Hangul writes both: ${K(S.some(y => y.jong === "ㄱ") ? "ㄱ" : "ㅋ")} (k) and ${K("ㅅ")} (s).`);
    if (/[aeiouy]r(?![aeiouyr])/.test(s) && !S.some(y => y.s === "르")) notes.push(`An r after a vowel (before a consonant or at the end) isn't written. Korean spelling follows British-style pronunciation, where that r is silent.`);
    if (/[aeiouy][bcdfgklmnprstvz]e$/.test(s) && !/[ㅔㅐ]/.test(S[S.length - 1].jung) && !S.some(y => y.s === "에" && y === S[S.length - 1])) notes.push(`The final e is silent. It only makes the vowel before it long.`);
    if (/에이|레이|케이|데이|베이|메이|네이|제이|헤이|세이|테이|페이|게이/.test(H)) notes.push(`The long a (as in "day") is spelled as two beats, ${K(H.match(/.이/)[0])}, because Korean writes each part of the diphthong.`);
    if (/[가-힣]이/.test(H) && S.some((y, i) => y.jung === "ㅏ" && !y.jong && S[i + 1] && S[i + 1].cho === "ㅇ" && S[i + 1].jung === "ㅣ")) notes.push(`The long i (as in "my") is spelled ${K("아이")}: two beats in Korean, one in English.`);
    if (S.some((y, i) => y.jong === "ㄹ" && S[i + 1] && S[i + 1].cho === "ㄹ") && /l/.test(s)) notes.push(`An l between vowels is written twice (final ${K("ㄹ")} + ${K("ㄹ")}), so Koreans say a clear l instead of a tapped r.`);
    if (/(t|tt)$/.test(s) && S[S.length - 1].jong === "ㅅ") notes.push(`A final t is written with ${K("ㅅ")} under the syllable. It's still said as a held t.`);
    if (/(k|ck|c)$/.test(s) && S[S.length - 1].jong === "ㄱ") notes.push(`After a short vowel the final k tucks under the syllable as ${K("ㄱ")}, instead of getting its own syllable.`);
    if (/(sh|ch|ge)$/.test(s) && /^[시치지]$/.test(S[S.length - 1].s)) notes.push(`A final "${s.match(/(sh|ch|ge)$/)[1]}" sound gets the vowel ${K("ㅣ")} (${K(S[S.length - 1].s)}) rather than ${K("ㅡ")}.`);
    if (S.some(y => y.jung === "ㅓ")) notes.push(`The unstressed "uh" vowel is written ${K("ㅓ")} (eo), whatever letter English uses for it.`);
    const g = S.find(y => /[ㅘㅝㅞㅟ]/.test(y.jung));
    if (g && /w|qu/.test(s)) notes.push(`w merges with the vowel after it into one Korean vowel: ${K(g.s)}.`);
    if (/([bcdfgkmnprstz])\1/.test(s) && !/ll/.test(s)) notes.push(`Double letters count once. Hangul spells the sound, not the letters.`);
  }
  const ep = S.filter(y => isEpenthetic(y));
  if (ep.length && en) notes.push(`Korean adds the vowel ${K("ㅡ")} to consonants that have no vowel of their own (${listJoin(ep.map(y => K(y.s)))}), which is why ${n.name} has ${S.length} syllable${S.length > 1 ? "s" : ""} in Korean.`);
  return notes;
}

// ---------------------------------------------------------------- build records
for (const n of NAMES) {
  n.name = disp(n.slug);
  n.syls = decompose(n.hangul);
  n.rr = romanSyls(n.syls);
  n.roman = n.rr.join("");
  n.say = n.rr.join("-");
  n.lang = LANG[n.slug] || "English";
  n.rules = HN.rules(n.slug);
  n.toolValue = HN.dict[n.slug];
}
const BY_HANGUL = {};
NAMES.forEach(n => (BY_HANGUL[n.hangul] = BY_HANGUL[n.hangul] || []).push(n));

function similar(n) {
  const out = [], seen = new Set([n.slug]);
  const push = arr => arr.sort((a, b) => a.order - b.order).forEach(m => { if (!seen.has(m.slug) && out.length < 8) { seen.add(m.slug); out.push(m); } });
  const first = n.syls[0].s, lastS = n.syls[n.syls.length - 1].s, len = n.syls.length;
  push(NAMES.filter(m => m.hangul === n.hangul));
  push(NAMES.filter(m => m.syls[0].s === first));
  push(NAMES.filter(m => m.syls.length === len && m.syls[m.syls.length - 1].s === lastS));
  push(NAMES.filter(m => m.syls[m.syls.length - 1].s === lastS));
  push(NAMES.filter(m => m.syls[0].cho === n.syls[0].cho && m.syls.length === len));
  push(NAMES.filter(m => m.slug[0] === n.slug[0]));
  return out;
}

// ---------------------------------------------------------------- shell
const STYLE = `<style>.nm-syl{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:10px;margin:14px 0}.nm-syl .stat{text-align:center}.nm-syl .v,.nm-ko{font-family:"Noto Sans KR",var(--sans);font-weight:700}.nm-j{font-size:15px;color:var(--ink-2)}.stat .v.nm-ko{font-size:22px;overflow-wrap:anywhere}.hangul-big{overflow-wrap:anywhere}a.chip{text-decoration:none;display:inline-block}.nm-list{list-style:none;padding:0;margin:10px 0 24px;display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:6px 14px}.nm-ul{padding-left:20px}.nm-ul li{margin:6px 0}</style>`;
function head({ title, desc, url, ogTitle, ogDesc, ld }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${url}">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,700&family=Inter:wght@400;500;600;700&family=Noto+Sans+KR:wght@500;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/assets/nunchi.css"><meta property="og:url" content="${url}"><meta property="og:type" content="website">
<meta name="theme-color" content="#f6f1e7"><link rel="icon" href="/img/favicon.png" type="image/png"><link rel="apple-touch-icon" href="/img/apple-touch-icon.png">
<meta property="og:title" content="${esc(ogTitle)}"><meta property="og:description" content="${esc(ogDesc)}"><meta property="og:image" content="${ORIGIN}/img/name-hangul.jpg">
${ld.map(o => `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, "\\u003c")}</script>`).join("\n")}
${STYLE}
<meta name="google-adsense-account" content="ca-pub-8862930962343176"><script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-8862930962343176" crossorigin="anonymous"></script></head>
<body data-root="/" data-room="love">
<main class="wrap narrow">
`;
}
const FOOT = `</main>
<script src="/assets/nunchi.js?v=${VER}"></script>
</body>
</html>
`;
const crumbsLd = items => ({ "@context": "https://schema.org", "@type": "BreadcrumbList",
  itemListElement: items.map(([name, item], i) => Object.assign({ "@type": "ListItem", position: i + 1, name }, item ? { item } : {})) });

const CONVERTER = `<form class="panel" action="/tools/my-name-in-hangul/" method="get" role="search">
    <div class="field"><label for="n">Try another name</label><input type="text" id="n" name="n" placeholder="e.g. Emily Carter" autocomplete="off" autocapitalize="words" required><small>Full names work too. Opens the My Name in Hangul converter.</small></div>
    <button class="btn" type="submit">Write it in Hangul</button>
  </form>`;

// ---------------------------------------------------------------- name page
function page(n) {
  const S = n.syls, H = n.hangul, N = esc(n.name), url = `${ORIGIN}/names/${n.slug}/`;
  const tips = pronTips(n), why = whyNotes(n), sims = similar(n);
  const twins = (BY_HANGUL[H] || []).filter(m => m.slug !== n.slug);
  const fin = hasFinal(H), voc = H + (fin ? "아" : "야");
  const lastS = S[S.length - 1];
  const vocSay = fin ? (() => { // liaison: final consonant moves onto 아
    const moved = lastS.jong === "ㅇ" ? null : compose(lastS.jong === "ㄹ" ? "ㄹ" : lastS.jong, "ㅏ", "");
    if (!moved) return null;
    const base = H.slice(0, -1) + compose(lastS.cho, lastS.jung, "");
    return base + moved;
  })() : null;
  const sylWord = S.length === 1 ? "one syllable" : `${["", "", "two", "three", "four", "five", "six"][S.length] || S.length} syllables`;
  const primary = tips[0];
  const plainTip = primary.replace(/<[^>]+>/g, "");
  const differs = n.rules && n.rules !== H;

  const desc = `${n.name} in Korean is ${H} (${n.say}). See the Hangul letter by letter, how to pronounce it, and what Korean friends would call you: ${voc}, ${H} 씨.`;
  const faq = [
    [`How do you write ${n.name} in Korean?`, `${n.name} is written ${H} in Hangul (Revised Romanization: ${n.roman}). It is the standard spelling Korean media use for the name${n.lang !== "English" ? ` and follows the ${n.lang} pronunciation` : ""}. In Hangul it has ${sylWord}: ${S.map(y => y.s).join(" + ")}.`],
    [`How do you pronounce ${n.name} in Korean?`, `Say it ${n.say}, with ${S.length > 1 ? "even weight on every syllable" : "one short beat"}. ${plainTip}`],
  ];
  const ld = [
    { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) },
    crumbsLd([["Nunchi", ORIGIN + "/"], ["Love", ORIGIN + "/love/"], ["Names", ORIGIN + "/names/"], [n.name, url]]),
  ];

  const sylCards = S.map((y, i) => {
    const parts = [`<b lang="ko">${y.cho}</b> ${onsetSound(y, i, S)}`, `<b lang="ko">${y.jung}</b> ${JUNG_R[JUNG.indexOf(y.jung)]}`];
    if (y.jong) parts.push(`<b lang="ko">${y.jong}</b> ${JONG_R[JONG.indexOf(y.jong)]} (final)`);
    return `<div class="stat" data-syl="${y.s}" data-jamo="${y.cho},${y.jung},${y.jong}" data-rr="${n.rr[i]}"><div class="v">${y.s}</div><div class="nm-j">${parts.join(" + ")}</div><div class="d">${n.rr[i]}</div></div>`;
  }).join("");
  const keys = S.map(y => [y.cho, y.jung, y.jong].filter(Boolean).map(j => KEYS[j]).join("")).join(" ");
  const jamoSeq = S.map(y => [y.cho, y.jung, y.jong].filter(Boolean).join("")).join(" ");

  const alt = n.alts.length ? `<p class="note">Also seen: ${n.alts.map(a => `${K(a)}${ALT_LABEL[n.slug] ? `, used for ${ALT_LABEL[n.slug]}` : ""}`).join("; ")}.</p>` : "";
  const twinP = twins.length ? `<p class="note">Same Hangul as ${listJoin(twins.map(m => `<a href="/names/${m.slug}/">${esc(m.name)}</a>`))}: Korean spells the sound, so different English spellings can land on the same ${K(H)}.</p>` : "";
  const fun = FUN[n.slug] ? `<div class="tip"><span class="eye" aria-hidden="true"></span><div><b>Good to know</b><p>${FUN[n.slug]}</p></div></div>` : "";
  const lenFact = S.length === 2
    ? `Korean given names are almost always two syllables, so ${K(H)} already sounds natural to Korean ears.`
    : S.length === 1 ? `One syllable is short for Korea, where given names are almost always two, so ${K(H)} stands out and is easy to remember.`
    : `Korean given names are almost always two syllables (after a one-syllable family name), so at ${S.length} syllables ${K(H)} reads as a foreign name at a glance.`;

  const cmp = differs ? `<div class="compare">
      <div class="stat bad"><div class="k">Letter by letter</div><div class="v hangul-big" style="font-size:30px">${n.rules}</div><div class="d">what spelling rules alone give</div></div>
      <div class="stat good"><div class="k">How Koreans write it</div><div class="v hangul-big" style="font-size:30px">${H}</div><div class="d">the settled media spelling</div></div>
    </div>` : "";
  const whyLead = differs
    ? `Spelled letter-by-letter you'd get ${K(n.rules)}, but Korean media write ${K(H)}, because the name is written the way it sounds${n.lang !== "English" ? ` in ${n.lang}` : ""}, not the way it's spelled.`
    : `Here the letters and the sound line up: applying the loanword rules letter by letter already gives ${K(H)}, the same spelling Korean media use.`;
  const whyList = [n.lang !== "English" ? LANG_NOTE[n.lang](n.slug, n.hangul) : null, ...why].filter(Boolean).slice(0, 5);

  const body = `  <div class="crumbs"><a href="/">Nunchi</a> › <a href="/love/">Love</a> › <a href="/names/">Names</a> › ${N}</div>
  <section class="tool-head">
    <div class="eyebrow">Love · Names</div>
    <h1>${N} in Korean <span class="hangul">${H}</span></h1>
    <p>Korean media, baristas and the immigration office write ${N} as ${K(H)}: ${sylWord}, said ${n.say}. Here's how it's built, how to say it, and what people will call you.</p>
  </section>

  <div class="panel">
    <div class="stat big" style="text-align:center"><div class="k">${N} in Hangul</div><div class="v hangul-big" lang="ko">${H}</div><div class="d">Revised Romanization: <b>${n.roman}</b> · said ${n.say} · ${sylWord}</div></div>
    ${alt}${twinP}
  </div>

  <h2>${N} letter by letter</h2>
  <p>Each Hangul block is one syllable, built from a consonant, a vowel and sometimes a final consonant underneath.</p>
  <div class="nm-syl">${sylCards}</div>
  <div class="tip"><span class="eye" aria-hidden="true"></span><div><b>Pronunciation tip</b><p>${primary}</p></div></div>
  ${tips.length > 1 ? `<ul class="nm-ul">${tips.slice(1, 5).map(t => `<li>${t}</li>`).join("")}</ul>` : ""}

  <h2>How Koreans would call you</h2>
  <div class="result-grid">
    <div class="stat"><div class="k">Friends calling you over</div><div class="v nm-ko">${voc}!</div><div class="d">${fin ? `${K(H)} ends in a consonant, so it takes ${K("아")}${vocSay ? `, said ${K(vocSay)}` : ""}` : `${K(H)} ends in a vowel, so it takes ${K("야")}`}. Casual, for close friends.</div></div>
    <div class="stat"><div class="k">At work or with new people</div><div class="v nm-ko">${H} 씨</div><div class="d">${H} ssi. Polite, roughly "Mr" or "Ms", but used with the first name.</div></div>
    <div class="stat"><div class="k">Customer, client, online</div><div class="v nm-ko">${H} 님</div><div class="d">${H} nim. What you'll see on a delivery box or a booking.</div></div>
  </div>
  <p>${lenFact} ${fin ? `In casual sentences Koreans often add ${K("이")} after a name that ends in a consonant: ${K(H + "이 왔어")} ("${N}'s here").` : `With foreign names some Koreans skip ${K("야")} and just say ${K(H)} or ${K(H + " 씨")}.`}</p>

  ${fun}

  <h2>Why it's spelled ${K(H)}</h2>
  ${cmp}
  <p>${whyLead}</p>
  ${whyList.length ? `<ul class="nm-ul">${whyList.map(t => `<li>${t}</li>`).join("")}</ul>` : ""}

  <h2>Type ${N} on a Korean keyboard</h2>
  <p>On the standard two-set (두벌식) layout, ${K(H)} is the jamo ${K(jamoSeq)}, typed with the keys <b>${esc(keys)}</b>. Want to get fast at it? Try the <a href="/tools/hangul-typing-test/">Hangul Typing Test</a>.</p>

  <h2>Similar names in Korean</h2>
  <div class="chips">${sims.map(m => `<a class="chip" href="/names/${m.slug}/">${esc(m.name)} <span lang="ko">${m.hangul}</span></a>`).join("")}</div>
  <p class="note"><a href="/names/">All names A–Z →</a></p>

  <h2>Write any name in Hangul</h2>
  ${CONVERTER}

  <section class="related">
    <div class="grid">
      <a class="card" href="/tools/korean-name-generator/"><span class="tag">Love</span><b>Want a Korean name with a real meaning instead?</b><span>The Korean Name Generator picks a name with Hanja that fits you.</span></a>
      <a class="card" href="/tools/my-name-in-hangul/?n=${encodeURIComponent(n.name)}"><span class="tag">Love</span><b>My Name in Hangul</b><span>Full names, share cards and a story image for ${N}.</span></a>
    </div>
  </section>

  <section class="faq"><h2>Questions people ask</h2>
${faq.map(([q, a]) => `    <details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join("\n")}
  </section>
  <p class="note">Spellings follow the National Institute of Korean Language loanword rules and common Korean media usage. Last checked: ${CHECKED}.</p>
`;
  return head({ title: `${n.name} in Korean: ${H} — how to write and say it | Nunchi`, desc, url,
    ogTitle: `${n.name} in Korean: ${H}`, ogDesc: `${n.name} is ${H} (${n.say}) in Korean. Letter by letter, how to say it, and what friends would call you.`, ld }) + body + FOOT;
}

// ---------------------------------------------------------------- hub
function hub() {
  const url = `${ORIGIN}/names/`;
  const groups = {};
  NAMES.forEach(n => (groups[n.slug[0].toUpperCase()] = groups[n.slug[0].toUpperCase()] || []).push(n));
  const letters = Object.keys(groups).sort();
  const ld = [
    crumbsLd([["Nunchi", ORIGIN + "/"], ["Love", ORIGIN + "/love/"], ["Names", url]]),
    { "@context": "https://schema.org", "@type": "CollectionPage", name: "Names in Korean: A–Z", url, description: `How ${NAMES.length} English and international first names are written in Korean Hangul.` },
  ];
  const body = `  <div class="crumbs"><a href="/">Nunchi</a> › <a href="/love/">Love</a> › Names</div>
  <section class="tool-head">
    <div class="eyebrow">Love · Names</div>
    <h1>Names in Korean: A–Z <span class="hangul">이름</span></h1>
    <p>How ${NAMES.length} English and international first names are written in Hangul, the way Korean media and friends spell them. Each page breaks the name down letter by letter and shows how to say it.</p>
  </section>
  <div class="panel">
    <div class="field"><label for="q">Find a name</label><input type="text" id="q" placeholder="Type a name or Hangul, e.g. Sarah or 세라" autocomplete="off"><small id="qn">${NAMES.length} names</small></div>
    <nav class="chips" aria-label="Jump to letter">${letters.map(l => `<a class="chip" href="#${l.toLowerCase()}">${l}</a>`).join("")}</nav>
  </div>
  <p>Korean writes foreign names by sound, not by spelling, so Sarah and Sara are both ${K("세라")} and Stephen and Steven are both ${K("스티븐")}. Not here? The <a href="/tools/my-name-in-hangul/">My Name in Hangul</a> converter handles any name, and the <a href="/tools/korean-name-generator/">Korean Name Generator</a> finds you a real Korean name with a meaning.</p>
${letters.map(l => `  <section id="${l.toLowerCase()}" class="nm-sec"><h2>${l}</h2>
    <ul class="nm-list">${groups[l].map(n => `<li data-k="${n.slug} ${esc(n.name.toLowerCase())} ${n.hangul}"><a href="/names/${n.slug}/">${esc(n.name)}</a> <span class="hangul">${n.hangul}</span></li>`).join("")}</ul>
  </section>`).join("\n")}
  <p class="note" id="none" hidden>No match in the list. <a href="/tools/my-name-in-hangul/" id="noneLink">Convert it with My Name in Hangul →</a></p>
  ${CONVERTER}
  <p class="note">Spellings follow the National Institute of Korean Language loanword rules and common Korean media usage. Last checked: ${CHECKED}.</p>
`;
  const script = `<script>
(function(){
  var q=document.getElementById("q"),qn=document.getElementById("qn"),none=document.getElementById("none"),nl=document.getElementById("noneLink");
  var items=[].slice.call(document.querySelectorAll(".nm-list li")),secs=[].slice.call(document.querySelectorAll(".nm-sec"));
  q.addEventListener("input",function(){
    var v=q.value.trim().toLowerCase(),n=0;
    items.forEach(function(li){var on=!v||li.getAttribute("data-k").indexOf(v)>-1;li.hidden=!on;if(on)n++;});
    secs.forEach(function(s){s.hidden=!s.querySelector("li:not([hidden])");});
    qn.textContent=n+" name"+(n===1?"":"s");none.hidden=n>0;nl.href="/tools/my-name-in-hangul/?n="+encodeURIComponent(q.value.trim());
  });
})();
</script>
`;
  return head({ title: "Names in Korean A–Z: how to write your name in Hangul | Nunchi",
    desc: `How ${NAMES.length} English and international first names are written in Korean Hangul, from Aaron (에런) to Zoey (조이), with pronunciation and what friends would call you.`,
    url, ogTitle: "Names in Korean: A–Z", ogDesc: "Find your name in Hangul, letter by letter, the way Koreans actually write it.", ld })
    + body + FOOT.replace("</main>\n", "</main>\n").replace(`<script src="/assets/nunchi.js?v=${VER}"></script>\n`, `<script src="/assets/nunchi.js?v=${VER}"></script>\n${script}`);
}

// ---------------------------------------------------------------- write
const OUT = path.join(SITE, "names");
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
for (const n of NAMES) {
  fs.mkdirSync(path.join(OUT, n.slug), { recursive: true });
  fs.writeFileSync(path.join(OUT, n.slug, "index.html"), page(n));
}
fs.writeFileSync(path.join(OUT, "index.html"), hub());

// sitemap: drop old /names/ entries, append fresh ones
const smPath = path.join(SITE, "sitemap.xml");
let sm = fs.readFileSync(smPath, "utf8").split("\n").filter(l => !l.includes(`${ORIGIN}/names/`)).join("\n");
const urls = [`  <url><loc>${ORIGIN}/names/</loc><lastmod>${LASTMOD}</lastmod><priority>0.8</priority></url>`,
  ...NAMES.map(n => `  <url><loc>${ORIGIN}/names/${n.slug}/</loc><lastmod>${LASTMOD}</lastmod><priority>0.6</priority></url>`)];
sm = sm.replace("</urlset>", urls.join("\n") + "\n</urlset>");
fs.writeFileSync(smPath, sm);

// slug list inside the name converter (between the NAME_PAGES markers)
const toolPath = path.join(SITE, "tools/my-name-in-hangul/index.html");
let tool = fs.readFileSync(toolPath, "utf8");
const re = /\/\*NAME_PAGES\*\/[\s\S]*?\/\*END_NAME_PAGES\*\//;
if (re.test(tool)) {
  tool = tool.replace(re, `/*NAME_PAGES*/${JSON.stringify(NAMES.map(n => n.slug))}/*END_NAME_PAGES*/`);
  fs.writeFileSync(toolPath, tool);
} else console.warn("! NAME_PAGES marker not found in tools/my-name-in-hangul/index.html; slug list not updated");

const diff = NAMES.filter(n => n.toolValue && n.toolValue !== n.hangul).map(n => `${n.slug}: page ${n.hangul} / converter ${n.toolValue}`);
console.log(`names: ${NAMES.length} pages + hub → site/names/`);
console.log(`skipped dictionary keys: ${[...new Set(SKIPPED)].join(", ")}`);
if (diff.length) console.log(`note, page spelling differs from converter dict: ${diff.join("; ")}`);
if (require.main !== module) module.exports = { NAMES };

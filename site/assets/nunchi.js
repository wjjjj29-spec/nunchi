/* Nunchi shared script: header/footer, number format, share card */
(function () {
  const ROOMS = [
    ["visit", "Visit", "여행"], ["live", "Live", "생활"], ["love", "Love", "문화"], ["learn", "Learn", "한국어"]
  ];
  const root = document.body.dataset.root || "/";
  const room = document.body.dataset.room || "";

  // Analytics (GA4). Skipped on localhost so dev clicks do not pollute the numbers.
  const GA_ID = "G-REZQPDXD5C";
  const tool = location.pathname.replace(/\/$/, "").split("/").pop() || "home";
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
  if (!/localhost|127\.0\.0\.1/.test(location.hostname)) {
    const g = document.createElement("script"); g.async = true; g.src = "https://www.googletagmanager.com/gtag/js?id=" + GA_ID; document.head.appendChild(g);
    gtag("js", new Date()); gtag("config", GA_ID, { anonymize_ip: true });
  }
  const track = (name, params) => { try { gtag("event", name, Object.assign({ tool, room }, params || {})); } catch (e) {} };

  function header() {
    const nav = ROOMS.map(([k, en, ko]) =>
      `<a href="${root}${k}/" data-room="${k}"${room === k ? ' aria-current="page"' : ""}>${en}</a>`).join("");
    return `<header class="site-header"><div class="wrap">
      <a class="logo" href="${root}"><img class="logo-mark" src="${root}img/logo-mark.png" alt="" width="34" height="34">Nunchi<small>눈치</small></a>
      <nav class="nav" aria-label="Sections">${nav}</nav>
    </div></header>`;
  }
  function footer() {
    const y = new Date().getFullYear();
    return `<footer class="site-footer"><div class="wrap">
      <span>© ${y} Nunchi · Read Korea at a glance.</span>
      <a href="${root}about/">About</a><a href="${root}privacy/">Privacy</a><a href="${root}contact/">Contact</a>
      <a href="https://www.instagram.com/hellonunchi/" rel="me noopener" target="_blank">Instagram</a><a href="https://www.threads.com/@hellonunchi" rel="me noopener" target="_blank">Threads</a>
      <span class="made">Made in Seoul <span class="hangul">서울에서 만듦</span></span>
    </div></footer>`;
  }
  document.addEventListener("DOMContentLoaded", () => {
    if (document.body.dataset.embed !== undefined) { // 다른 사이트에 iframe으로 들어간 경우: 헤더/푸터 대신 한 줄 크레딧
      document.body.insertAdjacentHTML("beforeend", `<p class="embed-credit"><a href="https://hellonunchi.com${document.body.dataset.embed || "/"}" target="_blank" rel="noopener">Nunchi</a> · free Korea tools</p>`);
      track("embed_view", { ref: document.referrer.replace(/^https?:\/\//, "").split("/")[0] });
    } else {
    document.body.insertAdjacentHTML("afterbegin", header());
    document.body.insertAdjacentHTML("beforeend", footer());
    }
    // What we actually want to know: did the tool get used, did anyone click a partner.
    document.addEventListener("click", e => {
      const a = e.target.closest("a"); if (!a) return;
      if (a.dataset.partner) track("affiliate_click", { partner: a.dataset.partner, href: a.href });
      else if (/juseyo\.app|id6816771391/.test(a.href)) track("juseyo_click", { href: a.href, page: location.pathname });
      else if (a.closest(".partner")) track("partner_click", { href: a.href });
    });
    const res = document.querySelector(".result");
    if (res) new MutationObserver(() => { if (res.classList.contains("show")) track("tool_result"); }).observe(res, { attributes: true, attributeFilter: ["class"] });
  });

  // helpers
  window.NUNCHI = {
    fmtKRW: n => "₩" + Math.round(n).toLocaleString("en-US"),
    fmtUSD: n => "$" + Math.round(n).toLocaleString("en-US"),
    KRW_PER_USD: 1380, // rough 2026 planning rate; tools say it is approximate
    /** Draw a hanji-style share card and download it as PNG. */
    shareCard({ title, big, sub, tip, file, story, lines }) {
      const accent = getComputedStyle(document.body).getPropertyValue("--accent").trim() || "#2c5f8a";
      const c = document.createElement("canvas"); const x = c.getContext("2d");
      const paper = (w, h) => { x.fillStyle = "#f6f1e7"; x.fillRect(0, 0, w, h); x.fillStyle = "rgba(27,27,27,.05)"; for (let i = 0; i < w; i += 22) for (let j = 0; j < h; j += 22) x.fillRect(i, j, 1.5, 1.5); };
      if (story) { // 9:16 — 인스타/틱톡 스토리용
        c.width = 1080; c.height = 1920; paper(1080, 1920);
        x.fillStyle = accent; x.fillRect(0, 0, 1080, 26);
        x.fillStyle = accent; x.font = "700 40px Inter, sans-serif"; x.textAlign = "center"; x.fillText(title.toUpperCase(), 540, 420);
        x.fillStyle = "#1b1b1b"; let size = 200; x.font = `700 ${size}px 'Noto Sans KR', Inter, sans-serif`;
        while (x.measureText(big).width > 940 && size > 90) { size -= 10; x.font = `700 ${size}px 'Noto Sans KR', Inter, sans-serif`; }
        x.fillText(big, 540, 760);
        x.font = "500 52px Inter, sans-serif"; x.fillStyle = "#4a4641"; x.fillText(sub, 540, 860);
        let y = 1010; x.textAlign = "left";
        for (const ln of (lines || [])) { x.font = "500 40px 'Noto Sans KR', Inter, sans-serif"; x.fillStyle = "#1b1b1b"; y = wrap(x, ln, 110, y, 860, 56) + 30; }
        if (tip) { x.font = "italic 38px Inter, sans-serif"; x.fillStyle = accent; wrap(x, tip, 110, y + 20, 860, 52); }
        x.textAlign = "center"; x.fillStyle = "#1b1b1b"; x.font = "700 56px Fraunces, Georgia, serif"; x.fillText("Nunchi", 540, 1690);
        x.font = "400 36px Inter, sans-serif"; x.fillStyle = "#8a847b"; x.fillText("Try yours → " + location.host + location.pathname.replace(/\/$/, ""), 540, 1760);
        x.textAlign = "left";
      } else {
        c.width = 1200; c.height = 630; paper(1200, 630);
        x.fillStyle = accent; x.fillRect(0, 0, 14, 630);
        x.fillStyle = "#1b1b1b";
        x.font = "600 26px Inter, sans-serif"; x.fillText(title, 70, 90);
        x.font = "700 120px 'Noto Sans KR', Inter, sans-serif"; x.fillText(big, 70, 300);
        x.font = "500 34px Inter, sans-serif"; x.fillStyle = "#4a4641"; x.fillText(sub, 70, 370);
        if (tip) { x.font = "italic 26px Inter, sans-serif"; x.fillStyle = accent; wrap(x, "Nunchi tip: " + tip, 70, 450, 1050, 36); }
        x.fillStyle = "#1b1b1b"; x.font = "700 30px Fraunces, Georgia, serif"; x.fillText("Nunchi", 70, 580);
        x.font = "400 22px Inter, sans-serif"; x.fillStyle = "#8a847b"; x.fillText("Read Korea at a glance · " + location.host, 190, 580);
      }
      const a = document.createElement("a"); a.download = file || "nunchi.png"; a.href = c.toDataURL("image/png"); a.click(); track("share_card", { file: a.download, story: !!story });
      function wrap(ctx, text, X, Y, maxW, lh) {
        const words = text.split(" "); let line = "";
        for (const w of words) { const t = line + w + " "; if (ctx.measureText(t).width > maxW) { ctx.fillText(line, X, Y); line = w + " "; Y += lh; } else line = t; }
        ctx.fillText(line, X, Y); return Y + lh;
      }
    },
    /** 네이티브 공유 시트(모바일) → 없으면 링크 복사 */
    share(btn, { text, url }) {
      track("share_native");
      if (navigator.share) return navigator.share({ text, url }).catch(() => {});
      navigator.clipboard?.writeText(text + " " + url).then(() => { const t = btn.textContent; btn.textContent = "Copied"; setTimeout(() => btn.textContent = t, 1600); });
    },
    copyLink(btn) {
      track("copy_link"); navigator.clipboard?.writeText(location.href).then(() => { const t = btn.textContent; btn.textContent = "Link copied"; setTimeout(() => btn.textContent = t, 1600); });
    }
  };
})();

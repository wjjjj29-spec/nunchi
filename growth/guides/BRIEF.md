# Guide writing brief (hellonunchi.com)

Site: Nunchi (hellonunchi.com), free tools and short guides for foreigners visiting or living in Korea. Audience: English-speaking travellers, many from SE Asia, US, UK, Australia. Today is 23 October 2026.

## Output
One JSON file per guide at `/Users/wonjoon/원준프로젝트/nunchi/growth/guides/<slug>.json`, same schema as the existing guides. Read `luggage-storage-seoul.json` and `korean-pharmacy-guide.json` in that folder first and copy their structure, tone and length exactly.

Fields: `order` (number, given below), `slug`, `room` ("visit" or "live"), `kicker` (2–3 words), `short` (≤ 32 chars), `card` (one sentence ≤ 120 chars), `title` (SEO title ending " | Nunchi", ≤ 80 chars, include "2026" if prices or rules), `h1`, `dek` (≤ 150 chars), `desc` (meta description ≤ 240 chars), `published` (the date given in your assignment), `heroSrc` and `cards[0].photo` (use the paths given below even though the images don't exist yet), `heroAlt`, `thumbTitle`, `cards` (exactly: 1 `cover`, 4 `point`, 1 `end`; same keys as the example: `big`/`bigSub` optional, `size` 70–78 when the title is long, 3 short `points` each ≤ 60 chars), `tldr` (4 items, each starts with `<strong>Label:</strong>`), `body` (HTML), `tool` ({href, title, text} pointing to the most relevant existing tool or guide), `faq` (4–5 [q, a] pairs), `sources` (3–5 [label, url]).

Also write `/Users/wonjoon/원준프로젝트/nunchi/growth/guides/photos/<photo-key>.prompt.txt` with two lines: `hero: …` and `cover: …`. Each is a one-sentence brief for a realistic, editorial, natural-light photo of the scene (no text in image, no logos, no recognisable faces, Korea setting). Hero is landscape 16:9, cover is landscape/square scene used at the top of a 4:5 card.

## Body rules
- 700–1,100 words. Short paragraphs. `<h2>` sections, `<p>`, `<ul>`, `<table>` with `class="num"` on number cells, `<strong>`. Korean words as `<span class="ko">한글</span>` followed by romanisation and meaning in brackets.
- Practical and specific: prices in ₩, station or app names, opening hours, the exact Korean phrase to say or show. What a Korean friend would tell you.
- British spelling (neighbourhood, colour), no exclamation marks, no fluff intros, no "In this guide". Start with the answer.
- Link 2–3 existing pages inline with relative URLs, from: /tools/korea-tax-refund-calculator/, /tools/korea-trip-budget-calculator/, /tools/tmoney-vs-climate-card/, /tools/korea-esim-data-calculator/, /tools/korean-number-converter/, /tools/korean-spice-level-quiz/, /tools/korean-public-holidays/, /guide/korea-travel-apps/, /guide/cash-cards-atm-korea/, /guide/incheon-airport-to-seoul/, /guide/luggage-storage-seoul/, /guide/korean-pharmacy-guide/, /guide/see-a-doctor-in-korea/, /guide/lost-items-in-korea/, /guide/korea-esim-sim-or-pocket-wifi/, /guide/korea-tax-refund-guide/, /guide/korean-convenience-store-guide/, /guide/ktx-booking-for-foreigners/, /guide/taxis-in-korea/, /guide/jjimjilbang-guide/, /guide/ordering-at-korean-restaurants/, /guide/seoul-weather-november-december/, /tickets/ (free K-pop ticket alerts in English).
- No affiliate links unless your assignment says so.

## Accuracy (most important)
- Every price, limit, rule and opening hour must come from a source you actually checked this session with WebSearch/WebFetch, preferably official (visitkorea.or.kr, Korail, Seoul city, KMA, tax refund operators) or a 2025–2026 news article. Put those in `sources`.
- If you can't verify a number, leave it out or write it as a range with "about". Never invent figures, store names, or rules. Don't claim personal experience.
- If something changed recently (2025–2026), say so; travellers often find old numbers online.

## When done
Validate with `python3 -c "import json;json.load(open('<file>'))"`. Reply with: the slugs written, a list of every fact you were unsure about, and the source URLs. Do not build or deploy the site, and do not touch other files.

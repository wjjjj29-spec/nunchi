# Nunchi (눈치) — Read Korea at a glance

외국인 대상 "한국 도구 상자" 사이트. 정적 HTML/CSS/JS, 서버 없음. `site/` 폴더를 그대로 올리면 동작한다.

## 구조
```
site/
  index.html                 홈 (방 4개 + 시작 도구 + 이번 주의 눈치)
  visit/ live/ love/ learn/  방별 도구 목록 (미완성 도구는 card.soon)
  tools/<slug>/index.html    도구 1개 = 페이지 1개 = 검색어 1개
  about/ privacy/ contact/   애드센스 심사용 기본 페이지
  assets/nunchi.css          한지·먹·단청 색 체계, data-room 으로 강조색 전환
  assets/nunchi.js           헤더·푸터 삽입, 공유 카드(PNG) 생성, 링크 복사
  assets/hangul-names.js     영어 이름→한글 (사전 ~500 + 외래어 표기법 규칙 엔진)
  assets/partners.json       제휴 링크. url 비우면 해당 박스 자동 숨김
  img/                       Higgsfield 사진 (jpg 1600px)
```

## 도구 만드는 규칙
- 주소는 검색어 그대로: `/tools/korean-age-calculator/`
- 페이지 순서: 입력 → 결과(stat) → Nunchi tip → 설명 글 → FAQ(+FAQPage JSON-LD) → 관련 도구 → "Last checked" 날짜
- 결과 화면에 `Save as image`(공유 카드)와 `Copy link`
- 제휴 박스는 `.partner` + `data-partner="키"`, 키는 partners.json

## 미리보기
`.claude/launch.json` 의 `nunchi` (python http.server 8787) 또는:
```bash
cd ~/원준프로젝트/nunchi/site && python3 -m http.server 8787
```

## 남은 것
- 도메인(카페24) → 구매 후 canonical/og:image 절대주소로 바꾸고 sitemap.xml, robots.txt 추가
- 배포: 카페24 정적 호스팅 또는 Cloudflare Pages
- contact 이메일 실제 주소로 교체 (지금 hello@hellonunchi.com 자리표시)
- 제휴 신청 후 partners.json 채우기 (Airalo, Trip.com, Klook, Amazon)
- WONZY 애드센스 승인 뒤 사이트 추가 → 광고 코드
- 2차 도구: Visa Days, Korean Name Generator, Number Converter, Holidays, eSIM, T-money vs Climate Card

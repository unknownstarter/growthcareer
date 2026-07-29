#!/usr/bin/env node
/**
 * Fan to Pro 1기 수료식 슬라이드 덱 생성기 (16:9, 1920x1080).
 *
 * 모집 웹과 동일 디자인 언어 (다크 #0a0a0f + 핑크/퍼플 accent + Pretendard).
 * 강사 3명 = 실제 사진 인라인. 네트워킹 3분 = 흰 배경 + 원형 사진 영역 + 하단 텍스트.
 *
 * 이미지 = base64 data URI 인라인 (Playwright file:// 렌더 안정, §7.6 lesson).
 * 카피 = §6.5 부호 룰 (em dash / interpunct / 곡선따옴표 / 단일 ellipsis 금지).
 *
 * 실행: node tools/gen-ceremony-deck.mjs  → tools/ceremony-deck.html
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

function dataUri(relPath) {
  const abs = path.join(root, relPath);
  const ext = path.extname(abs).slice(1).toLowerCase();
  const mime = ext === "jpg" || ext === "jpeg" ? "image/jpeg" : `image/${ext}`;
  const b64 = readFileSync(abs).toString("base64");
  return `data:${mime};base64,${b64}`;
}

const HERO = dataUri("public/images/stock/boy-group-concert-stage-3.jpg");
const CLOSING = dataUri("public/images/stock/stage-lights-purple-pink-1.jpg");
const LOGO_BLACK = dataUri("public/brand/logo-black.png");
const INSTRUCTORS = [
  {
    name: "이제향",
    en: "Lee, Je-Hyang",
    accent: "#6366f1",
    photo: dataUri("public/images/instructors/lee-jehyang.jpeg"),
    objectPosition: "62% 30%",
    role: "(주)준컴퍼니 기술부 | 현장 음향 감독, 믹싱 엔지니어",
    intro:
      "SBS 라디오와 KBS 6시내고향에서 시작해 MBC 음악중심, 가요대제전, SBS 가요대전 UNIPOP 까지 현장을 지켜 온 현직 사운드 디렉터입니다.",
    highlights: [
      "SBS 가요대전 UNIPOP 2025 현장 음향 감독",
      "MBC 음악중심, 가요대제전 현장 믹싱 엔지니어",
      "SBS 라디오 / KBS 6시내고향 공개방송",
      "2025 부터 2026 페스티벌 다수 (사운드베리 페스타, MBC 대학가요제)",
    ],
  },
  {
    name: "Nino",
    en: "이세환",
    accent: "#a855f7",
    photo: dataUri("public/images/instructors/nino-lee.jpg"),
    objectPosition: "center 20%",
    role: "Sherpa Music CEO | Creative Director",
    intro:
      "1999년 1세대 언더래퍼로 시작해 소니뮤직, CJ E&M 을 거쳐 현재 Sherpa Music Creative Director 로 27년째 뮤직 비즈니스를 이어오고 있습니다.",
    highlights: [
      "CJ ENM A&R: 프로듀스 101 시리즈, 워너원, 아이즈원, JO1, INI",
      "HI-HAT OST 프로듀서, 국내외 100여 팀 작가 계약",
      "이승윤 Visual Director, 2025 한국대중음악상 2관왕",
      "Sherpa Music CEO, 290여 팀 작가 계약",
    ],
  },
  {
    name: "박성철",
    en: "Park, Sung-Cheol",
    accent: "#ec4899",
    photo: dataUri("public/images/instructors/park-sungcheol.png"),
    objectPosition: "center 18%",
    role: "(주)그린음향 기술부 | 현장 음향 디렉터",
    intro:
      "2005년부터 20년간 MBC 음악중심, 가요대제전, 나는 가수다 등 메이저 무대의 현장 음향을 디렉팅해 온 베테랑 사운드 디렉터입니다.",
    highlights: [
      "MBC 음악중심, 가요대제전 2005 부터 현재까지",
      "MBC 나는 가수다 1기, 코리안뮤직 웨이브",
      "SBS 2025 가요대전 썸머 유니팝",
      "사운드베리 페스타, MBC 대학가요제 등 최신 무대",
    ],
  },
];

// 실 1기 수료생 10명 (capture-cert-batch-10.mjs 와 동일 명단, 수료증 발급과 일치)
const GRADUATES = [
  "RAMPOLDI MARTINA",
  "NGUYEN THI QUYNH TRANG",
  "JESUS CORTINHAS FABIA ALEXANDRA",
  "MEDEIROS DE BRITO PONTES CAROLINA",
  "LIU JIEXIAN",
  "Isabel Mendoza Garcia",
  "SIU KRISTEL CELINE CO",
  "AYE AYE KHAING",
  "Lysa MBAH",
  "Alagiriswamy Abinaya",
];

const NET_DIR = "docs/screenshots/ceremony/네트워킹_이미지";
const GUESTS = [
  {
    name: "권태호",
    sub: "유니온 그룹 총괄 대표",
    affil: "유니온픽처스 북미 대표",
    accent: "#ec4899",
    photo: dataUri(`${NET_DIR}/권태호_유니온픽처스_US_대표님.png`),
    objectPosition: "center 18%",
    bio: [
      "현 미국 유니온 그룹 총괄 대표. K-pop 공연 기획사 유니온픽처스(한국)를 비롯해 Store, AI, IT, F&B 등 5개 벤처 계열사를 보유하고 있습니다.",
      "투자 프로젝트: 배우 임시완 팬미팅, 악동뮤지션, 거미, 허각, 정용화 공연과 SK텔레콤과 함께한 K-pop 페스티벌 등 90여 개 프로젝트에 투자.",
      "성남벤처경진대회 1위, 연세대 예비기술자 창업지원에서 우수 벤처 10여 개 등급 선정.",
      "KOTRA 해외마케팅 본부 우수 인턴, 경기대학교 국제학부.",
      "협력 파트너 사례: 네이버, LG U+, SK텔레콤 등 다수 플랫폼과 엔터테인먼트 콜라보.",
    ],
  },
  {
    name: "진유정",
    sub: "靳宇存",
    affil: "유니온 그룹 DEEPI, 디지털 및 Ent IP 총괄",
    accent: "#a855f7",
    photo: dataUri(`${NET_DIR}/진유정_DEEPI_IP총괄님.png`),
    objectPosition: "center 12%",
    bio: [
      "유니온 그룹 DEEPI 계열사에서 디지털 및 엔터테인먼트 IP 비즈니스를 담당하고 있습니다.",
      "엔터테인먼트 플랫폼 DEEPI(디피)의 기획과 운영 관리를 총괄합니다.",
      "유니온의 IP를 기반으로 한 글로벌 디지털 콘텐츠 비즈니스를 담당합니다.",
      "K-pop 에 관심을 갖고 중국에서 한국 대학원에 진학해 심도 있게 공부한 뒤, 현재 전략적 IP 비즈니스 전략을 맡고 있습니다.",
    ],
  },
  {
    name: "이광주",
    sub: "유니온픽처스 대외협력 매니저",
    affil: "피플게이트 대표",
    accent: "#6366f1",
    photo: dataUri(`${NET_DIR}/이광주_피플게이트_대표님.png`),
    objectPosition: "center 24%",
    bio: [
      "1989년 27세에 (주)섬유저널 패션비즈에 입사해 2024년 4월 이사로 정년퇴직하기까지, 35년을 첫 직장에서 보냈습니다. (취재기자, 업무제휴, 패션 구인구직 헤드헌터)",
      "2024년 5월부터 피플게이트 대표, 유니온픽처스 대외협력 매니저, 뷰티누리와 패션서울 객원기자로 활동 중입니다.",
      "피플게이트(peoplegate.co.kr): 패션 뷰티 라이프스타일 B2B 콘텐츠 사이트. 1일 평균 5천 명 이상 방문하는 구글 기반 블로그.",
      "네이버 블로그(이웃 5000명)와 네이버카페 Fashion & Beauty Communication 을 병행 운영합니다.",
    ],
  },
];

function instructorSlide(m, idx) {
  return `
  <section class="slide slide-instructor" style="--accent:${m.accent}">
    <div class="ins-index">Instructor 0${idx + 1}</div>
    <div class="ins-grid">
      <div class="ins-photo-wrap">
        <img class="ins-photo" src="${m.photo}" alt="${m.name}" style="object-position:${m.objectPosition}" />
        <div class="ins-photo-ring"></div>
      </div>
      <div class="ins-body">
        <div class="ins-name">${m.name}</div>
        <div class="ins-en">${m.en}</div>
        <div class="ins-role">${m.role}</div>
        <p class="ins-intro">${m.intro}</p>
        <ul class="ins-highlights">
          ${m.highlights.map((h) => `<li>${h}</li>`).join("\n          ")}
        </ul>
      </div>
    </div>
  </section>`;
}

function guestSlide(g, idx) {
  return `
  <section class="slide slide-guest" style="--gaccent:${g.accent}">
    <div class="g-kicker">Networking / Guest 0${idx + 1}</div>
    <div class="g-grid">
      <div class="g-circle-wrap">
        <div class="g-circle"><img src="${g.photo}" alt="${g.name}" style="object-position:${g.objectPosition}" /></div>
      </div>
      <div>
        <div class="g-name">${g.name}</div>
        <div class="g-sub">${g.sub}</div>
        <div class="g-affil">${g.affil}</div>
        <ul class="g-bio">
          ${g.bio.map((b) => `<li>${b}</li>`).join("\n          ")}
        </ul>
      </div>
    </div>
  </section>`;
}

const html = `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8" />
<title>Fan to Pro 1기 수료식</title>
<style>
@import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css');

:root {
  --bg: #0a0a0f;
  --surface: #14141b;
  --surface-2: #1c1c26;
  --border: #27272f;
  --fg: #fafafa;
  --muted: #a1a1aa;
  --subtle: #71717a;
  --pink: #ec4899;
  --purple: #a855f7;
  --indigo: #6366f1;
}
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body {
  font-family: 'Pretendard Variable', 'Pretendard', system-ui, -apple-system, sans-serif;
  letter-spacing: -0.01em;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}
.slide {
  width: 1920px;
  height: 1080px;
  position: relative;
  overflow: hidden;
  background: var(--bg);
  color: var(--fg);
  display: flex;
  flex-direction: column;
}

/* ---------- SLIDE 1 TITLE ---------- */
.slide-title { justify-content: center; padding: 0 160px; }
.slide-title .bg {
  position: absolute; inset: 0;
  background-image: url('${HERO}');
  background-size: cover; background-position: center 30%;
  opacity: 0.5;
}
.slide-title .bg-grad-x { position: absolute; inset: 0; background: linear-gradient(90deg, var(--bg) 20%, rgba(10,10,15,0.55) 55%, transparent); }
.slide-title .bg-grad-y { position: absolute; inset: 0; background: linear-gradient(180deg, rgba(10,10,15,0.35), transparent 30%, var(--bg)); }
.slide-title .content { position: relative; z-index: 2; }
.t-umbrella { font-size: 26px; font-weight: 800; letter-spacing: 0.32em; color: var(--muted); margin-bottom: 42px; }
.t-title { font-size: 200px; font-weight: 900; line-height: 0.92; letter-spacing: -0.05em; }
.t-title .to { font-style: italic; font-weight: 500; color: var(--subtle); font-size: 120px; margin: 0 24px; }
.t-title .pro { color: var(--pink); }
.t-sub { margin-top: 52px; font-size: 46px; font-weight: 700; letter-spacing: -0.02em; }
.t-meta { margin-top: 22px; font-size: 30px; font-weight: 500; color: var(--muted); }
.t-date { position: absolute; right: 160px; bottom: 120px; z-index: 2; text-align: right; }
.t-date .label { font-size: 22px; letter-spacing: 0.2em; color: var(--subtle); text-transform: uppercase; }
.t-date .val { font-size: 60px; font-weight: 800; letter-spacing: 0.04em; margin-top: 8px; }

/* ---------- DIVIDER (dark) ---------- */
.slide-divider { justify-content: center; padding: 0 160px; }
.d-kicker { font-size: 30px; font-weight: 700; letter-spacing: 0.3em; color: var(--pink); text-transform: uppercase; margin-bottom: 28px; }
.d-title { font-size: 150px; font-weight: 900; letter-spacing: -0.04em; line-height: 1; }
.d-sub { margin-top: 40px; font-size: 40px; font-weight: 500; color: var(--muted); }
.d-dots { margin-top: 60px; display: flex; gap: 20px; }
.d-dots span { width: 26px; height: 26px; border-radius: 50%; }

/* ---------- INSTRUCTOR ---------- */
.slide-instructor { padding: 120px 160px; justify-content: center; }
.ins-index { position: absolute; top: 96px; left: 160px; font-size: 26px; font-weight: 800; letter-spacing: 0.28em; color: var(--accent); text-transform: uppercase; }
.ins-grid { display: grid; grid-template-columns: 620px 1fr; gap: 110px; align-items: center; }
.ins-photo-wrap { position: relative; width: 620px; height: 720px; }
.ins-photo { width: 100%; height: 100%; object-fit: cover; border-radius: 40px; display: block; }
.ins-photo-ring { position: absolute; inset: -14px; border-radius: 52px; border: 3px solid var(--accent); opacity: 0.55; pointer-events: none; }
.ins-name { font-size: 116px; font-weight: 900; letter-spacing: -0.04em; line-height: 1; }
.ins-en { font-size: 40px; font-weight: 500; color: var(--subtle); margin-top: 12px; letter-spacing: 0; }
.ins-role { display: inline-block; margin-top: 34px; font-size: 34px; font-weight: 700; color: var(--fg); padding: 14px 26px; background: var(--surface-2); border: 1px solid var(--border); border-left: 5px solid var(--accent); border-radius: 14px; }
.ins-intro { margin-top: 40px; font-size: 36px; font-weight: 500; line-height: 1.6; color: #e4e4e7; max-width: 980px; }
.ins-highlights { margin-top: 44px; list-style: none; display: flex; flex-direction: column; gap: 20px; }
.ins-highlights li { position: relative; padding-left: 44px; font-size: 32px; font-weight: 500; color: var(--muted); line-height: 1.35; }
.ins-highlights li::before { content: ""; position: absolute; left: 0; top: 14px; width: 22px; height: 22px; border-radius: 6px; background: var(--accent); }

/* ---------- 수료증 증정 (dark, K-pop blue accent) ---------- */
.slide-cert { justify-content: center; align-items: center; text-align: center; padding: 90px 160px; }
.cert-emblem { width: 128px; height: 128px; border-radius: 50%; border: 3px solid #3182f6; color: #3182f6; display: flex; flex-direction: column; align-items: center; justify-content: center; margin: 0 auto 34px; position: relative; }
.cert-emblem::before { content: ""; position: absolute; inset: 8px; border-radius: 50%; border: 1px solid #3182f6; opacity: 0.6; }
.cert-emblem .em-top { font-size: 15px; font-weight: 800; letter-spacing: 0.16em; }
.cert-emblem .em-mid { font-size: 22px; font-weight: 900; letter-spacing: 0.04em; margin-top: 2px; }
.cert-kicker { font-size: 26px; font-weight: 700; letter-spacing: 0.3em; color: var(--muted); text-transform: uppercase; margin-bottom: 22px; }
.cert-title { font-size: 140px; font-weight: 900; letter-spacing: -0.04em; line-height: 1; }
.cert-note { margin-top: 26px; font-size: 30px; font-weight: 500; color: var(--muted); }
.grad-grid { margin-top: 66px; display: grid; grid-template-columns: repeat(2, minmax(0, 660px)); gap: 22px 110px; }
.grad-item { display: flex; align-items: baseline; gap: 26px; font-size: 40px; font-weight: 700; text-align: left; letter-spacing: -0.01em; }
.grad-num { font-size: 24px; font-weight: 800; color: #3182f6; min-width: 46px; }

/* ---------- NETWORK DIVIDER (white) ---------- */
.slide-net-intro { background: #ffffff; color: #111; justify-content: center; padding: 0 160px; }
.slide-net-intro .d-kicker { color: var(--pink); }
.slide-net-intro .ni-title { font-size: 130px; font-weight: 900; letter-spacing: -0.04em; line-height: 1; color: #111; }
.slide-net-intro .ni-sub { margin-top: 30px; font-size: 38px; font-weight: 500; color: #52525b; }
.ni-row { margin-top: 96px; display: flex; gap: 120px; justify-content: center; }
.ni-person { text-align: center; width: 360px; }
.ni-circle { width: 280px; height: 280px; border-radius: 50%; margin: 0 auto; overflow: hidden; border: 5px solid #e4e4e7; }
.ni-circle img { width: 100%; height: 100%; object-fit: cover; display: block; }
.ni-name { margin-top: 34px; font-size: 48px; font-weight: 800; color: #111; letter-spacing: -0.02em; }
.ni-affil { margin-top: 12px; font-size: 30px; font-weight: 500; color: #52525b; }

/* ---------- NETWORK DETAIL (white) ---------- */
.slide-guest { background: #ffffff; color: #111; padding: 130px 170px; justify-content: center; }
.g-kicker { position: absolute; top: 100px; left: 170px; font-size: 24px; font-weight: 800; letter-spacing: 0.28em; color: #a1a1aa; text-transform: uppercase; }
.g-grid { display: grid; grid-template-columns: 420px 1fr; gap: 120px; align-items: center; }
.g-circle-wrap { text-align: center; }
.g-circle { width: 440px; height: 440px; border-radius: 50%; overflow: hidden; border: 6px solid var(--gaccent); box-shadow: 0 20px 60px rgba(0,0,0,0.14); }
.g-circle img { width: 100%; height: 100%; object-fit: cover; display: block; }
.g-name { font-size: 96px; font-weight: 900; letter-spacing: -0.04em; line-height: 1; color: #111; }
.g-sub { margin-top: 14px; font-size: 34px; font-weight: 500; color: #71717a; }
.g-affil { margin-top: 22px; font-size: 38px; font-weight: 700; color: var(--gaccent); }
.g-bio { margin-top: 40px; list-style: none; display: flex; flex-direction: column; gap: 22px; max-width: 1080px; }
.g-bio li { position: relative; padding-left: 40px; font-size: 30px; font-weight: 500; line-height: 1.5; color: #27272a; }
.g-bio li::before { content: ""; position: absolute; left: 0; top: 13px; width: 18px; height: 18px; border-radius: 50%; background: var(--gaccent); }

/* ---------- GUEST PAIR (white) ---------- */
.slide-pair { background: #ffffff; color: #111; padding: 130px 160px; justify-content: center; }
.pair-title { position: absolute; top: 100px; left: 160px; font-size: 24px; font-weight: 800; letter-spacing: 0.28em; color: #a1a1aa; text-transform: uppercase; }
.pair-row { display: flex; gap: 160px; justify-content: center; }
.pair-person { text-align: center; width: 560px; }
.pair-circle { width: 340px; height: 340px; border-radius: 50%; margin: 0 auto; display: flex; align-items: center; justify-content: center; font-size: 140px; font-weight: 800; color: #fff; }
.pair-name { margin-top: 44px; font-size: 66px; font-weight: 900; color: #111; letter-spacing: -0.02em; }
.pair-affil { margin-top: 16px; font-size: 36px; font-weight: 700; }
.pair-note { margin-top: 14px; font-size: 28px; font-weight: 500; color: #71717a; }

.logo-corner { position: absolute; bottom: 70px; left: 170px; height: 46px; opacity: 0.9; }

/* ---------- CLOSING (dark, bookend) ---------- */
.slide-closing { justify-content: center; align-items: center; text-align: center; padding: 0 160px; }
.slide-closing .bg { position: absolute; inset: 0; background-image: url('${CLOSING}'); background-size: cover; background-position: center; opacity: 0.42; }
.slide-closing .bg-grad { position: absolute; inset: 0; background: radial-gradient(ellipse at center, rgba(10,10,15,0.25), var(--bg) 78%); }
.slide-closing .content { position: relative; z-index: 2; }
.c-kicker { font-size: 30px; font-weight: 800; letter-spacing: 0.35em; color: var(--pink); text-transform: uppercase; margin-bottom: 38px; }
.c-title { font-size: 168px; font-weight: 900; letter-spacing: -0.04em; line-height: 1; }
.c-sub { margin-top: 50px; font-size: 40px; font-weight: 500; color: #e4e4e7; line-height: 2.0; }
.c-brand { margin-top: 76px; font-size: 26px; font-weight: 700; letter-spacing: 0.28em; color: var(--muted); }

@media print {
  @page { size: 1920px 1080px; margin: 0; }
  .slide { page-break-after: always; break-after: page; }
}
</style>
</head>
<body>

  <section class="slide slide-title">
    <div class="bg"></div><div class="bg-grad-x"></div><div class="bg-grad-y"></div>
    <div class="content">
      <div class="t-umbrella">GROWTH CAREER</div>
      <div class="t-title">FAN<span class="to">to</span><span class="pro">PRO</span></div>
      <div class="t-sub">1기 수료식</div>
      <div class="t-meta">한국 거주 외국인 유학생을 위한 K-pop 엔터테인먼트 직무 취업 트랙</div>
    </div>
    <div class="t-date"><div class="label">Completion Ceremony</div><div class="val">2026. 07. 25</div></div>
  </section>

  <section class="slide slide-divider">
    <div class="d-kicker">Instructors</div>
    <div class="d-title">강사 소개</div>
    <div class="d-sub">4주 8회, 현장을 가르친 분들</div>
    <div class="d-dots"><span style="background:#6366f1"></span><span style="background:#a855f7"></span><span style="background:#ec4899"></span></div>
  </section>

  ${INSTRUCTORS.map(instructorSlide).join("\n")}

  <section class="slide slide-cert">
    <div class="cert-emblem"><span class="em-top">DROPDOWN</span><span class="em-mid">Certified</span></div>
    <div class="cert-kicker">Certificate of Completion</div>
    <div class="cert-title">수료증 증정</div>
    <div class="grad-grid">
      ${GRADUATES.map((name, i) => `<div class="grad-item"><span class="grad-num">${String(i + 1).padStart(2, "0")}</span><span>${name}</span></div>`).join("\n      ")}
    </div>
  </section>

  <section class="slide slide-net-intro">
    <div class="d-kicker">Networking</div>
    <div class="ni-title">네트워킹 인사</div>
    <div class="ni-sub">오늘 함께해 주신 분들을 소개합니다.</div>
    <div class="ni-row">
      ${GUESTS.map((p) => `<div class="ni-person">
        <div class="ni-circle" style="border-color:${p.accent}"><img src="${p.photo}" alt="${p.name}" style="object-position:${p.objectPosition}" /></div>
        <div class="ni-name">${p.name}</div>
        <div class="ni-affil">${p.affil}</div>
      </div>`).join("\n      ")}
    </div>
  </section>

  ${GUESTS.map(guestSlide).join("\n")}

  <section class="slide slide-closing">
    <div class="bg"></div><div class="bg-grad"></div>
    <div class="content">
      <div class="c-kicker">Congratulations</div>
      <div class="c-title">수료를 축하합니다</div>
      <div class="c-sub">Fan to Pro 1기 수료생 여러분, 진심으로 축하드립니다.<br />K-pop 산업의 프로로, 여정은 이제 시작입니다.</div>
      <div class="c-brand">GROWTH CAREER  |  Fan to Pro</div>
    </div>
  </section>

</body>
</html>`;

const OUT = path.join(__dirname, "ceremony-deck.html");
writeFileSync(OUT, html, "utf8");
console.log(`[gen] wrote ${OUT} (${(html.length / 1024 / 1024).toFixed(2)} MB)`);

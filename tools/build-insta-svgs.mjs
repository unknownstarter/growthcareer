// Build 8 SVG files mirroring the HTML cards.
// Each SVG is 1080x1080, references the stock image via <image href>,
// and lays out all copy as discrete <text> nodes so Figma import yields
// separate, editable text layers.
//
// Output: docs/screenshots/insta-cards/card-NN-XX.svg

import { resolve, relative } from "node:path";
import { mkdirSync, writeFileSync } from "node:fs";

const root = resolve(import.meta.dirname, "..");
const outDir = resolve(root, "docs/screenshots/insta-cards");
mkdirSync(outDir, { recursive: true });

const BG = "#0a0a0f";
const FG = "#fafafa";
const MUTED = "#d4d4d8";
const SUBTLE = "#a1a1aa";
const PINK = "#ec4899";

// Stock image mapping — relative path from the SVG file location.
const STOCK = {
  hook: "../../../public/images/stock/concert-stage-from-behind-performer-2.jpg",
  benefits: "../../../public/images/stock/male-singer-silhouette-stage-2.jpg",
  mentors: "../../../public/images/stock/concert-stage-from-behind-performer-3.jpg",
  cta: "../../../public/images/stock/stage-lights-purple-pink-1.jpg",
};

const FONT = "Pretendard Variable, Pretendard, system-ui, -apple-system, BlinkMacSystemFont, sans-serif";

// ─── helpers ────────────────────────────────────────────────────────────────

function frame({ image, overlay }) {
  return `
  <rect width="1080" height="1080" fill="${BG}"/>
  <image href="${image}" x="0" y="0" width="1080" height="1080" preserveAspectRatio="xMidYMid slice"/>
  ${overlay}
  <rect x="0" y="0" width="12" height="1080" fill="${PINK}"/>`;
}

// Bottom-left wordmark, shared across all cards.
function wordmark() {
  return `
  <g font-family="${FONT}">
    <text x="120" y="1010" font-size="28" font-weight="900" letter-spacing="-0.84" fill="${FG}">
      FAN<tspan fill="${PINK}">.</tspan> TO PRO<tspan fill="${PINK}">.</tspan>
    </text>
    <text x="120" y="1034" font-size="11" font-weight="700" letter-spacing="3.96" fill="${SUBTLE}">GROWTH CAREER</text>
  </g>`;
}

function eyebrow(y, text) {
  return `<text x="120" y="${y}" font-family="${FONT}" font-size="22" font-weight="700" letter-spacing="7.04" fill="${PINK}">${text}</text>`;
}

// Linear gradient overlays as separate <defs> blocks per card.
function overlayHook(id) {
  return `
  <defs>
    <linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#0a0a0f" stop-opacity="0.55"/>
      <stop offset="1" stop-color="#0a0a0f" stop-opacity="0.90"/>
    </linearGradient>
  </defs>
  <rect width="1080" height="1080" fill="url(#${id})"/>
  <rect width="1080" height="1080" fill="#0a0a0f" fill-opacity="0.35"/>`;
}
function overlayBenefits(id) {
  return `
  <defs>
    <linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0a0a0f" stop-opacity="0.92"/>
      <stop offset="1" stop-color="#0a0a0f" stop-opacity="0.78"/>
    </linearGradient>
  </defs>
  <rect width="1080" height="1080" fill="url(#${id})"/>`;
}
function overlayMentors(id) {
  return `
  <defs>
    <linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#0a0a0f" stop-opacity="0.78"/>
      <stop offset="0.7" stop-color="#0a0a0f" stop-opacity="0.92"/>
      <stop offset="1" stop-color="#0a0a0f" stop-opacity="0.95"/>
    </linearGradient>
  </defs>
  <rect width="1080" height="1080" fill="url(#${id})"/>`;
}
function overlayCta(id) {
  return `
  <defs>
    <linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#0a0a0f" stop-opacity="0.72"/>
      <stop offset="0.6" stop-color="#0a0a0f" stop-opacity="0.90"/>
      <stop offset="1" stop-color="#0a0a0f" stop-opacity="0.95"/>
    </linearGradient>
  </defs>
  <rect width="1080" height="1080" fill="url(#${id})"/>`;
}

// Pink filled circle + check glyph, used for bullet rows.
function checkBadge(cx, cy) {
  return `
    <circle cx="${cx}" cy="${cy}" r="18" fill="${PINK}"/>
    <text x="${cx}" y="${cy + 8}" font-family="${FONT}" font-size="22" font-weight="900" fill="#0a0a0f" text-anchor="middle">&#10003;</text>`;
}

// Mentor left bar accent + role/desc.
function mentor(y, role, desc) {
  return `
    <rect x="120" y="${y - 28}" width="3" height="56" fill="${PINK}"/>
    <text x="144" y="${y - 6}" font-family="${FONT}" font-size="30" font-weight="900" letter-spacing="-0.6" fill="${FG}">${role}</text>
    <text x="144" y="${y + 26}" font-family="${FONT}" font-size="22" font-weight="500" fill="${MUTED}">${desc}</text>`;
}

// ─── card builders ──────────────────────────────────────────────────────────

function cardHook({ id, eyebrowText, line1, line2pre, line2pink, line2post, sub }) {
  // headline lives near the bottom of the frame, large.
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1080" width="1080" height="1080">
  ${frame({ image: STOCK.hook, overlay: overlayHook(`g_${id}`) })}
  ${eyebrow(720, eyebrowText)}
  <text x="120" y="820" font-family="${FONT}" font-size="120" font-weight="900" letter-spacing="-4.8" fill="${FG}">${line1}</text>
  <text x="120" y="930" font-family="${FONT}" font-size="120" font-weight="900" letter-spacing="-4.8" fill="${FG}">${line2pre}<tspan fill="${PINK}">${line2pink}</tspan>${line2post}</text>
  <text x="120" y="985" font-family="${FONT}" font-size="28" font-weight="400" fill="${MUTED}">${sub}</text>
  ${wordmark()}
</svg>`;
}

function cardBenefits({ id, eyebrowText, line1, line2pink, bullets }) {
  const bulletRows = bullets.map((b, i) => {
    const y = 470 + i * 78;
    return `
    ${checkBadge(140, y - 8)}
    <text x="186" y="${y}" font-family="${FONT}" font-size="28" font-weight="500" fill="${FG}">${b}</text>`;
  }).join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1080" width="1080" height="1080">
  ${frame({ image: STOCK.benefits, overlay: overlayBenefits(`g_${id}`) })}
  ${eyebrow(180, eyebrowText)}
  <text x="120" y="290" font-family="${FONT}" font-size="100" font-weight="900" letter-spacing="-4" fill="${FG}">${line1}</text>
  <text x="120" y="390" font-family="${FONT}" font-size="100" font-weight="900" letter-spacing="-4" fill="${PINK}">${line2pink}</text>
  ${bulletRows}
  ${wordmark()}
</svg>`;
}

function cardMentors({ id, eyebrowText, line1, line2pre, line2pink, line2post, sub, mentors }) {
  const mentorRows = mentors.map((m, i) => mentor(620 + i * 100, m.role, m.desc)).join("");
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1080" width="1080" height="1080">
  ${frame({ image: STOCK.mentors, overlay: overlayMentors(`g_${id}`) })}
  ${eyebrow(180, eyebrowText)}
  <text x="120" y="290" font-family="${FONT}" font-size="72" font-weight="900" letter-spacing="-2.88" fill="${FG}">${line1}</text>
  <text x="120" y="370" font-family="${FONT}" font-size="72" font-weight="900" letter-spacing="-2.88" fill="${FG}">${line2pre}<tspan fill="${PINK}">${line2pink}</tspan>${line2post}</text>
  <text x="120" y="450" font-family="${FONT}" font-size="24" font-weight="500" fill="${MUTED}">${sub}</text>
  ${mentorRows}
  ${wordmark()}
</svg>`;
}

function cardCta({ id, eyebrowText, price, subline, bullets, url, priceSize = 160, priceLetterSpacing = -6.4 }) {
  const bulletRows = bullets.map((b, i) => {
    const y = 720 + i * 62;
    return `
    ${checkBadge(140, y - 8)}
    <text x="186" y="${y}" font-family="${FONT}" font-size="26" font-weight="500" fill="${FG}">${b}</text>`;
  }).join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1080" width="1080" height="1080">
  ${frame({ image: STOCK.cta, overlay: overlayCta(`g_${id}`) })}
  ${eyebrow(360, eyebrowText)}
  <text x="120" y="510" font-family="${FONT}" font-size="${priceSize}" font-weight="900" letter-spacing="${priceLetterSpacing}" fill="${PINK}">${price}</text>
  <text x="120" y="580" font-family="${FONT}" font-size="32" font-weight="700" fill="${FG}">${subline}</text>
  ${bulletRows}
  <text x="120" y="880" font-family="${FONT}" font-size="26" font-weight="800" fill="${PINK}">${url}</text>
  ${wordmark()}
</svg>`;
}

// ─── content (mirror of HTML copy) ──────────────────────────────────────────

const CARDS = {
  "card-01-en": cardHook({
    id: "01en",
    eyebrowText: "FAN TO PRO / 2026 / COHORT 1",
    line1: "From K-pop fan",
    line2pre: "to ",
    line2pink: "maker.",
    line2post: "",
    sub: "A 4-week industry bootcamp for international students in Korea.",
  }),
  "card-01-ko": cardHook({
    id: "01ko",
    eyebrowText: "FAN TO PRO / 2026 / 1기",
    line1: "K-pop 팬에서",
    line2pre: "",
    line2pink: "만드는 사람",
    line2post: "으로.",
    sub: "한국 거주 외국인 유학생을 위한 4주 K-pop 산업 부트캠프.",
  }),

  "card-02-en": cardBenefits({
    id: "02en",
    eyebrowText: "WHAT YOU GET",
    line1: "Real career",
    line2pink: "assets.",
    bullets: [
      "Real K-pop concert experience and paid project work",
      "Mentorship from working industry pros",
      "Dropdown certificate, Union Pictures letter",
      "Lifetime KakaoTalk alumni network",
    ],
  }),
  "card-02-ko": cardBenefits({
    id: "02ko",
    eyebrowText: "이걸 얻는다",
    line1: "진짜 커리어",
    line2pink: "자산.",
    bullets: [
      "실제 K-pop 공연 경험과 수당 받는 프로젝트",
      "현직 업계 전문가 멘토링",
      "Dropdown 수료증, 유니온픽처스 참여확인서",
      "평생 유효한 카톡 동문 네트워크",
    ],
  }),

  "card-03-en": cardMentors({
    id: "03en",
    eyebrowText: "WHO YOU LEARN FROM",
    line1: "Learn the job from",
    line2pre: "the ",
    line2pink: "pros doing it.",
    line2post: "",
    sub: "Real mentors. Real work. Real know-how.",
    mentors: [
      { role: "Live sound director", desc: "Major K-pop TV shows and festivals" },
      { role: "A&amp;R + Visual director", desc: "K-pop label, 27 yrs" },
      { role: "Sound director", desc: "Major K-pop stages, 20 yrs" },
    ],
  }),
  "card-03-ko": cardMentors({
    id: "03ko",
    eyebrowText: "이들에게 배운다",
    line1: "현직 전문가에게",
    line2pre: "",
    line2pink: "직무를 그대로.",
    line2post: "",
    sub: "진짜 멘토. 진짜 업무. 진짜 노하우.",
    mentors: [
      { role: "현직 음향 감독", desc: "K-pop 메이저 방송, 페스티벌" },
      { role: "A&amp;R + 비주얼 디렉터", desc: "K-pop 레이블, 27년" },
      { role: "현직 사운드 디렉터", desc: "K-pop 메이저 무대, 20년" },
    ],
  }),

  "card-04-en": cardCta({
    id: "04en",
    eyebrowText: "APPLY NOW",
    price: "&#8361;880,000 KRW.",
    subline: "20% OFF / 30 seats / first-come, first-served",
    bullets: [
      "Eligible: D‑2, D‑4, D‑10, E‑series (in Korea)",
      "Deadline: Sunday, June 21, 2026 midnight",
    ],
    url: "growthcareer.xyz/fan-to-pro",
    // EN price is longer — scale down to keep single line within 864px content width.
    priceSize: 108,
    priceLetterSpacing: -3.2,
  }),
  "card-04-ko": cardCta({
    id: "04ko",
    eyebrowText: "지금 신청",
    price: "880,000원.",
    subline: "20% OFF / 30석 한정 / 선착순",
    bullets: [
      "자격: D‑2, D‑4, D‑10, E‑시리즈 (한국 거주자)",
      "마감: 2026년 6월 21일(일) 자정",
    ],
    url: "growthcareer.xyz/fan-to-pro",
  }),
};

for (const [name, svg] of Object.entries(CARDS)) {
  const out = resolve(outDir, `${name}.svg`);
  writeFileSync(out, svg, "utf8");
  console.log(`wrote ${relative(root, out)}`);
}
console.log("done");

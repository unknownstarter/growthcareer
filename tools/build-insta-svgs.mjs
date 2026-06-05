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

function eyebrow(y, text, fontSize = 22) {
  // letter-spacing scales proportionally with font-size (0.32em ≈ size * 0.32).
  const ls = (fontSize * 0.32).toFixed(2);
  return `<text x="120" y="${y}" font-family="${FONT}" font-size="${fontSize}" font-weight="700" letter-spacing="${ls}" fill="${PINK}">${text}</text>`;
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
// Optional `r` overrides the default radius (Card 02 uses bigger badges
// to balance the bumped 38px bullet text).
function checkBadge(cx, cy, r = 18) {
  const glyphSize = Math.round(r * 1.22);
  const glyphDy = Math.round(r * 0.44);
  return `
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="${PINK}"/>
    <text x="${cx}" y="${cy + glyphDy}" font-family="${FONT}" font-size="${glyphSize}" font-weight="900" fill="#0a0a0f" text-anchor="middle">&#10003;</text>`;
}

// Mentor left bar accent + role/desc + curriculum.
// curriculumLabel = "Curriculum" or "커리큘럼" (locale-aware).
// v6 (2026-06-05) — Noah's "스마트폰 인스타 가독성" 피드백.
//   role 26→32 / desc 19→24 / curriculum 16→22 / bar 86→120.
//   x-offset 142→146 to match the wider 24px padding in HTML.
function mentor(y, role, desc, curriculumLabel, curriculumText) {
  return `
    <rect x="120" y="${y - 30}" width="3" height="120" fill="${PINK}"/>
    <text x="146" y="${y - 4}" font-family="${FONT}" font-size="32" font-weight="900" letter-spacing="-0.64" fill="${FG}">${role}</text>
    <text x="146" y="${y + 30}" font-family="${FONT}" font-size="24" font-weight="500" fill="${MUTED}">${desc}</text>
    <text x="146" y="${y + 64}" font-family="${FONT}" font-size="22" font-weight="500" fill="${SUBTLE}"><tspan fill="${PINK}" font-weight="700">${curriculumLabel}</tspan>  ${curriculumText}</text>`;
}

// Section label for Saturday/Sunday class header in Card 03.
// v6 — bumped 16→20px + max-width 380→440 to match HTML scale.
function sectionLabel(y, text) {
  return `
    <text x="120" y="${y}" font-family="${FONT}" font-size="20" font-weight="700" letter-spacing="6.40" fill="${PINK}">${text}</text>
    <line x1="120" y1="${y + 12}" x2="440" y2="${y + 12}" stroke="${PINK}" stroke-opacity="0.4" stroke-width="2"/>`;
}

// ─── card builders ──────────────────────────────────────────────────────────

function cardHook({ id, eyebrowText, line1, line2pre, line2pink, line2post, sub, sub2, chips, lineGap = 100, chipCharWidth = 14 }) {
  // Layout v7 (2026-06-05) — Noah's "v2 preview 패턴" 피드백.
  // Headline + sub + chips moved to BOTTOM 1/3 of the card. Eyebrow now
  // sits DIRECTLY ABOVE headline (not pinned to top). Mirrors
  // _svg-preview-card-01-en-v2.png.
  //
  // y baselines:
  //   TUITION 20% OFF sticker — top-right, rotated -12deg (own group below)
  //   eyebrow      664   (was 230 — now anchored just above headline)
  //   headline L1  700   (was 470)
  //   headline L2  L1 + lineGap (EN=100; KO=112 — looser line-height per Noah)
  //   sub          L2 + 55
  //   chips top    sub + 28
  //   wordmark     1010 + 1034
  //
  // KO override (lineGap=112): the two-row KO headline was visually
  // cramped at 1.00 line-height. EN stays at 1.00 (looks fine).
  //
  // Chips v7: replaced visa-code chips (D-2/D-4/D-10/E-series) with 3
  // audience/value keyword chips per Noah's feedback. Visa info is
  // redundant with Card 04 + visa codes aren't obviously Korean.
  // Pink outline pill style retained. KO chips are wider per char so
  // callers pass chipCharWidth=22 to widen pill backing accordingly.
  const l1y = 700;
  const l2y = l1y + lineGap;
  const subY = l2y + 55;
  // v8 (2026-06-05) — Noah's "sub 두 문장 줄바꿈" 피드백 (EN 만).
  // EN sub 는 두 문장으로 분리되어 sub2 가 sub 아래 ~34px (26px font-size
  // line-height ~1.3) 에 렌더된다. chips 는 마지막 sub 라인 +28px.
  const sub2Y = sub2 ? subY + 34 : subY;
  const chipTop = sub2Y + 28;

  let cx = 120;
  const chipSvg = chips.map((label) => {
    const w = Math.max(72, label.length * chipCharWidth + 36);
    const g = `
    <g>
      <rect x="${cx}" y="${chipTop}" width="${w}" height="46" rx="23" fill="${PINK}" fill-opacity="0.08" stroke="${PINK}" stroke-width="2"/>
      <text x="${cx + w / 2}" y="${chipTop + 31}" font-family="${FONT}" font-size="22" font-weight="700" letter-spacing="0.44" fill="${PINK}" text-anchor="middle">${label}</text>
    </g>`;
    cx += w + 12;
    return g;
  }).join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1080" width="1080" height="1080">
  <defs>
    <filter id="sticker_shadow_${id}" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="8" stdDeviation="10" flood-color="#000000" flood-opacity="0.45"/>
    </filter>
  </defs>
  ${frame({ image: STOCK.hook, overlay: overlayHook(`g_${id}`) })}
  ${eyebrow(664, eyebrowText)}
  <text x="120" y="${l1y}" font-family="${FONT}" font-size="100" font-weight="900" letter-spacing="-4" fill="${FG}">${line1}</text>
  <text x="120" y="${l2y}" font-family="${FONT}" font-size="100" font-weight="900" letter-spacing="-4" fill="${FG}">${line2pre}<tspan fill="${PINK}">${line2pink}</tspan>${line2post}</text>
  <text x="120" y="${subY}" font-family="${FONT}" font-size="26" font-weight="400" fill="${MUTED}">${sub}</text>
  ${sub2 ? `<text x="120" y="${sub2Y}" font-family="${FONT}" font-size="26" font-weight="400" fill="${MUTED}">${sub2}</text>` : ""}
  ${chipSvg}
  <g transform="rotate(-12 810 195)" filter="url(#sticker_shadow_${id})">
    <rect x="670" y="155" width="280" height="80" rx="16" fill="${PINK}" stroke="#ffffff" stroke-width="3"/>
    <text x="810" y="208" font-family="${FONT}" font-size="32" font-weight="900" letter-spacing="1.9" fill="#ffffff" text-anchor="middle">TUITION 20% OFF</text>
  </g>
  ${wordmark()}
</svg>`;
}

function cardBenefits({ id, eyebrowText, line1, line2pink, bullets, bulletsStartY = 496 }) {
  // Bullets is an array of { text, sub? } objects. A bullet with `sub` gets
  // an indented qualifier line beneath the main row.
  //
  // v5 (2026-06-05) — Noah's "폰트 + 줄간격 키우기" feedback:
  //   bullet text 26 → 36px
  //   sub text    22 → 26px
  //   check badge r 18 → r 21 + glyph 22 → 26
  //
  // Layout math (y baselines):
  //   headline L1   330 (was 340, font 116→110)
  //   headline L2   440 (was 460)
  //   start cursorY 496 (just below headline at 440, mt 36→24 in HTML)
  //   bullet → next bullet:           +72
  //   bullet (with sub) → sub line:   +46
  //   sub line → next bullet:         +58
  //   last bullet ≈ 782, leaving ~200px breathing room above wordmark@1010.
  //
  // v8 (2026-06-05) — Noah's KO 호흡 피드백. KO 카드만 bulletsStartY를
  // 496 → 536 (+40px) 로 내려 헤드라인과 bullets 사이 호흡 ↑.
  // EN 은 496 그대로 (변경 0).
  let cursorY = bulletsStartY;
  const rows = [];
  for (const b of bullets) {
    rows.push(`
    ${checkBadge(141, cursorY - 12, 21)}
    <text x="190" y="${cursorY}" font-family="${FONT}" font-size="36" font-weight="500" fill="${FG}">${b.text}</text>`);
    if (b.sub) {
      cursorY += 46; // gap to sub-line
      rows.push(`
    <text x="190" y="${cursorY}" font-family="${FONT}" font-size="26" font-weight="500" fill="${MUTED}">${b.sub}</text>`);
      cursorY += 58; // gap to next bullet (sub consumed extra space)
    } else {
      cursorY += 72;
    }
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1080" width="1080" height="1080">
  ${frame({ image: STOCK.benefits, overlay: overlayBenefits(`g_${id}`) })}
  ${eyebrow(200, eyebrowText)}
  <text x="120" y="330" font-family="${FONT}" font-size="110" font-weight="900" letter-spacing="-4.4" fill="${FG}">${line1}</text>
  <text x="120" y="440" font-family="${FONT}" font-size="110" font-weight="900" letter-spacing="-4.4" fill="${PINK}">${line2pink}</text>
  ${rows.join("")}
  ${wordmark()}
</svg>`;
}

function cardMentors({
  id,
  eyebrowText,
  line1,
  line2pre,
  line2pink,
  line2post,
  sub,
  saturdayLabel,
  saturdayMentors,
  sundayLabel,
  sundayMentors,
  curriculumLabel,
}) {
  // Layout v6 (top→bottom, y baselines):
  //   eyebrow            170    (28px, was 22)
  //   headline L1        252    (76px, was 58)
  //   headline L2        330
  //   sub                382    (28px, was 22)
  //   ── mentor block ──
  //   Section/mentor strides bumped to fit larger text (role 32, desc 24,
  //   curriculum 22). Each mentor row needs ~145px (was 122).
  //   SAT header         455
  //   SAT mentor         520
  //   SUN header         690   (SAT mentor baseline + 64 curric + 100 gap)
  //   SUN mentors        755, 900 (145px stride)
  //   wordmark           1010 + 1034
  //
  // Re-derived for the asymmetric 1+2 split — SUN block sits in lower
  // half, last mentor curriculum baseline ≈964 leaves ~46px to wordmark.
  const satStride = 145;
  const sunStride = 145;
  const satFirstY = 520;
  const satRows = saturdayMentors
    .map((m, i) => mentor(satFirstY + i * satStride, m.role, m.desc, curriculumLabel, m.curriculum))
    .join("");
  const sunHeaderY = 455 + saturdayMentors.length * satStride + 100;
  const sunRows = sundayMentors
    .map((m, i) => mentor(sunHeaderY + 65 + i * sunStride, m.role, m.desc, curriculumLabel, m.curriculum))
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1080" width="1080" height="1080">
  ${frame({ image: STOCK.mentors, overlay: overlayMentors(`g_${id}`) })}
  ${eyebrow(170, eyebrowText, 28)}
  <text x="120" y="252" font-family="${FONT}" font-size="76" font-weight="900" letter-spacing="-3.04" fill="${FG}">${line1}</text>
  <text x="120" y="330" font-family="${FONT}" font-size="76" font-weight="900" letter-spacing="-3.04" fill="${FG}">${line2pre}<tspan fill="${PINK}">${line2pink}</tspan>${line2post}</text>
  <text x="120" y="382" font-family="${FONT}" font-size="28" font-weight="500" fill="${MUTED}">${sub}</text>
  ${sectionLabel(455, saturdayLabel)}
  ${satRows}
  ${sectionLabel(sunHeaderY, sundayLabel)}
  ${sunRows}
  ${wordmark()}
</svg>`;
}

function cardCta({
  id,
  eyebrowText,
  priceOriginal,
  priceNow,
  valueLine,
  valueLineAccent,
  subline,
  bullets,
  url,
  priceSize = 132,
  priceLetterSpacing = -5.28,
  bulletsStartY = 720,
  urlY = 880,
}) {
  // Layout v6 (top→bottom, y baselines):
  //   sticker (top-right)        rotated -12deg around (840,190)
  //   eyebrow                    360
  //   price original (strike)    420
  //   price now                  520 (large pink)
  //   value line                 610
  //   sub                        650
  //   bullet 1                   720
  //   bullet 2                   782
  //   url                        880
  //   wordmark                   1010 + 1034
  //
  // v6 (2026-06-05) — Noah's "인라인 20% OFF 뱃지 제거" 피드백.
  // The inline pink "20% OFF" pill next to the discounted price was
  // redundant with the top-right "TUITION 20% OFF" sticker. Dropped the
  // inline badge entirely; the price box is now clean stacked rows.
  // v8 (2026-06-05) — Noah's EN 호흡 피드백. EN 카드만 bulletsStartY 720
  // → 760, urlY 880 → 920 (+40px) 로 내려 가격 박스와 bullets 사이 호흡 ↑.
  // KO 는 720/880 그대로 (변경 0).
  const bulletRows = bullets.map((b, i) => {
    const y = bulletsStartY + i * 62;
    return `
    ${checkBadge(140, y - 8)}
    <text x="186" y="${y}" font-family="${FONT}" font-size="24" font-weight="500" fill="${FG}">${b}</text>`;
  }).join("");

  const valueLineSvg = `
  <text x="120" y="610" font-family="${FONT}" font-size="28" font-weight="800" fill="${FG}">${valueLine} <tspan fill="${PINK}">${valueLineAccent}</tspan></text>`;

  // TUITION 20% OFF sticker mirrors Card 01: top-right, -12deg rotation,
  // pink fill + white border + drop-shadow.
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1080" width="1080" height="1080">
  <defs>
    <filter id="sticker_shadow_${id}" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="8" stdDeviation="10" flood-color="#000000" flood-opacity="0.45"/>
    </filter>
  </defs>
  ${frame({ image: STOCK.cta, overlay: overlayCta(`g_${id}`) })}
  ${eyebrow(360, eyebrowText)}
  <text x="120" y="420" font-family="${FONT}" font-size="30" font-weight="600" fill="${SUBTLE}" text-decoration="line-through">${priceOriginal}</text>
  <text x="120" y="520" font-family="${FONT}" font-size="${priceSize}" font-weight="900" letter-spacing="${priceLetterSpacing}" fill="${PINK}">${priceNow}</text>
  ${valueLineSvg}
  <text x="120" y="650" font-family="${FONT}" font-size="22" font-weight="600" fill="${MUTED}">${subline}</text>
  ${bulletRows}
  <text x="120" y="${urlY}" font-family="${FONT}" font-size="26" font-weight="800" fill="${PINK}">${url}</text>
  <g transform="rotate(-12 810 195)" filter="url(#sticker_shadow_${id})">
    <rect x="670" y="155" width="280" height="80" rx="16" fill="${PINK}" stroke="#ffffff" stroke-width="3"/>
    <text x="810" y="208" font-family="${FONT}" font-size="32" font-weight="900" letter-spacing="1.9" fill="#ffffff" text-anchor="middle">TUITION 20% OFF</text>
  </g>
  ${wordmark()}
</svg>`;
}

// ─── content (mirror of HTML copy) ──────────────────────────────────────────

const CARDS = {
  "card-01-en": cardHook({
    id: "01en",
    eyebrowText: "FAN TO PRO / 2026",
    line1: "From K-pop fan",
    line2pre: "to ",
    line2pink: "maker.",
    line2post: "",
    sub: "Learn from working pros.",
    sub2: "Make real concert experience your portfolio.",
    // v7: visa chips → 3 keyword chips. EN copies shortened so the row
    // fits on one line within the 120→1080 content band.
    chips: ["For job seekers in Korea", "Industry network", "4‑week training"],
  }),
  "card-01-ko": cardHook({
    id: "01ko",
    eyebrowText: "FAN TO PRO / 2026",
    line1: "K-pop 팬에서",
    line2pre: "",
    line2pink: "만드는 사람",
    line2post: "으로.",
    sub: "현직 전문가에게 배우고, 실제 공연 경험을 포트폴리오로!",
    // v7: visa chips → 3 keyword chips. Korean glyphs are ~22px wide at
    // font-size 22 vs Latin ~14px, so widen the pill backing.
    chips: ["한국 거주 외국인 취준생", "전문가 네트워킹", "4주 직무 교육"],
    chipCharWidth: 22,
    lineGap: 112,
  }),

  "card-02-en": cardBenefits({
    id: "02en",
    eyebrowText: "WHAT YOU GET",
    line1: "Real career",
    line2pink: "assets.",
    bullets: [
      {
        text: "Real K-pop concert experience for your portfolio",
        sub: "Top graduates — real project work and a stipend",
      },
      { text: "Active K-pop industry pros as your mentors — a rare opportunity!" },
      { text: "Personalized résumé, portfolio, and interview coaching" },
      { text: "A K-culture industry network you couldn&#39;t build alone" },
    ],
  }),
  "card-02-ko": cardBenefits({
    id: "02ko",
    eyebrowText: "가져갈 수 있는 것",
    line1: "진짜 커리어",
    line2pink: "자산.",
    // v8: KO 만 bullets 영역 +40px 아래 (헤드라인과 호흡 ↑).
    bulletsStartY: 536,
    bullets: [
      {
        text: "실제 K-pop 공연 경험을 포트폴리오로",
        sub: "우수 수료생 대상 — 실제 공연 프로젝트 + 소정의 일당",
      },
      { text: "지금 현업에서 활약하는 전문가를 강사님으로 만날 수 있는 기회!" },
      { text: "수강생 맞춤 이력서, 포트폴리오, 면접 컨설팅" },
      { text: "K컬처 전문가와 만나는 네트워킹" },
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
    saturdayLabel: "SATURDAY CLASS",
    saturdayMentors: [
      {
        role: "Live Sound Director",
        desc: "K-pop major TV shows and festivals",
        curriculum: "Live mixing, stage acoustics, festival workflow",
      },
    ],
    sundayLabel: "SUNDAY CLASS",
    sundayMentors: [
      {
        role: "A&amp;R + Visual Director, 27 yrs",
        desc: "K-pop label",
        curriculum: "Music biz, A&amp;R, label strategy, visual directing",
      },
      {
        role: "Live Sound Director, 20 yrs",
        desc: "K-pop major stages",
        curriculum: "Signal flow, FOH operation, stage rigging",
      },
    ],
    curriculumLabel: "Curriculum",
  }),
  "card-03-ko": cardMentors({
    id: "03ko",
    eyebrowText: "Fan to Pro 강사님 소개",
    line1: "현직 전문가에게",
    line2pre: "",
    line2pink: "직무를 그대로.",
    line2post: "",
    sub: "진짜 멘토. 진짜 업무. 진짜 노하우.",
    saturdayLabel: "토요일반",
    saturdayMentors: [
      {
        role: "현직 음향 감독",
        desc: "K-pop 메이저 방송, 페스티벌",
        curriculum: "라이브 믹싱, 스테이지 음향, 페스티벌 워크플로우",
      },
    ],
    sundayLabel: "일요일반",
    sundayMentors: [
      {
        role: "A&amp;R + 비주얼 디렉터, 27년",
        desc: "K-pop 레이블",
        curriculum: "뮤직 비즈, A&amp;R, 레이블 전략, 비주얼 디렉팅",
      },
      {
        role: "현직 사운드 디렉터, 20년",
        desc: "K-pop 메이저 무대",
        curriculum: "시그널 플로우, FOH 운영, 스테이지 리깅",
      },
    ],
    curriculumLabel: "커리큘럼",
  }),

  "card-04-en": cardCta({
    id: "04en",
    eyebrowText: "APPLY NOW",
    priceOriginal: "&#8361;1,100,000 KRW",
    priceNow: "&#8361;880,000 KRW",
    valueLine: "Industry insider mentors you",
    valueLineAccent: "can&#39;t meet anywhere else.",
    subline: "30 seats, first-come, first-served",
    bullets: [
      "Eligible: D‑2, D‑4, D‑10, E‑series (in Korea)",
      "Deadline: Sunday, June 21, 2026 midnight",
    ],
    url: "growthcareer.xyz/fan-to-pro",
    // EN price string ("₩880,000 KRW") is wider — scale down.
    priceSize: 84,
    priceLetterSpacing: -3.36,
    // v8: EN 만 bullets + URL 영역 +40px 아래 (가격 박스와 호흡 ↑).
    bulletsStartY: 760,
    urlY: 920,
  }),
  "card-04-ko": cardCta({
    id: "04ko",
    eyebrowText: "지금 신청",
    priceOriginal: "1,100,000원",
    priceNow: "880,000원",
    valueLine: "어디서도 만나기 힘든",
    valueLineAccent: "현업 전문가가 강사로!",
    subline: "30석 한정, 선착순",
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

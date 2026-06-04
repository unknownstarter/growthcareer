# Kowork 광고 배너 리서치 노트

> 작성: Echo (Research Lead) · 2026-06-03
> 목적: Luna가 코워크 광고 배너 6장(3매체 × 국/영)을 *사이트 톤과 일치하는* 시안으로 즉시 코드화할 수 있게.
> 참고: 첫 시안은 사이트 톤과 동떨어져서 거부됨. 이 노트는 추측 없이 실제 자산·토큰·문구만 인용함.

---

## 0. 매체 스펙 요약 (코워크 가이드 — 이미 확정)

| 매체 | 사이즈(px) | 텍스트 폭 | 타이틀 | 서브 |
|---|---|---|---|---|
| PC 메인홈 중간 | 1080×136 | 588px | 24px Bold · 1줄 | 14px Medium · 1줄 |
| Web(mobile)/App 중간 | 328×122 | 192px | 18px Bold · 1~2줄 (lh130%) | 10px Medium · 1~2줄 (lh140%) |
| App 최상단 | 328×180 | 312px (이미지 우측 overlay) | 20px Bold · 1~2줄 (lh130%) | 12px Medium · 1~2줄 (lh130%) |

공통: **Pretendard**, **단색 배경**, **3배수 PNG**.

---

## 1. 사이트 자산 인벤토리 (실제 ls 확인)

### 1.1 스톡 이미지 — `public/images/stock/` (전부 Unsplash 출처, `manifest.json` 보유)

| 파일 | 톤 | 매체 적합도 |
|---|---|---|
| `boy-group-concert-stage-{1..4}.jpg` | 보이그룹 무대 와이드샷 | **PC 1080×136 (좌우 잘림 감내 가능)**. OG 이미지에도 사용됨 → 사이트 공식 톤. |
| `concert-stage-from-behind-performer-{1..4}.jpg` | 퍼포머 뒷모습 + 객석 (사이트 hero 와 동일 키비주얼) | **3매체 모두 가능**. 가장 안전. |
| `performer-back-audience-kpop-1.jpg` | 퍼포머 뒷모습 + 객석 (단일) | 동일. |
| `stage-lights-purple-pink-{1..4}.jpg` | 보라/핑크 무대 조명 — 인물 없음 | **단색 배경 대안**. 텍스트 가독성이 가장 좋음. Kowork *단색 배경* 룰과의 절충안. |
| `korean-concert-audience-{1..4}.jpg` | 객석 군중 | App 최상단 우측 오버레이 후보. 1080×136 에는 인물 디테일이 망가짐. |
| `male-singer-silhouette-stage-{1..4}.jpg` | 남자 가수 실루엣 | Outcome 섹션에서 사용. 320 사이즈에 적합. |

### 1.2 브랜드 자산 — `public/brand/`, `public/images/partners/`
- `public/brand/logo-black.png` — Dropdown 운영 법인 로고 (검정). 배너 우상단 watermark 후보.
- `public/images/partners/deepi.png` — DEEPI 협력사 로고. **배너에 노출 금지** (수강생 직접 광고에서는 운영주체 = Dropdown 브랜드 = Growth Career 만 노출이 정상).

### 1.3 강사 사진 — `public/images/instructors/`
- `nino-lee.jpg`, `park-sungcheol.png`, `lee-jehyang.jpeg`
- **사용 금지** (사용자 명시 제약 + 초상권 동의 범위가 사이트 내 멘토 섹션으로 한정되었을 가능성).

### 1.4 폰트 — `assets/fonts/`
- `Pretendard-Black.otf` (weight 900) — OG/hero 디스플레이용
- `Pretendard-SemiBold.otf` (weight 600) — 본문 강조용
- 사이트는 `pretendardvariable.min.css` CDN 로드 (`app/globals.css:1`)
- Kowork 가이드의 "Bold"는 weight **700 또는 900**. 사이트 톤(`font-black`, weight 900)을 그대로 가져가는 것을 권장.

### 1.5 OG 이미지 디자인 톤 추출 — `app/opengraph-image.tsx`
- 배경: `#0a0a0f` (bg) + `boy-group-concert-stage-3.jpg` + 좌→우 어두움 그라데이션
- **좌측 16px 두께의 핑크 세로 바** (`#ec4899`) — *시그니처 모티프*
- 좌측 eyebrow: `Growth Career · K-Entertainment Track` (uppercase, letter-spacing 0.32em, 핑크)
- 메인 타이틀: `Fan to Pro.` — Pretendard Black 220px, letter-spacing -0.06em, line-height 0.92
- 서브: `세상에 없는 리얼 실무 교육 프로그램` — Pretendard SemiBold 40px, letter-spacing -0.025em
- **이게 사이트의 공식 시각 언어다.** 배너는 이 OG 이미지의 축소판으로 만들면 톤 충돌이 없다.

---

## 2. 사이트 디자인 토큰 (실측 — `app/globals.css`)

### 2.1 색상 (hex 정확값)
```
bg              #0a0a0f   ← 거의 검정 (off-black). 사이트의 디폴트 배경.
surface         #14141b
surface-elev    #1c1c26
border          #27272f
border-strong   #3f3f48
fg              #fafafa
fg-muted        #a1a1aa
fg-subtle       #71717a

brand-indigo    #6366f1   ← Problem, Guarantees 섹션 단색 배경
brand-violet    #8b5cf6   ← Recruitment 섹션 단색 배경
brand-purple    #a855f7   ← Solution 섹션 단색 배경
brand-pink      #ec4899   ← Pricing 섹션 단색 배경 + 모든 강조색 + OG 좌측 바
brand-fuchsia   #d946ef
```

### 2.2 컬러 사용 규칙 (글로벌 CSS 주석에서 인용)
> *"each color used as a STANDALONE solid block. Not mixed."* (`app/globals.css:16-21`)
- 즉, 배너 배경도 **단일 컬러 블록**이 정공법. 멀티 그라데이션 금지 (Kowork "단색 배경" 룰과도 일치).
- 이미지 위에는 *어두움-투명* 단방향 그라데이션만 허용 (OG / Hero 패턴).

### 2.3 타이포 스케일
- `font-black` = weight 900 = Pretendard-Black
- 디스플레이 헤드라인은 모두 `letterSpacing: -0.04em ~ -0.06em`, `lineHeight: 0.92~1.05`
- Eyebrow(섹션 라벨)는 `uppercase` + `letterSpacing: 0.4em` + 작은 크기
- 본문은 `word-break: keep-all` (CSS `body`) — 한국어 어절 단위 줄바꿈 강제. **배너 텍스트도 어절 사이에서만 끊긴다고 가정.**

### 2.4 a11y / 대비
- 사이트 전역 `color-scheme: dark`
- focus ring: `--color-brand-purple` 2px (배너는 무관)
- selection: 배경 `brand-pink`, 글자 `fg`
- 흰 텍스트 vs `#0a0a0f`: 대비 ≈ 18:1 (WCAG AAA)
- 흰 텍스트 vs `#ec4899` 핑크: 대비 ≈ 3.5:1 (AA Large만 통과) → **핑크 위 본문 텍스트는 weight 700 이상 + 16px↑** 권장. Pricing 섹션이 실제로 이 패턴 사용 중.

---

## 3. 사이트 카피 톤 (실제 사용 문구 인용)

> 모든 인용은 `src/programs/fan-to-pro/presentation/sections/*.tsx` 직접 발췌.

**메인 카피 후보 (사이트에서 이미 검증된 문구)**

| 출처 | 문구 | 글자수(공백포함) |
|---|---|---|
| Hero | `FAN. to PRO.` | 12 |
| Problem | `이력서에 쓸 게 없다.` | 12 |
| Solution | `진짜 무대. 진짜 경력.` | 12 |
| Outcome | `완성된 너의 새 챕터.` | 11 |
| Pricing | `한 달. 단 한 번.` | 9 |
| Pricing | `한 달. 그리고 무대.` (사용자 발화 인용, 사이트엔 없으나 동등 톤) | 11 |
| Guarantees | `3가지 보장.` | 7 |
| Bonus | `신청 즉시 함께 받는 것.` | 13 |
| Hero 서브 | `한국 거주 외국인 유학생을 위한 K-POP 엔터테인먼트 직무 취업 트랙` | 35 (서브에 너무 김) |
| Hero CTA | `지금 신청 →` | 7 |
| Hero bullet | `주말 4주 · 총 8회 현업 강의` | 17 |
| Recruitment | `실제 전문가들에게 배우는 4주!` | 17 |
| Hero eyebrow | `Fan to Pro · Growth Career · 2026` | 33 (영문 eyebrow) |

**영문 후보**
- `FAN. TO PRO.` (Hero 그대로)
- `REAL STAGE. REAL CAREER.` (Solution 영문)
- `4 WEEKS. ONE STAGE.` (가공, Pricing 톤)
- `K-Pop Career Track for Int'l Students` (서브 영문)

**톤 키워드**: 단호함, 마침표 강조, 짧은 두 문장 병치, 영문 uppercase eyebrow, 핑크 강조 단어.

---

## 4. 외부 레퍼런스 — 핵심 패턴 7가지

> WebSearch 6회 결과 + Awwwards/Dribbble 일반 원칙 종합. 출처는 보고서 말미.

1. **헤드라인에만 굵게, 서브는 한 단계 얇게** — 같은 weight로 두 줄 쓰면 위계가 죽음. *(Tabular.email; signs.com)*
2. **단색 배경 + 컬러 블로킹** — 다크 모드 배너는 다중 그라데이션이 아니라 *거의 인지 불가능한 단색 또는 매우 부드러운 단일 그라데이션*이 정공법. *(Colorhero 2025 다크 팔레트)*
3. **이미지 위 텍스트는 어두움 오버레이로 가독성 확보** — 단방향(좌→우, 또는 상→하) 그라데이션 1개만. *(BannerBoo)*
4. **텍스트는 4줄 이내, 폰트 ≥ 10pt, 본문엔 all-caps 지양** — 작은 매체일수록 엄격. *(NextMillennium; Naylor)*
5. **CTA는 색상 블록으로 분리** — 본문과 다른 단색 사각형 + 화살표. (사이트 Button 컴포넌트가 이미 이 패턴.)
6. **CJK `word-break: keep-all`** — 한국어 배너에서 음절 중간 끊김 방지는 사실상 표준. 사이트 globals.css 가 이미 적용 중. *(ryelle.codes 2025; W3C i18n)*
7. **시그니처 모티프 1개를 모든 배너에 일관 적용** — 사이트의 경우 *좌측 핑크 세로 바*가 OG에 이미 사용 중. 배너 6장 전체에 동일 적용 시 브랜드 인지 비용↓.

---

## 5. 안전 글자수 실측 (Pretendard Bold, letter-spacing ≈ -0.03em)

> Pretendard 한글 자평 폭은 매우 일정 (≈ 1.0em). 자간 -0.03em 보정 시 실효 폭 ≈ 0.97em.
> 영문은 비례폭이라 동일 폭 안에 약 1.5~1.7배 더 들어감.

| 매체 | 타이틀 | 한글 안전 글자수 | 영문 안전 글자수 |
|---|---|---|---|
| PC 1080×136 | 24px @ 588px폭 · 1줄 | **20자 (공백 포함)** — 25자까지 가능하나 마진 권장 | 32자 |
| Web/App 중간 328×122 | 18px @ 192px폭 · 1~2줄 | **1줄 10자 / 2줄 22자** | 1줄 16자 / 2줄 34자 |
| App 최상단 328×180 | 20px @ 312px폭 · 1~2줄 | **1줄 14자 / 2줄 28자** | 1줄 22자 / 2줄 44자 |

**서브 텍스트 (Medium, 자간 거의 0)**

| 매체 | 서브 | 한글 안전 글자수 |
|---|---|---|
| PC 1080×136 | 14px @ 588px폭 · 1줄 | **38자** |
| Web/App 중간 328×122 | 10px @ 192px폭 · 2줄 | **2줄 38자** |
| App 최상단 328×180 | 12px @ 312px폭 · 2줄 | **2줄 50자** |

→ 한국어 카피는 **타이틀 12자 이내**, 서브 **2줄 30자 이내**가 안전 마진을 충분히 확보.

---

## 6. Luna 권고 (즉시 코드화 가능한 결정)

### 6.1 배경 (단색 — Kowork 룰 준수)

| 배너 (시안 가이드) | 배경 hex | 액센트 hex | 근거 |
|---|---|---|---|
| 시안 A: 검정 (디폴트) | `#0a0a0f` (bg) | `#ec4899` (brand-pink) | 사이트 hero/OG 톤 그대로 |
| 시안 B: 핑크 임팩트 | `#ec4899` (brand-pink) | `#fafafa` (fg) + 흑백 액센트 | Pricing 섹션 톤. 흰 글자 weight 900 필수 |
| 시안 C: 퍼플 (Solution 톤) | `#a855f7` (brand-purple) | `#fafafa` | Solution 섹션 톤 |

→ **6장 중 4장은 시안 A (검정)** 로 통일 권장. 나머지 2장에 시안 B(핑크) 1장 + 시안 C(퍼플) 1장 섞으면 코워크 피드 안에서 6장이 연속 노출됐을 때 한 브랜드로 인식 가능.

### 6.2 시그니처 모티프 — 3가지 옵션 (어떤 사이즈에서도 글자 wrap 안 깨지는 안전 순)

1. **좌측 핑크 세로 바** (OG와 동일). 1080×136은 6px / 328×122 / 328×180은 4px.
   - 텍스트 영역을 침범하지 않음. **세 매체 전부 안전.** Top recommendation.
2. **타이틀의 마침표만 핑크** — `한 달<span color=pink>.</span> 그리고 무대<span color=pink>.</span>`.
   - 한 글자 영역만 색상 변경 → 줄바꿈/폭 영향 0. 사이트의 핑크 강조 패턴(`text-brand-pink`)과 일치.
3. **단어 1개만 핑크** (예: `<핑크>완성된</핑크> 너의 새 챕터`). 사이트 outcome.tsx의 패턴.
   - 단어 길이가 안정적일 때만. 영문 버전엔 권장하지 않음 (uppercase + 색상 두 강조가 충돌).

### 6.3 매체별 텍스트 배치 권고

**PC 1080×136 (좌 텍스트 588 / 우 이미지 340)**
- 좌상 핑크 세로 바 6px
- 좌 텍스트 영역:
  - Eyebrow 10px Bold uppercase letterSpacing 0.32em 핑크: `GROWTH CAREER · FAN TO PRO`
  - 타이틀 24px Black: `한 달. 그리고 무대.` (10자) 또는 `이력서에 쓸 게 없다.` (12자)
  - 서브 14px SemiBold: `한국 거주 유학생을 위한 K-POP 엔터 직무 취업 트랙` (28자)
- 우 이미지 340px: `stage-lights-purple-pink-2.jpg` 추천 (단색 톤 + 인물 없음 → 좌측 텍스트 가독성 안전).
  - 대안: `boy-group-concert-stage-3.jpg` (OG와 동일, 강한 인지 시그널). 좌측에 검정 그라데이션 마스크 필수.

**Web/App 중간 328×122 (좌 텍스트 192 / 우 이미지 120)**
- 좌상 핑크 세로 바 4px
- Eyebrow 8px 또는 생략 (192px폭에서 글자 압박 큼)
- 타이틀 18px Black: `FAN. to PRO.` (영문) / `한 달. 무대.` (한글, 6자) — **두 줄 분리: `FAN.` / `to PRO.`**
- 서브 10px Medium 2줄: `K-pop 공연 실무 4주.` `선착순 마감.` (각 11자 / 7자)
- 우 이미지 120px: 정사각 가까운 잘림. `stage-lights-purple-pink-3.jpg` 또는 `male-singer-silhouette-stage-1.jpg`.

**App 최상단 328×180 (좌 텍스트 312, 우 이미지 overlay)**
- 배경 전체에 `concert-stage-from-behind-performer-3.jpg` + 좌 90%~우 30% 검정 그라데이션 오버레이
- 좌측 16px 패딩 안에 핑크 세로 바 4px
- Eyebrow 10px uppercase: `FAN TO PRO`
- 타이틀 20px Black 2줄:
  - `한 달.` / `그리고 무대.` (4자 / 7자, 강한 임팩트)
  - 또는 `이력서에` / `쓸 게 없다.` (4자 / 6자)
- 서브 12px Medium 2줄: `한국 거주 외국인 유학생을 위한` / `K-pop 공연 실무 4주 트랙` (16자 / 14자)

### 6.4 활용 가능 자산 short-list (강사 사진 제외 확정)

**Primary (모든 매체)**
- `public/images/stock/concert-stage-from-behind-performer-3.jpg`
- `public/images/stock/concert-stage-from-behind-performer-4.jpg`
- `public/images/stock/boy-group-concert-stage-3.jpg` (OG와 동일 — 인지 효율 ↑)

**Secondary (작은 매체 우측 영역용)**
- `public/images/stock/stage-lights-purple-pink-2.jpg` / `-3.jpg` (인물 없음 → 텍스트 안전)
- `public/images/stock/male-singer-silhouette-stage-1.jpg`

**브랜드**
- `public/brand/logo-black.png` — 다크 배경에선 inverted 처리 필요. 또는 미사용 (텍스트 `GROWTH CAREER` 워드마크가 사이트의 OG 패턴).

**금지**
- `public/images/instructors/*` (3명 사진 전부)
- `public/images/partners/deepi.png`

### 6.5 피할 패턴 (지난 시안에서 깨졌을 확률 ↑)

1. **좁은 폭에 큰 폰트로 한국어 음절 강제 줄바꿈** — `word-break: keep-all`이 적용되지 않은 환경에서 흔히 발생. 배너 PNG 생성 시에도 어절 단위로 직접 줄바꿈 지점을 박아야 함.
2. **다중 그라데이션 (분홍→보라→남보라 같은 무지개)** — 사이트는 *단일 컬러 블록* 룰. Kowork도 *단색 배경* 요구. 이중으로 위반.
3. **이미지 위에 흰 글자만 + 오버레이 부재** — 콘서트 무대 사진은 대비가 들쭉날쭉. 좌→우 50% 검정 그라데이션 마스크 필수.
4. **강사 얼굴/DEEPI 로고 노출** — 법적·계약적 위험 + 사용자 명시 제약.
5. **all-caps 한국어** (예: `FAN TO PRO` 옆에 `한국 거주 유학생` 도 uppercase 처리하려는 시도) — Pretendard는 한글에 uppercase 개념이 없고 영문만 적용됨. 한국어는 정상 케이스로.
6. **CTA 누락** — Kowork 가이드에 CTA 슬롯이 명시되어 있지 않더라도, 짧은 액션 워드 1개(`지금 신청 →`)는 핑크 박스 또는 화살표로 명시 권장. 단 폭이 좁은 328×122에서는 생략 가능.
7. **letterSpacing 0 또는 양수** — 사이트 헤드라인은 전부 음수 자간(-0.03 ~ -0.06em). 이걸 빼면 즉시 "사이트 톤이 아님"으로 인지됨.
8. **Pretendard가 아닌 시스템 폰트로 출력** — 3배수 PNG 만들 때 폰트 임베딩 누락하면 macOS Helvetica로 fallback 됨. 디자인 툴에서 OTF 임베딩 또는 outline 처리 확인 필수.

---

## 7. Open Questions (Luna가 시안 만들기 전 사용자에게 확정해도 좋은 것들)

- 영문 버전 카피의 *서명* — `Fan to Pro` vs `FAN. TO PRO.` 케이싱 확정?
- CTA URL — 코워크 클릭 시 랜딩이 `growthcareer.xyz/fan-to-pro` apex로 가는지, UTM 파라미터 규약이 있는지?
- 배너 안에 가격(`349,000원 / 60% OFF`) 노출 여부 — Kowork 가이드에 명시 없으나, 사이트 hero/pricing 둘 다 가격을 전면에 노출 중.

---

## 8. 출처

- 사이트 내부 (1차 자료, 신뢰도 HIGH)
  - `/Users/noah/growthcareer/app/globals.css`
  - `/Users/noah/growthcareer/app/opengraph-image.tsx`
  - `/Users/noah/growthcareer/src/programs/fan-to-pro/presentation/sections/*.tsx`
  - `/Users/noah/growthcareer/public/images/stock/manifest.json`
- 외부 (MED)
  - [Ryelle: Typography troubles — Balancing in Japanese & Korean (2025)](https://ryelle.codes/2025/04/typography-troubles-balancing-in-japanese-korean/)
  - [W3C i18n: Approaches to line breaking](https://w3c.github.io/i18n-drafts/articles/typography/linebreak.en)
  - [Colorhero: Dark Mode Color Palettes 2025](https://colorhero.io/blog/dark-mode-color-palettes-2025)
  - [BannerBoo: 30 Web Banner Design Ideas](https://bannerboo.com/blog/web-banner-design-ideas/)
  - [NextMillennium: 15 Banner Ad Design Best Practices](https://nextmillennium.com/blog/banner-ad-design-best-practices/)
  - [Tabular.email: Best Fonts for Banners](https://tabular.email/blog/banner-font)
  - [Naylor: Best Practices for Online Ad Design](https://www.naylor.com/best-practices-online-ad-design/)

---

## Recommendation (한 줄)

OG 이미지 (`app/opengraph-image.tsx`)의 축소판 — **검정 `#0a0a0f` + 좌측 핑크 세로 바 + Pretendard Black 음수 자간 + 마침표 강조** — 패턴을 6장 전부에 일관 적용하라. 한국어 타이틀은 12자 이내, 영문은 24자 이내. 강사 사진 / DEEPI 로고 / 멀티 그라데이션은 절대 금지.

# Changelog

이 프로젝트의 주요 변경 사항을 날짜순으로 기록합니다.
형식은 [Keep a Changelog](https://keepachangelog.com/) 약식.
세부 diff 는 `git log` 참조.

---

## [2026-05-19]

### Added — 신규 기능
- **GA4 통합** — `@next/third-parties/google` 의 `<GoogleAnalytics />` 를 `app/layout.tsx` 에 박음. `NEXT_PUBLIC_GA_ID` 환경변수 게이트(없으면 미렌더). 측정 ID `G-6N0R68CH0D` Vercel Production env 등록.
- **1기 강의 일정 노출** — `domain/program.ts` 에 `SCHEDULE` 상수 신규(시작 6/13 토 · 모집 마감 6/7 일 · 장소 *수강 확정자 개별 공지* · 토일 4주 8회). Recruitment 섹션의 Capacity strip 위에 Schedule strip 3 셀, ApplyForm Step 2 상단에 시작일·장소 callout 추가.
- **수강신청 완료 기준 Payment 박스** — ApplyForm Step 2 안에 핑크 강조 박스 신설. 토스뱅크 1002-4759-1521 · 예금주 Dropdown · 880,000원 표 + *"입금이 확인되어야 수강 신청이 최종 완료됩니다"* 룰 명시.
- **입금자명 = 신청서 본명** 필수 안내 — "필수" 칩 + 핑크 테두리 분리 박스. 다르면 입금 확인 지연·자리 배정 보류 가능 명시.
- **Faculty 토요일 강사 확정** — 박성철(그린음향, 현장 음향 디렉터) · 이제향(준컴퍼니, 현장 음향 감독·믹싱). Nino(일요일) 와 함께 3인 카드 구성.
- 검증 유틸: `tools/clip-mentor.mjs`, `tools/clip-sections.mjs`, `tools/clip-viewports.mjs` — Playwright 기반 섹션·뷰포트별 단독 캡처.

### Changed — 변경
- **헤드라인 카피** (`recruitment.tsx`): *"이 4주는, 아무에게나 열리지 않습니다"* → 사용자 직접 수정 다단계 → 최종 **"실제 전문가들에게 / 배우는 4주! / 수강 신청 자격"**.
- **Faculty 카드 레이아웃** — `aspect-[4/5]` 풀사이즈 사진 카드 → 112px 원형 아바타 + 텍스트 헤더 단일 스택. 사진 품질 편차 흡수. 사진 없을 시 `Avatar` 컴포넌트 이니셜 폴백.
- **개인정보 동의 문구** — *"신청 처리 및 입금 안내 목적 외 사용되지 않으며"* → **"입력하신 연락처와 개인정보는 교육 프로그램 안내 및 긴급 연락 목적으로만 사용되며"** (사용 목적 구체화).
- **환불 카피** — *"시작일 N일 전 신청자 N명 미만 시"* → **"2026년 6월 7일(일) 기준 신청자 20명 미만 시"** (절대 날짜로 명시).
- **`text-brand-pink` → `text-black`** — "수강 신청 자격" 강조 컬러. violet 섹션 배경 위 핑크/빨강 모두 채도 충돌(눈 피로)로 부적합 → 검은색이 대비도 강하고 시각적 부담 없음. (red-500 거쳐 black 으로 정착.)

### Fixed — 버그·결함
- **한국어 음절 절단 방지** — `body { word-break: keep-all }` 전역 적용. 기존엔 *"실제 전문가들에"* + *"게"* 식으로 syllable 중간이 끊겼음. 폴백으로 `overflow-wrap: anywhere` 로 영문 super-long-word 대응. `h1-h3` 에 `text-wrap: balance` 로 외톨이 줄 방지. 사이트 전체 텍스트에 자동 적용.
- 이재향 → **이제향** (李 濟 享 / Lee, Je-Hyang) 정식 표기 정정. `public/images/instructors/lee-jaehyang.jpeg` → `lee-jehyang.jpeg` 리네임.

### Infrastructure — 인프라·환경
- **Supabase Production env 점검** — `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` 3종 모두 Vercel 에 등록 확인. `applicants` 테이블 + RLS (service_role 만 INSERT/SELECT) 정상 동작.
- **신규 env**: `NEXT_PUBLIC_GA_ID = G-6N0R68CH0D` (Production).
- **`.gitignore` 보강** — 강사 원본 자료(PDF·XLSX·구버전 이미지) 제외 룰 추가. 개인정보 보호.
- 도메인 `growthcareer.xyz` Production 라이브 — 오늘 5건 배포(`313930c → 703407c → c873014 → ac81fef → 4fqbush7q` 등).

### Docs
- `CHANGELOG.md` 신규 — 본 파일.
- `prd/fan-to-pro.md` — 기존 `kenterbootcamp_prd.md` 의 위치·이름 정리 (HANDOFF 권장 사항 미실행 분).
- `docs/dev-rules.md` 신규 — 코딩 컨벤션 + a11y/타이포/접근성 가드.
- `docs/design-system.md` 신규 — 토큰·컴포넌트·tone 카탈로그.

---

## [2026-05-30]

### Changed — 변경
- **박성철 강사 요일 재배정** — 토요일 → **일요일**. `domain/program.ts` 의 `INSTRUCTORS[park-sungcheol].day` 갱신. Faculty 카드 칩 *"일요일 강사"* 로 노출. PHASE 01 설명 텍스트(`presentation/sections/program.tsx` 의 토일 주제 매핑)는 의도적으로 그대로 유지.

---

## [2026-06-04]

### Added — 신규 기능
- **코워크 광고 배너 v2 4장** — 기존 6장(`pc-ko/en`, `mw-ko/en`, `app-ko/en`)에 더해 v2 4장(`mw-ko-v2/en-v2`, `app-ko-v2/en-v2`) 추가. **PC 시안의 디자인 언어**(우측 보이그룹 콘서트 이미지 + 강한 좌→우 검정 그라데이션 + 좌상단 회전 핑크 배지 + 인라인 핑크 separator)를 MW/App 사이즈로 일관 적용. 모든 SVG 는 배경 이미지를 base64 로 임베드해 피그마 단독 import 가능. 산출물 위치 `docs/screenshots/kowork/`. 파이프라인 `tools/kowork-banner-pc.html` → `tools/clip-kowork.mjs` → `tools/embed-kowork-images.mjs` → `tools/verify-kowork-svg.mjs`.

### Changed — 변경
- **강사 소개 순서 재배열** — `INSTRUCTORS` 배열을 **이제향 → Nino → 박성철** 순으로 변경. `src/programs/fan-to-pro/domain/program.ts` 한 곳만 수정 (배열을 iterate해서 노출하는 구조라 ID/인덱스 참조 없음 확인 완료). 박성철 강사를 마지막에 배치.

### Fixed — 버그·결함
- **`tools/preview.mjs` 가 `docs/screenshots/` 의 서브디렉터리까지 wipe 하던 문제** — `rm(OUT_DIR, { recursive: true, force: true })` 를 `clearOutDirFiles()` 로 교체. 이제 **top-level 파일만 삭제하고 서브디렉터리는 보존** → `kowork/`, `instructors/` 등 큐레이팅 산출물 폴더가 preview 실행에도 살아남음. 경위는 `docs/lessons/2026-06-04-preview-wipes-screenshots.md` 참조.

### Docs
- `docs/lessons/2026-06-04-preview-wipes-screenshots.md` 신규 — `pnpm preview` 가 코워크 배너 산출물 20장을 통째로 날린 사고의 사후 분석 + 재발 방지 룰.
- `docs/lessons/` 디렉터리 신규 — 향후 사후 분석 문서 보관소.
- `docs/research/kowork-banner-research.md` 보강 — 6월 3일 작성된 코워크 배너 리서치 노트. 매체 스펙·디자인 토큰·문구 안전 글자수·외부 레퍼런스 종합.

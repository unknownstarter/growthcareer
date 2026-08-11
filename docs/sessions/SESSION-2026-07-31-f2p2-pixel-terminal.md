# SESSION 2026-07-31 — F2P 2기 픽셀/터미널 + 플랫폼 아키텍처

> **다음 세션은 이 문서부터 읽고 시작.** 오늘 한 일 + 조사 내용 + 다음 할 일 전부 여기 있음.
> 관련: [ADR 0018](../decisions/0018-platform-domains-and-roles.md) · [픽셀 체크포인트](../design/pixel-terminal-checkpoint.md)

---

## 0. 한 줄 상태

F2P 2기 모집 페이지를 **프리뷰 라우트에서** 다크 에디토리얼 → **픽셀/터미널 컨셉**으로 구축 중. 콘텐츠(강사/커리큘럼/지원조건/일정/얻는 것/후기/현장) 다 채움. 다음 = **섹션별 픽셀 인터랙션 구현**(아이데이션 완료, 아래 §6). 병행: GC 메인 프리뷰, 플랫폼 권한/도메인 ADR, SEO 사이트맵.

**전부 신규 프리뷰/문서 파일. 기존 라이브(1기/어드민) 변경 0건.** (`git status` 로 검증됨)

---

## 1. 라우트 / 핵심 파일

| 목적 | 경로 | 상태 |
|---|---|---|
| F2P 2기 프리뷰 | `app/[locale]/f2p2-preview/page.tsx` + `glass.module.css` | 픽셀/터미널, 콘텐츠 완비. URL `localhost:3000/ko/f2p2-preview` |
| GC 메인 프리뷰 | `app/[locale]/gc-preview/page.tsx` | 무한스와이프 히어로 + 3기둥. `localhost:3000/ko/gc-preview` |
| 플랫폼 도메인/권한 ADR | `docs/decisions/0018-platform-domains-and-roles.md` | Draft (핵심 결정 확정됨) |
| 픽셀 체크포인트 + 백업 | `docs/design/pixel-terminal-checkpoint.md` + `docs/design/checkpoints/2026-07-31-pixel-hero/` | 롤백용 |
| 캡처 헬퍼 | `tools/_cap-preview.mjs` | `node tools/_cap-preview.mjs <url> <prefix> <dir>` |

**실 라우트(`/`, `/fan-to-pro`) 이관은 승인 후.** 프리뷰는 noindex.

---

## 2. 플랫폼 아키텍처 (ADR 0018, 노아 확정)

- **GC 3기둥** (공개): **팬투프로**(K컬처 실무 교육, 현재 K엔터만) / **인사이트**(외국인 in Korea 정보 콘텐츠) / **커뮤니티**(수강생만 gated, 닉네임 옆 `K엔터 1기` 뱃지). 로그인/가입 미노출 — 결제 수강생만 유저 전환.
- **역할 모델**: super_admin / program admin / instructor / **Pro**(학습+취업+커뮤니티 통합 단일 identity) / **Employer**(기업 셀프서비스, 신설). Basic Auth viewer(코워크)는 별도 격리.
- **인증**: 2-auth 유지 + Supabase 안 `profile_type ∈ {pro, employer}` (상호배타). Pro=invite, Employer=기업메일 self-signup.
- **ATS 상태머신** (최소 뎁스): `applied → screening → document_rejected / document_passed → in_interview → interview_rejected / final_offer` + `withdrawn`. **면접 라운드 = `current_round` int(1/2/3, 상태 인코딩 X)**. UX = 현재 상태의 allowed-next만 칩/드롭다운. **역전이 = terminal 포함 허용**(employer 실수 복구), 모든 전이 `application_events` append.
- **Employer 진입**: `/employers` 소개 → 기업메일 검증 → `/employer` 어드민 (원티드 기업회원 패턴). Pro 표면과 격리.
- **Community 회사 피드**: Pro(개인) + Employer(회사 홍보) actor. Pro는 회사 포스트 read/react/follow.
- **중요 발견**: ATS·courses·bundles·역할 3계층 코어가 **이미 MVP 구현됨**. "코어 단단히" = 신규 구축이 아니라 **통합 지도 + authorize() 순수 추출**(ADR 0017 #10).
- 미결(나중 빌드 시): Career 위상(공유자산 vs 도메인), 빌드 우선순위, 회사 피드 스키마.

---

## 3. 디자인 시스템 토큰 (Aria 조사, 신규 페이지 로컬 적용)

- **컨테이너**: max **1120px** 센터 + gutter 모바일 20px / 태블릿 32px + **배경 full-bleed, 콘텐츠는 컨테이너**.
- **한국어 타이틀 line-height 상향**: display-lg 1.15 / sm 1.25 / body 1.6 (라틴 1.05는 한글에 답답).
- **전역 `globals.css` 절대 안 건드림** — 라이브 1기 회귀 방지. 신규 페이지는 로컬 상수(WRAP, LEAD_*)로. (메모리 `feedback_1st_cohort_frozen`)

---

## 4. 픽셀/터미널 컨셉 (컨셉 B, full send)

- **폰트**: Galmuri11(한글 픽셀, CDN `cdn.jsdelivr.net/npm/galmuri/dist/Galmuri11.woff2`) = 타이틀. Space Mono = 라벨/넘버/커맨드. **한국어 본문/설명글 = Pretendard 유지**(가독성).
- **요소**: 터미널 윈도우 프레임(신호등+`.exe`+SEATS), `[01]`/`$ command` 섹션 헤더, CRT 스캔라인, 청키 픽셀 버튼(하드 오프셋 그림자, 눌리면 밀림), 도트그리드 canvas, 샤프 픽셀 보더.
- **히어로 여정 맵**: `팬 → 강의 → 경험 → 전문가 → 취업` 노드(01~05 웨이포인트 박스) + 점선 연결. **협업 커서**(1기 8개국 학생 + Nino, path 애니로 노드 사이를 오가며 겹침, left/top 직접 이동, 10~13초).
- **섹션 터미널 커맨드 헤더**: `$ whois instructors` / `cat program.md` / `ls curriculum/` / `ls courses/` / `check --eligibility` / `cat schedule.json` / `return outcomes[]` / `git log cohort_01`.
- **⛔ 금지(2026-07-31 룰, CLAUDE.md §6.8 + 메모리)**: 컬러값 그라데이션 절대 금지 / 폰트·컴포넌트 blur glow(뿌옇게) 금지. 딤(단색 검정 alpha)은 허용. accent=solid, 그림자=검정 하드 드롭만.
- **주의(반복된 버그)**: `${styles.pixelFont}${styles.pixelFont}` 공백없이 중복되면 클래스 깨져 Pretendard fallback됨. 클래스 합칠 때 공백 확인.

---

## 5. F2P 2기 콘텐츠 (1기 실제 내용 기반, 신규 작성)

- **강사**: Nino(A&R 단과 확정, 실제 크레딧 — **아이돌 정식명 금지**, 역할·규모만). 나머지 강사 = "확정 예정 ?".
- **커리큘럼**: 토(공연 실무: 디렉팅/플레이백/현장) / 일(뮤직비즈니스: Music Business/음반기획/A&R/Visual Director). 회차별 상세는 2기 확정 예정.
- **과정**: 단과(A&R) + 올인원(단과 포함). 수강료 확정 예정.
- **지원 자격 4요건**(1기 동일): 외국국적 학생/취준생 / 비자(D-2,D-4,D-10,E,F) / 한국어 강의 이해 / 주말 출석.
- **일정·장소**(노아 확정): 2026년 8월 중순 / 서울 강남 또는 마포(확정자 개별 전달).
- **얻는 것**(1기 동일): 포트폴리오 / 네트워킹 / 취업준비 / 수료증+참여확인서.
- **후기**: 6개 = 이전 동일 커리큘럼 익명 발췌 + **정직한 disclosure**. 1기 실후기는 노아가 받아둠 → 순차 교체.
- **현장**: 실 촬영본 없음 → 스톡 + "실제 현장 사진 수강 후 공유" disclaimer.
- 8개국(1기 실측: 중국/베트남/인도/멕시코/필리핀/프랑스/포르투갈/미얀마 = 10명). 미정값 = "확정 예정". 운영: Dropdown(수료증)/유니온픽처스(참여확인서)/DEEPI(강사섭외).

---

## 6. 섹션별 픽셀 인터랙션 아이데이션 (Aria PM + Luna PD, 구현 대기) ★다음 작업★

**핵심 원칙**: 픽셀의 본질 = **연속값을 이산 스텝으로 끊기**(steps(), ASCII 게이지, dither). 폰트보다 강한 시그널. 입체감은 **하드 오프셋 그림자 + dither 체크무늬 + steps()** 로만(glow/gradient X).

**공통 primitive 3개 먼저**:
1. `useInViewSteps` 훅 — IntersectionObserver(threshold 0.4) → steps()로 카운트업/게이지/체크 전진. reduced-motion 시 즉시 최종값.
2. `.dither` — `repeating-conic-gradient(#000 0 25%, transparent 0 50%) 0 0/6px 6px` alpha 4~8%. glow 대체 질감.
3. `.pixelShadowLift` — 카드 `box-shadow:4px 4px 0 #000`, hover `translate(-2px,-2px)+6px 6px`, `transition:.1s steps(2)`.

**섹션별 모티프**:
| 섹션 | 모티프 | 난이도 |
|---|---|---|
| GNB | 부팅 타이핑 로고(1회, sessionStorage) + 픽셀 점선 스크롤 게이지(role=progressbar) | 하 |
| 강사진 | `whois` 터미널 창(신호등) + hover pixelShadowLift + `>` 프롬프트 | 중 |
| 프로그램 | `$ ./fan_to_pro --program` + 라인 stagger fade(타이핑 X) | 하 |
| 커리큘럼 | **파일트리 아코디언** `├─ 01_directing.md` (`<details>/<summary>`, grid 0fr→1fr steps(4)) + 미니 게이지 | 중 |
| 과정 | 주차 타임라인 픽셀 레일 `●───●───○` (스크롤 채움) | 중 |
| 지원조건 | **체크리스트 `[ ]→[x]`** 스크롤 stagger 자가체크 + dither flash | 하 |
| 일정 | ASCII 달력 그리드 + D-day 카운트다운(force-dynamic §7) | 중 |
| 얻는 것 | 스탯 카운트업(steps) + `[■■■□□] 80%` ASCII 게이지 | 중 |
| 후기 | **git commit log** `commit a3f9c2` + git-graph 세로선(clip-path) | 중 |
| 현장 | dither placeholder(스켈레톤 대신) + 스캔라인 섹션 구분자 | 하 |
| CTA | `$ apply --cohort=2` 프롬프트 + `_` blink (기존 pixelBtn 유지) | 하 |
| Footer | `> exit_` blink + sysinfo mono 정렬 | 하 |

**PM 절제(AI 티 방지)**: 타이핑은 **GNB 1회 + CTA만**. 모션 섹션 **최대 5~6개**. 전환 핵심 3섹션(지원조건·과정·CTA)은 **명확성 우선**, 컨셉 거들기만.

**구현 우선순위 제안**: ① 지원조건 체크리스트 ② 커리큘럼 파일트리 ③ 스탯 ASCII 게이지 ④ 후기 커밋로그 ⑤ GNB 부팅+게이지. (Top1 GNB + Top3 체크리스트가 공수 낮고 시그널 즉각 상승)

---

## 7. SEO / AEO / GEO (Echo 조사, 인사이트 허브 빌드 시 사용)

- **사이트맵**: `/`(GC) · `/fan-to-pro`(2기) · `/insight/{visa|topik|korean|finance|work|living}/{질문형-영문-slug}` · `/cohorts/fan-to-pro-1` · 미래 `/jobs` `/employers`.
- **AEO/GEO**: 얕은 3단, 질문형 영문 slug, FAQPage/HowTo/Article/Breadcrumb/Organization JSON-LD, ko/en hreflang(x-default=en), dateModified(최신성), 권위 출처 인라인 인용.
- **인사이트 공식 출처(실존 확인)**: 비자=HiKorea(hikorea.go.kr)+visa.go.kr / TOPIK=topik.go.kr(국립국제교육원) / 한국어=세종학당+국립국어원 / 금융=금감원 / 취업=고용노동부+HiKorea 시간제취업 / 생활=정부24·서울글로벌센터·Korea.net.
- **콘텐츠 규칙(노아 절대 제약)**: "공식 규정"(기관 링크 필수) vs "먼저 겪은 사람 팁"(시점 라벨) 블록 분리. 미검증 사실 게재 금지("뻥치면 끝").

---

## 8. 다음 세션 할 일 (순서)

1. **§6 픽셀 인터랙션 구현** — primitive 3개 → Top 픽 섹션(지원조건/커리큘럼/스탯/후기/GNB). client 컴포넌트 필요. 노아에게 순서 확인받고 슬라이스로.
2. **GC 메인 3기둥 재구성** — 같은 픽셀 컨셉으로(팬투프로/인사이트/커뮤니티, 콘텐츠 플랫폼 형태 + 소구점). 커뮤니티는 gated 티저.
3. **인사이트 허브 라우트/JSON-LD 뼈대** (Sophia) + 첫 글 1개 공식 출처로 작성(템플릿 확정).
4. 실 라우트 이관 결정(#14): `/fan-to-pro`=2기 재구성 + 1기 아카이브 `/cohorts/fan-to-pro-1`.

**노아 확인 대기**: 픽셀 구현 우선순위 / GC vs 인사이트 먼저 / 실 라우트 이관 타이밍.

---

## 9. 오늘 박제된 룰·메모리

- `feedback_1st_cohort_frozen` — 1기 페이지 공통 적용에서 항상 제외(동결).
- `feedback_no_color_gradient_no_glow` + **CLAUDE.md §6.8** — 컬러 그라데이션·폰트 글로우 금지.
- `reference_design_system_themes` / `project_brand_architecture_vision` (기존, 갱신).

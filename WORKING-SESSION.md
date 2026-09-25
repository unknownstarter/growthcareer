# Working Session

> **이 파일은 가장 최신 작업 상태를 담는다.** 다음 세션 시작 시 가장 먼저 읽기.
> 운영 매뉴얼: [CLAUDE.md](./CLAUDE.md)

---

## 📅 Last updated: 2026-09-24 (Factor 분리 + 2기 프리뷰 영문판 마감 + git 정리)

> 🧬 **Factor 분리 (ADR 0020)**: SaaS 파생 작업 전체를 형제 폴더 `~/factor` (레포 `unknownstarter/factor`) 로 이관. 그로스커리어는 1기 수료증 검증 + 2기 신청 데이터가 걸린 라이브 운영 사이트라 실험 코드를 섞지 않는다. 여기 남는 것 = `docs/decisions/0020-saas-spinoff-to-factor.md` + 9/24 리서치 4건 원본. **정본은 Factor 쪽이고 이후 갱신은 Factor 에서만.** SaaS 논의 이어갈 땐 `cd ~/factor` 로 세션 시작.
>
> 🖤 **2기 리디자인 프리뷰 마감**: `docs/design/2gi-fullpage-glass.built.html` = 영문 전면 + 2기 실제가 (550,000 / 550,000 / 990,000) + 유리 히어로 인라인. 부호 검사 PASS. 캡처 = `docs/design/captures/2gi-fullpage-en.png` / `2gi-mobile-en.png` / `2gi-pricing-en.png`. ⚠️ **프리뷰 전용, 프로덕션 미반영.** 실제 2기 페이지 반영은 §7.4 대로 노아 승인 + Mira + 카피 검사 후.
>
> 🧹 **git 정리**: 9/21~9/24 문서 (레슨 2건, ADR 0020, 디자인 프리뷰 + 기법) 커밋. SaaS 리서치 4건과 스타터 spec 은 `~/factor` 로 완전 이관하고 여기서는 삭제 (ADR 0020 참조). .gitignore 추가 = 디자인 캡처 21MB / 1기 현장 원본 사진 영상 78MB (수강생 얼굴 PII) / 설문 CSV (응답자 PII) / 외부 교육자료 PDF / 카드뉴스 렌더 소스 / 설치형 스킬 본문.
>
> 📌 **다음 후보**: (1) 2기 프리뷰를 실제 페이지에 반영할지 결정 (2) Factor 에서 니치 후보 1 (배달 3사 정산 대사) vs 3 (세무사 증빙 수취) 선택 (3) 아래 기존 대기 항목 (#6 코워크 cutoff, GC 루트 승격, sitemap 인사이트 추가).

---

## 📅 (이전) 2026-09-24 (1인 SaaS 니치 리서치 복원 + 프리뷰 영문 전환 결정)

> 🔁 **유실 복구**: 9/23 세션에서 완료됐던 Echo 리서치 (1인 바이브코딩 SaaS build to exit 사례 + 비IT 니치 기회) 가 대화에만 있어서 유실됐던 것을 이전 세션 로그에서 복원 → 박제 (현재 정본은 `~/factor/docs/research/2026-09-24-solo-saas-niche-opportunities.md`). 사고 레슨 + CLAUDE.md §1 / §7.5 룰 역반영 완료 (`docs/lessons/2026-09-24-research-output-lost-in-chat.md`).
>
> **리서치 핵심**: 위노트 = 로컬 저장형 학교/심리상담 관리 프로그램 (민상기, 인디펍 공동창업자). **매각 기록은 확인 불가, 유튜브 숫자는 소문 취급**. 1인 exit 은 순이익 3배 내외 소액이 흔하고, 스타들 대부분은 매각 대신 운영. 권고 = 디자인 퀄리티가 해자인 각도 (로컬 사장용 고퀄 랜딩+예약 / 미용 리텐션) + distribution first + 인수창업 병행 검토.
>
> **템플릿 자산 인벤토리**: `src/shared/ui` 7종 + `src/shared/navigation` 8종 + Supabase/RLS + 에러 taxonomy + 분석 트래킹 + 메시지 템플릿 + 어드민 패턴 + tools 83개. 부족한 것 = 결제, 멀티테넌시, 셀프 가입, 사용량 과금.
>
> **결정 대기**: 니치 후보 8개 중 무엇부터 검증할지. 세무 인접 아이디어는 세무사법 규제선 확인 선행 필요.
>
> **프리뷰 마감 (진행 중)**: 2기 리디자인 프리뷰를 영문 전면 + 2기 실제가 (55만/55만/99만) 로 통일하기로 결정. 부호 검사 PASS. 편집 미완.

---

## 📅 (이전) 2026-09-21 (2기 리디자인 방향 + 유리 히어로 기법 - 전부 프리뷰/문서, 배포 X)

> 🎨 **디자인 방향 세션 (구현 X, 프로덕션 무변경 확인됨)**. 산출물은 전부 `docs/design/` 프리뷰 + Artifact.
>
> **결정된 방향**:
> - **2기 페이지 리디자인**: 1기가 성공한 "클린 볼드 + 진짜 사진"으로. 2기 픽셀/터미널 컨셉이 프리미엄·가독성 깎았던 게 원인(1기 vs 2기 히어로 비교로 확인). 픽셀은 **시그니처로만 절제**(eyebrow 틱/코너 마커/칩 불릿, 타이틀 마침표 X). 다크 유지. 1기 페이지는 **동결(건드리지 마)**.
> - **새 팬투프로 프로젝트**: 별 repo 안 팜. **같은 repo + 같은 Supabase(이미 fantopro) 브랜드 승격 + 옛 도메인 경로 301 보존**(1기 수료증 연속성). RIM→BlackBerry/Sun→Oracle 사례 근거. → **보류**, 2기부터 자리잡기로.
> - **원데이 DJ(관광객)**: 라이트+실사 사진 카테고리(클룩/에어비앤비), 부킹+파트너 시스템. 나중.
> - **큰 대화 진행 중**: 정직한 약속 프레임 합의(취업보장 빼고 경험+증명 중심). 히어로 thesis(A/B) + 증명 배치 미정.
>
> **유리 히어로 기법 습득** (원티드식 liquid glass 재현): Three.js transmission 유리 + 텍스트 평면 + 환경맵 + 색분산 포스트 → Playwright 헤드리스로 정적 PNG 베이킹. **원티드는 라이브 아니라 정적 PNG였음**(검사로 확인). 기법: `docs/design/webgl-glass-hero-technique.md`, 렌더 소스: `docs/design/glass-hero-render.html`, 산출: `docs/design/captures/fantopro-glass-hero.png`. 레슨: `docs/lessons/2026-09-21-replicate-reference-inspect-first.md`.
>
> **주요 프리뷰 Artifact**: 디자인 시스템(원티드 기반 토큰), 2기 전체 리디자인(픽셀 프리미엄), liquid glass 효과. 파일 `docs/design/*.html`.
>
> **다음**: 히어로에 유리 이미지 통합 or 큰 대화(증명 배치) 이어가기. 실제 2기 페이지 반영은 §7.4 대로 노아 승인 + Mira/카피검사 후.

---

## 📅 (이전) 2026-08-23 (분석 이벤트 트래킹 GA4+자체DB + 유입 진단)

> 🔎 **8/23 추가**: 모집 페이지에 view/scroll/click/start_apply/completed_apply 이벤트를 GA4+자체DB(`analytics_events`) 양쪽 적재. `tools/analytics-summary.mjs`(자체) + `tools/ga4-report.mjs`(GA4 Data API, property 538220690, `.env.local` GA4_KEY_FILE/GA4_PROPERTY_ID) 로 퍼널 집계. Sage GO(Origin체크·meta정규화·referrer절단).
>
> ⚠️ **진단 정정 (GA4 실측)**: "27→0"은 유입 문제 **아님**. GA4 30일 = **431 세션/310명** (8/18 172 스파이크, Kowork cowork+kowork ~112 유입). **문제 = 전환**. 퍼널: 431 세션 → 250 깊은스크롤 → **form_start 18** → 완료 ~4. 절벽은 "읽기→폼시작"(95% 이탈, 폼 건드리기도 전). 8/21~22 폼버그는 부차(form_error 1건). **핵심 = 페이지가 신청까지 전환 못 시킴**(카피·신뢰·CTA·가격설득·폼마찰). DB 타임라인만 본 8/23 초기 진단(유입문제)은 GA4로 뒤집힘.
>
> ✅ **전환 개선 1차 배포(8/23)**: P1 폼 마찰 축소(birthdate DB NOT NULL 제거 마이그레이션 `20260823010000` + 스키마/UI optional, 학교도 optional → 필수는 이름·이메일·연락처·국적·비자+동의2만). P2 위험역전/긴급성(hero "마감 D-N"+"7일내 100% 환불" 칩, 가격 밑 안심 배지, force-dynamic 자동 갱신). P4 중간 전환 CTA(가격 직후). 인스타 인앱웹뷰 영문 최소정보 신청 E2E 18/18(모바일+웹) `tools/en-minimal-apply-e2e.mjs`.
>
> ✅ **멱등성(8/23)**: 같은 email+cohort 재신청 → 중복 INSERT 대신 프로필만 UPDATE(status/notified_at 보존). E2E 9/9. `tools/idempotency-apply-e2e.mjs`.
> ✅ **신뢰 요소(8/23)**: 커리큘럼 음향 아코디언 기본 펼침 · FAQ 8문항(1기 기반, 룰맞게 수정: 비자가이드 제거·계좌 제거·2기값) · 법인 신뢰 띠(Dropdown 사업자 154-28-02110/유니온픽처스/DEEPI) · 수료증 실물 샘플(`public/images/cert-sample.png`, 중간 블러+SAMPLE) · 프로세스 투명성 4step. **2-step폼·P6 계좌노출은 노아 지시로 스킵**(무지성 입금 위험).
>
> 후속 백로그: WAF rate-limit, 처리방침에 분석수집 명시, session_id 만료, analytics_events TTL cron, 1기 중복 applicant 2건 정리 후 email+cohort DB UNIQUE 인덱스.

## 📅 (이전) 2026-08-22 (신청폼 긴급수정 + 관측성 Tier 1 + 2차 카드뉴스)

> ▶ **2기 모집 라이브.** `growthcareer.xyz/fan-to-pro/2` (마감 2026-08-30 자정, 첫수업 9/5 토). 지원 → `applicants` status=pending + cohort_id=fantopro2 → 어드민 → 결제 → LMS.

> 🔎 **오늘(8/21~22) 상세 기록**: `docs/internal/SESSION-2026-08-22-apply-fix-observability.md` + `SESSION-2026-08-21-2gi-admin-ops.md` (gitignored). 아래는 요약.

## 🎯 현재 상태 (2026-08-22)
- **2기 신청 퍼널 정상화 완료**: React 19 form auto-reset 로 검증 에러 시 입력값 소실 → **폼 controlled 화**로 수정(`1ff8b10`). playwright 로 값유지+완료뷰 검증. (라이브 사고: "신청이 아예 없었음")
- **관측성 Tier 1 배포**(`8d0270a`): 에러코드 taxonomy(`src/shared/errors/codes.ts`) + GA4 `form_error`/`client_error` + 스큐 자가치유(error.tsx auto reload). Tier 2(Sentry) 미도입.
- **배포 원칙**: 라이브 중 연속배포 금지 → 변경 모아 1회. 스큐(`UnrecognizedActionError`) 재발 시 하드새로고침/자가치유.
- **협력사 이름 = Kowork**(K, cowork 오타 금지). 코워크 인스타 = kowork UTM 링크.
- **인스타 2차 카드뉴스** 완성(`docs/marketing/2gi-cards-2/`, 커밋 금지). 게시 대기.
- **1기**: 아카이브(`/fan-to-pro/1`). **2기**: 모집 라이브(cohort `fantopro2`, 단과 55만/올인원 99만, 최소 10명).

---

## ✅ 이번 세션 배포 완료 (커밋 a2fbd09)

### GC 플랫폼 신규 (라이트 디자인 시스템)
- `/gc-preview`(GC 메인, noindex 프리뷰), `/fan-to-pro`(Fan to Pro 브랜드+기수 리스트), `/insight`(리스트+상세 6편), `/press`(Press Room), 커뮤니티 게이트 모달.
- 공통 컴포넌트: `src/shared/navigation/{SiteHeader,SiteFooter,GcWordmark,NavLink,SubNav,GcHeaderCta,LocaleSwitch}` + `src/shared/ui/{Button,Card,Modal,StatusBadge,SectionHeader,StickyCtaBar}`. 컴포지션 룰 `docs/design-system-composition.md`.

### 라우팅 재구성 (IA 디커플)
- `/fan-to-pro`=기수 리스트, `/fan-to-pro/2`=2기 모집(다크 픽셀), `/fan-to-pro/1`=1기 아카이브. 루트 `/`→`/fan-to-pro/2` 리다이렉트.
- 백엔드 URL 디커플 확인(auth 허용목록 prefix, DB slug≠URL). structured-data/sitemap/locale-switcher 갱신.

### 이중언어 + i18n
- 전 GC 서피스 ko/en (COPY 객체 + locale param). 무-prefix=en, `/ko/*`=ko. 언어 세션 유지(내부 링크 prefix). 반응형 헤드라인(clamp+text-balance). humanizer A등급.

### 인사이트 (SEO/GEO)
- `content/insights/*.mdx` 6편 ko/en (공식 출처만, 비자는 링크+사실). JSON-LD Article + canonical + hreflang + OG. `/insight` 색인 허용.

### 2기 백엔드 배선 (§7.4 Sage PASS + Mira 블로커 fix)
- **디커플**: cohort별 `enrollment_closes_at`(시각 기반 자동 마감) → 전역 1기 cutoff 제거. `submit-application` 리팩터(`fetchSignupOpenCohort` now 판정).
- **마이그레이션** `20260811000000` prod 적용 완료: 2기 cohort + courses(a-r/sound open) + bundle(all-in-one open) + bundle_courses. prod 검증됨.
- noindex 해제: `/fan-to-pro` 리스트 + `/insight`.

---

## 🔄 진행 중 / 대기

### GC 후속 (비블로커)
- **GC 루트 승격**: `/gc-preview`→`/` (현재 `/`→`/fan-to-pro/2`). gc-preview/press noindex 해제도 이때. 별도 SEO 큰 건.
- Mira minor: EN 페이지 `aria-label`(site-header)·비자 드롭다운 "기타/없음"·press meta description 가 한국어 (스크린리더/폼 미세 leak). StatusBadge 근본 locale-aware 리팩터 후보.
- sitemap 에 `/insight` + 아티클 경로 추가(SEO).
- 운영: 2기 cohort `course_id` NULL(단과 2개 병행이라 의도) — LMS 수료 집계가 의존 시 매핑. prod `courses/bundles` RLS `public_read_open_or_archived` 확인(쇼케이스 페이지용).

### 기존 대기
- **#6 코워크 cutoff 재개통**(2기 오픈했으니 진행 가능): `VIEWER_ACCESS_END_UTC` 연장 + cohort 파라미터화 + 약관 D4.
- **#13 Strangler + #10/11 인증** 리팩터(별도 큰 덩어리).

---

## 🛠️ 노아 manual action 잔여
- **첫 실제 지원 1건** 들어오면 `applicants` status=pending + cohort_id=fantopro2 확인(자동 검증됨, 첫 지원이 최종 증명).
- 2기 cohort 일괄 발급/정산은 모집 후.
- Google Search Console 재크롤 요청(색인 해제된 리스트/인사이트).

## 📁 핵심 파일 / 경로
- **GC nav 단일소스**: `src/programs/growth-career/presentation/gc-nav.ts` (헤더/푸터 nav — 여기서만 변경).
- **2기 페이지**: `app/[locale]/fan-to-pro/2/{page,content,apply-flow,pixel-fx}.tsx`. **리스트**: `app/[locale]/fan-to-pro/page.tsx`.
- **인사이트**: `content/insights/*.mdx`, `src/programs/growth-career/{domain/content,infrastructure/content,presentation/components/insight}`.
- **2기 배선**: `supabase/migrations/20260811000000_*.sql`, `application/submit-application.ts`, `infrastructure/supabase/repositories/cohort-repository.ts`(fetchSignupOpenCohort).

## 📚 다음 세션 30초 체크 (§7.5)
1. 이 파일 → 2. `git log --oneline -10` → 3. `git status` → 4. `docs/tasks/BACKLOG.md` → 5. `docs/lessons/README.md`

# Working Session

> **이 파일은 가장 최신 작업 상태를 담는다.** 다음 세션 시작 시 가장 먼저 읽기.
> 운영 매뉴얼: [CLAUDE.md](./CLAUDE.md)

---

## 📅 Last updated: 2026-08-23 (분석 이벤트 트래킹 GA4+자체DB + 유입 진단)

> 🔎 **8/23 추가**: 모집 페이지에 view/scroll/click/start_apply/completed_apply 이벤트를 GA4+자체DB(`analytics_events`) 양쪽 적재. `tools/analytics-summary.mjs` 로 방문/신청 퍼널 집계. Sage GO(Origin체크·meta정규화·referrer절단). 진단 결론: **"27→0" = 유입 문제(주) + 8/21~22 폼버그(부, 수정됨)**. 1기 27명은 6월 푸시 버스트, 2기 4명(8/18~20 실제 유학생) 후 유입원(인스타카드·Kowork) 미가동. 후속 백로그: WAF rate-limit, 처리방침에 분석수집 명시, session_id 만료, analytics_events TTL cron.

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

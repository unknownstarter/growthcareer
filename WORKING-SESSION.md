# Working Session

> **이 파일은 가장 최신 작업 상태를 담는다.** 다음 세션 시작 시 가장 먼저 읽기.
> 운영 매뉴얼: [CLAUDE.md](./CLAUDE.md) · 큰 결정: [ADR 0017](./docs/decisions/0017-lms-performance-and-auth-refactor.md)

---

## 📅 Last updated: 2026-07-29 (LMS 하드닝 스프린트)

> ▶ **다음 세션 시작점 (노아 지정): 인증 리팩터부터.** `#9 vitest 세팅` → `#10 authorize()/resolveAuthContext` → `#11 getClaims`. lms-role.ts(684줄) 판정/IO 분리가 몸통. 라이브 로그인 표면이라 Sage/Mira 게이트 + preview 검증 후 배포.

## 🎯 현재 상태
- **1기**: 종강(7/19) + 수료식(7/25) 완료. 수료증 발급 시스템 정상(P-1 fix 후).
- **2기**: 준비 단계. 모집 페이지(#14) + 코워크 재개통(#6) 대기.
- LMS 성능/라이브버그/코워크/디자인/데이터/아키텍처 seam 을 이번 세션에 대거 정리.

---

## ✅ 이번 세션 배포 완료 (13 커밋, 태스크 #1~#18)

### 성능 (LMS "느림" 해결)
- **#7 리전 icn1 핀** (`vercel.json`): 실측으로 함수가 iad1(미국)에서 실행 = 근본 원인. Seoul 핀 후 TTFB 270→~100ms. `x-vercel-id: icn1::icn1` 확인.
- **#8 loading + 캐시**: LoadingOverlay non-blocking skeleton, bare 404 fix, not-found. cohort 공용 비PII만 `unstable_cache`+태그(announcements/materials/cohort meta), 시각 컷오프는 캐시 밖(§7 준수), PII force-dynamic 유지.

### 라이브 프로덕션 버그
- **P-1 (#1)** `certificates.verify_token` prod 미적용 → 발급 시 500. `supabase db push`(백필 pgcrypto→md5). **수료증 발급 이제 정상.**
- **P-2 (#2)** 출석률 admin 0% 오표시. `getElapsedSessionIds`(ends_at<now) 헬퍼로 4곳 통일(overview/roster/cert/학생뷰).
- **P-3 (#3)** 로그인 instructor 발산 → latent(강사 surface 미구현), **#10에 통합**.

### 코워크 정산 (ADR 0017 D1/D3/D5)
- **#4 마스킹**: viewer만 name/email/phone/입금자명/university(카테고리) 마스킹. birthdate/address/notes null. **nationality/visa 노출 유지(노아 D1 accepted)**. 폴링도 마스킹(Sage CRIT fix), CSV viewer 차단. admin mask:false 불변. **Sage PASS.**
- **#5 커미션**: SUM(paid_amount_krw where paid/enrolled)×12%. 1기=8,800,000×12%=1,056,000원.

### 디자인 시스템 (#16 #17, 노아 승인)
- LMS **라이트 모드**: 흰 배경+near-black+핑크 `#db2777`+남보라 `#4f46e5`, Pretendard, 관습적 스타일(AI-slop 금지). 코어 컴포넌트(button/badge/card/table/select/typography). 토스-블루 완전 제거. 프리뷰 `/[locale]/design-system`(임시). memory `reference_design_system_themes`.

### 데이터/아키텍처
- **#18** test noah 계정 삭제(students+applicants, 1기 11→10) + dead 파일 `infrastructure/storage/signed-url.ts` 제거(STORAGE_BUCKETS landmine).
- **#12** growth-career → fan-to-pro 역의존 제거, `src/shared/`(cn, supabase/server 브리지) 승격. 2번째 프로그램 대비 clean seam.

---

## 🔄 다음 세션 — 남은 큰 작업 (한 덩어리)

### #13 Strangler + #9~11 인증 = 묶어서 하나로
**핵심 통찰: #13의 구조 리팩터 = #10 인증 리팩터의 몸통.** 따로 하면 두 번 만짐.
- **#9 vitest 세팅** (테스트 프레임워크 0) — 인증 리팩터 선결. characterization(인증 매트릭스 diff 0, 위조토큰, viewer 마스킹 회귀, RLS 격리). Edge 번들 정적검사.
- **#10 인증 Phase 1** = `authorize()`(domain 순수, Edge/Node 공유) + `resolveAuthContext` Edge/Node 2벌(공유X, §7 Edge에 service_role 금지). 미들웨어↔레이아웃 DB 중복 제거. `assert*` 파사드 시그니처 보존(56곳). x-lms-auth 헤더 폐기. **Sophia 설계 C1: lms-role.ts(684줄) 판정/IO 분리 선결.** mutation은 DB-fresh 유지.
- **#11 인증 Phase 2** = getClaims 전환. **ES256 비대칭 키 이미 활성**(실측) → 키 승격/revoke 불필요, 코드만 전환(@supabase/ssr 0.8+ 업그레이드 + getUser→getClaims). **레거시 secret은 노아 결정으로 유지(revoke 안 함).**
- **#13 나머지**: 30+ page→application 경유, server action 두 집(interface/server-actions vs application/**) 통합, drift 정리(revalidatePath "/ko/" no-op 제거, gen-cert stale, resolveLoggedInDestination vs post-login 중복).

### #14 2기 모집 페이지 (EPIC, 별도)
- **라우팅 결정 선행(노아 미결)**: A. `/fan-to-pro` 2기 재구성+1기 아카이브 vs B. growthcareer(showcase) 경로. 1기 후기(수료식 구글폼)+영상+사진 반영. ADR 0015/0016 연계. §2.5 gating + spec 선행.

### #6 코워크 cutoff 재개통 (2기 오픈 대기)
- #4 마스킹으로 안전성 확보됨. 2기 오픈 시 `VIEWER_ACCESS_END_UTC` 연장 + cohort 파라미터화 + server action cutoff 게이트. 약관 조항(D4) 법무.

---

## 🛠️ 노아 manual action 잔여
- **수료증 발급**: P-1 fix 후 이제 정상. cohort 일괄 발급 실행 가능.
- **JWT signing keys**: 실측 완료 — ES256 비대칭 활성 + 레거시 HS256 유지(revoke 안 함, 노아 결정). getClaims 성능 전환은 코드만으로 가능(#11).
- **2기 라우팅 결정**(#14 A/B) + **약관 D4**(법무) + **2기 일정**(ADR 0014 결정 5건).
- Google Search Console / Naver / structured-data placeholder (기존 B0019 잔여).

## 📋 태스크 보드 (harness 태스크, 파일로 백업)
- ✅ 완료: #1 #2 #4 #5 #7 #8 #12 #16 #17 #18
- ⏳ 대기: #3(→#10) #6(2기) #9 #10 #11 #13 #14

---

## 📁 핵심 파일 / 경로
- **ADR 0017** `docs/decisions/0017-lms-performance-and-auth-refactor.md` — 성능+인증 리팩터 + 3회 리뷰 + 결정 D1~D9. Open 표에 미결 결정.
- **디자인**: `app/globals.css` [data-theme=light] + `interface/components/lms/ui/*` + memory `reference_design_system_themes`.
- **shared**: `src/shared/{ui/cn,supabase/server}.ts` (신규 seam).
- **인증(리팩터 대상)**: `middleware.ts`, `infrastructure/auth/lms-role.ts`(684줄), `post-login-redirect.ts`, `supabase-server-auth.ts`.
- **코워크**: `admin/applicants/page.tsx`, `application/polling-actions.ts`, `infrastructure/supabase/repositories/applicant-repository.ts`.

## 📚 다음 세션 30초 체크 (§7.5)
1. 이 파일 → 2. `git log --oneline -14` → 3. `git status` → 4. ADR 0017 Open 표 → 5. `docs/lessons/README.md`

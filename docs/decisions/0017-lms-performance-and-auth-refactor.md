# ADR 0017 - LMS 성능 개선 + 인증 리팩터 + 코워크 정산 read

**Status**: Proposed (노아 결정 A/B/C 반영, D 실측 대기, 3차 리뷰 반영 예정)
**Date**: 2026-07-29
**Deciders**: 노아 + 팀 전원 (Aria PO / Sophia Arch / Iris Backend / Luna UX / Mira QA / Sage Security / Echo Research / Vera DevOps)
**Tags**: lms, performance, auth, jwt-signing-keys, getClaims, middleware, cowork, viewer, pii-masking, clean-architecture
**Related**: ADR 0005 (LMS 클린아키텍처), 0006 (디자인시스템), 0008 (URL/Auth 분리), CLAUDE.md §7/§7.4/§6.7
**리뷰 근거**: 2026-07-29 팀 1차 + 2차 adversarial 리뷰 (코드베이스 + 실제 Supabase JWKS/RLS/인덱스 실측)

---

## 컨텍스트

LMS(`app/[locale]/fan-to-pro/(lms)/` + `[cohortSlug]/`) 전 페이지가 답답하게 느림. 팀 2회 리뷰로 근본 원인과 숨은 크리티컬을 코드+Supabase 실측으로 확정.

### 확정된 근본 원인 (성능)

1. **미들웨어 직렬 인증 체인**: `handleLms`가 매 인증요청마다 `supabase.auth.getUser()`(Supabase Auth 서버 네트워크 왕복) + `user_profiles`/`programs`/`memberships` 순차 DB 왕복 2~5회. 렌더 전 게이트라 TTFB에 누적. `resolveLoggedInDestination`이 로그인 리다이렉트마다 또 3~5 쿼리.
2. **인증 3중 중복**: 미들웨어 + `*/layout.tsx` + page. `getLmsUser`의 React `cache()`는 request-scope라 **미들웨어↔서버컴포넌트 경계를 못 넘음**(별 실행 컨텍스트). 공식 근거: React `cache()`는 단일 렌더 패스 한정 (vercel/next.js#60124).
3. **함수 리전 미핀**: `vercel.ts`/`vercel.json` 부재 → 함수/미들웨어가 Seoul(icn1) 밖이면 위 왕복이 태평양 latency로 증폭. 관측 인프라(Speed Insights/Analytics)도 0.
4. **loading 패턴 품질**: `loading.tsx`는 9개 존재(상속 커버)하나 `LoadingOverlay`가 dim+blur+spinner로 화면을 덮어 skeleton 이점을 죽임. instructor 서브트리만 진짜 부재. bare 경로(`/admin`, `/student`)는 index 없어 404, `not-found.tsx` 프로젝트 전체 0건.

### 실측으로 뒤집힌/확정된 사실 (2차 리뷰)

- **비대칭 JWT 키(ES256)가 이미 JWKS에 활성** (kid `49f1c646...`). 그러나 **코드는 `getClaims()`를 전혀 안 씀**(getUser 4곳) → 키가 켜져 있어도 성능 이득 0.
- **legacy HS256 시크릿이 아직 유효** (Sage probe: anon/service_role HS256 토큰이 PostgREST 통과). legacy 시크릿 유출 시 `service_role` 위조 → RLS 전면 우회. **revoke 전까지 보안 구멍.**
- **RLS는 getClaims/비대칭 전환에 안전**: `auth.jwt()` 58회 전부 `->> 'role' = 'service_role'` 단일 패턴, custom claim 참조 0. `auth.uid()`(=sub)는 알고리즘 무관 유지. (Iris 실측 + Echo 공식문서)
- **인덱스 부재 아님**: `program_memberships`/`cohort_memberships` PK + `cohort_memberships_user_idx` 가 hot query 전부 커버. 인덱스 추가 불필요.
- **미들웨어가 service_role을 안 씀**(anon+fetch, Edge-safe)인 반면 서버컴포넌트 `getLmsUser`는 service_role(Node 전용). → 인증 판정 데이터 소스가 근본적으로 다름.
- **코워크 PII 법적 근거 부재**: 개인정보처리방침 위탁자/제3자 목록에 DEEPI/코워크 없음. CLAUDE.md §8도 "DEEPI 개인정보 위탁 안 받음" 명시. 그런데 현 `/admin/applicants` viewer는 이름·이메일·전화 평문(mask:false) + **CSV 다운로드 버튼이 viewer에 열림**.

---

## 결정 (노아, 2026-07-29)

### A. 코워크 viewer 데이터 = 개별 행 유지 + 이름/전화/이메일 마스킹

- viewer(코워크)는 기존처럼 `/admin/applicants` 개별 신청자 행을 봄. **단 이름·전화번호·이메일 3개 필드는 마스킹/블러 처리**(삭제 아님, 가림).
- **CSV 다운로드 버튼은 viewer에게 차단** (`{!readOnly && ...}` gate). 오프라인 PII 반출 벡터 제거 (Sage C-1).
- 마스킹 대상: `name`, `email`, `phone`. 기존 `maskEmail`/`maskPhone`은 존재(현재 mask:false로 dead) → 활성화 + `maskName` 신규. `nationality`/`visa`/`status`/금액 등은 노출(마케팅·정산 판단용).
- **잔여 우려 (Sage/Aria, open)**: 마스킹해도 개별 행을 제3자(코워크)에 제공하는 것 자체가 위탁 표면일 수 있음. 마스킹으로 리스크는 크게 감소하나, 2기 신청폼 약관에 "마케팅 제휴사에 마스킹된 신청 현황 제공" 조항 추가를 권고 (법무 확인 후).

### B. 커미션 base = 환불자 제외 결제 확정 인원

- 커미션 = **환불되지 않은 결제 확정 인원 수 × 수강료 × 12%**. 1기 = 10명 × 880,000원 × 12% = **1,056,000원**.
- 노아 명확화: 첫 수업 1주 전 환불 발생 시 → 고객 환불 + **코워크 커미션 미지급** → 애초에 카운트에서 제외.
- 집계 정의: `status ∈ {paid, enrolled}` AND `status ∉ {refunded, cancelled}` 인 인원 수. 환불자는 base에서 빠짐 (별도 차감 계산 불필요, 단순 미포함).
- §6.6 원 단위 표기: "결제 확정 1명 = 105,600원" 형태로 정산 화면 명시.

### C. 비대칭 JWT 마이그레이션 = 지금 진행 (2기 후로 미루지 않음)

- 노아 결정으로 1차 Aria "2기 전 인증 동결" 권고를 **override**. 단 아래 안전 시퀀스 엄수(무중단 보장).
- 성능 이득은 getClaims 코드 전환 + 리전 핀에서 나옴(키만 켜는 것으론 0). legacy 시크릿 revoke가 보안 이득의 핵심.

### D. Signing Keys 상태 확인/관리 = 노아 직접 (가이드 별첨)

- 대시보드 Signing Keys 탭에서 legacy 키가 `previously_used`(롤백 가능)인지 `revoked`(롤백 불능)인지 실측 후 진행. 순차 가이드는 세션 로그/핸드오프 참조.

---

## 설계 (2차 리뷰 반영, 1차 설계 수정)

### 인증 모듈화 (클린 아키텍처)

1차 설계("미들웨어↔서버가 `resolveAuthContext` 공유 + `x-lms-auth` 헤더 전파")는 런타임 경계에서 깨져 폐기. 수정:

- **`authorize(context, requirement): boolean`** — domain, 순수함수(DB/네트워크 0). 미들웨어(Edge)와 서버(Node) **양쪽 공유**. 흩어진 `assert*` 판정 로직 수렴.
- **`resolveAuthContext`는 2벌** (공유 X): `resolveAuthContextEdge`(anon+getClaims, 미들웨어 전용, 얇음) + `resolveAuthContextNode`(service_role+getLmsUser, 서버 전용, 전체 membership). 공유되는 건 `authorize()` + `AuthContext` **타입**뿐.
- **service_role을 Edge 미들웨어 번들에 반입 금지** (§7 Edge 금지 + 보안). vitest로 "middleware import 그래프에 `infrastructure/supabase/server.ts` 없음" 정적 검사 (재발 방지).
- **`x-lms-auth` 헤더 전파 폐기.** request-scope 중복은 이미 `cache()`가 잡고, cross-request는 헤더가 못 잡으며 miss 경로(서버액션/route handler/prefetch)에서 이중 비용. 대신: 미들웨어 DB 왕복 축소는 **Custom Access Token Hook으로 membership 요약을 JWT claim에 굽는 방식** 검토(단 claim에 PII 금지, stale는 mutation의 DB-fresh 가드로 방어).
- **`assert*` 파사드 시그니처 보존** (56곳/27파일 무수정). 내부만 `authorize()` 위임. 단 `LmsUser` 반환의 PII 식별자(studentId 등)는 여전히 profile 1-read 필요 → 판정만 빨라지고 profile read는 유지 (Strangler 부분 보존).

### 인증 최종 방어선 불변 (§7.4)

- **mutation server action의 `assert*` 1차 가드 절대 유지.** getClaims/헤더로 대체 금지 (2026-06-09 viewer 사고 재현 방지).
- 미들웨어 판정은 "path 진입 1차 필터", 실제 데이터 접근은 서버 실시간 DB 가드 + RLS. getClaims는 미들웨어 auth 왕복만 로컬화.
- **미들웨어 진입 시 inbound `x-admin-role`(및 신규 인증 헤더) 명시적 strip 후 재set** (스푸핑 방어, 1차 Sage 미반영분).

---

## Phase 계획

### Phase 0 — 무위험 즉효 (인증 로직 무변경)
- **D: Signing Keys 상태 실측** (노아). GO의 절대 선행.
- Speed Insights + Vercel Observability 설치 → **baseline 측정** (측정 없이 다음 단계 금지).
- 함수 + 미들웨어 **리전 icn1 핀** (최대 레버). 미들웨어 런타임 Edge/Node **실측 + 명시**(현재 runtime export 없음 = 암묵).
- `LoadingOverlay` non-blocking skeleton 전환(dim/blur/spinner 제거 → i18n 로딩카피 문제 동시 해결) + instructor `loading.tsx` + 리스트 stagger.
- bare 경로 404 fix(`/admin`→`/admin/dashboard`, `/student`→`/student/dashboard` redirect) + `not-found.tsx`.

### Phase 1 — 인증 중복 제거 + 코워크 정산 (2기 전)
- `authorize()` 순수 + `resolveAuthContext` 2벌 도입 (Strangler, dead code부터). 미들웨어↔레이아웃 DB 중복 제거.
- **코워크 viewer 마스킹(A)**: `mask:true` + `maskName` + CSV viewer 차단. + 커미션 집계 표기(B, 원 단위).
- vitest 세팅 + characterization(인증 판정 매트릭스 before/after diff 0) + 위조토큰 거부 유닛 + viewer 마스킹 회귀.
- 게이트: Sophia 설계 + Sage + Mira + 노아 승인.

### Phase 2 — getClaims + JWT 마이그레이션 (C, 안전 시퀀스)
1. `@supabase/ssr` 최신(≥0.8.0 권장) + supabase-js 세트 업그레이드. 프리뷰에서 getClaims 로컬검증이 실제 왕복 없이 도는지 계측.
2. 미들웨어/서버 `getUser`→`getClaims` 치환 + 미들웨어 순차 DB 병렬/RPC 축소.
3. **코드 rolling 배포** (아직 HS256 in_use, getClaims는 무해 폴백).
4. **트래픽 최저 + 2기 모집 D-7 밖** 창에서 ES256 `in_use` 승격. legacy는 `previously_used` 유지(롤백 라인).
5. rotate 직후 **RLS 스모크 테스트**(authenticated insert/select, 42501 확인 — Supabase#45812 대비).
6. 24~48h 관측 정상 → **legacy secret revoke** (= 롤백 불능 확정, access-token-TTL+15분 후).
7. TTL 단축은 여기서부터만. 2기 모집 주간엔 금지.

---

## 리스크 레지스터 (2회 리뷰 종합)

| ID | 리스크 | 심각도 | 완화 |
|---|---|---|---|
| R1 | legacy HS256 시크릿 유출 시 service_role 위조 → RLS 우회 | CRITICAL | env 교체 → legacy revoke → PGRST301 probe 확인 (순서 엄수) |
| R2 | JWKS legacy 상태 불명(이미 revoked면 롤백 불능) | CRITICAL | D 실측 선행. previously_used면 롤백 가능 |
| R3 | 코워크 개별 PII 제공 (마스킹 전) | CRITICAL | A: 이름/전화/이메일 마스킹 + CSV 차단 + 약관 조항 권고 |
| R4 | resolveAuthContext 공유가 service_role을 Edge에 반입 | CRITICAL | authorize()만 공유, resolve 2벌, import 정적검사 |
| R5 | getClaims revocation 지연(로그아웃/강등 ~20분 stale) | HIGH | mutation은 DB-fresh 가드 유지, 민감 라우트는 getUser 병행, TTL 단축 |
| R6 | RLS 42501 (rotate 직후, Supabase#45812) | HIGH | rotate 직후 RLS 스모크 + 저트래픽 시간대 |
| R7 | JWT 마이그레이션 × 2기 트래픽 겹침 | HIGH | 키 승격은 2기 D-7 밖 + 관측 필수 |
| R8 | 커미션 base 정의 분쟁 | HIGH | B 확정(환불자 제외), 원 단위 명시, 집계 스냅샷 |
| R9 | 미들웨어 헤더 스푸핑 | HIGH | inbound strip 후 재set |
| R10 | 성능 리팩터가 접근제어 약화 | HIGH | characterization diff 0 + Sage/Mira 게이트 |

---

## 배포 게이트 (§7.4 + 이번 추가)
1. Sage 통과 (인증/PII/세션 표면) — 결과 받은 후 push
2. Mira: 인증 매트릭스 diff 0 + 위조토큰 거부 + viewer 마스킹 회귀 + RLS 격리
3. typecheck + build
4. 카피 부호
5. 마이그레이션이면 supabase-verify
6. (Phase 2) legacy revoke 전 baseline 관측 + RLS 스모크 PASS

---

## 3차 리뷰 발견 (2026-07-29, 팀 전원 adversarial)

### 🔴 라이브 프로덕션 버그 (이 리팩터와 무관, 즉시 수정 대상)

- **P-1 [CRITICAL] `certificates.verify_token` 컬럼이 prod DB에 없음.** 마이그레이션 `20260719000000_certificates_verify_token.sql`이 `supabase db push` 안 됨(실측: `column does not exist`, certificates row=0). 커밋 `3cc6914`의 발급/조회 코드(issue-certificate.ts:129, certificate-repository.ts:78,108, verify-certificate.ts, build-certificate-data.ts:230)가 이 컬럼을 INSERT/SELECT → **수료증 일괄 발급 실행 시 즉시 500.** §7.4 배포 게이트 5(마이그레이션 supabase-verify)가 그 커밋에서 누락. → `supabase db push` + verify 필요.
- **P-2 [CRITICAL] 출석률 분모 4중 분기 → 같은 학생이 화면마다 다른 출석률.** `hasSessionElapsed`(ends_at<now) fix가 cert(`build-certificate-data.ts`) + 학생뷰(`fetch-student-sessions-view.ts`)에만 적용됨. 미통일: `fetch-cohort-overview.ts:115,121`(admin cohort 카드 = `status==="ended"` only → **0% 오표시**), `fetch-cohort-roster.ts:108`(로스터 = `sessions.length` 전체회차), `attendance.ts:71`(원본). lesson 2026-07-23이 roster 불일치를 인지했으나 방치. → `getElapsedSessionIds()` 공용 헬퍼로 3곳 수렴.
- **P-3 [HIGH] 로그인 목적지 instructor 케이스 발산.** `middleware.ts:520` → `/instructor/dashboard`(미구현 → 404), `post-login-redirect.ts:83` → `/student/dashboard`(하드코딩). 같은 판정 2벌, instructor에서 결론 다름. → authorize() 공유 통일 (설계에 이미 방향 있음).
- **P-4 [CRITICAL] `/admin/applicants` viewer: CSV 버튼 무게이트 + 마스킹 0% 구현.** `page.tsx:22` `mask:false` 하드코딩, `applicants-dashboard.tsx:768` CSV 버튼에 `!readOnly` 없음. Decision A가 **전면 미구현**. (viewer는 7/19 cutoff로 현재 비활성 → 재개통 전 필수 수정.)

### Decision A 정밀화 (마스킹만으론 부족 — 실측)

- **마스킹 대상 확장**: name/email/phone + **`depositor_name_observed`(입금자명 = 신청자 실명, "Martina Rampoldi" 실측)** + `university`. 이름 가려도 입금자명에 실명 그대로 남음(마스킹 무력화). university+nationality+visa 조합 = 1기 10명 규모에서 25/29 유일 → 재식별 가능(k-익명성 붕괴).
- 마스킹은 **반드시 server/repository 단(page 진입 전)**. display-time(컴포넌트) 마스킹 금지 — 정렬/검색이 원문 기준으로 남아 누출(`applicants-dashboard.tsx:252-264`).
- **admin(super) 뷰는 `mask:false` 불변** (회귀 테스트로 잠금, §7.4 기존 어드민 동작 보호).
- **1기 기존 신청자 제공 근거 = 법무 확인 필수** (개인정보처리방침 위탁/제3자에 DEEPI/코워크 없음, CLAUDE.md §8과 충돌). 근거 없으면 마스킹 완성 전 viewer 잠금. 대안: 개별행 대신 **집계(status별 카운트)만** 제공하면 재식별·약관 문제 동시 소멸.

### Decision B 정밀화 (커미션 공식 재정의)

- **base = `SUM(paid_amount_krw) where status ∈ {paid, enrolled}` × 12%.** "인원 × 단가" 공식 폐기 — 2기 다중 가격(단과 800,000 / 올인원 1,360,000, ADR 0014)에서 틀린 값. 소스는 `cohort-revenue.ts:52` `paid_count`/매출 재사용(신규 쿼리 X).
- ADR 표기 정정: 1기 커미션 = **공급가 960,000원 + VAT 96,000원 = 송금 총액 1,056,000원** (seed `cohort_expenses` 실측과 일치). "커미션 = 1,056,000"은 부정확.
- **12%는 1기 근거, 2기 재협상 여지**(ADR 0014 R6) → 하드코딩 말고 cohort별 설정값 검토.
- 부분환불/중도합류(`next_cohort_interest`) 커미션 귀속 룰 미정 → 이번 스코프(1기 정산)에선 명시적 배제.

### 클린 아키텍처 부채 (Sophia — Phase 1 스코프에 영향)

- **[C1] authorize() 추출이 ADR 견적보다 큼**: 판정 로직이 domain 아닌 `infrastructure/auth/lms-role.ts`(684줄)에서 DB I/O와 융합(15+ 함수). 순수 추출이 선결 대공사.
- **[C2/C3] growth-career 프로그램 경계 붕괴**: `growth-career/application/queries/showcase/*`(5)가 presentation DTO를 import(의존역전) + `fan-to-pro/infrastructure`를 직접 파먹음. 2번째 프로그램 붙이면 폭발 → 공유 대상(`cn`, `getSupabaseServer`, showcase repository/DTO)을 **`src/shared/`로 승격** 필요.
- **[C4/C5/C6] Strangler 절반**: 30+ page가 application 우회해 repository 직접 호출, `student/layout.tsx:37-52`가 raw `.from()`, server action이 `interface/server-actions/`(8) vs `application/**`(46) 두 집 분열(application이 next/cache 결합).
- **[C7] 판정 규칙 이원화**: `resolveLoggedInDestination`(middleware) vs `resolvePostLoginRedirect`(post-login) 복붙 → P-3 발산의 근인.
- **[C8] Custom Access Token Hook 경계**: claim엔 `is_super_admin` + `program_ids[]` coarse 축만. cohort membership은 굽지 말 것(신규 등록 20분 stale + 멀티프로그램 God function).

### ADR 갭

- **성공 메트릭 수치 부재** → Phase 0 baseline 측정 **직후** 합격선(LMS p75 TTFB, 미들웨어 DB 왕복 횟수)을 ADR에 수치로 박기. 없으면 Phase 2 revoke(롤백 불능)를 이득 불명인 채 감수.
- **Phase 0→1 게이트 승격**: "baseline 측정 없이 Phase 1 착수 금지"를 배포 게이트에 1줄 추가.
- **Phase 2 키 승격 목표일을 2기 모집 캘린더에 못박기** (안 되면 결정 C 실질 무효).
- **verify 백필 토큰 random 확인** + verify 라우트 rate limit(Vercel WAF) — 발급 시작 전.
- **STORAGE_BUCKETS 상수(signed-url.ts)가 실제 버킷명과 불일치** (dead constant 정리).

---

### 노아 결정 확정 (2026-07-29, 2차)

- **D1 확정 — 개별행 마스킹** (집계 아님). 코워크가 추후 공개(unmask)를 요청할 수 있으므로 개별 행 구조 유지하되 PII 마스킹. 마스킹 필드 = `name` + `email` + `phone` + `depositor_name_observed`(입금자명) + `university`. 그 외(nationality/visa/status/금액)는 노출. viewer만 `mask:true`, admin/super는 `mask:false` 불변. CSV 버튼 viewer 차단. 마스킹은 server/repository 단(page 진입 전).
- **D3 확정 — 코워크 = 1기 홍보 전속 파트너.** 코워크에 마스킹된 신청 현황 제공의 근거 = 전속 마케팅 파트너십. DEEPI 는 별개 역할(강사 수급 + 커리큘럼 교정) → DEEPI 파트너십이 오히려 핵심. 개인정보처리방침 위탁/제3자 조항에 "마케팅 전속 파트너(코워크)에 마스킹된 신청 현황 제공"을 반영 필요(문안 = D4, 법무 확인 권고). 이 결정으로 viewer 잠금 불필요.
- **D5 확정 — 커미션 = SUM(paid_amount_krw where status∈{paid,enrolled}) × 12%.** 1기 = 결제 총액 **8,800,000원 × 12% = 1,056,000원** (10명 × 880,000원). "인원 × 단가" 공식 폐기, 결제 총액 기준. 소스 = `cohort-revenue` 매출 합계 재사용.

## Open — 노아 결정 필요 (3차 종합, D1~D9 + 실측)

| # | 결정 | 상태 |
|---|---|---|
| D1 | 마스킹 필드 (name/email/phone/입금자명/university) | ✅ 확정 (개별행 마스킹) |
| D2 | 입금자명 처리 | ✅ 확정 (마스킹 대상 포함) |
| D3 | 코워크 제공 근거 | ✅ 확정 (전속 홍보 파트너) |
| D4 | 약관 조항 문안 + 삽입 시점 | ⏳ 법무 (2기 폼 동기화) |
| D5 | 커미션 = SUM(paid)×12% | ✅ 확정 (8,800,000×12%=1,056,000) |
| D6 | 12% 기수별 확정성 (상수 vs cohort 설정값) | ⏳ open |
| D7 | 부분환불/중도합류 룰 | ⏳ 이번 스코프 밖(1기 정산만) |
| D8 | Phase 2 키 승격일 = 2기 캘린더 | ⏳ open |
| D9 | 성능 목표선 수치 (Phase 0 baseline 직후) | ⏳ open |
| D-key | Signing Keys 상태 실측 | ✅ 완료 (2026-07-29): ES256 비대칭 활성 → getClaims 로컬검증 가능. 레거시 HS256 secret 은 **노아 결정으로 유지(revoke 안 함, risk accepted)**. getClaims 성능은 레거시 유지와 무관하게 동작. |
| D-hook | Custom Access Token Hook (coarse claim만) | ⏳ open |
| D-rt | 미들웨어 런타임 Edge vs Node 확정 | ⏳ open |

**팀 반영(노아 결정 불요)**: P-1~P-4 즉시 수정, 출석률 헬퍼 수렴, revoke 게이트 체크 통일, Mira 매트릭스에 student/instructor + 신규 read query authz 전수 포함, ADR 번호 0014 중복 정리.

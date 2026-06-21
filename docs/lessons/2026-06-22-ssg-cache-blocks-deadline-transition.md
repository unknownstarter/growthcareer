# SSG 정적 빌드 캐시로 마감 자동 전환 누락

**날짜**: 2026-06-22 (자정 직후)
**관련 commit**: `69cbd7b` (hotfix), `1b1328e` ~ `cd0405a` (B0039)
**관련 PR**: 없음 (main 직접 push)
**참여**: 사용자 (현장 발견), 메인 어시스턴트

## 무슨 일이 있었나

1기 모집 마감 (2026-06-22 00:00 KST) 자동 전환을 위해 B0039 작업:
- `isEnrollmentClosed()` helper + `ENROLLMENT_CAP.cutoffAt = "2026-06-22T00:00:00+09:00"` 박음
- Hero / Pricing / StickyCTA / ApplyForm 4 surface 에 conditional rendering
- 자정 직전 모든 코드 commit + push 완료

자정 직후 사용자가 사이트 새로고침 — **여전히 880,000원 / "지금 신청 →" 노출**. 자동 전환 안 됨.

## 왜 일어났나

**Next.js App Router 기본 동작**: `/[locale]/fan-to-pro/page.tsx` 는 `generateStaticParams` 가 명시되어 SSG (Static Site Generation) 으로 처리.

빌드 시점 (자정 전, isEnrollmentClosed=false) 의 HTML 이 정적으로 박혀 Vercel CDN 에 캐시. 자정 지나도 새 build 가 trigger 안 되어 **이전 HTML 그대로 서빙**.

`isEnrollmentClosed()` 가 server-side 에서 평가되지만, SSG = 빌드 시점에 평가. request 시점이 아님.

### 보조 요인

1. **클라이언트 StickyCTA** 는 `useState(() => isEnrollmentClosed())` lazy init 으로 hydration 시 재평가 — 하지만 server 가 closed=false 로 렌더한 HTML 과 client closed=true 가 충돌 → React hydration mismatch → 종종 server 결과 채택 (브라우저별 다름).

2. **commit cadence**: B0039 commit 들이 자정 전에 push 되었기 때문에 **build 도 자정 전** 에 일어났음. build runner 의 "now" = 자정 전 → isEnrollmentClosed=false.

3. **CDN 캐시 TTL** — Vercel 의 정적 페이지 CDN 캐시 만료 시점까지 그대로 서빙.

## 어떻게 막을까

### 즉시 fix (적용 완료)

`app/[locale]/fan-to-pro/page.tsx` 에 `export const dynamic = "force-dynamic"` 추가 (commit `69cbd7b`).

→ 매 request 마다 server-render. `isEnrollmentClosed()` 가 request 시점에 평가됨. SSG / CDN 캐시 회피.

### 룰 박제

`CLAUDE.md` 의 `§7 Vercel Defaults` 또는 새 섹션에 추가:

> **시간 기반 자동 전환 (cutoff datetime / enrollment toggle 등) 이 있는 페이지는 `dynamic = "force-dynamic"` 또는 `revalidate = 60` 필수**. SSG = 빌드 시점에 값이 박혀 자동 전환이 동작하지 않는다. 다음 기수 모집 / 마감 / promo period 자동 전환 등 모두 해당.

### 패턴 박제

다음 시나리오 모두 SSG 회피 의무:
- 모집 마감 / 시작 cutoff
- promo / discount 기간 (예: D-7 ~ D-1 가격 변경)
- 강의 시작 후 신청 거절
- limited time announcement banner
- 카운트다운 / 잔여 인원 표시

### 대안 패턴 (검토)

- `revalidate = 60` — ISR 1분 캐시. SEO 친화적이지만 fresh 도 1분 지연 가능.
- middleware redirect 기반 — 마감 후 다른 페이지로 redirect. 무거움.
- 클라이언트 only 분기 — hydration mismatch 위험. 권장 X.

### 사고 박제 위치

- `CLAUDE.md §7` 시간 기반 페이지 룰 추가 (역반영)
- `docs/playbook/02-build-tracks/website.md` 의 "마감 후 자동 전환 (B0039)" 섹션에 SSG 함정 명시 (완료)
- 메모리: `feedback_ssg_cache_blocks_time_based_transitions`

## 재발 방지 체크

신규 페이지가 시간 기반 자동 전환을 가지면:
- [ ] `export const dynamic = "force-dynamic"` 추가
- [ ] 또는 `export const revalidate = 60`
- [ ] 마감 시각 직전/직후 양쪽 다 수동 검증

배포 직후 자동 전환 동작 검증:
- [ ] 마감 시각 직전 한 번 / 직후 한 번 새로고침
- [ ] curl 또는 headless 브라우저로 HTML response 확인 (build 시점 박힌 값 vs 현재 값)

## 메타

사용자 발견 → 어시스턴트 hotfix → 8분 만에 push (commit `cd0405a` → `69cbd7b`).
B0039 작업 자체는 자정 정확히 30분 전부터 시작했는데, SSG cache 함정을 미리 인지하지 못했음.

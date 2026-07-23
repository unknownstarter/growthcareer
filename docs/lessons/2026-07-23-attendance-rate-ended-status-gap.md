# 2026-07-23 · 출석률이 전원 0% (수료증 발급 차단)

## 무슨 일이 있었나

1기 수료식(7/25) 직전, admin 학생 상세 페이지에서 **모든 1기 수강생의 수료증 배지가 "출석률 미달 0%"** 로 표시됐다. 실제로는 10명 전원 8회차 100% 출석(attendance 80행 전부 `present`)이었다. 출석률이 0%로 계산되면 `evaluateCompletionEligibility` 의 `attendance_below_threshold` (< 0.75) 에 걸려 수료증 발급이 차단된다.

## 왜 일어났나

출석률 계산이 **분모를 `sessions.status === "ended"` 회차 수로 셌다.** 그런데:

- session 상태 머신 = `scheduled → in_progress → ended`. "ended" 는 운영자가 명시적으로 전환해야 하는 terminal 상태.
- **운영 현실**: 1기 운영 중 운영자는 세션 lifecycle 전환을 전혀 쓰지 않았다. 출석만 직접 mark 함. 종강(7/19) 4일 후에도 8회차 전부 `status = "scheduled"` (in_progress 조차 안 거침).
- 결과: `computeAttendanceRate` 의 `endedIds.size === 0` → `null` 반환 → 배지에서 `attendanceRate ?? 0` → **0%**.

즉 attendance 데이터는 완벽했고, 출석률 로직이 **운영자가 안 쓰는 수동 상태 전환에 의존**한 게 근본 원인. 같은 버그가 `fetch-student-sessions-view` 에도 있었다 (학생 본인 뷰). 반면 `fetch-cohort-roster` 는 분모가 `sessions.length` 라 우연히 정상이었다 (코드베이스 내 분모 기준 불일치).

## 어떻게 막을까

**출석률 분모 = "이미 진행된 회차" 를 물리적 시각(`ends_at < now`) 으로 판정.** 수동 status 전환에 의존하지 않는다.

- 신규 도메인 헬퍼 `hasSessionElapsed(session, now)` (`domain/entities/session.ts`): cancelled 제외, ended 포함, 그 외 `ends_at < now` 면 포함.
- `computeAttendanceRate` (`application/certificate/build-certificate-data.ts`) + `fetch-student-sessions-view` 둘 다 이 헬퍼로 통일.
- 검증: 실 데이터 시뮬레이션에서 10명 전원 8/8 = 100% 확인 (`tools/diagnose-attendance.mjs`).

### 룰 역반영 (CLAUDE.md)

- **§7.4 배포 전 5종 체크에 항목 추가**: "시각/상태 기반 집계(출석률·진도·정산 등)는 운영자 수동 상태 전환에 의존하지 말 것. 물리적 시각(`ends_at < now`) 또는 실 데이터로 판정." (아래 인덱스 반영)
- 재발 방지 핵심 = "운영자가 안 쓰는 lifecycle 단계를 집계의 전제로 삼지 않기".

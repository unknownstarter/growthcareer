# Program Operations Playbook

> Fan to Pro 1기 (2026-04 ~ 2026-07) 의 기획·빌드·마케팅·운영 전 과정을 박제.
> 다음 기수 운영 시 참고 자산 + 자동화 후보 + 기능 개발 후보 추출 기반.
>
> **Owner**: Aria (PM) · 협업: Echo (research) · Sage (security) · Iris/Luna (build) · Vera (deploy) · Mira (QA)
>
> **만든 시점**: 2026-06-22 (1기 모집 마감 직후) · **유지 주기**: 큰 단락마다 / 사고 발생 시 / 다음 기수 모집 전 전수 점검

---

## 왜 만들었나

1기는 사람이 직접 채워서 굴렸다. 다음 기수는 같은 일을 반복하지 않게 자동화하거나 도구화해야 한다. 그러려면 먼저 *무엇을 했는지* 정확히 알아야 한다.

이 폴더의 목표:
1. **재현성** — 다음 기수 운영자(노아 본인 또는 위임)가 같은 흐름을 빠르게 복원
2. **자동화 후보 발굴** — 반복된 수동 작업 식별 → `08-automation-candidates.md` 로 정리
3. **기능 개발 후보 발굴** — 운영 중 손으로 메웠던 빈틈 식별 → `09-feature-candidates.md` 로 정리
4. **시계열 회고** — 무엇이 언제 일어났고 어떻게 풀었는지 (`07-timeline.md`)
5. **다음 기수 사전 체크리스트** — `10-next-cohort-checklist.md`

---

## 구조

| 파일 | 무엇 |
|---|---|
| `01-overview.md` | 우산 브랜드 / 운영 주체 / 트랙 정의 / 1기 vs 다음 기수 |
| `02-build-tracks/` | 빌드 트랙별 — `website.md` (마케팅 사이트) / `admin.md` (Basic Auth 어드민) / `lms.md` (Supabase Auth LMS) |
| `03-recruitment-operations.md` | 1기 모집 운영 (신청-입금-인원 확정-후속) |
| `04-marketing.md` | 채널 / 캠페인 / 콘텐츠 시스템 / Cowork 파트너십 |
| `05-class-operations.md` | 강의 운영 (6/27 시작 후 채울 부분) |
| `06-finance-tax.md` | 정산 / 세무 / 회계 처리 |
| **`07-timeline.md`** | **시계열 이벤트 + 인사이트 + 해결 내용** ⭐ |
| `08-automation-candidates.md` | 자동화 후보 (정리/추출) |
| `09-feature-candidates.md` | 기능 개발 후보 (정리/추출) |
| `10-next-cohort-checklist.md` | 다음 기수 운영 전 점검 리스트 |
| `11-tax-invoicing-howto.md` | 세금계산서 / 원천징수 / 현금영수증 운영 매뉴얼 (강사료 / Cowork / 강의장 / 학생) |

`02-build-tracks/` 는 폴더, 나머지는 단일 파일.

---

## 유지 룰

1. **사건 발생 시점에 timeline 추가** — `07-timeline.md` 의 최상단에 추가. 사건 / 결정 / 인사이트 / 해결 내용 4축.
2. **반복 발견 시 automation/feature 후보로 승격** — 같은 수동 작업 3회 이상 → 후보. 같은 빈틈 3회 이상 → 후보.
3. **다음 기수 시작 시 전수 검토** — 모든 파일 1회 훑고 변경사항 반영. 변경 끝나면 새 cohort 섹션 (예: "Cohort 2 변경분") 추가.
4. **세션 핸드오프와 동기화** — `WORKING-SESSION.md` 와 본 playbook 은 **다른 layer**. WORKING-SESSION = 단기 in-progress 상태 / playbook = 장기 운영 자산.
5. **사고는 lessons + playbook 양쪽 박제** — `docs/lessons/` 의 short RCA + 본 playbook 의 timeline 항목 (참조 링크).

---

## 다음 기수 전 액션 (요약)

`10-next-cohort-checklist.md` 가 정식. 여기는 간단 mental model:

1. 본 README 읽기 → 구조 파악
2. `07-timeline.md` 1기 회고 → 무엇이 어려웠는지 환기
3. `08-automation-candidates.md` 검토 → 이번 기수 자동화 우선순위 결정
4. `09-feature-candidates.md` 검토 → 이번 기수 개발 우선순위 결정
5. `10-next-cohort-checklist.md` 따라 사전 준비 시작

---

## 관련 자산

- `CLAUDE.md` — 운영 매뉴얼 + 절대 룰
- `WORKING-SESSION.md` — 현재 세션 상태 (단기)
- `docs/tasks/BACKLOG.md` — Now/Next/Later/Done 백로그
- `docs/decisions/` — ADR (Architecture Decision Records)
- `docs/lessons/` — 사고 RCA
- `docs/specs/` — 큰 feature 스펙
- `docs/research/` — 외부 리서치 노트
- `docs/sessions/` — 세션 스냅샷 아카이브
- `docs/contracts/` — 강사 / 협력사 계약서

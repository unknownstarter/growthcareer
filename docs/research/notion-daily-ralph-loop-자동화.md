# 노션 기반 매일 아침 자동 ralph 루프 / 아키텍처 검토

**상태**: 리서치 (결정 X, 구현 X)
**작성일**: 2026-06-17
**작성자**: 노아 + Claude 리서치 세션
**태그**: 자동화, 비동기 에이전트, 노션 연동, Claude Agent SDK, ralph 루프

---

## 목표

매일 아침 8시 (KST) 에 노아가 노션에 작성해둔 티켓을 자동으로 확인하고, 각 티켓에 대해 9명 에이전트 팀이 표준 12단계 워크플로우 (CLAUDE.md §2) 를 ralph 루프 형태로 실행하는 것.

ralph 루프 단계:

1. 리서치
2. 문제 정의
3. 가설 수립
4. 해결책 설계
5. 구현
6. 자체 테스트
7. 결과 분석 + 개선안
8. 배포 (안전 룰 통과 시)
9. 사고 발생 시 RCA
10. 완료 후 문서 정리

트리거는 매일 (또는 평일) 08:00 KST cron. **노아 랩탑은 닫혀 있어도 자동 실행돼야 함**.

---

## 지금 상태

지금 노아가 쓰는 Claude Code 는 **로컬 랩탑의 Node.js 프로세스**. 랩탑 닫으면 프로세스 슬립 + macOS 가 백그라운드 작업 정지 → 작업 중단됨. 즉 **현재 환경으로는 매일 자동 배치 불가능**. 진짜 매일 자동 루프를 돌리려면 **실행 자체를 클라우드로 옮겨야** 함.

---

## 아키텍처 옵션 4가지

| 옵션 | 어디서 도나 | 노션 연동 | ralph 루프 지원 | 초기 작업 | 운영 비용 |
|---|---|---|---|---|---|
| **A. Claude Code RemoteTrigger** | claude.ai 클라우드 (관리형) | 노션 MCP 또는 직접 REST | 단일 turn 제한, 복잡 루프 어려움 | 가장 적음 (~반나절) | Claude 사용량 |
| **B. GitHub Actions + Claude Agent SDK** | GitHub Actions 러너 | 노션 REST API | 멀티 turn agentic workflow 완전 지원 | 중간 (~1~2일) | Actions 분 + Anthropic API |
| **C. Vercel Cron + Vercel Function** | Vercel (Fluid Compute) | 노션 REST API | 함수 timeout (~300초) 제한 | 중간 (~1일) | Vercel + Anthropic API |
| **D. Claude Agent SDK + 자체 호스팅** | Railway / Fly.io / VPS | 노션 REST API | 가장 유연, 길게 도는 거 OK, stateful | 가장 많음 (~3~5일) | 호스팅 + API |

---

## 추천: 옵션 B

**GitHub Actions + Claude Agent SDK** 가 이 프로젝트 흐름에 가장 잘 맞아.

이유:

1. 이미 GitHub repo + Vercel auto deploy 흐름 정착돼 있어서 자연스럽게 끼임. 새 플랫폼 X.
2. GitHub Actions Pro 러너는 한 작업당 최대 6시간이라 ralph 루프가 1~2시간 걸려도 충분히 여유.
3. Actions 안에서 `git push` 하면 그대로 main 으로 들어가고 Vercel 자동 배포 → CLAUDE.md §7 의 "git push 가 default 배포" 룰 그대로 유지.
4. cron 문법 단순. `cron: '0 23 * * *'` = UTC 23:00 = KST 08:00.
5. 시크릿 관리 (Anthropic API key, 노션 API key) 는 GitHub Secrets 로 안전.

옵션 D 가 더 강력하긴 한데 호스팅 환경 하나 더 운영하는 부담. 옵션 A 는 초기 작업 가장 적지만 멀티 turn 루프 돌리기 까다로움. 옵션 C 는 함수 timeout 때문에 ralph 루프 풀 사이클이 안 들어감.

---

## 옵션 B 동작 흐름

```
GitHub Actions cron (매일 08:00 KST)
  │
  ▼
1. 노션 API 로 "오늘 처리할 티켓" 조회 (status = "ready")
  │
  ▼
2. 각 티켓별로 Claude Agent SDK 세션 시작
     - 시스템 prompt: 12단계 워크플로우 (CLAUDE.md §2)
     - context: 티켓 제목, 본문, 첨부
     - tool: Read / Write / Edit / Bash / 노션 API / Git
  │
  ▼
3. 에이전트 세션 안에서 ralph 루프 실행
     리서치 → 문제 정의 → 가설 → 설계 → 구현 → 자체 테스트 → 리뷰 → 배포
     (각 단계마다 노션 티켓에 진행 코멘트 update)
  │
  ▼
4. 완료 시
     - git commit + push (Vercel auto deploy trigger)
     - 노션 티켓 status = "done"
     - 노아한테 Slack / 메일 / 노션 mention 으로 알림
  │
  ▼
5. 실패 / 안전 룰 trip (Sage critical, typecheck fail 등)
     - push 안 함
     - 티켓 상태 "needs-human" 으로 두고 RCA 코멘트
     - 노아한테 알림
```

---

## 사전 준비 항목

| 항목 | 메모 |
|---|---|
| 노션 API integration | notion.so/my-integrations 에서 새 integration 생성, 데이터베이스 권한 부여, integration token 보관 |
| 노션 데이터베이스 스키마 | 상태 (ready / in-progress / done / needs-human), 우선순위, 본문, 에이전트 결과 컬럼, 코멘트 thread |
| Anthropic API key | 이미 보유 |
| GitHub Secrets | `NOTION_API_KEY`, `NOTION_DB_ID`, `ANTHROPIC_API_KEY` |
| ralph 루프 orchestration 스크립트 | TypeScript 또는 Python, Anthropic SDK + 노션 SDK 사용 |
| 알림 채널 | Slack webhook, 이메일, 또는 노션 @mention (완료 / 실패 시) |

---

## 한계와 위험

1. **API 비용**. 매일 ralph 루프 1회 돌면 토큰 사용량이 꽤 큼. 첫 주에 드라이런 돌려서 비용 측정 필수. 시작부터 비용 상한 + 알림 박아두기.
2. **실패 핸들링**. typecheck 실패, build 실패, Sage critical, merge conflict 등이 발생하면 절대 자동 push 하면 안 됨. "코멘트만 남기고 bail out" 패턴 강제.
3. **PII 노출**. 노션 티켓에 신청자 데이터 (이름 / 이메일 / 전화) 들어가면 Claude 컨텍스트에 그대로 들어감. PIPA 차원에서 에이전트가 읽기 전 마스킹 필요.
4. **프로덕션 안전 룰 (CLAUDE.md §7.4)**. 새 권한 / 인증 / PII 표면 변경하는 commit 은 여전히 Sage 검토 통과 후만 push 가능. 자동 루프가 이런 diff 를 감지하면 자동 push 하지 말고 human 사인업 hold.
5. **동시 편집 충돌**. 노아가 08:00 KST 에 로컬에서 작업 중이면 자동 루프 commit 과 conflict. 간단한 규칙으로 노아는 08:00 KST 에 working branch 새로 시작 안 함, 또는 자동 루프는 평일 노아 오프라인 시간에만.
6. **idle 처리**. "ready" 상태 티켓이 0 개면 토큰 안 태우고 조용히 종료. 로직 단순.
7. **도구 권한**. 에이전트가 Bash + git 권한 필요한데 그게 destructive 명령 실수 가능성. 샌드박스 제약 (read-only 디렉토리, allowlist shell verb) 권장.

---

## 언제 만들지

지금은 아님. 1기 모집이 6/21 마감, 강의가 7/19 까지 진행. **운영 중인 1기와 이 자동화를 동시에 만들면 노아 집중력 분산 + 운영 위험 증가**.

추천 타임라인:

| 단계 | 시점 | 작업량 |
|---|---|---|
| 노션 스키마 디자인 | 1기 종료 후 (~2026-07-22) | 반나절 |
| Proof of concept (티켓 1개, turn 1회) | 2026-07-25 즈음 | 반나절 |
| ralph 루프 orchestration (한 run 안에 12단계 풀 사이클) | 2026-07-28 즈음 | 1일 |
| 드라이런 1주 (dummy 티켓) | 2026-07-29 ~ 2026-08-05 | passive |
| 실전 컷오버 | 2026-08-06 즈음 | 반나절 |
| 첫 한 달 주 회고 | 2026-09 까지 | passive |

---

## 미해결 질문

- 에이전트 루프가 의미 있게 일하려면 Supabase (프로덕션 데이터) 접근이 필요한가? 필요하면 Sage 검토받은 별도 자격 통로 필요, 로컬 `.env.local` 그대로 쓰면 안 됨.
- 첫 한 달은 **프로덕션 영향 없는 작업** (docs / 리서치 / 리팩터) 만 자동 루프로 돌리고, 프로덕션 코드 건드리는 건 human 사인업 강제하는 게 안전하지 않을까?
- 이 자동화 시작할 시점에 팀이 노아 1인 그대로일지, 추가 멤버 합류 예정일지에 따라 노션 스키마에 assignee / reviewer / approver 필드 미리 박을지 결정 필요.
- 알림 채널은 Slack 워크스페이스 운영 시작할 건지, 노션 @mention 만으로 갈 건지.

---

## 참고

- CLAUDE.md §2 (12단계 표준 워크플로우)
- CLAUDE.md §3 (9명 에이전트 로스터)
- CLAUDE.md §7 (Vercel 기본값. git push = 기본 배포)
- CLAUDE.md §7.4 (프로덕션 안전 룰)
- Anthropic Claude Agent SDK 문서
- GitHub Actions cron 문법
- 노션 API 레퍼런스

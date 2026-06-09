# 2026-06-09 — HTTP Basic Auth 의 logout / session timeout 본질적 한계

## 무슨 일이 있었나

코워크 공유 viewer role 신설 후 노아가 admin nav 에 [로그아웃] + 12시간 세션 타임아웃을 요청했다. commit `ce18730` 로 구현:

- middleware 가 `/admin/logout` 진입 시 401 + cookie 삭제 + WWW-Authenticate 헤더
- 12시간 cookie timestamp 검사

노아가 실 환경에서 시험한 결과: **로그아웃 클릭 후 admin 자격으로 자동 재로그인**. logout 효과 0. 화남.

## 왜 일어났나

HTTP Basic Auth 의 본질적 한계 — **브라우저가 자격을 캐시하고 같은 도메인의 모든 요청에 자동 첨부**. 401 + WWW-Authenticate 응답만으로는 캐시가 비워지지 않고, 다음 요청에도 캐시된 자격이 그대로 들어와 middleware 가 통과시킴.

내가 이 한계를 알고 있었다 (commit message 와 보고에 "브라우저별 100% 보장 아님" 명시). 그런데 명시만 하고 **노아가 시험할 때 무엇이 일어날지** 를 미리 다 풀어서 설명 안 했다. 노아는 "로그아웃 = 자격 무효화" 가 당연한 mental model 인데, 내 구현이 그 mental model 을 충족 못 함.

## 해결 패턴 (commit `c12e8cf`)

매번 다른 realm 으로 자격 다이얼로그 강제:

1. `/admin/logout` → 302 redirect to `/admin/applicants` + logged-out marker cookie (1분) set
2. 다음 요청 (`/admin/applicants`) → middleware 가 marker cookie 보고 **`growthcareer-admin-<random>` realm 으로 401**
3. 브라우저는 같은 realm 자격만 자동 첨부 → 새 realm 이라 새 자격 다이얼로그
4. 자격 입력 → marker cookie 삭제 + 정상 통과

다만 일부 브라우저 (특히 Safari) 는 realm 무시하고 자격 자동 첨부할 수 있어서 100% 는 아님.

## 어떻게 막을까

1. **인증 관련 기능을 새로 구현할 때는 사용자 mental model 을 미리 명시화**. "버튼 누르면 자격 무효화돼" 같은 기대치를 그대로 보장 못 하면 구현 전에 한계 알려주고 대안 (cookie-based session 으로 전환) 옵션 제시
2. **Basic Auth 의 한계 5종 박제**:
   - "로그아웃" 은 본질적으로 트릭 (realm rotation / fake creds / new tab 강제)
   - "세션 타임아웃" 은 별도 cookie timestamp 로만 구현 가능
   - 자격 캐시 invalidate 는 브라우저별 차이 있음
   - 자격에 `:` 있어도 `indexOf` split 으로 안전
   - admin/viewer 분리는 같은 realm 이면 자격 한 번 입력 후 자동 첨부 — 분리하려면 realm 다르게 또는 cookie session
3. **다음 본격 운영자 인증 필요 시점에 NextAuth / Clerk 등 session-based 로 전환 고려** (B0029 backlog 후보)

## 관련 박제

- memory: `feedback_basic_auth_limitations.md`
- BACKLOG: B0029 (운영자 인증 session-based 로 전환)

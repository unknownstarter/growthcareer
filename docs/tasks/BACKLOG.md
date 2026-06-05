# Backlog

> Owner: Aria · Last reviewed: 2026-06-04
>
> 운영 매뉴얼: [docs/decisions/0002-backlog-and-spec-system.md](../decisions/0002-backlog-and-spec-system.md)
>
> **4섹션**: Now (이번 주) / Next (이번 달) / Later (보류·장기) / Raw (T1 dump · 미분류)
> **상태**: raw → specced → approved → in-progress → done · 추가: dropped (안 하기로 결정), deferred (보류)
> **ID 규칙**: B0001, B0002… (단조증가, dropped 도 ID 회수 안 함)
> **링크**: `→ specs/<slug>.md` (T2 spec 본문)

---

## Now  (이번 주)

- **B0005** · 1기 일정 확정 + 강사진 공식 통지 + 사이트 일정 업데이트 · status: **done** · 2026-06-04 완료
  - 신청 마감 **6/21(일) 자정** · 첫 강의 **6/27(토)** · 종강 **7/19(일)** · 수료식+네트워킹 **7/25(토)**
  - ✅ 사이트 코드 업데이트 — `program.ts` SCHEDULE/ENROLLMENT_CAP · `faq.ts` 환불 약관
  - ✅ 코워크 배너 HTML + 10개 SVG + 10개 PNG 재생성 (마감일 6/21 반영)
  - ✅ 강사 계약서 `docs/contracts/instructor-agreement.md` 정정 — 제3조 강의 일정 / 제6조 모집 마감 / 별첨 1 회차 표 + 수료식 7/25 추가
  - ✅ 강사진 8명 재통보 완료 (사용자 수동)
  - 출처: [2026-06-04 코워크 미팅 §13](../research/cowork-partnership-tracking.md)

- **B0006** · 사이트 영문 디폴트화 + 잘 보이는 위치 언어 토글 · status: **done** · 2026-06-04 완료
  - 디폴트 locale `en`, 한국어는 `ko` 라우트
  - **헤더 first-fold (우상단 또는 네비)** 에 언어 전환 UI 노출 — 풋터 숨김 금지
  - 카드뉴스/FAQ/약관 다국어 카피 수급 필요 (B0009·B0010 와 연동)
  - i18n 라이브러리 선택 (next-intl 우선 검토)
  - 출처: 2026-06-04 코워크 미팅 §13 — 타겟 = 한국 거주 외국인

- **B0007** · 신청-입금 분리 플로우 + 반자동 입금 안내 · status: **specced** · 2026-06-04 specced (rev 2 반자동 전환)
  - Spec: [`docs/specs/B0007-payment-flow-split.md`](../specs/B0007-payment-flow-split.md)
  - ADR: [`docs/decisions/0003-payment-channel-and-refund-split.md`](../decisions/0003-payment-channel-and-refund-split.md)
  - 채널: **반자동 (운영자 dashboard 의 메시지 generate + 1-click 복사 + mailto/sms 링크 + 노아 본인 카톡/SMS/이메일 수동 발송)** + 카톡 채널 1:1 폴백
  - 컨펌 모달 신설 (체크박스 X, single-click) + 계좌번호 즉시 노출 폐지
  - 환불 정책 2층 분리 (마케팅 단순화 vs 약관 본문 무수정)
  - 리마인드: cron 없이 dashboard side 색상 강조 (T+1 황색 / D-3 주황 / D-1 적색) + 노아가 보고 수동 발송
  - 운영자 미니 페이지 `/admin/applicants` (Basic Auth) - 메시지 generate + 복사 + mailto + sms + 상태 토글 + 일괄 액션
  - 작업 분해: T2 T3 T4 T7 T8 T10 T11 T12 (rev 1 의 T0 T1 T5 T6 T9 제거)
  - 마일스톤: M2 코어 6/6 (금) · M3 운영자 페이지 6/7 (토) · M4 QA+배포 6/8 (일) · M5 첫 발송 6/9 (월)
  - 인프라 도입 안 함: NaverCloud SENS, Resend, Vercel Cron 전부 제거
  - 출처: 2026-06-04 코워크 미팅 §13 + 2026-06-04 노아 결정 변경 (반자동 전환)

- **B0008** · CS 카톡 플로팅 버튼 · status: **done** · 2026-06-04 완료
  - 우측 하단 fixed 단순 anchor → `https://pf.kakao.com/_nxhDGX/chat` 새창. **SDK 불필요**
  - 카카오 옐로우 `#FEE500` + 카톡 아이콘 + aria-label
  - 루트 layout 마운트, 모든 페이지 노출
  - 출처: 2026-06-04 코워크 미팅 §13

---

## Next  (이번 달)

- **B0009** · 인스타 카드뉴스 4장 수신·검수·캡션 협업 · status: **raw** · 2026-06-04 captured
  - Cowork 측에서 카드뉴스 4장 제공 + 캡션 협업 가능
  - 핵심 메시지: 우수 수료생 → 실제 공연 프로젝트 참가 + **수당 지급** 강조 (유니온픽처스 참여확인서 연계)
  - 마감(6/21) 전 게시 완료
  - 출처: 2026-06-04 코워크 미팅 §13

- **B0010** · FAQ 보강 — 온라인 강의 가능 여부 등 · status: **done** · 2026-06-04 완료
  - ✅ "온라인으로 수강할 수 있나요?" FAQ 항목 추가 (`faq.ts` 03 위치 · 한국어 항목 다음)
  - 답변: 현장 실무 체험 핵심 → 온라인 미제공. 한국 거주자만 신청 가능. 비자 가이드 등 보조 자료는 PDF 별도 제공
  - 영문 FAQ 는 B0006 영문화에서 일괄 처리
  - 출처: 2026-06-04 코워크 미팅 §13

- **B0011** · 모바일 카카오 플로터 ↔ sticky CTA ↔ 콘텐츠 z-index 재정렬 · status: **done** · owner: Luna · 2026-06-04 완료
  - Mira Phase 5 검증에서 발견 — mobile-sm (360px) recruitment 첫 카드 / hero 배너 우측이 카카오 노란 버튼과 일시 겹침
  - 적용: 모바일 한정 사이즈 56→48px 축소 + bottom offset 5rem→6.5rem 상향 (sm+ 는 기존 56px / 5rem 유지)
  - 결과: recruitment 첫 카드 헤더 / hero 핑크 배너와 겹침 해소. 데스크탑·태블릿 regression 없음
  - 캡처: `docs/screenshots/i18n/viewport/recruitment-en-mobile-sm.png` `switcher-en-mobile-sm.png` `polish-tablet-*` `polish-desktop-*`

- **B0012** · `middleware → proxy` 컨벤션 마이그레이션 (Next.js 16.2.4 deprecation) · status: **deferred** · 2026-06-04 captured
  - build log 에 `The "middleware" file convention is deprecated. Please use "proxy" instead.` 출력
  - 동작 무영향, 다음 마이너에서 권고
  - **블로커**: next-intl 4.14+ 필요 (현재 미발표). 라이브러리 릴리즈 후 작업
  - 출처: B0006 Phase 5 Mira QA

- **B0014** · Hash anchor scroll 본질 검증 + cold visit fix · status: **in-progress** · owner: Luna · 2026-06-04 captured
  - 외부 마케팅 (Cowork 카드뉴스·이메일·광고) 에서 `growthcareer.xyz/fan-to-pro#apply` cold 진입 시 hash 점프 동작 검증 필요
  - 검증: Playwright cold visit 시뮬레이션 + viewport scroll y-position 측정
  - fix 안: `scroll-behavior: smooth` + 섹션 `scroll-margin-top` + 필요시 layout useEffect
  - Mira preview 도구 (`tools/preview-i18n.mjs`) timing fix 도 함께

- **B0016** · 섹션 impression GA4 추적 · status: **in-progress** · owner: Luna · 2026-06-04 captured
  - 목적: Cowork 마케팅 시작 전 funnel 추적 인프라 구축. 1기 마감(6/21) 전 데이터 수집
  - 발화 정책: 첫 진입 1회 (impression 표준) / threshold 50% / debounce 500ms / 1회 dedup
  - 이벤트: `section_view` (GA4 커스텀) · 파라미터: `section_id`, `section_name`, `section_order`, `locale`, `page_path`
  - 구현: `useSectionImpression` hook 신규 (IntersectionObserver 기반) + Section 컴포넌트 enhance + 모든 섹션 적용
  - GA4 셋업 이미 있음 (`NEXT_PUBLIC_GA_ID = G-6N0R68CH0D`)
  - 검증: GA4 DebugView 또는 console wrapper

- **B0013** · EN recruitment 헤로 폰트 한 단계 다운 검토 · status: **done** · owner: Luna · 2026-06-04 완료
  - mobile-sm 에서 영문 헤로 5줄 → **4줄** (`Who can apply` 1줄로 통합)
  - 적용: `html[lang="en"] .text-display-lg` `font-size: clamp(2.25rem, 8vw, 6.5rem)` + 동일 패턴으로 `text-display-md` 도 한 단계 다운 (`@layer utilities` 에 배치해 Tailwind utility 보다 specificity 우위)
  - `text-wrap: balance` 는 globals.css 의 `h1,h2,h3` 룰로 이미 전역 적용 중. 별도 추가 불필요
  - 한글 페이지 무영향 — `lang="ko"` 분기 적용 안 됨. 데스크탑은 clamp 상한이 7→6.5rem 으로 미세하게만 작아짐 (시각 변화 거의 없음)
  - 캡처: `docs/screenshots/i18n/viewport/recruitment-en-mobile-sm.png` `polish-program-en-360.png` `polish-mentor-en-360.png`

---

## Later  (언젠가 · 보류 · 장기)

- **B0001** · 코워크 제휴 트래킹 구현 — `referral_code` 컬럼 + UTM 캠페인 + 정산 리포트 · status: **dropped** · 2026-06-04 closed
  - 미팅 결과: Cowork 측이 트래킹 시스템 요구하지 않음. 제휴 자체를 트래킹 기반 12% 정산 모델로 진행하지 않기로
  - §3~§9 의 전략 분석은 archival 자료 — 향후 다른 파트너 검토 시 재활용 가능
  - 리서치 노트: [`docs/research/cowork-partnership-tracking.md`](../research/cowork-partnership-tracking.md) §13

- **B0002** · 운영 어드민 — 사업 전반 관리 대시보드 · status: **deferred** · 2026-06-04 captured
  - markdown(Git) + DB(Supabase) 하이브리드 아키텍처 논의됨
  - 모듈 후보: 백로그 뷰어, 신청자 관리, 결제·정산, 파트너 트래킹, 기수 관리, 분석 요약, 강사·커리큘럼, 배포·헬스, 알림
  - 점진 빌드 로드맵 (~10-12일 분량): v0.1 백로그 뷰어 → v0.2 신청자 → v0.3 분석 → v0.4 알림 → v1.0 인증 → v1.1 파트너 정산 → v2.0 파트너 외부 읽기 스코프
  - **사용자 결정 보류** — "잠시 후에 다시 얘기하자" (2026-06-04 대화)
  - ADR 0003 후보

- **B0003** · `.claude/agents/aria.md` 보강 — Aria 의 T1 인테이크 + T2 디스패치 책임 prompt 에 박기 · status: **raw** · 2026-06-04 captured
  - 출처: ADR 0002 §5 "Aria 의 인테이크 책임"

- **B0004** · `.claude/skills/task-master.md` 스킬화 — `/intake`, `/spec`, `/promote`, `/done` 4개 슬래시 커맨드 · status: **deferred** · 2026-06-04 captured
  - 너무 일찍 자동화 금지 — 수동 운영이 일주일 이상 익숙해진 후 패턴 굳으면 박제
  - 출처: ADR 0002 §6

---

## Raw  (T1 dump · 미분류)

_여기에 머릿속 할 일을 1줄씩 던지세요. promote 시점에 위 lane 으로 이동._

<!-- 예시
- TBD · 박성철 강사 카드 이미지 교체 검토 · 2026-06-04 captured
- TBD · ...
-->

---

## Done  (최근 처리분 — 한 달 단위로 CHANGELOG 로 이관)

_비어있음_

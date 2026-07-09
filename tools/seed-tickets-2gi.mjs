/**
 * seed-tickets-2gi.mjs — 2026-07-10.
 * 2기 launch 준비 이해관계자별 세분화 티켓 (Phase 1 확장).
 * 각 티켓 body_md 안 이메일/카톡 초안 포함 (노아가 복사 붙여넣기 발송).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  const file = path.join(__dirname, "..", ".env.local");
  if (!fs.existsSync(file)) return {};
  const env = {};
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m) env[m[1]] = m[2].replace(/^"|"$/g, "");
  }
  return env;
}

const env = loadEnv();
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing env");
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const tickets = [
  {
    phase: 1,
    ticket_no: "B0092A",
    title: "1기 강사 8명 재계약 개별 통화 (2기 참여 의사 확인)",
    priority: "P0",
    owner: "노아",
    due_date: "2026-07-11",
    body_md: `## 참고할 것
- 1기 강사 8명 = admin/instructors 페이지 확인
- 2기 강사료 = 5회 flat 250만원 (사업자 세금계산서 발행, 부가세 별도)
- 강사료 근거 = ADR 0014 v1.5 매출 프로젝션

## 만드는 방법
1. 8명 개별 카톡/전화 = 2기 참여 의사 + 강사료 조건 안내
2. 참여 확정 명단 정리 (7/11 자정 마감)
3. 미참여 강사 자리 = DEEPI 통해 신규 섭외 (B0112 연동)

## 카톡 초안 (강사님 개별 발송용)

---
[강사님 성함] 강사님,

Growth Career Fan to Pro 1기 진행에 함께해주셔서 진심으로 감사드립니다.
2기를 아래 조건으로 준비 중인데, 함께 해주실 수 있는지 회신 부탁드립니다.

- 첫 수업: 2026-08-01 (토)
- 기간: 5주 5회 (회당 2시간)
- 강의료: 회차 flat 250만원 (부가세 별도, 사업자 세금계산서 발행)
- 지급 조건: 1기와 동일

- 회신 마감: 2026-07-11 (금)

궁금하신 점 편하게 답 주세요.
감사합니다.
노아 드림
---

## 어딜 찾을지
- 강사 연락처: /admin/instructors 페이지 or 노아 개인 카톡
- 1기 계약서: docs/contracts/instructor-agreement.md
- 강사료 근거: docs/decisions/0014-cohort2-revenue-projection.md`,
  },
  {
    phase: 1,
    ticket_no: "B0092B",
    title: "셰르파 뮤직 대표 신규 강사 계약",
    priority: "P0",
    owner: "노아",
    due_date: "2026-07-11",
    body_md: `## 참고할 것
- 신규 트랙 = 단과 B (뮤직 비즈니스 심화, 5주 5회)
- 강사료 = 250만원 flat (부가세 별도, 사업자 세금계산서)
- 커리큘럼 초안 = docs/share/20260708_cohort2_program_proposal.md §4.2

## 만드는 방법
1. 셰르파 뮤직 대표 개별 미팅 or 전화 = 커리큘럼 협의
2. 계약서 초안 준비 (기존 1기 계약서 재사용)
3. 계약 조건 협의 후 서명

## 이메일 초안 (셰르파 뮤직 대표 발송용)

---
안녕하세요, 셰르파 뮤직 대표님.

Growth Career (growthcareer.xyz, 운영: Dropdown 154-28-02110) 대표 노아입니다.
저희 사이트에서 확인 부탁드립니다.

저희는 한국 거주 외국인을 대상으로 K-pop 공연 실무 부트캠프 (Fan to Pro) 를 운영하고 있으며,
1기 (2026년 6월 개강, 10명 수료) 를 성공적으로 마무리하고 2기를 준비 중입니다.

2기부터 뮤직 비즈니스 심화 트랙을 신설하려고 하며,
셰르파 뮤직 대표님의 인사이트와 실무 경험을 학생들에게 전달할 강사님으로 모시고 싶습니다.

주요 조건은 아래와 같습니다.
- 기간: 2026-08-01 (토) ~ 08-29 (토), 5주 5회 (회당 2시간)
- 강의료: 회차 flat 250만원 (부가세 별도, 사업자 세금계산서 발행)
- 대상: 한국 거주 외국인 학생 (한국어 초급 이상)
- 커리큘럼: 뮤직 비즈니스 개론, 아이돌 IP, 콘텐츠 유통, 팬 커머스, 진로 상담 등 (협의)

한 번 미팅 자리 마련해 주시면 커리큘럼 협의와 조건 상의 진행하겠습니다.
편한 시간 알려주시면 감사하겠습니다.

노아 드림
Growth Career / Dropdown
whatisgoingonbaby@gmail.com
---

## 어딜 찾을지
- 셰르파 뮤직 대표 연락처: 노아 개인 확인
- 계약서 템플릿: docs/contracts/instructor-agreement.md
- 2기 program 기획서: docs/share/20260708_cohort2_program_proposal.md`,
  },
  {
    phase: 1,
    ticket_no: "B0110A",
    title: "블루스프링하우스 강의장 예약 (8/15 광복절 확인)",
    priority: "P0",
    owner: "노아",
    due_date: "2026-07-11",
    body_md: `## 참고할 것
- 1기 강의장 = 블루스프링하우스 (서울 마포구 월드컵북로 161)
- 2기 = 5회 매주 토요일 (8/1, 8/8, 8/15, 8/22, 8/29)
- 단과 A / 단과 B 시간대 분리 (예: 오전 A / 오후 B)
- 8/15 광복절 대응 필요 (폐관 or 대체 강의장 or 스케줄 조정)

## 만드는 방법
1. 블루스프링하우스 담당자 연락 = 5주 매 토요일 예약 문의
2. 시간대 분리 조건 확인 (같은 날 오전+오후 2 세션)
3. 8/15 광복절 = (a) 정상 대관 or (b) 대체일 8/16 (일) 조정 or (c) 폐강 통보
4. 예약 확정 서면 확보

## 이메일 초안 (블루스프링하우스 발송용)

---
안녕하세요, 블루스프링하우스 담당자님.

Growth Career (Dropdown 154-28-02110) 노아입니다.
1기 (6/27 ~ 7/19) 강의장 대관에 감사드렸습니다.

2기 강의장 대관 문의드립니다.

- 일정: 2026-08-01 (토), 08-08 (토), 08-15 (토), 08-22 (토), 08-29 (토) 총 5회
- 시간: 오전 세션 (예: 10:00~12:00) + 오후 세션 (예: 14:00~16:00) 같은 날 2 세션
- 인원: 세션당 최대 20~30명 예상
- 목적: K-pop 공연 실무 교육 (1기 동일)

문의 사항:
1. 위 일정 대관 가능 여부
2. 8/15 광복절 정상 대관 가능 여부 (폐관 시 대체일 8/16 (일) 조정 가능한지)
3. 오전/오후 2 세션 동시 대관 시 요금 조건

회신 감사드립니다.
노아 드림
---

## 어딜 찾을지
- 1기 강의장 = 블루스프링하우스 (마포구 월드컵북로 161)
- 담당자 연락처: 노아 개인 기록`,
  },
  {
    phase: 1,
    ticket_no: "B0112",
    title: "DEEPI 파트너십 확인 + 2기 협업 요청 (신규 강사 섭외)",
    priority: "P1",
    owner: "노아",
    due_date: "2026-07-11",
    body_md: `## 참고할 것
- DEEPI = Union Pictures 자회사, MOU 협력사 (강사 섭외 등 backstage 협력)
- 1기 강사 8명 중 재계약 안 되는 자리 신규 섭외 필요
- CLAUDE.md §8: DEEPI 는 개인정보 위탁 X, 결제 수령 X

## 만드는 방법
1. DEEPI 담당자에게 2기 개요 공유
2. 1기 강사 재계약 결과 (B0092A 완료 후) 공유
3. 미참여 강사 자리 신규 섭외 요청

## 이메일 초안 (DEEPI 담당자 발송용)

---
안녕하세요, DEEPI 담당자님.

Growth Career Fan to Pro 2기 준비 관련해 협업 요청 드립니다.

2기 개요:
- 첫 수업: 2026-08-01 (토)
- 기간: 5주 5회 (회당 2시간)
- 트랙: Fan to Pro 공연 실무 (단과 A) + 셰르파 뮤직 비즈니스 심화 (단과 B) + 올인원
- 예상 인원: 단과별 15~20명

1기 강사님들 재계약 여부를 개별 확인 중이며 (7/11 마감),
미참여 강사 자리에 대해 DEEPI 측 추천 강사가 있으면 알려주시면 감사하겠습니다.

- 조건: 5회 flat 250만원 (부가세 별도, 사업자 세금계산서)
- 커리큘럼: 1기 강사진 커리큘럼 유지 방향

2기 준비 미팅 자리 마련 가능한지 회신 부탁드립니다.

감사합니다.
노아 드림
Growth Career / Dropdown
---

## 어딜 찾을지
- DEEPI 담당자 연락처: 1기 파트너십 자료 참조
- Union Pictures 계열 확인: CLAUDE.md §8`,
  },
  {
    phase: 1,
    ticket_no: "B0113",
    title: "Union Pictures 2기 협업 문의 (공연 참여 확인서 지속)",
    priority: "P1",
    owner: "노아",
    due_date: "2026-07-11",
    body_md: `## 참고할 것
- Union Pictures = 공연 프로젝트 참여 확인서 발급 주체 (1기 우수 수료자에게 발급)
- 2기도 동일 방식 유지 여부 협의 필요
- CLAUDE.md §8: 실제 공연 참여자에게 확인서 발급

## 만드는 방법
1. Union Pictures 담당자에게 2기 개요 공유
2. 우수 수료자에 대한 공연 참여 기회 지속 여부 확인
3. 참여 확인서 발급 방식 유지 협의

## 이메일 초안

---
안녕하세요, Union Pictures 담당자님.

Growth Career Fan to Pro 1기 (2026년 6월 개강) 진행과 관련해
공연 프로젝트 참여 확인서 발급 협력에 감사드립니다.

1기 종강 (7/19) + 수료식 (7/25) 이 임박했으며,
2기 (2026년 8월 개강) 를 준비 중입니다.

2기 관련 협의 사항:
1. 2기 우수 수료자에 대한 공연 프로젝트 참여 기회 지속 여부
2. 참여 확인서 발급 방식 유지 여부
3. 대규모 페스티벌 참관 티켓 확보 협조 가능 여부 (2기 커리큘럼 요소로 검토 중)

한 번 미팅 자리 마련해 주시면 감사하겠습니다.

노아 드림
Growth Career / Dropdown
---

## 어딜 찾을지
- Union Pictures 담당자 연락처: 1기 파트너십 자료
- 1기 참여 확인서 발급 이력: 노아 개인 기록`,
  },
  {
    phase: 1,
    ticket_no: "B0114",
    title: "Cowork 2기 마케팅 협업 확인 (12% 수수료 유지 + 카드뉴스 재발주)",
    priority: "P1",
    owner: "노아",
    due_date: "2026-07-11",
    body_md: `## 참고할 것
- Cowork = 1기 마케팅 채널 (12% commission)
- 2기도 12% 유지 (Aria v1.5 매출 프로젝션에 반영됨)
- 카드뉴스 10종 재발주 (B0095 세부)

## 만드는 방법
1. Cowork 담당자에게 2기 개요 공유
2. 12% 수수료 유지 조건 재확인
3. 카드뉴스 10종 재발주 문의 (마감 7/13)
4. 얼리버드 카운트다운 캠페인 협의

## 카톡 초안

---
Cowork 담당자님,

Growth Career Fan to Pro 2기 마케팅 관련 협의 드립니다.

- 2기 첫 수업: 2026-08-01 (토)
- 모집 시작: 2026-07-14 (화)
- 얼리버드 기간: 2026-07-14 ~ 07-20 (1주일)
- 얼리버드 가격: 550,000원, 정가: 660,000원
- 올인원: 880,000원

협의 사항:
1. 1기와 동일한 12% commission 조건 유지 가능 여부
2. 인스타 카드뉴스 10종 재발주 (2기 스케줄 반영, 마감 7/13)
3. 얼리버드 D-7 카운트다운 캠페인 협업

편한 시간 알려주시면 상세 논의하겠습니다.
노아 드림
---

## 어딜 찾을지
- Cowork 담당자 연락처: 1기 파트너십 자료
- Aria 매출 프로젝션 (12% commission 반영): docs/decisions/0014-cohort2-revenue-projection.md`,
  },
  {
    phase: 1,
    ticket_no: "B0095A",
    title: "인스타 카드뉴스 10종 발주 사양서 (2기 스케줄)",
    priority: "P1",
    owner: "노아 + Cowork",
    due_date: "2026-07-13",
    body_md: `## 참고할 것
- 1기 카드뉴스 이력 = B0009 백로그
- 2기 스케줄: 모집 7/14 시작, 얼리버드 7/14~7/20
- 가격: 얼리버드 550,000 / 정가 660,000 / 올인원 880,000

## 만드는 방법
10종 카드뉴스 컨셉 (Cowork 발주 시 첨부):

1. **얼리버드 D-7 카운트다운** — "7/14~7/20 550,000원, 이후 660,000원"
2. **강사 라인업 소개** — 현직 K-pop 산업 전문가 (구체 이름 X, 직군만)
3. **커리큘럼 하이라이트 (5줄)**:
   - 뮤직 비즈니스와 K-pop 산업 구조 이해
   - A&R 및 기획사 실무 케이스 스터디 (현직 전문가 라이브 세션)
   - 무대 음향 시스템 셋팅 원리 및 미니 콘서트 실습 조율
   - Visual Director와 무대 연출 실무 관점 학습
   - K-pop 콘텐츠 기획 및 공연 연출 실무
4. **미니 콘서트 실습** — 클래스 안 음향 기기 조율 실습
5. **1기 수료생 후기** (수료식 후 촬영본)
6. **셰르파 뮤직 비즈니스 심화 트랙** — 뮤직 산업 인사이드
7. **올인원 패키지** — 880,000원 (두 트랙 통합)
8. **외국인 학생 대상** — 한국 거주 + 한국어 초급 이상
9. **강의장 소개** — 서울 시내 강의장 + 실제 음향 기기 보유
10. **마감 임박** — 7/31 (금) 자정 마감

## 어딜 찾을지
- 1기 카드뉴스: Cowork 보관 or 노아 기록`,
  },
  {
    phase: 1,
    ticket_no: "B0093A",
    title: "/fan-to-pro 2기 정보 섹션 신설 (Iris + Luna 구현)",
    priority: "P0",
    owner: "Iris + Luna",
    due_date: "2026-07-13",
    body_md: `## 참고할 것
- 기존 /fan-to-pro 페이지 = 1기 완료 페이지 (모집 완료)
- 2기 정보 섹션 신설 = 별도 섹션 추가 (§7.4 최소 침습)
- courses/bundles 이미 신설됨 (B0068)
- apply-form 이미 course/bundle 확장됨 (Slice 2c-A)

## 만드는 방법
1. /fan-to-pro 페이지에 "2기 모집" 섹션 신설 (1기 섹션 아래)
2. 트랙 카드 3개: 단과 A / 단과 B / 올인원
3. 각 카드 = 커리큘럼 + 강사 (일반 표기) + 가격 (얼리버드/정가) + [신청하기] 링크
4. 링크 = /fan-to-pro?course=<slug>#apply 또는 ?bundle=<slug>#apply

## 어딜 찾을지
- 페이지: app/[locale]/fan-to-pro/page.tsx
- Section 컴포넌트: src/programs/fan-to-pro/presentation/sections/
- program-config.ts SCHEDULE`,
  },
  {
    phase: 1,
    ticket_no: "B0093B",
    title: "얼리버드 카운트다운 UI (force-dynamic)",
    priority: "P1",
    owner: "Iris",
    due_date: "2026-07-13",
    body_md: `## 참고할 것
- B0039 SSG 사고 lesson = docs/lessons/2026-06-22-ssg-cache-blocks-deadline-transition.md
- CLAUDE.md §7 시간 기반 페이지 룰
- 얼리버드 종료 = 2026-07-20 자정

## 만드는 방법
1. 카운트다운 컴포넌트 = 서버 시각 기준 D-N 계산
2. export const dynamic = "force-dynamic" 또는 revalidate = 60 필수
3. 자정 지나면 자동 정가 phase 전환
4. pricing.ts getCurrentPricingPhase 함수 재사용

## 어딜 찾을지
- pricing.ts: src/programs/fan-to-pro/domain/pricing.ts
- 페이지: app/[locale]/fan-to-pro/page.tsx`,
  },
  {
    phase: 1,
    ticket_no: "B0115",
    title: "2기 커리큘럼 5줄 확정 (수료증 + 마케팅 공용)",
    priority: "P1",
    owner: "노아 + Aria",
    due_date: "2026-07-14",
    body_md: `## 확정 5줄 (2026-07-10 노아 승인)

1. 뮤직 비즈니스와 K-pop 산업 구조 이해
2. A&R 및 기획사 실무 케이스 스터디 (현직 전문가 라이브 세션)
3. 무대 음향 시스템 셋팅 원리 및 미니 콘서트 실습 조율
4. Visual Director와 무대 연출 실무 관점 학습
5. K-pop 콘텐츠 기획 및 공연 연출 실무

## 사용처
- 1기 수료증 하단 커리큘럼 요약 (Sophia 안 1 안에 삽입)
- 2기 인스타 카드뉴스 (B0095A)
- 2기 모집 페이지 (B0093A)
- Cowork 마케팅 소재
- 강사 계약서 첨부

## 참고
- 브랜드명 (MBC/SBS 등) 사용 금지
- 아이돌 그룹명 사용 금지
- 방송 프로그램 이름 사용 금지
- 학생 관점 실무 강조가 핵심`,
  },
];

console.log(`Seeding ${tickets.length} tickets...`);
const { data, error } = await supabase
  .from("tickets")
  .upsert(tickets, { onConflict: "ticket_no", ignoreDuplicates: false })
  .select("ticket_no");

if (error) {
  console.error("Error:", error.message);
  process.exit(1);
}

console.log(`✓ ${data?.length ?? 0} tickets upserted`);

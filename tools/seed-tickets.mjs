/**
 * seed-tickets.mjs — 2026-07-10.
 * 18개 티켓 seed (Phase 1~4). 이미 있으면 upsert (ticket_no unique).
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
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const tickets = [
  // Phase 1 — 2기 모집 시작 준비
  {
    phase: 1,
    ticket_no: "B0092",
    title: "강사 재계약 + 셰르파 뮤직 대표 신규 계약",
    priority: "P0",
    owner: "노아 + DEEPI",
    due_date: "2026-07-11",
    body_md: `## 참고할 것
- 1기 강사 8명 리스트 = admin/instructors 페이지
- 강사료 정책 = 5회 flat 250만원 (사업자 세금계산서 발행)
- 계약서 템플릿 = docs/contracts/instructor-agreement.md

## 만드는 방법
1. 1기 강사와 개별 통화 = 2기 참여 의사 확인
2. 참여 강사 = 신 계약서 서명 (5회 250만 조건)
3. 셰르파 뮤직 대표 = 신규 계약 (같은 조건)
4. 미참여 강사 = 신규 강사 섭외 (DEEPI 협업)

## 어딜 찾을지
- 강사 정보: /admin/instructors
- 계약서 원본: docs/contracts/
- 담당 회사 연락처: admin 회사 탭`,
  },
  {
    phase: 1,
    ticket_no: "B0110",
    title: "강의장 예약 확정 (8/15 광복절 대응)",
    priority: "P0",
    owner: "노아",
    due_date: "2026-07-11",
    body_md: `## 참고할 것
- 1기 강의장 = 블루스프링하우스 (서울 마포구 월드컵북로 161)
- 2기 = 5회 (8/1, 8/8, 8/15, 8/22, 8/29)
- 8/15 = 광복절, 강의장 예약 상 확인 필요
- 시간대 분리 = 단과 A / 단과 B 다른 시간대

## 만드는 방법
1. 블루스프링하우스 8/1~8/29 매주 토요일 예약 문의
2. 8/15 광복절 특별 요금 or 폐관 확인
3. 시간대 분리 = 오전 A / 오후 B (예: 10~12 A / 14~16 B)

## 어딜 찾을지
- 1기 예약 이력 = 노아 개인 기록`,
  },
  {
    phase: 1,
    ticket_no: "B0093",
    title: "2기 모집 페이지 (얼리버드/일반 phase + course/bundle 표시)",
    priority: "P0",
    owner: "Iris + Luna",
    due_date: "2026-07-13",
    body_md: `## 참고할 것
- 기존 /fan-to-pro 페이지 확장 (신규 페이지 X, §7.4 최소 침습)
- Aria 매출 프로젝션 v1.5 = docs/decisions/0014-cohort2-revenue-projection.md
- courses/bundles 테이블 = 이미 신설됨 (B0068)
- pricing.ts = PRICING_PHASES 도메인 로직

## 만드는 방법
1. /fan-to-pro 페이지에 2기 정보 섹션 신설 (얼리버드 카운트다운 + 가격)
2. 얼리버드 기간 = 7/14~7/20 (1주일), 정가 = 7/21~7/31
3. 단과 A / 단과 B / 올인원 카드 3개 배치
4. 각 카드 = 커리큘럼 + 강사 + [신청하기] 버튼

## 어딜 찾을지
- /fan-to-pro 페이지: app/[locale]/fan-to-pro/page.tsx
- apply-form: src/programs/fan-to-pro/presentation/sections/apply-form.tsx
- pricing.ts: src/programs/fan-to-pro/domain/pricing.ts`,
  },
  {
    phase: 1,
    ticket_no: "B0094",
    title: "얼리버드 카운트다운 (force-dynamic, B0039 SSG 사고 방지)",
    priority: "P1",
    owner: "Iris",
    due_date: "2026-07-13",
    body_md: `## 참고할 것
- B0039 SSG 사고 lesson = docs/lessons/2026-06-22-ssg-cache-blocks-deadline-transition.md
- CLAUDE.md §7 시간 기반 페이지 룰
- 얼리버드 종료 = 2026-07-20 자정

## 만드는 방법
1. 카운트다운 컴포넌트 = 서버 시각 기준 D-day 계산
2. 페이지에 export const dynamic = "force-dynamic" 또는 revalidate = 60 필수
3. 자정 지나면 자동 정가 phase 전환 확인

## 어딜 찾을지
- pricing.ts: getCurrentPricingPhase 함수
- B0039 사고 파일: src/programs/fan-to-pro/presentation/`,
  },
  {
    phase: 1,
    ticket_no: "B0095",
    title: "인스타 카드뉴스 재발주 (10종, 2기 스케줄 반영)",
    priority: "P1",
    owner: "Cowork + 노아",
    due_date: "2026-07-13",
    body_md: `## 참고할 것
- 1기 카드뉴스 = B0009 백로그
- 2기 새 스케줄 = 8/1 launch, 얼리버드 7/14~7/20
- 새 가격 = 얼리버드 550,000원 / 정가 660,000원 / 올인원 880,000원

## 만드는 방법
1. Cowork 측에 새 카드뉴스 10종 발주 요청
2. 핵심 메시지 = 얼리버드 D-7 카운트다운 + Fan to Pro + 셰르파 뮤직 비즈니스 + 올인원 강조
3. 마감 7/13 (일)`,
  },

  // Phase 2 — 1기 수료증 오피셜화
  {
    phase: 2,
    ticket_no: "B0096",
    title: "수료증 양식 격식 강화 (서명 + 인장 + 카피)",
    priority: "P1",
    owner: "나 (직접)",
    due_date: "2026-07-19",
    body_md: `## 참고할 것
- 현재 수료증 template = src/programs/fan-to-pro/application/certificate/certificate-template.ts
- Preview HTML = tools/certificate-preview.html
- Spec = docs/specs/B0081-certificate-system.md

## 만드는 방법
1. 카피 격식체 정정 = "이수하였음을 증명합니다" 유지, 추가 격식 문구
2. 서명 라인 = 노아 실 서명 이미지 (없으면 typed 이름 + 인장)
3. 인장 (Toss 블루 원형) 확대 = 지름 100px 이상
4. 발급자 명 = "Growth Career / Dropdown 대표 노아 (서명)"

## 어딜 찾을지
- certificate-template.ts (렌더링 로직)
- tools/certificate-preview.html (미리보기)`,
  },
  {
    phase: 2,
    ticket_no: "B0097",
    title: "QR verify URL 실 배선 (수료증 인증)",
    priority: "P2",
    owner: "나 (직접)",
    due_date: "2026-07-19",
    body_md: `## 참고할 것
- verify 페이지 이미 라이브 = app/[locale]/verify/[serialNo]/page.tsx
- QR 이미지 = 현재 placeholder or 미구현
- serial_no = "GC-FTP-1기-001" 형식

## 만드는 방법
1. 수료증 template 에 QR 코드 URL 실 표시
2. QR 이미지 생성 = qrcode 라이브러리 or Google Chart API
3. verify URL = growthcareer.xyz/ko/verify/GC-FTP-1기-001

## 어딜 찾을지
- certificate-template.ts QR 부분
- verify page: app/[locale]/verify/[serialNo]/page.tsx`,
  },
  {
    phase: 2,
    ticket_no: "B0098",
    title: "수료 자격 자동 활성화 (종강 7/19 + 출석률 75%)",
    priority: "P2",
    owner: "나 (직접)",
    due_date: "2026-07-19",
    body_md: `## 참고할 것
- canIssueCompletion 도메인 함수 = src/programs/fan-to-pro/domain/services/certificate-eligibility.ts
- 조건 = attendance >= 75% + cohort.status = 'completed' + student.status = 'active'

## 만드는 방법
1. 종강일 (7/19) 이후 cohort.status = 'completed' 자동 전환
2. 학생 dashboard 수료증 카드 = 조건 만족 시 활성화
3. 확인 = 학생 로그인 후 /student/certificates 다운로드 가능

## 어딜 찾을지
- certificate-eligibility.ts (판정 로직)
- 학생 dashboard = app/[locale]/fan-to-pro/[cohortSlug]/student/dashboard/`,
  },
  {
    phase: 2,
    ticket_no: "B0111",
    title: "수료증 실물 인쇄 발주 사양 정리",
    priority: "P1",
    owner: "노아",
    due_date: "2026-07-22",
    body_md: `## 참고할 것
- 학생 10명 = 10부 필요
- 우수 수료자 = Union Pictures 참여 확인서 별도

## 만드는 방법
1. 종이 = 200gsm 이상 아이보리 or 크림
2. 인쇄 = 컬러 (Toss 블루 인장 살리기)
3. 액자 = A4 액자 10개 (수료식 배부용)
4. 인쇄소 = 노아 검색 or 근처 온라인 인쇄

## 어딜 찾을지
- 수료증 PDF = LMS admin > 학생 상세 > 수료증 미리보기
- 파일 export 방법 = 브라우저 프린트 -> PDF 저장`,
  },

  // Phase 3 — 수료식 & 네트워킹 파티
  {
    phase: 3,
    ticket_no: "B0099",
    title: "수료식 장소 예약 (7/25 토)",
    priority: "P0",
    owner: "노아",
    due_date: "2026-07-14",
    body_md: `## 참고할 것
- 학생 10명 + 강사 8명 + 파트너 (DEEPI/Union Pictures/Cowork) 5명 = 총 23명
- 블루스프링하우스 재사용 검토 (강의장 그대로)
- 대안 = 카페 대관 or 유니온픽처스 사무실

## 만드는 방법
1. 예상 인원 25명 수용 공간
2. 다과 or 간단 케이터링 예산 확보
3. 마이크 + 스피커 + 프로젝터 (수료증 수여용)

## 어딜 찾을지
- 1기 강의장 = 블루스프링하우스 (마포구 월드컵북로 161)`,
  },
  {
    phase: 3,
    ticket_no: "B0100",
    title: "수료식 프로그램 순서",
    priority: "P1",
    owner: "노아 + Aria",
    due_date: "2026-07-18",
    body_md: `## 참고할 것
- 시간 = 2시간 예상 (17:00~19:00 or 18:00~20:00)
- 순서 예시:
  1. 환영사 (노아, 5분)
  2. 1기 회고 영상 (10분)
  3. 강사 인사 (5분 × 8명 = 40분 or 3~4명만)
  4. 수료증 수여식 (30분, 10명 × 2~3분)
  5. Union Pictures 참여 확인서 수여 (10분)
  6. 네트워킹 (30분, 다과)

## 만드는 방법
1. 사회자 = 노아 or 지정
2. 슬라이드 = 학생 이름 + 수료증 사진
3. 발표자 순서 미리 안내`,
  },
  {
    phase: 3,
    ticket_no: "B0101",
    title: "수료식 초대장 발송 (카톡 + 이메일)",
    priority: "P1",
    owner: "Iris (템플릿)",
    due_date: "2026-07-19",
    body_md: `## 참고할 것
- 대상 = 학생 10명 + 강사 8명 + 파트너 5명
- 채널 = 카톡 오픈채팅 broadcast + 개별 이메일
- 카톡 오픈채팅 = https://open.kakao.com/o/gX12jFAi (비번 fan06pro)

## 만드는 방법
1. 이메일 템플릿 = messages/templates.ts 확장
2. 초대장 = 수료식 안내 + 프로그램 순서 + 장소 지도
3. RSVP 링크 (Google Form or 간단 페이지)`,
  },
  {
    phase: 3,
    ticket_no: "B0102",
    title: "RSVP 참석 확인",
    priority: "P1",
    owner: "노아",
    due_date: "2026-07-22",
    body_md: `## 참고할 것
- 학생 10명 = 개별 확인 (카톡 1:1)
- 강사 8명 = 개별 이메일
- 파트너 = 노아 개별 연락

## 만드는 방법
1. 초대장 발송 후 이틀 안 첫 확인
2. 미답 = 재확인 (D-3)
3. 최종 참석자 명단 = 수료식 D-2 확정`,
  },
  {
    phase: 3,
    ticket_no: "B0103",
    title: "Union Pictures 공연 참여 확인서 (우수 수료자)",
    priority: "P2",
    owner: "Union Pictures + 노아",
    due_date: "2026-07-22",
    body_md: `## 참고할 것
- 우수 수료자 = 노아 판단 (2~3명 예상)
- Union Pictures 발급 확인서 = 별도 (Growth Career 수료증과 분리)
- CLAUDE.md §8 = "실제 공연에 참여한 분께 공연 프로젝트 참여(업무) 확인서 발급 주체"

## 만드는 방법
1. 우수 수료자 선정 = 출석률 + 참여도 + 강사 추천
2. Union Pictures 에 명단 전달 + 확인서 사양 협의
3. 수료식에서 수료증과 함께 수여`,
  },
  {
    phase: 3,
    ticket_no: "B0104",
    title: "수료식 사진 촬영 + 인터뷰 (2기 stories 콘텐츠 병행)",
    priority: "P2",
    owner: "노아 + 촬영자",
    due_date: "2026-07-25",
    body_md: `## 참고할 것
- 촬영 목적 = 수료 기념 + 마케팅 콘텐츠 (2기 stories)
- B0105 (수료생 인터뷰) 와 병행 촬영 시 예산 절약
- 참고 = Aria ADR 0015 인터뷰 촬영 계획

## 만드는 방법
1. 촬영자 섭외 (D-7)
2. 수료식 현장 = 단체 사진 + 개별 프로필 (10명)
3. 인터뷰 = 학생 3~5명 (10~15분 각)
4. 편집본 = 2기 마케팅 활용`,
  },

  // Phase 4 — 종강 후 (2기 강화 + Outcomes)
  {
    phase: 4,
    ticket_no: "B0105",
    title: "1기 수료생 인터뷰 (/stories/* 콘텐츠)",
    priority: "P2",
    owner: "Luna + 노아",
    due_date: "2026-08-15",
    body_md: `## 참고할 것
- B0083 stories 시스템 이미 라이브 = /stories/
- MDX 파일 = content/stories/*.mdx
- Frontmatter = story-frontmatter.ts

## 만드는 방법
1. 인터뷰 텍스트 편집 (촬영본에서)
2. content/stories/ 에 mdx 파일 3~5개 신설
3. Frontmatter = 학생 이름 (anonymous 옵션 있음) / 사진 / 인용 / cohort_showcase_slug`,
  },
  {
    phase: 4,
    ticket_no: "B0106",
    title: "1기 성과 통계 정리 (Outcomes, CIRR 표준)",
    priority: "P2",
    owner: "Aria",
    due_date: "2026-08-30",
    body_md: `## 참고할 것
- Echo B0083 리서치 = Lambda School 사고 (분모/기간 정의 필수)
- CIRR 표준 = docs/research/B0083-platform-evolution-benchmark.md
- outcome_reports 테이블 = ADR 0016 신설 예정

## 만드는 방법
1. 수료율 = 10/10 (100%)
2. 취업 연계 = Union Pictures 참여 확인 N명
3. 만족도 조사 = 종강 후 학생 설문
4. 통계 문서화 + methodology 명시`,
  },
  {
    phase: 4,
    ticket_no: "B0108",
    title: "채용 파이프라인 실 launch (파트너 회사 초대)",
    priority: "P2",
    owner: "노아 + Echo",
    due_date: "2026-09-30",
    body_md: `## 참고할 것
- B0072 채용 마이그레이션 = 이미 apply 완료
- Echo 파트너 리서치 = docs/research/B0072-recruitment-partner-companies.md
- 우선순위 A = 유니온픽처스, Show Note, Live Nation Korea, HYBE, Ktown4u

## 만드는 방법
1. 우선순위 A 5개사 개별 접촉 (노아)
2. JD 등록 = /admin/recruitment/postings/new
3. 학생에게 공고 노출 = 자동 (RLS 정책)`,
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

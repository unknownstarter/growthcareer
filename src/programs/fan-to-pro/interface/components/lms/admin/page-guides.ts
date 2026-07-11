/**
 * Admin 페이지 가이드 콘텐츠 catalog (B0056).
 *
 * 각 페이지의 PageGuideBot 에 주입할 정적 콘텐츠 모음. props 모두 string literal —
 * XSS surface 0. 노아 / 운영자가 페이지 별 workflow 를 짧게 안내받는다.
 *
 * 카피 부호 룰 (CLAUDE.md §6.5): em dash, interpunct, 곡선 따옴표, 단일 ellipsis
 * 사용 금지. 검색 grep 으로도 검증 (npm script 없으면 수동).
 */
import type { PageGuide } from "./page-guide-bot";

type AdminPageId =
  | "dashboard"
  | "cohorts"
  | "cohort-detail"
  | "cohort-materials"
  | "attendance"
  | "students"
  | "student-detail"
  | "instructors"
  | "instructor-detail"
  | "talent-pool"
  | "applicant-detail"
  | "finance"
  | "announcements"
  | "companies"
  | "consultations"
  | "materials";

export const PAGE_GUIDES: Record<AdminPageId, PageGuide> = {
  dashboard: {
    pageId: "dashboard",
    title: "어드민 대시보드",
    steps: [
      {
        title: "기수 현황 확인",
        description:
          "현재 활성 기수의 신청 / 입금 / 학생 현황을 한눈에 봐요. KPI 카드로 빠르게 스캔.",
      },
      {
        title: "운영 알림 체크",
        description:
          "신규 신청자, 입금 확인 대기, 미발송 메시지 등 즉시 처리할 항목을 우선 확인.",
      },
      {
        title: "빠른 작업으로 이동",
        description:
          "기수 / 학생 / 공지 카드 클릭으로 자주 쓰는 페이지로 1클릭 이동.",
      },
    ],
    tips: [
      "왼쪽 sidebar 의 메뉴는 운영 워크플로우 순서대로 배치되어 있어요.",
    ],
  },

  cohorts: {
    pageId: "cohorts",
    title: "기수 관리",
    steps: [
      {
        title: "기수 카드 클릭",
        description:
          "통합 view 진입. 신청 / 학생 / 강사 / 회차 / 자료 / 재무 6 KPI 한 화면.",
      },
      {
        title: "입금 완료 일괄 등록",
        description:
          "paid 상태 신청자를 students 테이블로 promote. 한 번에 등록되고 멱등이라 중복 걱정 없어요.",
      },
      {
        title: "신청 퍼널 분석",
        description:
          "pending / notified / paid / overdue / cancelled 단계별 카운트로 funnel drop-off 파악.",
      },
    ],
    tips: [
      "기수 별 운영 workflow 는 cohort 상세 페이지에서 한 화면에 모입니다.",
    ],
  },

  "cohort-detail": {
    pageId: "cohort-detail",
    title: "기수 상세",
    steps: [
      {
        title: "6 영역 KPI 스캔",
        description:
          "신청 퍼널 / 학생 / 강사 / 출결 / 자료 / 재무 6 카드. 각 카드 클릭으로 상세 페이지 진입.",
      },
      {
        title: "회차 (sessions) 확인",
        description:
          "8회차 일정 + 강사 배정 + 출결률. 회차 별 자료 / 출결 등록은 여기서 시작.",
      },
      {
        title: "운영 액션",
        description:
          "공지 발송 / 자료 업로드 / 학생 promote 등 cohort 단위 액션을 한 화면에서.",
      },
    ],
  },

  "cohort-materials": {
    pageId: "cohort-materials",
    title: "강의 자료 관리",
    steps: [
      {
        title: "자료 업로드",
        description:
          "파일 (500MB 이하) 또는 외부 링크 (Notion / Figma / YouTube) 등록.",
      },
      {
        title: "회차 + 제목 설정",
        description:
          "1회차 ~ 8회차 매칭. 제목은 학생이 보는 그대로 (예: '1회차 K-pop 산업 이해').",
      },
      {
        title: "가시성 토글",
        description:
          "draft = 운영자만 / published = 학생에게 노출. 회차 시작 전 published 로 전환.",
      },
    ],
    tips: [
      "draft 상태는 학생 surface 에서 안 보입니다. 검수 후 published 로.",
      "외부 링크는 공개 권한 필수 (Notion 'anyone with the link' 등).",
    ],
  },

  attendance: {
    pageId: "attendance",
    title: "출결 매트릭스",
    steps: [
      {
        title: "셀 클릭",
        description:
          "학생 × 회차 셀 클릭 = 상태 선택 popover. present / late / absent / excused.",
      },
      {
        title: "회차 헤더 일괄",
        description:
          "회차 헤더의 [전원 출석] 버튼으로 한 번에 처리. 예외 학생만 개별 수정.",
      },
      {
        title: "메모 / 지각 분",
        description:
          "셀 우클릭 = 지각 분 / 메모 입력. 학생 detail 페이지의 운영 코멘트에 기록됩니다.",
      },
    ],
    tips: [
      "실시간 저장. 셀 클릭 즉시 DB 반영, undo 없음. 확인 후 클릭.",
    ],
  },

  students: {
    pageId: "students",
    title: "학생 관리",
    steps: [
      {
        title: "학생 이름 클릭",
        description:
          "학생 detail 진입. 한국 이름 / 진로 희망 / 이력서 / 운영 코멘트 관리.",
      },
      {
        title: "원본 이름 정정",
        description:
          "신청서의 잘못된 이름 (오타 / 외국 표기) 을 정정. 학생 동의 후 진행 권장.",
      },
      {
        title: "이력서 / 진로 확인",
        description:
          "학생이 업로드한 이력서 + 진로 희망을 한 화면에서. 강사 매칭 / 컨설팅 준비에 활용.",
      },
    ],
  },

  "student-detail": {
    pageId: "student-detail",
    title: "학생 상세",
    steps: [
      {
        title: "프로필 / 진로 / 이력서",
        description:
          "기본 정보 + 진로 희망 + 업로드 자료 한 화면. 운영 코멘트로 기수 내 진척 기록.",
      },
      {
        title: "원본 이름 정정",
        description:
          "우상단 [원본 이름 정정] 버튼. 신청서 이름이 잘못된 경우 정정 (audit log 남음).",
      },
      {
        title: "커리어 문서 링크",
        description:
          "학생의 커리어 문서 (자기소개서 / 포트폴리오 등) 외부 링크. 강사 / 컨설팅에 공유.",
      },
    ],
    tips: [
      "운영 코멘트는 학생에게 노출되지 않습니다. 솔직한 관찰 기록 OK.",
    ],
  },

  instructors: {
    pageId: "instructors",
    title: "강사 관리",
    steps: [
      {
        title: "강사 이름 클릭",
        description:
          "강사 detail 진입. 회사 / cohort 배정 / 회차 진척 / 정산 상태 확인.",
      },
      {
        title: "회사 변경",
        description:
          "강사 dropdown 으로 소속 회사 변경. 회사 = 정산 송금 + 세금 계산 단위.",
      },
      {
        title: "invite 발송",
        description:
          "강사가 LMS 미로그인 상태면 invite 발송. 첫 로그인 시 PW 변경 강제됩니다.",
      },
    ],
  },

  "instructor-detail": {
    pageId: "instructor-detail",
    title: "강사 상세",
    steps: [
      {
        title: "기본 정보 / 회사",
        description:
          "이름 / 전화 / 회사 / 세금 처리 방식 (세금계산서 vs 원천징수 3.3%).",
      },
      {
        title: "cohort 배정 + 회차 진척",
        description:
          "배정된 cohort + 담당 회차 + 진행 상태. 회차 별 자료 / 출결 진척률.",
      },
      {
        title: "정산 송금 mark",
        description:
          "송금 완료 시 [지급] 버튼 클릭. settlements 테이블에 기록되어 finance 페이지에 반영.",
      },
    ],
  },

  "talent-pool": {
    pageId: "talent-pool",
    title: "Talent Pool",
    steps: [
      {
        title: "다음 기수 outreach 대상",
        description:
          "notified 미입금 / cancelled / refunded 신청자 중 다음 기수 안내 후보군.",
      },
      {
        title: "이름 클릭 = 신청자 detail",
        description:
          "신청자 detail 페이지로 진입. 상태 변경 / 메시지 발송 / 메모 가능.",
      },
      {
        title: "필터로 좁히기",
        description:
          "상태 / 신청 시점 / cohort 별 필터링으로 outreach 우선순위 결정.",
      },
    ],
    tips: [
      "다음 기수 모집 1주 전 시점에 talent pool 일괄 안내 권장.",
    ],
  },

  "applicant-detail": {
    pageId: "applicant-detail",
    title: "신청자 상세",
    steps: [
      {
        title: "정보 확인 + 상태 변경",
        description:
          "신청 정보 (이름 / 연락처 / 진로 / 이력서) + 상태 toggle (notified / paid / overdue / cancelled / refunded).",
      },
      {
        title: "메시지 발송",
        description:
          "단일 신청자에게 안내 / 입금 / 마감 메시지 발송. 운영 templates 에 정의된 종류만.",
      },
      {
        title: "영수증 + promote",
        description:
          "입금 확인 후 영수증 발급 + [학생으로 promote] 클릭으로 students 테이블 등록.",
      },
      {
        title: "PII 파기",
        description:
          "프로그램 종료 + 보관 기간 (1년) 만료 시 PII 파기. audit log 남음.",
      },
    ],
    tips: [
      "promote 는 paid 상태에서만 가능. 입금 미확인 시 paid 로 먼저 변경.",
    ],
  },

  finance: {
    pageId: "finance",
    title: "재무 / 회계 / 세무",
    steps: [
      {
        title: "cohort 별 손익",
        description:
          "매출 / 비용 / 부가세 / 순익 4 KPI 자동 계산. cohort 종료 후 정산 보고에 활용.",
      },
      {
        title: "비용 entry 등록",
        description:
          "카테고리 (강사료 / Cowork 수수료 / 강의장 / 기타) + 금액 + 세금계산서 첨부 여부.",
      },
      {
        title: "분기별 부가세 신고",
        description:
          "tax_filings 일정 + 상태. 신고 마감 D-7 알림 + 신고 완료 후 mark.",
      },
      {
        title: "매입세는 별도 입력",
        description:
          "세금계산서 받은 비용에 한해 매입세 (VAT 환급분) 별도 입력. 매입 = 비용 자동 추론 X.",
      },
    ],
    tips: [
      "일반 과세 사업자 (학원 미등록) 기준. 학원 등록 시 세무 처리 달라집니다.",
      "강사 정산은 instructor detail 의 [지급] 버튼으로. finance 페이지는 합계 view.",
    ],
  },

  announcements: {
    pageId: "announcements",
    title: "공지 발송",
    steps: [
      {
        title: "cohort 선택",
        description:
          "공지 받을 cohort 선택. 전체 cohort 일괄 발송도 가능.",
      },
      {
        title: "제목 + 본문 작성",
        description:
          "학생 / 강사 surface 의 알림 패널에 노출. markdown 일부 지원.",
      },
      {
        title: "발송 + 기록",
        description:
          "발송 즉시 cohort 멤버 전원에게 노출. 발송 이력은 자동 기록됩니다.",
      },
    ],
  },

  companies: {
    pageId: "companies",
    title: "회사 관리",
    steps: [
      {
        title: "회사 등록 / 수정",
        description:
          "강사 소속 회사. 이름 / 사업자번호 / 세금계산서 발행 여부 (vat_issuer) 관리.",
      },
      {
        title: "강사 소속 매칭",
        description:
          "강사 detail 의 회사 dropdown 에서 매칭. 회사 = 정산 단위.",
      },
    ],
    tips: [
      "vat_issuer = true 면 세금계산서 (VAT 10%), false 면 원천징수 3.3% 처리.",
    ],
  },

  consultations: {
    pageId: "consultations",
    title: "컨설팅 관리",
    steps: [
      {
        title: "신청 list 확인",
        description:
          "학생이 신청한 1:1 컨설팅. 대기 / 검토중 / 완료 상태로 분류.",
      },
      {
        title: "전문가 매칭",
        description:
          "학생 진로 + 이력서 기반으로 전문가 (강사 / 외부 멘토) 매칭.",
      },
      {
        title: "완료 처리",
        description:
          "컨설팅 종료 후 [완료] 클릭. 학생 surface 에 후기 작성 요청 노출.",
      },
    ],
  },

  materials: {
    pageId: "materials",
    title: "자료 라이브러리",
    steps: [
      {
        title: "글로벌 자료",
        description:
          "특정 cohort 에 종속되지 않는 공통 자료 (오리엔테이션 / 가이드 / 템플릿).",
      },
      {
        title: "cohort 별 자료는 별도",
        description:
          "cohort 회차 별 자료는 [기수 상세] 의 [강의 자료] 에서 관리.",
      },
    ],
  },
};

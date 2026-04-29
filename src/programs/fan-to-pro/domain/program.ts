/**
 * Program — 프로그램 구성, 멘토, 보장 항목.
 * 일부 필드는 사용자 입력 대기 (null / TBD).
 */
export const GUARANTEES = [
  {
    id: "portfolio",
    title: "포트폴리오",
    body: "현장에서 검증된 결과물. 면접관이 신뢰하는 형식으로 정리.",
  },
  {
    id: "network",
    title: "업계 네트워킹",
    body: "현직 멘토 3인 + 동기. 끝나도 카카오톡 오픈채팅으로 이어진다.",
  },
  {
    id: "certificate",
    title: "수료증",
    body: "유니온 픽처스 발급. 이력서에 한 줄 추가되는 신뢰 신호.",
  },
] as const;

export const CAREER_SUPPORT = [
  "이력서 코칭",
  "포트폴리오 큐레이션",
  "면접 시뮬레이션",
] as const;

/**
 * 학원법 시행령 별표 4 + 공정위 소비자분쟁해결기준(교육서비스) 기준.
 * 1개월 이내 강좌의 의무 환불 비율을 그대로 따른다.
 * 추가로 전자상거래법 §17 청약철회권(결제 후 7일)을 명시적으로 보장.
 */
export const REFUND_POLICY = {
  fullRefundDays: 7,
  fullRefundLabel: "결제 후 7일 이내 또는 수강 시작 전 100% 환불",
  schedule: [
    { phase: "결제 후 7일 이내", refund: "100%" },
    { phase: "수강 시작 전", refund: "100%" },
    { phase: "수강 시작 후 1/3 경과 전", refund: "2/3 환불" },
    { phase: "수강 시작 후 1/2 경과 전", refund: "1/2 환불" },
    { phase: "1/2 경과 후", refund: "환불 없음" },
  ] as const,
  legalBasis:
    "학원의 설립·운영 및 과외교습에 관한 법률 시행령 별표 4 · 공정위 소비자분쟁해결기준",
} as const;

/**
 * 모집 정원 가드. 시작일 7일 전 시점 신청자 < 최소 인원이면 강좌를 취소하고 전액 자동 환불.
 */
export const ENROLLMENT_CAP = {
  totalSeats: 30,
  minToProceed: 20,
  cutoffDaysBeforeStart: 7,
  autoRefundNote:
    "본 강좌는 총 30인 모집이며, 수강 시작일 7일 전 시점에 신청자가 20명 미만이면 강좌가 취소되고 결제 금액은 전액 자동 환불됩니다.",
} as const;

export const CERTIFICATE_ISSUER = {
  name: "유니온 픽처스",
  nameEn: "Union Pictures",
} as const;

export const COMMUNITY = {
  channel: "카카오톡 오픈채팅" as const,
  joinTimingNote: "수강 확정 시 안내",
} as const;

export type Mentor = {
  id: string;
  role: string;
  roleEn: string;
  name: string | null;
  bio: string | null;
  status: "confirmed" | "pending";
};

export const MENTORS: readonly Mentor[] = [
  {
    id: "audio",
    role: "무대 음향 감독",
    roleEn: "Stage Audio Director",
    name: null,
    bio: null,
    status: "confirmed",
  },
  {
    id: "visual",
    role: "비주얼 디렉터",
    roleEn: "Visual Director",
    name: null,
    bio: null,
    status: "confirmed",
  },
  {
    id: "network",
    role: "현업 네트워킹 멘토",
    roleEn: "Industry Network Mentor",
    name: null,
    bio: null,
    status: "pending",
  },
] as const;

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

export const REFUND_POLICY = {
  fullRefundDays: 7,
  fullRefundLabel: "수강 시작 7일 이내 100% 환불",
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

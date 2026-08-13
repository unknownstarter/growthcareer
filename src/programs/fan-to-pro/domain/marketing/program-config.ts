/**
 * Program marketing config — 프로그램 구성, 멘토, 보장 항목, 일정, 정원.
 *
 * B0068 리네임: `domain/program.ts` → `domain/marketing/program-config.ts`.
 * DB row 를 표현하는 program 엔티티가 아니라 랜딩·pricing·apply-form 이 참조하는
 * 하드코딩 마케팅 config (1기 시점 값). 2기+ multi-track 도입 시 `courses` / `bundles`
 * DB 로 이동. 일부 필드는 사용자 입력 대기 (null / TBD).
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
    body: "Dropdown 명의로 발급. 이력서에 한 줄 추가되는 신뢰 신호.",
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
 * 모집 정원 가드. 모집 마감일 기준 신청자 < 최소 인원이면 강좌를 취소하고 전액 자동 환불.
 *
 * `cutoffAt` 은 ISO 8601 + KST(+09:00) 명시. server / client 동일 시각 비교 가능.
 * 한국어 "6월 21일 자정" = 6/21 → 6/22 전환 시점 = 2026-06-22 00:00 KST.
 */
export const ENROLLMENT_CAP = {
  totalSeats: 30,
  minToProceed: 20,
  cutoffDaysBeforeStart: 6,
  cutoffAt: "2026-06-22T00:00:00+09:00",
  autoRefundNote:
    "본 강좌는 총 30인 모집이며, 2026년 6월 21일(일) 자정까지 신청자가 20명 미만일 경우 강좌가 취소되고 결제 금액 전액이 자동 환불된 후 차기 기수로 재모집을 진행합니다.",
} as const;

/**
 * 모집 마감 여부 — `now` 이 cutoff datetime 이후면 true.
 * 서버 / 클라이언트 둘 다 호출 가능 (의존성 0).
 */
export function isEnrollmentClosed(now: Date = new Date()): boolean {
  return now.getTime() >= new Date(ENROLLMENT_CAP.cutoffAt).getTime();
}

/**
 * 1기 강의 일정. 강의장은 보안·안내 효율을 위해 수강 확정자에게만 개별 공지.
 */
export const SCHEDULE = {
  cohort: "1기",
  firstSessionDate: "2026-06-27",
  firstSessionLabel: "2026년 6월 27일 (토)",
  lastSessionLabel: "2026년 7월 19일 (일)",
  graduationLabel: "2026년 7월 25일 (토)",
  enrollmentCutoffLabel: "2026년 6월 21일 (일) 자정",
  locationLabel: "수강 신청 완료 시 개별 공지",
  durationLabel: "토요일과 일요일 각 2시간씩 4주, 총 8회 16시간 (6/27~7/19), 수료식 7/25 (토)",
  durationShort: "총 8회 16시간",
  attendanceCommitment:
    "2026년 6월 27일(토)부터 7월 19일(일)까지 토요일과 일요일 각 2시간씩 총 8회 진행되는 본 프로그램에 참여하는 것에 동의합니다.",
  contentUseNote:
    "수강 신청을 완료한 시점부터, 본 프로그램 중 촬영·녹화되는 영상·이미지가 Growth Career·Dropdown·DEEPI·유니온 픽처스의 (1) 프로그램 홍보 (2) 차기 기수 모집 콘텐츠 (3) 수강생 본인 포트폴리오 목적으로 활용되는 것에 동의한 것으로 간주됩니다. 거부 의사가 있는 경우 운영진에게 통보 시 얼굴 후처리·블러 처리 후 활용합니다.",
} as const;

/**
 * 운영 주체 · 신뢰 시그널. Trust Strip · Footer 미니 푸터에서 단일 진실 소스로 사용.
 */
export const OPERATOR = {
  legalName: "Dropdown",
  businessNumber: "154-28-02110",
  certificateIssuer: "Dropdown (수료증)",
  performanceProjectPartner: "유니온 픽처스 (공연 프로젝트 참여 확인서)",
  faculty: "DEEPI (강사 섭외, 운영 협력)",
  inquiryNote: "문의: 카카오톡 채널 또는 신청 후 안내 메일",
} as const;

export const CERTIFICATE_ISSUER = {
  name: "유니온 픽처스",
  nameEn: "Union Pictures",
} as const;

export const COMMUNITY = {
  channel: "카카오톡 오픈채팅" as const,
  joinTimingNote: "수강 확정 시 안내",
} as const;

export type CareerGroup = {
  label: string;
  items: readonly string[];
};

export type Instructor = {
  id: string;
  day: "토요일" | "일요일";
  status: "confirmed" | "pending";
  name: string;
  nameSub: string | null;
  initials: string;
  tint: "indigo" | "purple" | "pink";
  affiliation: readonly string[];
  oneLiner: string;
  photo: string | null;
  photoAlt: string;
  photoPosition: string | null;
  curriculum: readonly string[];
  careerGroups: readonly CareerGroup[];
};

export const INSTRUCTORS: readonly Instructor[] = [
  {
    id: "lee-jehyang",
    day: "토요일",
    status: "confirmed",
    name: "이제향",
    nameSub: "Lee, Je-Hyang",
    initials: "제",
    tint: "indigo",
    affiliation: ["(주)준컴퍼니 기술부", "현장 음향 감독, 믹싱 엔지니어"],
    oneLiner:
      "지상파 라디오 공개방송에서 시작해 대형 음악 방송과 연말 가요 시상식까지 현장 음향 감독, 믹싱 엔지니어로 활동 중인 현직 사운드 디렉터입니다.",
    photo: "/images/instructors/lee-jehyang.jpeg",
    photoAlt: "이제향 강사 콘솔 작업 사진",
    photoPosition: "62% 30%",
    curriculum: [],
    careerGroups: [
      {
        label: "Live Mixing, Sound Director",
        items: [
          "대형 음악 방송 특집 현장 믹싱 엔지니어",
          "연말 가요 시상식 현장 믹싱 엔지니어",
          "지상파 가요 대전 현장 음향 감독 (2025)",
        ],
      },
      {
        label: "공개방송, 녹화",
        items: [
          "지상파 라디오 공개방송 2022~현재",
          "지역 생활 정보 공개방송 2024~현재",
          "아침 생방송 프로그램 녹화",
          "케이블 음악 프로그램 녹화",
        ],
      },
      {
        label: "Festival (2025~26)",
        items: [
          "대형 뮤직 페스티벌",
          "지역 록 페스티벌",
          "대학 가요제",
          "버추얼 라이브 페스티벌",
          "인디 뮤직 페스티벌",
          "심포니 오케스트라 공연",
          "서울 록 페스티벌 (2026.4)",
        ],
      },
    ],
  },
  {
    id: "nino-lee",
    day: "일요일",
    status: "confirmed",
    name: "Nino",
    nameSub: "이세환",
    initials: "Ni",
    tint: "purple",
    affiliation: ["Sherpa Music CEO", "Creative Director"],
    oneLiner:
      "1999년 1세대 언더래퍼로 시작해 여러 기획사를 거쳐 현재 Sherpa Music Creative Director 로 27년째 뮤직 비즈니스를 하고 있습니다.",
    photo: "/images/instructors/nino-lee.jpg",
    photoAlt: "Nino (이세환) 강사 프로필",
    photoPosition: null,
    curriculum: [
      "Music Business",
      "음반 기획 · 제작 전략",
      "A&R",
      "Visual Director",
    ],
    careerGroups: [
      {
        label: "메이저 엔터사 A&R",
        items: [
          "국내 최대 규모 아이돌 오디션 프로그램 시리즈 다수",
          "글로벌 데뷔 아이돌 그룹 다수 음반 기획",
          "한국과 일본 아이돌 프로젝트 A&R 총괄",
        ],
      },
      {
        label: "프로듀싱, 퍼블리싱",
        items: [
          "인기 드라마 OST 다수 프로듀싱",
          "국내외 100여 팀 작가 계약",
          "다수 아티스트 곡 셀링 및 퍼블리싱",
        ],
      },
      {
        label: "Sherpa Music CEO, Creative Director",
        items: [
          "대형 기획사 오디션 프로그램 A&R",
          "해외 연습생 오디션 운영과 1위 데뷔 매니지먼트",
          "음악 시상식 2관왕 아티스트 비주얼 디렉팅 (2025)",
          "Sherpa Music Publishing 국내외 290여 팀 작가 계약",
        ],
      },
    ],
  },
  {
    id: "park-sungcheol",
    day: "일요일",
    status: "confirmed",
    name: "박성철",
    nameSub: "Park, Sung-Cheol",
    initials: "박",
    tint: "pink",
    affiliation: ["(주)그린음향 기술부", "현장 음향 디렉터"],
    oneLiner:
      "2005년부터 20년간 지상파 대형 음악 방송과 연말 가요 시상식 등 메이저 무대의 현장 음향을 디렉팅해 온 베테랑 사운드 디렉터입니다.",
    photo: "/images/instructors/park-sungcheol.png",
    photoAlt: "박성철 강사 프로필",
    photoPosition: "center top",
    curriculum: [],
    careerGroups: [
      {
        label: "Live Sound Director",
        items: [
          "지상파 대형 음악 방송 2005~현재",
          "연말 가요 시상식 2005~현재",
          "지상파 가요제 FOH 엔지니어",
          "인기 예능 프로그램 현장 음향",
          "지상파 음악 서바이벌 프로그램 (2011~2012)",
          "글로벌 K-뮤직 국내외 투어 2011~현재",
          "지상파 야외 음악회 2008~2014",
          "지상파 토크쇼 (2009~2013)",
          "지상파 라디오 공개방송 2009~현재",
        ],
      },
      {
        label: "Recent Stage (2025)",
        items: [
          "지상파 가요 대전 썸머 스페셜 (2025)",
          "대형 뮤직 페스티벌",
          "버추얼 라이브 페스티벌",
          "대학 가요제",
          "경기 인디 뮤직 페스티벌",
          "대형 선거 개표 방송",
        ],
      },
    ],
  },
] as const;

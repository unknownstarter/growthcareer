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
 */
export const ENROLLMENT_CAP = {
  totalSeats: 30,
  minToProceed: 20,
  cutoffDaysBeforeStart: 6,
  autoRefundNote:
    "본 강좌는 총 30인 모집이며, 2026년 6월 14일(일) 자정까지 신청자가 20명 미만일 경우 강좌가 취소되고 결제 금액 전액이 자동 환불된 후 차기 기수로 재모집을 진행합니다.",
} as const;

/**
 * 1기 강의 일정. 강의장은 보안·안내 효율을 위해 수강 확정자에게만 개별 공지.
 */
export const SCHEDULE = {
  cohort: "1기",
  firstSessionDate: "2026-06-20",
  firstSessionLabel: "2026년 6월 20일 (토)",
  enrollmentCutoffLabel: "2026년 6월 14일 (일) 자정",
  locationLabel: "수강 신청 완료 시 개별 공지",
  durationLabel: "토 · 일 각 2시간 · 4주 / 총 8회 · 16시간",
  durationShort: "총 8회 · 16시간",
  attendanceCommitment:
    "2026년 6월 20일(토)부터 토 · 일 각 2시간씩 총 8회 진행되는 본 프로그램에 참여하는 것에 동의합니다.",
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
  faculty: "DEEPI (강사 섭외 · 운영 협력)",
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
    id: "park-sungcheol",
    day: "토요일",
    status: "confirmed",
    name: "박성철",
    nameSub: "Park, Sung-Cheol",
    initials: "박",
    tint: "pink",
    affiliation: ["(주)그린음향 기술부", "현장 음향 디렉터"],
    oneLiner:
      "2005년부터 20년간 MBC 음악중심·가요대제전·나는 가수다 등 메이저 무대의 현장 음향을 디렉팅해 온 베테랑 사운드 디렉터입니다.",
    photo: "/images/instructors/park-sungcheol.png",
    photoAlt: "박성철 강사 프로필",
    photoPosition: "center top",
    curriculum: [],
    careerGroups: [
      {
        label: "Live Sound Director",
        items: [
          "MBC 음악중심 (전 음악캠프) 2005~현재",
          "MBC 가요대제전 2005~현재",
          "MBC 듀엣가요제 FOH 엔지니어",
          "MBC 마이리틀텔레비전",
          "MBC 나는 가수다 1기 (2011~2012)",
          "MBC 코리안뮤직 웨이브 국내·해외 투어 2011~현재",
          "KBS 열린음악회(야외) 2008~2014",
          "SBS 강심장 (2009~2013)",
          "SBS·MBC 라디오 공개방송 2009~현재",
        ],
      },
      {
        label: "Recent Stage (2025)",
        items: [
          "SBS 25년 가요대전 썸머 유니팝",
          "사운드베리 페스타 25",
          "MBC 버추얼 라이브 페스티벌",
          "MBC 대학가요제",
          "화성 경기인디뮤직 페스티벌",
          "SBS 21대 대선방송",
        ],
      },
    ],
  },
  {
    id: "lee-jehyang",
    day: "토요일",
    status: "confirmed",
    name: "이제향",
    nameSub: "Lee, Je-Hyang",
    initials: "제",
    tint: "indigo",
    affiliation: ["(주)준컴퍼니 기술부", "현장 음향 감독 · 믹싱 엔지니어"],
    oneLiner:
      "SBS 라디오·KBS 6시내고향에서 시작해 MBC 음악중심·가요대제전, SBS 가요대전 UNIPOP 까지 현장 음향 감독·믹싱 엔지니어로 활동 중인 현직 사운드 디렉터입니다.",
    photo: "/images/instructors/lee-jehyang.jpeg",
    photoAlt: "이제향 강사 콘솔 작업 사진",
    photoPosition: "62% 30%",
    curriculum: [],
    careerGroups: [
      {
        label: "Live Mixing · Sound Director",
        items: [
          "MBC 음악중심 울산특집 — 현장 믹싱 엔지니어",
          "MBC 가요대제전 — 현장 믹싱 엔지니어",
          "SBS 가요대전 UNIPOP 2025 — 현장 음향 감독",
        ],
      },
      {
        label: "공개방송 · 녹화",
        items: [
          "SBS 라디오 공개방송 2022~현재",
          "KBS 6시내고향 공개방송 2024~현재",
          "KBS 아침마당 녹화",
          "TV조선 싱코리아 녹화",
        ],
      },
      {
        label: "Festival (2025~26)",
        items: [
          "사운드베리 페스타 25",
          "동두천 락페스티벌",
          "MBC 대학가요제",
          "MBC 버추얼 라이브 페스티벌",
          "화성 인디뮤직 페스티벌",
          "OBS 토토로파티",
          "웨스터심포니오케스트라",
          "서울 히어로락페스티벌 (2026.4)",
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
      "1999년 1세대 언더래퍼로 시작해 소니뮤직, CJ E&M 을 거쳐 현재 Sherpa Music Creative Director 로 27년째 뮤직 비즈니스를 하고 있습니다.",
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
        label: "CJ ENM A&R",
        items: [
          "프로듀스 101 시즌1 · 2 · X · Japan 시즌1 · 2",
          "프로듀스 48",
          "I.O.I — 미니 1·2집 / 싱글 1·2집",
          "JBJ — 미니 1·2집 / 디럭스 1집",
          "워너원 미니 1집 [1×1=1]",
          "아이즈원 — 미니 1·2·3·4집 / 정규 1집 [Bloom*IZ]",
          "JO1 (Japan) — 미니 1·2·3집 / 정규 1집 [The STAR]",
          "INI — 미니 1·2·3집",
          "중국 청춘유니2 타이틀 [YES! OK!]",
        ],
      },
      {
        label: "HI-HAT Producer · Publishing",
        items: [
          "키스식스센스 OST Producer",
          "변론을 시작하겠습니다 OST Producer",
          "카지노 OST Producer",
          "사랑이라 말해요 OST Producer",
          "남남 OST Producer",
          "트랜드지 3·4집 Producer",
          "국내외 100여팀 작가 계약",
          "비비지 · 황민현 · 소유 · 템페스트 · 보이즈플래닛 · 트랜드지 곡 셀링",
        ],
      },
      {
        label: "Sherpa Music CEO · Creative Director",
        items: [
          "STARSHIP New Kids On The STARSHIP A&R",
          "JTBC Project7 해외 연습생 오디션 — 1위 마징시앙 데뷔",
          "이승윤 3rd Album Visual Director — 2025 한국대중음악상 2관왕",
          "Sherpa Music Publishing 국내외 290여팀 작가 계약",
        ],
      },
    ],
  },
] as const;
